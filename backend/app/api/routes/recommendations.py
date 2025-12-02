import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.api.deps import SessionDep, CurrentUser
from app.models import File as FileModel
from app.core.llm import analyze_text_with_llm, CourseStep, AnalysisResult, Metadata, Persona
from app.core.naver_client import search_naver_local

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

# 요청 Body 모델 정의
class RecommendationRequest(BaseModel):
    file_id: Optional[uuid.UUID] = None        # 처음 요청할 때 사용
    courses: Optional[List[CourseStep]] = None # 수정해서 재요청할 때 사용 (최우선 순위)
    
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

    # ------------------------------------------------------------------
    # [Logic Swap] 우선순위 변경: 사용자 수정 데이터(courses)가 1순위
    # ------------------------------------------------------------------
    
    # Case 1: 사용자 편집 모드 (재검색)
    # 프론트에서 수정한 키워드(courses)가 넘어오면, AI 분석을 건너뛰고 바로 검색으로 직행
    if request.courses:
        print("🔄 키워드 재검색 요청 (User Edit Mode)...")
        
        # 기존 분석 정보(메타데이터 등)는 그대로 유지하거나 빈값 처리해서 객체 복원
        ai_result = AnalysisResult(
            metadata=request.metadata or Metadata(location="", group_name="", date=""),
            personas=request.personas or [],
            courses=request.courses
        )

    # Case 2: 초기 진입 모드 (AI 분석)
    # 수정 데이터가 없고 파일 ID만 있을 때는 텍스트를 읽어서 처음부터 분석
    elif request.file_id:
        file = session.get(FileModel, request.file_id)
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        if file.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # 텍스트가 없는 경우 (이미지/영상 분석 실패 등)
        if not file.extracted_text:
            raise HTTPException(status_code=400, detail="분석할 텍스트가 없습니다.")
        
        print(f"🤖 AI 분석 시작... (File ID: {request.file_id})")
        ai_result = analyze_text_with_llm(file.extracted_text)
    
    # Case 3: 둘 다 없음 (에러)
    else:
        raise HTTPException(status_code=400, detail="file_id 또는 courses 데이터가 필요합니다.")

    # -------------------------------------------------------
    # [공통 로직] 네이버 검색 및 3가지 경로 생성
    # -------------------------------------------------------
    search_pool = {}
    
    # 1. 각 단계별(식당, 카페, 활동)로 네이버 검색 수행
    for step in ai_result.courses:
        print(f"🔎 검색 진행 중: {step.final_query}")
        # 다양성을 위해 5개 검색
        places = search_naver_local(step.final_query, display=5)
        search_pool[step.step] = places

    recommended_courses = []
    
    # 2. 3가지 경로 조합 (알고리즘)
    for i in range(3):
        course_items = []
        
        for step in ai_result.courses:
            candidates = search_pool.get(step.step, [])
            
            if not candidates:
                continue

            # i번째 경로에는 i번째 검색 결과를 배정
            # 만약 검색 결과가 부족하면(예: 1개뿐) 0번째를 재사용 (Modulo 연산 대신 안전하게 처리)
            place_index = i if i < len(candidates) else 0
            
            selected_place = candidates[place_index]
            course_items.append(selected_place)

        recommended_courses.append({
            "course_id": i + 1,
            "label": f"추천 경로 {i + 1}",
            "places": course_items
        })

    # 3. 최종 결과 반환
    return {
        "analysis": ai_result,       # 편집창용 원본 데이터
        "routes": recommended_courses # 지도 표시용 경로 데이터
    }