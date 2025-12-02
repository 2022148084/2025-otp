from datetime import datetime
from pydantic import BaseModel, Field
from openai import OpenAI
from app.core.config import settings

# ---------------------------------------------------------
# [데이터 모델 정의]
# ---------------------------------------------------------

class Metadata(BaseModel):
    # [수정] 설명을 더 명확하게 변경
    location: str = Field(description="핵심 지역명 (예: 강남역, 홍대). 출구 번호나 세부 위치 제외.")
    group_name: str = Field(description="모임 이름 (무조건 '친구 2인'으로 고정)")
    date: str = Field(description="약속 날짜 (무조건 '2025년 12월 7일'로 고정)")

class Persona(BaseModel):
    name: str = Field(description="참여자 이름 (예: '나', '어피치')")
    traits: str = Field(description="대화에서 유추한 성격이나 취향을 요약한 한 문장")

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
    카톡 대화를 분석하여 메타데이터, 페르소나, 3단계 추천 코스를 반환합니다.
    """
    
    if not settings.OPENAI_API_KEY:
        raise ValueError("❌ OpenAI API Key가 설정되지 않았습니다! .env 파일을 확인해주세요.")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # ---------------------------------------------------------
    # [업그레이드된 프롬프트] 구조적 조합 (Constructive Mapping)
    # ---------------------------------------------------------
    system_prompt = """
    Role: You are a "Search Query Architect" for Naver Maps.
    
    Task:
    1. Metadata: Extract Location. **FORCE** Date and Group Name to specific values.
    2. Persona: Analyze participants' traits into a SINGLE sentence.
    3. Course: Generate a 3-step course (Meal -> Cafe -> Activity/Pub).
    4. Query Construction: Create 'final_query' based on the Critical Rules.

    # 🔴 Critical Rules:

    [Metadata Rules]
    - Location: Extract ONLY the main area/station name (e.g., "강남역", "홍대", "성수"). 
      * MUST remove specific details like "Exit 3"(3번 출구), "Near"(근처), "Intersection"(사거리).
      * Bad: "홍대입구역 3번 출구" -> Good: "홍대" or "홍대입구역"
    - Group Name: ALWAYS set to "친구 2인". (Do not calculate)
    - Date: ALWAYS set to "2025년 12월 7일". (Do not extract from chat)

    [Persona Rules]
    - Identify 2 participants.
    - 'traits': Summarize personality/preference into ONE descriptive sentence string in Korean.

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
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Chat Log:\n\n{text}"},
        ],
        response_format=AnalysisResult,
    )

    return completion.choices[0].message.parsed