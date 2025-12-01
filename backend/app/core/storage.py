import boto3
import uuid  # <--- 이거 꼭 있어야 함!
from app.core.config import settings
from datetime import datetime

# R2 설정이 있을 때만 클라이언트 생성 (없으면 에러 방지용으로 None 처리)
try:
    if settings.R2_ACCOUNT_ID and settings.R2_ACCESS_KEY_ID:
        s3_client = boto3.client(
            service_name='s3',
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto", 
        )
    else:
        s3_client = None
except Exception as e:
    print(f"⚠️ R2 Client init failed: {e}")
    s3_client = None


def upload_file_to_r2(file_content: bytes, filename: str, content_type: str) -> str | None:
    """
    R2에 파일 업로드 후 퍼블릭 URL 반환.
    설정이 없거나 실패하면 None 반환.
    """
    if not s3_client or not settings.R2_BUCKET_NAME:
        print("❌ R2 설정이 없어 업로드를 건너뜁니다.")
        return None

    try:
        # 1. 환경에 따라 폴더 분리 (dev/ 또는 prod/)
        env_prefix = "dev" if settings.ENVIRONMENT == "local" else "prod"
        
        # 2. 파일명 중복 방지 및 정리 (dev/20241201/uuid_test.jpg)
        date_folder = datetime.now().strftime("%Y%m%d")
        unique_filename = f"{uuid.uuid4()}_{filename}"
        object_key = f"{env_prefix}/{date_folder}/{unique_filename}"

        # 3. 업로드
        s3_client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=object_key,
            Body=file_content,
            ContentType=content_type,
            # ACL="public-read" # R2 설정에 따라 필요할 수도 있음
        )

        # 4. URL 생성해서 리턴
        # R2_PUBLIC_DOMAIN 뒤에 슬래시가 있든 없든 깔끔하게 처리
        domain = str(settings.R2_PUBLIC_DOMAIN).rstrip("/")
        return f"{domain}/{object_key}"

    except Exception as e:
        print(f"❌ R2 Upload Failed: {e}")
        return None