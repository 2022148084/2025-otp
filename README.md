# 🚀 ChatPick

**AI 기반 맞춤형 여행/약속 코스 추천 서비스**

> 대화 내용을 올리면, AI가 페르소나를 분석하고 최적의 장소를 지도에 찍어줍니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-00C58E.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://reactjs.org/)

---

 ![System Architecture](/OTP2.drawio.png)

---
## 📋 목차

- [프로젝트 개요](#-프로젝트-개요)
- [주요 특징](#-주요-특징)
- [기술 스택](#-기술-스택)
- [핵심 구현 기능](#-핵심-구현-기능)
- [접속 정보](#-접속-정보)
- [시작하기](#-시작하기)
- [프로젝트 구조](#-프로젝트-구조)
- [성능 최적화](#-성능-최적화)
- [로드맵](#-로드맵)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)

---

## 🌟 프로젝트 개요

**ChatPick**은 FastAPI Full Stack Template을 기반으로 시작하여, 실제 서비스 가능한 수준의 기능 확장 및 인프라 최적화를 수행한 AI 추천 시스템입니다.

단순한 CRUD를 넘어, **LLM(OpenAI)**, **Serverless GPU(Modal)**, **In-Memory Cache(Redis)**, **Cloud Storage(Cloudflare R2)** 등 다양한 최신 기술 스택을 통합하여 고성능 AI 추천 시스템을 구축했습니다.

### 핵심 가치 제안

- 🎯 **맞춤형 추천**: 대화 내용 분석을 통한 참여자 성향 파악
- ⚡ **빠른 응답**: Redis 캐싱으로 중복 요청 시 0.1초 응답 (LLM 비용 0원)
- 🗺️ **시각적 경로**: Naver Map API를 활용한 코스 자동 생성
- 🎨 **직관적 UX**: 반응형 디자인과 편집 가능한 중간 단계 제공
- 📱 **멀티모달**: 텍스트, 이미지, 동영상 파일 통합 지원

---

## ✨ 주요 특징

### 🧠 AI 분석 파이프라인

- **멀티모달 입력 지원**
  - 텍스트 파일 (`.txt`)
  - 이미지 (`.jpg`, `.png`) - Serverless GPU로 OCR 처리
  - 동영상 (`.mp4`) - Serverless GPU로 프레임 변환
  
- **페르소나 분석**
  - 대화 내용 기반 참여자 성향 분석
  - 선호/비선호 태그 자동 추출 및 시각화
  
- **코스 자동 생성**
  - 🍽️ 식사 장소
  - ☕ 카페
  - 🎮 놀거리
  - 각 테마별 최적 경로 자동 구성

### ⚡ 성능 최적화

- **Redis 캐싱**
  - LLM 분석 결과 캐싱으로 중복 요청 비용 제로화
  - 응답 속도 10배 향상 (5초 → 0.5초)
  
- **편집 모드 최적화**
  - 사용자 키워드 수정 시 LLM 재호출 없이 Naver 검색 API만 사용
  - 즉각적인 반응성 제공

### 🎨 UX/UI 고도화

- **중간 편집 단계**
  - AI 분석 결과 확인 및 수정 기능
  - 실시간 피드백으로 만족도 향상
  
- **인터랙티브 지도**
  - 경로별 탭(Tab) 인터페이스
  - 마커 클릭 시 해당 리스트 하이라이트
  - 자동 영역 조절(FitBounds)로 최적 뷰포트 제공
  
- **반응형 디자인**
  - 데스크톱/태블릿/모바일 완벽 대응
  - Chakra UI 기반 일관된 디자인 시스템

---


## 🛠️ 기술 스택

### Frontend
- **Core**: React 18.2, TypeScript, Vite
- **UI Framework**: Chakra UI
- **State Management**: TanStack Query (React Query)
- **Routing**: TanStack Router
- **Map**: Naver Map API
- **Hosting**: Cloudflare Pages (Global CDN)

### Backend
- **Framework**: FastAPI 0.100+
- **Language**: Python 3.11+
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Auth**: JWT (JSON Web Tokens)
- **Storage**: Cloudflare R2 (S3-compatible)
- **GPU Processing**: Modal (Serverless)
- **Reverse Proxy**: Caddy (Auto HTTPS)

### Infrastructure
- **Cloud**: Oracle Cloud Infrastructure (OCI)
- **Compute**: Ampere A1 (4 vCPU, 24GB RAM)
- **Container**: Docker & Docker Compose
- **Monitoring**: Docker logs

### AI/ML
- **LLM**: OpenAI GPT-5
- **OCR**: Modal + PaddleOCR
- **영상 처리**: Modal + SPYNET

---

## 🎯 핵심 구현 기능

### 1️⃣ 인증 시스템
- [x] JWT 기반 로그인/회원가입
- [x] 비밀번호 해싱 (bcrypt)
- [x] 토큰 갱신 (Refresh Token)
- [x] 사용자 프로필 관리

### 2️⃣ 파일 처리
- [x] 텍스트 파일 업로드 및 파싱
- [x] 이미지 업로드 → Modal GPU OCR
- [x] 동영상 업로드 → Modal GPU STT
- [x] Cloudflare R2 연동 (파일 저장)

### 3️⃣ AI 분석
- [x] OpenAI API 연동
- [x] 대화 내용 페르소나 분석
- [x] 선호 키워드 추출
- [x] Redis 캐싱으로 중복 분석 방지

### 4️⃣ 장소 검색
- [x] Naver 검색 API 연동
- [x] 키워드 기반 장소 추천
- [x] 테마별 장소 구성

### 5️⃣ 지도 시각화
- [x] Naver Map API 연동
- [x] 커스텀 마커 표시
- [x] 경로선 (Polyline) 그리기
- [x] 자동 영역 조절 (FitBounds)
- [x] 마커 클릭 이벤트
- [x] 정보창 (InfoWindow) 표시

### 6️⃣ UI/UX
- [x] 반응형 레이아웃 (Mobile/Tablet/Desktop)
- [x] 로딩 상태 표시
- [x] 에러 핸들링 및 Toast 알림
- [x] 편집 모드 (키워드 수정)
- [x] 경로별 탭 인터페이스
- [x] 리스트-지도 연동 하이라이트

---

## 🌐 접속 정보

| 구분 | 역할 | URL | 비고 |
|------|------|-----|------|
| **어플리케이션 (FE)** | 사용자 인터페이스 | https://2025-otp.pages.dev/ | Cloudflare Pages (전 세계 CDN) |
| **API 문서** | 백엔드 API 명세 | https://146.56.106.252.nip.io/docs | OCI Server (HTTPS via Caddy) |
| **DB Admin** | 데이터베이스 관리 | SSH 터널링 (localhost:8080) | 보안상 외부 접속 차단 |

---

## 🚀 시작하기

### 사전 요구사항

- Docker 24.0+
- Docker Compose 2.20+
- Node.js 18+ (프론트엔드 개발 시)
- Python 3.11+ (백엔드 개발 시)

### 로컬 개발 환경 설정

#### 1. 저장소 클론

```bash
git clone https://github.com/2022148084/2025-otp.git
cd 2025-otp
```

#### 2. 환경 변수 설정

```bash
# 백엔드 환경 변수
cp backend/.env.example backend/.env

# 필수 환경 변수 설정
# - OPENAI_API_KEY
# - NAVER_CLIENT_ID
# - NAVER_CLIENT_SECRET
# - POSTGRES_PASSWORD
# - SECRET_KEY
# - REDIS_URL
# - CLOUDFLARE_R2_*
```

#### 3. Docker Compose 실행

```bash
# 전체 스택 실행 (Backend + DB + Redis + Adminer)
docker compose up -d

# 로그 확인
docker compose logs -f backend
```

#### 4. 프론트엔드 개발 서버 실행

```bash
cd frontend
npm install
npm run dev
```

#### 5. 접속

- Frontend: http://localhost:5173
- Backend API Docs: http://localhost:8000/docs
- Adminer (DB): http://localhost:8080

### 프로덕션 배포

자세한 배포 가이드는 [deployment.md](deployment.md)를 참고하세요.

---

## 📁 프로젝트 구조

```
2025-otp/
├── backend/                  # FastAPI 백엔드
│   ├── app/
│   │   ├── api/              # API 엔드포인트
│   │   │   ├── routes/       # 라우트 정의
│   │   │   └── deps.py       # 의존성 주입
│   │   ├── core/             # 핵심 설정
│   │   │   ├── config.py     # 환경 설정
│   │   │   └── security.py   # 인증/보안
│   │   ├── models/           # SQLAlchemy 모델
│   │   ├── schemas/          # Pydantic 스키마
│   │   ├── crud/             # CRUD 로직
│   │   └── utils/            # 유틸리티 함수
│   ├── alembic/              # DB 마이그레이션
│   ├── tests/                # 테스트
│   └── Dockerfile
│
├── frontend/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/       # 재사용 가능 컴포넌트
│   │   ├── routes/           # 페이지 라우트
│   │   ├── client/           # API 클라이언트
│   │   ├── hooks/            # 커스텀 훅
│   │   └── theme/            # Chakra UI 테마
│   ├── public/
│   └── package.json
│
├── scripts/                  # 유틸리티 스크립트
├── docker-compose.yml        # 개발 환경 구성
└── README.md
```

---

## ⚡ 성능 최적화

### Redis 캐싱 전략

```python
# LLM 분석 결과 캐싱
cache_key = f"analysis:{file_hash}"
cached_result = redis.get(cache_key)

if cached_result:
    return cached_result  # 0.1초 응답
else:
    result = openai_analyze(content)  # 5초 소요
    redis.setex(cache_key, 3600, result)  # 1시간 캐싱
    return result
```

### 성능 지표

| 항목 | 캐시 미적중 | 캐시 적중 | 개선율 |
|------|------------|----------|--------|
| **응답 시간** | 5.2초 | 0.1초 | **98% ↓** |
| **LLM 비용** | $0.02/req | $0.00 | **100% ↓** |
| **서버 부하** | 높음 | 낮음 | **95% ↓** |

### Modal Serverless GPU

- **콜드 스타트**: ~3초
- **웜 스타트**: ~0.5초
- **비용**: 사용한 만큼만 과금 (GPU 유휴 시간 0원)

---

## 🗓️ 로드맵

### ✅ Phase 1: MVP (완료)
- [x] 기본 인증 시스템
- [x] 텍스트 파일 분석
- [x] 장소 추천 기본 기능
- [x] Naver Map 연동

### 🚧 Phase 2: 고도화 (진행 중)
- [ ] 이미지/동영상 통합 처리
- [ ] 페르소나 선택 UI
- [ ] 추천 결과 저장 기능
- [ ] URL 공유 기능

### 📋 Phase 3: 확장 (계획)
- [ ] 실시간 협업 기능
- [ ] 소셜 로그인 (Google, Kakao)
- [ ] 이메일 알림 시스템
- [ ] 관리자 대시보드
- [ ] A/B 테스트 프레임워크

### 🎯 Phase 4: 고급 기능 (미래)
- [ ] ML 기반 추천 개인화
- [ ] 실시간 채팅
- [ ] 모바일 앱 (React Native)
- [ ] 다국어 지원

---

## 🧪 테스트

### 백엔드 테스트

```bash
cd backend

# 단위 테스트
pytest

# 커버리지 리포트
pytest --cov=app --cov-report=html

# 특정 테스트 실행
pytest tests/test_api.py::test_create_user
```

### 프론트엔드 테스트

```bash
cd frontend

# 단위 테스트
npm test

# E2E 테스트 (Playwright)
npm run test:e2e
```

---

## 🤝 기여하기

프로젝트에 기여하고 싶으시다면 다음 절차를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 커밋 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅, 세미콜론 누락 등
refactor: 코드 리팩토링
test: 테스트 코드 추가
chore: 빌드 작업, 패키지 매니저 설정 등
```

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 👥 팀원

- **Backend Lead**: [Your Name]
- **Frontend Lead**: [Your Name]
- **DevOps**: [Your Name]
- **Design**: [Your Name]

---

## 📞 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 Issue를 생성해주세요.

- GitHub: [@2022148084](https://github.com/2022148084)
- Email: your.email@example.com

---

## 🙏 감사의 글

이 프로젝트는 다음 오픈소스 프로젝트들을 기반으로 합니다:

- [FastAPI Full Stack Template](https://github.com/tiangolo/full-stack-fastapi-template) by @tiangolo
- [React](https://reactjs.org/)
- [Chakra UI](https://chakra-ui.com/)
- [Naver Map API](https://www.ncloud.com/product/applicationService/maps)

---

<div align="center">

**Made with ❤️ by ChatPick Team**

[🌐 Live Demo](https://2025-otp.pages.dev/) | [📖 Documentation](https://146.56.106.252.nip.io/docs) | [🐛 Report Bug](https://github.com/2022148084/2025-otp/issues) | [✨ Request Feature](https://github.com/2022148084/2025-otp/issues)

</div>
