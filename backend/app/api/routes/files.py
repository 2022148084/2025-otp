import uuid
from typing import Any

from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlmodel import select

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import File as FileModel, FileCreate, FilePublic, FilesPublic, Message

# [수정 포인트] 자기 주소와 태그를 스스로 정의합니다.
router = APIRouter(prefix="/files", tags=["files"])

# 1. 파일 업로드 (POST /api/v1/files/)
@router.post("/", response_model=FilePublic)
def create_file(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...)
) -> Any:
    # ... (아까와 동일한 로직) ...
    content = file.file.read()
    try:
        extracted_text = content.decode("utf-8")
    except Exception:
        extracted_text = "텍스트 변환 실패 (바이너리 파일)"

    file_in = FileCreate(
        filename=file.filename,
        extracted_text=extracted_text,
        file_url=None
    )

    db_file = crud.create_file(session=session, file_in=file_in, owner_id=current_user.id)
    return db_file


# 2. 내 파일 목록 조회 (GET /api/v1/files/)
@router.get("/", response_model=FilesPublic)
def read_files(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    # ... (아까와 동일한 로직) ...
    count_statement = select(FileModel).where(FileModel.owner_id == current_user.id)
    statement = select(FileModel).where(FileModel.owner_id == current_user.id).offset(skip).limit(limit)
    
    count = session.exec(count_statement).all()
    files = session.exec(statement).all()

    return FilesPublic(data=files, count=len(count))


# 3. 파일 삭제 (DELETE /api/v1/files/{id})
@router.delete("/{id}", response_model=Message)
def delete_file(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    # ... (아까와 동일한 로직) ...
    file = session.get(FileModel, id)
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(file)
    session.commit()
    return Message(message="File deleted successfully")