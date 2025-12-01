import uuid
import modal
from typing import Any

from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlmodel import select

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import File as FileModel, FileCreate, FilePublic, FilesPublic, Message
from app.core.storage import upload_file_to_r2

router = APIRouter(prefix="/files", tags=["files"])

# ---------------------------------------------------------
# [Modal 연결] 
# ---------------------------------------------------------
try:
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
    
    # 1. 파일 읽기
    content = file.file.read()
    filename = file.filename.lower()
    extracted_text = ""
    uploaded_url = None

    print(f"📂 파일 업로드 감지: {filename}")

    # 2. 확장자별 분기 처리
    # A. 텍스트 파일 (.txt)
    if filename.endswith(".txt"):
        try:
            extracted_text = content.decode("utf-8")
        except Exception:
            extracted_text = "텍스트 디코딩 실패"

    # B. 이미지/동영상 (Modal 필수 -> R2 선택)
    elif filename.endswith(('.png', '.jpg', '.jpeg', '.heic', '.mp4', '.mov', '.avi')):
        
        # -------------------------------------------------
        # [Step 1] Modal 분석 (Critical Path)
        # 실패하면 여기서 즉시 에러 리턴하고 종료 (R2 업로드 안 함)
        # -------------------------------------------------
        try:
            if not OCRService:
                raise Exception("OCR 서비스 연결 실패")
            
            service = OCRService()
            print(f"🚀 [Modal Start] {filename} 분석 시작...")

            if filename.endswith(('.mp4', '.mov', '.avi')):
                # 동영상
                result = service.process_video.remote(content)
                extracted_text = result.get("text", "") if isinstance(result, dict) else str(result)
            else:
                # 이미지
                result = service.process_image.remote(content)
                extracted_text = str(result)
            
            print("✅ [Modal Success] 분석 완료")

        except Exception as e:
            print(f"❌ [Modal Error] 치명적 오류 발생: {e}")
            # 여기서 에러를 던지면 함수가 종료되므로 R2 업로드도 실행되지 않음 (의도한 대로)
            raise HTTPException(status_code=500, detail=f"AI 분석 실패: {str(e)}")

        # -------------------------------------------------
        # [Step 2] R2 업로드 (Optional Path)
        # 실패해도 로그만 찍고 넘어감 (지도 추천은 되어야 하니까)
        # -------------------------------------------------
        try:
            print("☁️ [R2 Start] 업로드 시작...")
            uploaded_url = upload_file_to_r2(content, filename, file.content_type)
            
            if uploaded_url:
                print(f"✅ [R2 Success] 업로드 완료: {uploaded_url}")
            else:
                print("⚠️ [R2 Warning] URL 생성 실패 (설정 확인 필요)")

        except Exception as e:
            # R2가 죽어도 프로세스는 계속된다
            print(f"❌ [R2 Error] 업로드 실패 (무시하고 진행): {e}")
            uploaded_url = None

    else:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다.")

    # 3. DB 저장
    # (Modal이 성공했으므로 extracted_text는 무조건 있음)
    # (R2가 실패했으면 uploaded_url은 None이지만 저장은 됨)
    file_in = FileCreate(
        filename=filename,
        extracted_text=extracted_text,
        file_url=uploaded_url 
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
    
    # R2는 알아서 삭제하세용 ㅋㅋㄹㅃㅃ

    session.delete(file)
    session.commit()
    return Message(message="File deleted successfully")