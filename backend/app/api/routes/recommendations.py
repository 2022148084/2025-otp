import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.api.deps import SessionDep, CurrentUser
from app.models import File as FileModel
from app.core.llm import analyze_text_with_llm, CourseStep, AnalysisResult, Metadata, Persona
from app.core.naver_client import search_naver_local

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

# [추가] 요청 Body 모델 정의
class RecommendationRequest(BaseModel):
    file_id: Optional[uuid.UUID] = None  # 처음 요청할 때
    courses: Optional[List[CourseStep]] = None  # 수정해서 재요청할 때 (AI 분석 건너뜀)
    
    # 재요청 시 기존 분석 정보를 유지하기 위해 받음 (선택)
    metadata: Optional[Metadata] = None 
    personas: Optional[List[Persona]] = None

@router.post("/")
def create_recommendation(
    session: SessionDep,
    current_user: CurrentUser,
    request: RecommendationRequest,
) -> Any:
    
    ai_result = None

    # Case 1: 처음 요청 (파일 ID로 분석)
    if request.file_id:
        file = session.get(FileModel, request.file_id)
        if not file or not file.extracted_text:
            raise HTTPException(status_code=404, detail="File text not found")
        
        print(f"🤖 AI 분석 시작... (File ID: {request.file_id})")
        ai_result = analyze_text_with_llm(file.extracted_text)

    # Case 2: 재요청 (수정된 키워드로 검색만)
    elif request.courses:
        print("🔄 키워드 재검색 요청...")
        # 기존 분석 정보(메타데이터 등)는 그대로 유지하거나 빈값 처리
        ai_result = AnalysisResult(
            metadata=request.metadata or Metadata(location="", group_name="", date=""),
            personas=request.personas or [],
            courses=request.courses
        )
    
    else:
        raise HTTPException(status_code=400, detail="file_id 또는 courses 데이터가 필요합니다.")

    # -------------------------------------------------------
    # [공통 로직] 네이버 검색 및 경로 생성
    # -------------------------------------------------------
    search_pool = {}
     
    for step in ai_result.courses:
        print(f"🔎 검색 진행 중: {step.final_query}")
        places = search_naver_local(step.final_query, display=5)
        search_pool[step.step] = places

    recommended_courses = []
    
    for i in range(3):
        course_items = []
        for step in ai_result.courses:
            candidates = search_pool.get(step.step, [])
            if not candidates: continue
            
            place_index = i if i < len(candidates) else 0
            course_items.append(candidates[place_index])

        recommended_courses.append({
            "course_id": i + 1,
            "label": f"추천 경로 {i + 1}",
            "places": course_items
        })

    return {
        "analysis": ai_result,
        "routes": recommended_courses
    }