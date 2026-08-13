# 사주미 (saju-me-junyeong)

AI 사주 해석 웹 서비스입니다.  
이름·생년월일·시간·성별을 입력하면 Gemini가 사주 해석을 생성하고, 로그인 사용자는 결과 저장·공유까지 할 수 있습니다.

**라이브:** https://saju-me-junyeong.vercel.app/

## 주요 기능

- **비회원 미리보기** — 로그인 없이 먼저 해석. 일부만 공개되고 전체는 로그인 후 열림
- **Google 로그인** — Supabase Auth
- **프로필** — 온보딩·기본 생년월일 저장 후 빠르게 재해석
- **사주 기록** — 해석 저장, 수정, 삭제, 사이드바 목록
- **공유 링크** — 읽기 전용 공개 결과 페이지 (`/result/:shareToken`)
- **마스코트** — 상태에 따라 안내 멘트 표시
- **Google Analytics** — 페이지뷰 + 버튼 클릭 이벤트 (`G-Y4REDJNC1X`)

## 기술 스택

| 영역 | 사용 |
|------|------|
| Frontend | React 19, Vite 8, React Router |
| AI | Google Gemini (`/api/gemini`) |
| Backend / Auth / DB | Supabase |
| 배포 | Vercel |
| 분석 | Google Analytics 4 |

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경 변수

`.env.example`을 복사해 `.env`를 만듭니다.

```bash
copy .env.example .env
```

필요한 값:

| 변수 | 설명 |
|------|------|
| `VITE_GEMINI_API_KEY` / `GEMINI_API_KEY` | Gemini API 키 |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |

배포(Vercel)에도 동일한 환경 변수를 설정한 뒤 재배포하세요.  
`.env`는 git에 올리지 마세요.

### 3. 로컬 실행

```bash
npm run dev
```

### 기타 스크립트

```bash
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # oxlint
```

## 프로젝트 구조

```
src/
  components/
    auth/          # 사이드바 로그인
    layout/        # 헤더·사이드바
    mascot/        # 마스코트 UI
    profile/       # 온보딩·프로필 모달
    readings/      # 입력 폼·결과·공유·목록
  hooks/           # useSajuApp (앱 상태·로직)
  pages/           # 공유 결과 페이지
  utils/           # analytics, format, profile 등
  lib/             # Supabase 클라이언트
api/               # Vercel serverless (Gemini)
```

## 라우트

| 경로 | 설명 |
|------|------|
| `/` | 메인 해석 앱 |
| `/result/:shareToken` | 공유된 읽기 전용 결과 |

## 분석

`index.html`에 GA4 태그가 포함되어 있고, 주요 버튼 클릭은 `button_click` 이벤트로 전송됩니다 (`button_name`, `location` 파라미터).

## 라이선스

Private project.
