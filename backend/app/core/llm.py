from pydantic import BaseModel, Field
from openai import OpenAI
from app.core.config import settings

# AI가 뱉을 출력 형식 (검색어 3개)
class SearchKeywords(BaseModel):
    keywords: list[str] = Field(description="네이버 지도에서 검색할 장소 키워드 2개이상 4개이하 (예: '강남역 조용한 카페', 강남역 분위기 좋은 일식)")

# ... (위쪽 import 생략) ...

def generate_search_keywords(text: str) -> list[str]:
    """
    텍스트를 분석하여 네이버 지도 검색용 키워드 3개를 추출합니다.
    """
    if not settings.OPENAI_API_KEY:
        # 테스트용 가짜 데이터
        return ["신촌역 분위기 좋은 카페", "신촌역 조용한 맛집", "신촌역 영화관"]

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # [수정된 프롬프트] AI에게 강력한 제약조건을 겁니다.
    system_prompt = """
    Analyze the given text and extract 3 search keywords for Naver Maps.
    
    [CRITICAL RULES]
    1. **Location is MANDATORY**: Every keyword MUST start with the specific location name found in the text (e.g., 'Gangnam Station', 'Hongdae'). Do not omit the location in any keyword.
    2. **Simplified Categories**: Use broad categories like 'Western'(양식), 'Japanese'(일식), 'Korean'(한식), 'Chinese'(중식), 'Cafe'(카페), 'Cinema'(영화관). Do not use specific terms like 'Italian'.
    3. **Adjectives Restricted**: Use ONLY 'Quiet'(조용한) or 'Atmospheric'(분위기 좋은). Do not use other adjectives.
    4. **Length Limit**: Each keyword must be 4 words or less
    5. **Language**: Output must be in Korean.
    
    Example Input: "I want to have pasta at Gangnam and watch a movie."
    Example Output: ["신촌역 분위기 좋은 카페", "신촌역 조용한 맛집", "신촌역 영화관"]
    """

    completion = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system", 
                "content": system_prompt
            },
            {
                "role": "user", 
                "content": f"Context Text:\n{text}"
            },
        ],
        response_format=SearchKeywords,
    )

    return completion.choices[0].message.parsed.keywords