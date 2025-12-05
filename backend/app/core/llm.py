import os
import hashlib
import redis
from datetime import datetime
from pydantic import BaseModel, Field
from openai import OpenAI
from app.core.config import settings

# ---------------------------------------------------------
# [버전 관리]
# ---------------------------------------------------------
PROMPT_VERSION = "v1"  # 프롬프트 변경 시 이것만 올리면 됨
MODEL_VERSION = "gpt-5.1"

# ---------------------------------------------------------
# [Redis 클라이언트 설정]
# ---------------------------------------------------------
# Docker 환경에서는 'redis', 로컬/기타 환경 대비 환경변수 지원
redis_host = os.getenv("REDIS_HOST", "redis")

try:
    # decode_responses=True: 데이터를 bytes가 아닌 str로 자동 변환
    redis_client = redis.Redis(host=redis_host, port=6379, db=0, decode_responses=True)
    # 연결 테스트 (핑) - 실패 시 예외 발생하여 redis_client를 None으로 처리
    redis_client.ping()
    print(f"✅ Redis connected at {redis_host}")
except Exception as e:
    print(f"⚠️ Redis connection failed: {e}")
    redis_client = None


# ---------------------------------------------------------
# [데이터 모델 정의]
# ---------------------------------------------------------

class Metadata(BaseModel):
    location: str = Field(description="핵심 지역명 (예: 강남역, 홍대). 출구 번호나 세부 위치 제외.")
    group_name: str = Field(description="모임 인원 (포맷: '친구 N인'). 대화 참여자 수를 세어서 작성.")
    date: str = Field(description="약속 날짜 (무조건 '2025년 12월 7일'로 고정)")

class Persona(BaseModel):
    name: str = Field(description="참여자 이름 (예: '나', '어피치')")
    likes: list[str] = Field(description="선호하는 음식, 분위기, 활동 키워드 리스트 (예: ['한식', '조용한', '사진'])")
    dislikes: list[str] = Field(description="싫어하거나 피하는 것들 리스트 (예: ['시끄러운 곳', '해산물', '웨이팅'])")

class CourseStep(BaseModel):
    step: int = Field(description="단계 (1: 식사, 2: 카페, 3: 놀거리/술)")
    category: str = Field(description="카테고리 (식당, 카페, 이자카야 등)")
    final_query: str = Field(description="네이버 검색용 최종 문자열 (4단어 이하)")

class AnalysisResult(BaseModel):
    metadata: Metadata
    personas: list[Persona]
    courses: list[CourseStep]


def analyze_text_with_llm(text: str) -> AnalysisResult:
    """
    카톡 대화를 분석하여 메타데이터, 상세 페르소나(선호/비선호), 3단계 추천 코스를 반환합니다.
    (Redis 캐싱 적용: 동일한 텍스트 요청 시 OpenAI 호출 없이 반환)
    """
    
    if not settings.OPENAI_API_KEY:
        raise ValueError("❌ OpenAI API Key가 설정되지 않았습니다! .env 파일을 확인해주세요.")

    # ---------------------------------------------------------
    # [Cache Check] Redis 조회
    # ---------------------------------------------------------
    cache_key = ""
    if redis_client:
        try:
            # 버전 정보를 포함한 캐시 키 생성
            cache_input = f"{PROMPT_VERSION}:{MODEL_VERSION}:{text}"
            text_hash = hashlib.md5(cache_input.encode('utf-8')).hexdigest()
            cache_key = f"llm_analysis:{text_hash}"
            
            cached_data = redis_client.get(cache_key)
            if cached_data:
                print(f"⚡️ [Redis Hit] 캐시된 LLM 결과를 반환합니다. (Key: {cache_key})")
                # JSON 문자열을 Pydantic 객체로 복원
                return AnalysisResult.model_validate_json(cached_data)
        except Exception as e:
            print(f"⚠️ Redis Read Error: {e}")

    # ---------------------------------------------------------
    # [LLM Call] OpenAI 호출 (Cache Miss)
    # ---------------------------------------------------------
    print("🤖 [Redis Miss] OpenAI API 호출 중...")
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # 프롬프트 원본 유지
    system_prompt = """
    Role: You are a "Search Query Architect" & "Persona Analyst".
    
    Task:
    1. Metadata: Extract Location. Count participants for Group Name. **FORCE** Date.
    2. Persona: Identify ALL participants. Extract their 'Likes' and 'Dislikes' as keyword lists.
    3. Course: Generate a 3-step course (Meal -> Cafe -> Activity/Pub).
    4. Query Construction: Create 'final_query' based on Critical Rules.

    # 🔴 Critical Rules:

    [Metadata Rules]
    - Location: Extract ONLY the main area (e.g., "강남역", "홍대"). Remove details like "Exit 3".
    - Group Name: Count the number of unique speakers in the chat and format strictly as "친구 N인" (e.g., "친구 2인", "친구 3인", "친구 4인"). Do NOT use terms like "Couples", "Family", or "Colleagues".
    - Date: ALWAYS set to "2025년 12월 7일". (Do not extract from chat)

    [Persona Rules]
    - Identify ALL participants involved in the conversation.
    - 'likes': Extract 2-4 keywords (List of Strings) about what they like (Food type, Atmosphere, Activity).
    - 'dislikes': Extract 1-3 keywords (List of Strings) about what they dislike or want to avoid. If not mentioned, infer reasonable dislikes based on context (e.g., if they like quiet places, they likely dislike 'Noise').

    [Query Generation Rules for 'final_query']
    
    [Step 1 (Meal) & Step 2 (Cafe)]
    - Format: "{Location} {Adjective} {Noun}"
    - Rule: Must include exactly ONE adjective.
    - Ban List: "Expensive"(비싼), "Cheap"(싼), "Delicious"(맛있는), "Famous"(유명한), "Good"(좋은), "Best"(최고), "JMT"(존맛).

    [Step 3 (Activity/Pub)]
    - Format: "{Location} {Noun}"  <-- NO Adjective!
    - Rule: Do NOT use adjectives. Just Location + Category Noun.

    # Mapping Rules (Select the best Adjective & Noun):

    [Step 1. Restaurant]
    - Adjectives (Select ONE):
      * Cheap/Quantity -> '가성비'
      * Expensive/Anniversary -> '기념일', '파인다이닝'
      * Quiet/Talk -> '조용한', '룸식당'
      * Old/Authentic -> '노포'
      * Trendy/New -> '신상'
      * Default -> '맛집'
    - Nouns:
      * Specific Food: '초밥', '파스타', '고기집', '곱창', '평양냉면' etc.
      * Category: '일식', '양식', '한식', '중식'
      * Course: '오마카세'

    [Step 2. Cafe/Dessert]
    - Adjectives (Select ONE):
      * Photo/Insta -> '포토존', '감성'
      * Quiet/Study -> '조용한', '카공'
      * Big/Comfort -> '대형', '소파가 편한'
      * View -> '뷰맛집'
      * Default -> '디저트', '로스팅'
    - Nouns:
      * MUST include: '카페' or '찻집' or specific dessert like '빙수', '케이크'

    [Step 3. Activity/Pub]
    - Adjectives: NONE
    - Nouns:
      * Alcohol: '이자카야', '와인바', '칵테일바', '노포 호프', '야장'
      * Activity: '코인노래방', '보드게임카페', '방탈출', '셀프사진관', '영화관'

    # Constraints:
    - Output language: Korean.
    """

    completion = client.beta.chat.completions.parse(
        model="gpt-5.1",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Chat Log:\n\n{text}"},
        ],
        response_format=AnalysisResult,
    )

    result = completion.choices[0].message.parsed

    # ---------------------------------------------------------
    # [Cache Save] 결과 Redis 저장
    # ---------------------------------------------------------
    if redis_client and cache_key:
        try:
            # Pydantic 객체를 JSON 문자열로 변환하여 저장 (TTL: 24시간)
            redis_client.setex(cache_key, 86400, result.model_dump_json())
            print(f"💾 [Redis Saved] 결과를 캐시에 저장했습니다. (TTL: 24h)")
        except Exception as e:
            print(f"⚠️ Redis Write Error: {e}")

    return result