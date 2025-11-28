import uuid
from typing import Any
from fastapi import APIRouter, HTTPException
from app.api.deps import SessionDep, CurrentUser
from app.models import File as FileModel
from app.core.llm import generate_search_keywords
from app.core.naver_client import search_naver_local

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.post("/")
def create_recommendation(
    session: SessionDep,
    current_user: CurrentUser,
    file_id: uuid.UUID, # Body로 file_id 하나만 받으면 됨
) -> Any:
    """
    1. 파일의 텍스트를 읽어서
    2. AI가 검색어 3개를 뽑고
    3. 네이버 지도에서 장소를 찾아서 반환
    """
    # 1. 파일 조회 (내 파일인지 확인)
    file = session.get(FileModel, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    if file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if not file.extracted_text:
        raise HTTPException(status_code=400, detail="텍스트가 없는 파일입니다.")

    # 2. AI에게 검색어 추출 요청
    keywords = generate_search_keywords(file.extracted_text)
    print(f"🤖 AI가 추출한 키워드: {keywords}")

    # 3. 네이버 API로 장소 검색 (3번 반복)
    final_places = []
    for keyword in keywords:
        # 키워드당 장소 1개씩만 검색 (display=1)
        places = search_naver_local(keyword, display=1)
        final_places.extend(places)

    # 4. 결과 반환 (DB 저장 없이 바로 리턴)
    return {
        "title": f"{file.filename} 기반 추천 코스",
        "keywords": keywords,
        "places": final_places
    }