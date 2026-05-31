# Brissy — Claude 세션 컨텍스트

> 이 파일은 Claude Code 세션 시작 시 자동으로 읽힙니다.
> 프로젝트 전체 맥락을 빠르게 복원하기 위한 파일입니다.

---

## 프로젝트 개요

**Brissy** — GPTs + 캘린더 기반 월간 플래너 웹서비스

- **프론트엔드**: React/Vite → Vercel 배포 (`https://brissy.vercel.app`)
- **백엔드**: FastAPI → Railway 배포 (`https://web-production-2bc25.up.railway.app`)
- **DB**: Supabase (events, confirmed 테이블)
- **GPTs**: ChatGPT Actions로 백엔드 API 호출

---

## 디렉토리 구조

```
brissy/
├── backend/
│   ├── main.py                  # FastAPI 앱, CORS 설정
│   ├── supabase_client.py       # Supabase 클라이언트
│   ├── auth.py                  # (미사용) OAuth 시도 후 보류
│   ├── data/activities.json     # 활동 데이터 (정적)
│   └── routers/
│       ├── events.py            # GET/POST/DELETE /events
│       ├── confirmed.py         # GET/POST /confirmed
│       ├── free_windows.py      # GET /free-windows
│       └── activities.py        # GET /activities
├── frontend/
│   ├── src/
│   │   ├── index.css            # CSS 변수 (핵심 디자인 시스템)
│   │   ├── pages/Home.jsx       # 메인 페이지 (전체 레이아웃)
│   │   ├── components/
│   │   │   ├── Calendar.jsx     # 월간 캘린더 그리드
│   │   │   ├── EventCard.jsx    # 일정 카드
│   │   │   ├── ActivityCard.jsx # 활동 추천 카드
│   │   │   ├── DatePopover.jsx  # 날짜 클릭 팝오버
│   │   │   └── Toast.jsx        # 토스트 알림
│   │   ├── supabaseClient.js    # Supabase 클라이언트 (MOCK_MODE 분기)
│   │   └── mockApi.js           # MOCK_MODE용 로컬 데이터
│   ├── public/privacy.html      # GPTs 공개용 개인정보처리방침
│   ├── .env                     # 로컬 환경변수 (gitignore)
│   └── vercel.json              # Vercel 배포 설정
├── supabase/
│   ├── config.toml              # Supabase CLI 설정
│   └── migrations/              # DB 마이그레이션 파일 (git 관리)
│       └── 20240101000000_initial_schema.sql
├── gpts/
│   ├── action_schema.json       # GPTs Actions 스키마 (JSON)
│   ├── action_schema.yaml       # GPTs Actions 스키마 (YAML)
│   ├── instruction.md           # GPTs Instructions 필드 내용
│   └── knowledge_activities.json # GPTs Knowledge 업로드용
├── railway.json                 # Railway 배포 설정
├── requirements.txt             # 루트 (NIXPACKS 감지용)
├── Procfile                     # web: uvicorn backend.main:app ...
└── CLAUDE.md                    # 이 파일
```

---

## 현재 설계 결정 사항 (변경 시 주의)

### 1. userId = "default-user" (하드코딩)
- GPTs Actions에서 Google OAuth를 구현하려다 포기
- **이유**: GPTs OAuth는 Authorization URL, Token URL, API hostname이 모두 같은 루트 도메인이어야 함. Google(accounts.google.com) + Railway(railway.app) = 도메인 불일치 → 불가
- 현재: 모든 API의 `userId` 기본값 = `"default-user"`, 프론트도 `USER_ID = "default-user"` 고정
- `backend/auth.py` 파일은 존재하지만 라우터에서 사용 안 함 (삭제해도 무방)

### 2. POST 응답 = HTTP 200 (201 아님)
- GPTs가 HTTP 201 응답을 에러로 처리함 (데이터는 저장되지만 GPTs가 읽지 못함)
- `events.py`, `confirmed.py` 모두 `status_code=200`
- `action_schema.json`도 POST 응답을 `"200"`으로 정의

### 3. 다크테마 디자인 시스템 (index.css)
```css
--bg: #0F0F0F       /* 최하위 배경 */
--bg-2: #161616     /* 카드 배경 */
--bg-3: #1E1E1E     /* 호버/인풋 배경 */
--accent: #F97316   /* 오렌지 강조색 */
--grade-s: #10B981  /* 에메랄드 (S등급) */
```
- html, body, #root → `height: 100%; overflow: hidden` (스크롤 없음)
- 왼쪽: 캘린더 (flex: 1), 오른쪽: 사이드바 (300px 고정)

### 4. 프론트 MOCK_MODE
- `frontend/.env`의 `VITE_MOCK_MODE=true/false`로 분기
- `true`: Supabase 연결 없이 mockApi.js 로컬 데이터 사용
- `false`: 실제 Supabase 연결 (현재 설정값)
- 로컬 개발 시 백엔드 없이 테스트하려면 `VITE_MOCK_MODE=true`로 변경

---

## DB 테이블 (Supabase)

```sql
-- events: 사용자 일정
id uuid PK | user_id text | date date | label text | created_at timestamptz

-- confirmed: GPTs가 확정한 활동
id uuid PK | user_id text | date date | activity text | grade text(S/A/B/C/D) | created_at timestamptz
```

Realtime 활성화됨 → 프론트에서 Supabase Realtime 구독으로 실시간 업데이트

---

## API 엔드포인트

| Method | Path | 주요 파라미터 |
|--------|------|-------------|
| GET | /health | - |
| POST | /events | body: `{user_id, date, label}` |
| GET | /events | `month=YYYY-MM`, `userId=default-user` |
| DELETE | /events/{id} | - |
| POST | /confirmed | body: `{user_id, date, activity, grade}` |
| GET | /confirmed | `month=YYYY-MM`, `userId=default-user` |
| GET | /free-windows | `month=YYYY-MM`, `userId=default-user` |
| GET | /activities | `region`, `season`, `grade` |

---

## 로컬 개발

```bash
# 백엔드
cd /Users/jay/Projects/brissy
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000

# 프론트엔드
cd /Users/jay/Projects/brissy/frontend
npm run dev
```

**환경변수** (`frontend/.env`):
```
VITE_MOCK_MODE=false
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_KEY=eyJ...
VITE_API_URL=http://localhost:8000
```

**백엔드 환경변수** (Railway Variables에만 있음, 로컬 .env 없음):
```
SUPABASE_URL=...
SUPABASE_KEY=...
```

---

## 배포

- **Railway** (백엔드): GitHub push → 자동 배포. `railway.json` 참고
- **Vercel** (프론트): GitHub push → 자동 배포. Root Directory: `frontend`
- Vercel Environment Variables에 `VITE_*` 변수 설정 필요

---

## GPTs 설정

- **Instructions**: `gpts/instruction.md` 내용 붙여넣기
- **Actions Schema**: `gpts/action_schema.json` 또는 `.yaml` 붙여넣기
- **서버 URL**: `https://web-production-2bc25.up.railway.app`
- **Knowledge**: `gpts/knowledge_activities.json` 업로드
- **Privacy Policy**: `https://brissy.vercel.app/privacy`
- GPTs는 일정 추가/조회 후 `https://brissy.vercel.app` 링크를 응답에 포함

---

## DB 마이그레이션 (Supabase CLI)

스키마 변경은 반드시 마이그레이션 파일로 관리. 대시보드에서 직접 수정 금지.

### 처음 세팅 (팀원 온보딩)
```bash
brew install supabase/tap/supabase   # CLI 설치 (또는 npm install -g supabase)
supabase link --project-ref <PROJECT_REF>   # Supabase 대시보드 → Settings → General → Reference ID
```

### 스키마 변경 시
```bash
supabase migration new <변경_이름>        # 새 마이그레이션 파일 생성
# supabase/migrations/<timestamp>_<이름>.sql 에 SQL 작성
supabase db push                         # 실제 DB에 적용
git add supabase/migrations/             # git 커밋
```

### 미적용 마이그레이션 확인
```bash
supabase migration list   # 로컬 vs 원격 적용 상태 비교
```

---

## 미해결 과제 (TODO)

- [ ] 사용자 인증 — userId를 사용자별로 분리하려면 API Key 방식 검토 (GPTs는 Bearer token 지원)
- [ ] Railway 슬립 방지 — 무료 플랜에서 비활성 시 슬립. `/health` 핑 크론 설정 가능
- [ ] 활동 데이터(`activities.json`) 관리 UI — 현재 파일 직접 수정 필요

---

## 주요 커밋 이력

- `e27bbbe` — design: dark theme with orange accent (현재 디자인)
- 이전: 인디고 테마 → 다크/오렌지로 전환
- 이전: Google OAuth 시도 → 실패 → default-user로 복귀
- 이전: Railway pip not found 에러 → 루트 requirements.txt로 해결
