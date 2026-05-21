# 🗓 Brissy — 월간 플래너

GPTs를 브레인으로 사용하는 월간 일정 관리 서비스.  
자연어로 일정을 등록하고, 빈 시간을 분석해 활동을 추천받는다.

**배포 주소**
- 프론트엔드: https://brissy.vercel.app
- 백엔드 API: https://web-production-2bc25.up.railway.app
- API 문서: https://web-production-2bc25.up.railway.app/docs

---

## 아키텍처 개요

```
사용자
 ├── GPTs 채팅  ──────────────────────────────┐
 │                                            ▼
 └── 웹 브라우저                         FastAPI (Railway)
      brissy.vercel.app                       │
      React + Vite (Vercel)  ─────────────────┤
                                              ▼
                                       Supabase (PostgreSQL)
                                       + Realtime
```

| 레이어 | 기술 | 역할 |
|--------|------|------|
| GPTs | ChatGPT Custom GPT | 자연어 → API 호출 |
| 프론트엔드 | React + Vite | 월간 캘린더 UI |
| 백엔드 | FastAPI (Python) | REST API 서버 |
| DB | Supabase (PostgreSQL) | 일정 데이터 저장 |
| 배포 | Railway + Vercel | 24시간 운영 |

---

## 프로젝트 구조

```
brissy/
├── backend/                    # FastAPI 백엔드
│   ├── main.py                 # 앱 진입점, CORS 설정, 라우터 등록
│   ├── supabase_client.py      # Supabase 클라이언트 초기화
│   ├── auth.py                 # 인증 유틸 (현재 미사용, 확장용)
│   ├── requirements.txt        # Python 의존성
│   ├── routers/
│   │   ├── events.py           # POST/GET /events, DELETE /events/{id}
│   │   ├── confirmed.py        # POST/GET /confirmed
│   │   ├── free_windows.py     # GET /free-windows (등급 계산 포함)
│   │   └── activities.py       # GET /activities (JSON 파일 기반)
│   └── data/
│       └── activities.json     # 활동 추천 데이터 (정적)
│
├── frontend/                   # React + Vite 프론트엔드
│   ├── src/
│   │   ├── main.jsx            # React 진입점
│   │   ├── index.css           # 전역 CSS 변수 및 기본 스타일
│   │   ├── App.jsx             # 루트 컴포넌트
│   │   ├── supabaseClient.js   # Supabase 클라이언트 (Realtime 구독)
│   │   ├── mockApi.js          # 로컬 테스트용 Mock API
│   │   ├── pages/
│   │   │   └── Home.jsx        # 메인 페이지 (캘린더 + 사이드바 레이아웃)
│   │   └── components/
│   │       ├── Calendar.jsx    # 월간 캘린더 (빈 날 등급 시각화)
│   │       ├── EventCard.jsx   # 일정 카드 (삭제 포함)
│   │       ├── ActivityCard.jsx# 활동 추천 카드 (확정 버튼 포함)
│   │       └── Toast.jsx       # 알림 토스트
│   ├── .env                    # 로컬 환경변수 (git 제외)
│   └── vercel.json             # Vercel 배포 설정
│
├── gpts/
│   ├── action_schema.json      # GPTs Actions용 OpenAPI 3.0 스키마
│   ├── action_schema.yaml      # 동일 스키마 YAML 버전
│   ├── instruction.md          # GPTs Instructions 필드에 붙여넣는 시스템 프롬프트
│   └── knowledge_activities.json # GPTs Knowledge 업로드용 활동 데이터
│
├── supabase_schema.sql         # DB 테이블 생성 SQL
├── railway.json                # Railway 배포 설정
├── requirements.txt            # 루트 (backend/requirements.txt 참조)
└── Procfile                    # Railway 시작 명령어
```

---

## DB 스키마

```sql
-- 일정 테이블
events (
  id         uuid PRIMARY KEY,
  user_id    text NOT NULL,        -- 사용자 구분자 (현재 "default-user")
  date       date NOT NULL,        -- YYYY-MM-DD
  label      text NOT NULL,        -- 일정 내용
  created_at timestamptz
)

-- 확정 활동 테이블
confirmed (
  id         uuid PRIMARY KEY,
  user_id    text NOT NULL,
  date       date NOT NULL,
  activity   text NOT NULL,        -- 활동명
  grade      text NOT NULL,        -- 빈 시간 등급 (S/A/B/C/D)
  created_at timestamptz
)
```

> `activities`(활동 추천)는 DB 없이 `backend/data/activities.json` 정적 파일로 관리

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| POST | `/events` | 일정 추가 |
| GET | `/events?month=YYYY-MM&userId=` | 월별 일정 조회 |
| DELETE | `/events/{id}` | 일정 삭제 |
| POST | `/confirmed` | 활동 확정 |
| GET | `/confirmed?month=YYYY-MM&userId=` | 월별 확정 조회 |
| GET | `/free-windows?month=YYYY-MM&userId=` | 빈 시간 창 조회 |
| GET | `/activities?grade=&region=&season=` | 활동 추천 조회 |

### 빈 시간 등급 기준
| 등급 | 조건 |
|------|------|
| S | 4일 이상 연속 빈 날 |
| A | 3일 연속 |
| B | 2일 연속 + 주말 포함 |
| C | 2일 연속 (평일만) |
| D | 1일 |

---

## 로컬 개발 환경 설정

### 1. 백엔드

```bash
# 의존성 설치 (conda 환경 기준)
pip install -r backend/requirements.txt

# 환경변수 설정
cp .env.example .env
# .env에 SUPABASE_URL, SUPABASE_KEY 입력

# 서버 실행
uvicorn backend.main:app --reload --port 8000
```

### 2. 프론트엔드

```bash
cd frontend
npm install

# 환경변수 설정
cp .env.example .env
# .env 항목:
# VITE_MOCK_MODE=true          ← true면 Mock 데이터로 백엔드 없이 테스트 가능
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_KEY=...
# VITE_API_URL=http://localhost:8000

npm run dev
# → http://localhost:5173
```

> `VITE_MOCK_MODE=true`로 설정하면 백엔드/Supabase 없이 프론트만 독립 실행 가능

---

## 환경변수 목록

### 백엔드 (Railway Variables)
| 변수 | 설명 |
|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_KEY` | Supabase anon key |
| `PORT` | Railway 자동 주입 |

### 프론트엔드 (Vercel Environment Variables)
| 변수 | 설명 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_KEY` | Supabase anon key |
| `VITE_API_URL` | 백엔드 URL (Railway 주소) |
| `VITE_MOCK_MODE` | `true` = Mock 모드, `false` = 실서버 연결 |

---

## GPTs 설정

GPTs는 `gpts/` 폴더의 파일로 구성된다.

1. **instruction.md** — GPTs Configure → Instructions에 붙여넣기
2. **action_schema.json** — Actions → Create new action → Schema에 붙여넣기
   - `servers.url`을 Railway 배포 주소로 교체
3. **knowledge_activities.json** — Knowledge에 업로드
4. **Authentication** — 현재 None (미인증), `userId`는 요청 파라미터로 전달

### GPTs 자연어 → API 흐름 예시
```
"5월 15일 팀 회의 있어"
  → POST /events { date: "2026-05-15", label: "팀 회의" }

"이번 달 빈 시간 알려줘"
  → GET /free-windows?month=2026-05

"서울에서 할 수 있는 거 추천해줘"
  → GET /free-windows → GET /activities?grade=S&region=서울&season=spring

"그거로 확정할게"
  → POST /confirmed
```

---

## 배포 흐름

```
git push origin main
    │
    ├── Railway (백엔드 자동 재배포)
    │     NIXPACKS로 Python 감지 → pip install → uvicorn 실행
    │
    └── Vercel (프론트엔드 자동 재배포)
          npm run build → dist/ → CDN 배포
```

---

## 주요 설계 결정

- **GPTs POST 응답은 200** — GPTs가 HTTP 201을 에러로 처리하는 버그가 있어 모든 POST를 200으로 통일
- **활동 데이터는 정적 JSON** — 자주 바뀌지 않으므로 DB 대신 파일로 관리. 추가/수정은 `backend/data/activities.json` 직접 편집
- **Realtime 구독** — Supabase Realtime으로 GPTs에서 일정 추가 시 웹 캘린더가 자동 갱신
- **VITE_MOCK_MODE** — 백엔드 없이 프론트 개발 가능하도록 Mock 레이어 분리
