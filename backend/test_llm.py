import os
from dotenv import load_dotenv

# 1. .env 파일 로드 (OpenAI Key 가져오기)
# (상위 폴더에 .env가 있다면 경로 조정 필요: load_dotenv("../.env"))
load_dotenv("../.env") 


from app.core.llm import analyze_text_with_llm





chat_log= """
오후 2:00, 박민수 : 야 이번 주말에 애들 다 모이기로 한 거 맞지? 건대입구에서 볼까?
오후 2:02, 최영희 : ㅇㅇ 건대 좋지. 근데 나 이번 달 카드값 폭탄이라.. 비싼 건 좀 무리다 ㅠㅠ 양 많고 싼 곳 없냐?
오후 2:03, 정수철 : 그럼 1차는 무조건 고기지 ㅋㅋ 요즘 유행하는 레트로한 냉동삼겹살이나 노포 느낌 나는 고깃집 어때? 소주 한잔하기 딱인데.
오후 2:05, 박민수 : 오 좋다 ㅋㅋ 배 터지게 먹어보자. 밥 먹고는 소화도 시킬 겸 뭐 할까? 노래방? 아님 볼링?
오후 2:06, 최영희 : 볼링은 팔 아프고 오랜만에 보드게임이나 한판 뜨자 ㅋㅋ 진 사람이 카페 쏘기 내기 콜?
오후 2:10, 정수철 : 콜 ㅋㅋ 카페는 그냥 자리 넓고 편한 데 아무 데나 가자. 공부하는 분위기 말고 수다 떨 수 있는 대형 카페로!
오후 2:12, 박민수 : 그래 그럼 이번 주 일요일 1시에 건대 맛의거리 입구에서 집합! 늦으면 벌금이다 ㅡㅡ
"""




print("🚀 AI 분석 시작...")
try:
    result = analyze_text_with_llm(chat_log)
    
    print("\n--- [Metadata] ---")
    print(result.metadata)
    
    print("\n--- [Personas] ---")
    for p in result.personas:
        print(f"👤 {p.name}: {p.traits}")
        
    print("\n--- [Courses] ---")
    for c in result.courses:
        print(f"📍 Step {c.step} ({c.category}): {c.final_query}")

except Exception as e:
    print(f"❌ 에러 발생: {e}")
