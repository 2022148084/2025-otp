import uuid
import modal
from typing import Any

from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlmodel import select

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import File as FileModel, FileCreate, FilePublic, FilesPublic, Message

router = APIRouter(prefix="/files", tags=["files"])

# ---------------------------------------------------------
# [Modal 연결] 
# ---------------------------------------------------------
try:
    # 님 테스트 코드에 있던 앱 이름과 클래스 이름
    OCRService = modal.Cls.from_name("kakao-ocr-unified", "OCRService")
except Exception as e:
    print(f"⚠️ Warning: Modal 앱을 찾을 수 없습니다. ({e})")
    OCRService = None


# 1. 파일 업로드 (POST /api/v1/files/)
@router.post("/", response_model=FilePublic)
def create_file(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...)
) -> Any:
    """
    파일 업로드 & 텍스트 추출
    - .txt: 즉시 변환
    - .png, .mp4 등: Modal GPU로 전송하여 OCR 결과 반환
    """
    
    # 1. 파일 읽기 (메모리에 로드)
    content = file.file.read()
    filename = file.filename.lower()
    extracted_text = ""

    print(f"📂 파일 업로드 감지: {filename}")

    # 2. 확장자별 분기 처리
    try:
        # A. 텍스트 파일
        if filename.endswith(".txt"):
            extracted_text = content.decode("utf-8")

        # B. 이미지/동영상 (Modal 호출)
        elif filename.endswith(('.png', '.jpg', '.jpeg', '.heic', '.mp4', '.mov', '.avi')):
            
            if not OCRService:
                raise HTTPException(status_code=503, detail="OCR 서비스 연결 실패 (서버 로그 확인)")
            
            # Modal 함수 호출을 위한 인스턴스
            service = OCRService()
            print(f"🚀 Sending {filename} to Modal GPU...")

            if filename.endswith(('.mp4', '.mov', '.avi')):
                # [동영상] 결과가 딕셔너리이므로 .get("text") 사용
                result = service.process_video.remote(content)
                extracted_text = result.get("text", "") if isinstance(result, dict) else str(result)
                print("--- [Video Result Fetched] ---")
            
            else:
                # [이미지] 결과가 바로 텍스트(또는 리스트)임
                result = service.process_image.remote(content)
                extracted_text = str(result) # 리스트라면 문자열로 변환해서 저장
                print("--- [Image Result Fetched] ---")

        else:
            raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다.")

    except Exception as e:
        print(f"❌ 분석 중 에러 발생: {e}")
        extracted_text = f"분석 실패: {str(e)}"

    # 3. DB 저장 (CDN URL은 나중에 추가)
    file_in = FileCreate(
        filename=file.filename,
        extracted_text=extracted_text,
        file_url=None 
    )

    db_file = crud.create_file(session=session, file_in=file_in, owner_id=current_user.id)
    return db_file


# 2. 내 파일 목록 조회
@router.get("/", response_model=FilesPublic)
def read_files(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    count_statement = select(FileModel).where(FileModel.owner_id == current_user.id)
    statement = select(FileModel).where(FileModel.owner_id == current_user.id).offset(skip).limit(limit).order_by(FileModel.created_at.desc())
    
    count = session.exec(count_statement).all()
    files = session.exec(statement).all()

    return FilesPublic(data=files, count=len(count))


# 3. 파일 삭제
@router.delete("/{id}", response_model=Message)
def delete_file(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    file = session.get(FileModel, id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    if file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(file)
    session.commit()
    return Message(message="File deleted successfully")