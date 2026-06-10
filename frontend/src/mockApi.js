import dayjs from "dayjs";

// ── In-memory store ──────────────────────────────────────────────
let _events = [
  { id: "e1", user_id: "demo-user", date: "2026-05-02", label: "팀 주간 회의" },
  { id: "e2", user_id: "demo-user", date: "2026-05-07", label: "치과 예약" },
  { id: "e3", user_id: "demo-user", date: "2026-05-08", label: "생일 파티" },
  { id: "e4", user_id: "demo-user", date: "2026-05-14", label: "프로젝트 발표" },
  { id: "e5", user_id: "demo-user", date: "2026-05-20", label: "부모님 방문" },
  { id: "e6", user_id: "demo-user", date: "2026-05-21", label: "부모님 방문" },
  { id: "e7", user_id: "demo-user", date: "2026-05-27", label: "월말 결산" },
];

let _confirmed = [
  { id: "c1", user_id: "demo-user", date: "2026-05-09", activity: "한강 자전거 라이딩", grade: "B" },
];

// ── Free-windows 계산 (백엔드 로직 JS 포팅) ──────────────────────
function gradeWindow(days) {
  const n = days.length;
  if (n >= 4) return "S";
  if (n === 3) return "A";
  if (n === 2) {
    const hasWeekend = days.some((d) => dayjs(d).day() === 0 || dayjs(d).day() === 6);
    return hasWeekend ? "B" : "C";
  }
  return "D";
}

function groupConsecutive(dates) {
  if (!dates.length) return [];
  const groups = [[dates[0]]];
  for (let i = 1; i < dates.length; i++) {
    const prev = dayjs(dates[i - 1]);
    const cur = dayjs(dates[i]);
    if (cur.diff(prev, "day") === 1) {
      groups[groups.length - 1].push(dates[i]);
    } else {
      groups.push([dates[i]]);
    }
  }
  return groups;
}

function calcFreeWindows(month, events) {
  const base = dayjs(`${month}-01`);
  const daysInMonth = base.daysInMonth();
  const allDays = Array.from({ length: daysInMonth }, (_, i) =>
    base.add(i, "day").format("YYYY-MM-DD")
  );
  const busySet = new Set(events.map((e) => e.date));
  const freeDays = allDays.filter((d) => !busySet.has(d));
  const groups = groupConsecutive(freeDays);
  const GRADE_ORDER = ["S", "A", "B", "C", "D"];
  return groups
    .map((g) => ({
      dates: g,
      duration_days: g.length,
      grade: gradeWindow(g),
      has_weekend: g.some((d) => {
        const dow = dayjs(d).day();
        return dow === 0 || dow === 6;
      }),
    }))
    .sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade));
}

// ── Mock API functions ────────────────────────────────────────────
export async function apiFetchEvents(month) {
  const [year, mon] = month.split("-").map(Number);
  return _events.filter((e) => {
    const d = dayjs(e.date);
    return d.year() === year && d.month() + 1 === mon;
  });
}

export async function apiCreateEvent(body) {
  const newEvent = { ...body, id: `e${Date.now()}` };
  _events = [..._events, newEvent];
  return newEvent;
}

export async function apiDeleteEvent(id) {
  _events = _events.filter((e) => e.id !== id);
}

export async function apiFetchConfirmed(month) {
  const [year, mon] = month.split("-").map(Number);
  return _confirmed.filter((c) => {
    const d = dayjs(c.date);
    return d.year() === year && d.month() + 1 === mon;
  });
}

export async function apiCreateConfirmed(body) {
  const newConf = { ...body, id: `c${Date.now()}` };
  _confirmed = [..._confirmed, newConf];
  return newConf;
}

export async function apiFetchFreeWindows(month) {
  const eventsThisMonth = await apiFetchEvents(month);
  return { month, free_windows: calcFreeWindows(month, eventsThisMonth) };
}

const MOCK_ACTIVITIES = [
  {
    id: "seoul-hangang-1d",
    title: "한강 자전거 라이딩",
    region: "서울",
    grade: ["D", "C"],
    season: ["spring", "summer", "fall"],
    duration_days: 1,
    tags: ["자연", "운동", "커플"],
    description: "한강 자전거도로 따라 여의도~광나루 왕복 코스",
  },
  {
    id: "seoul-bukchon-1d",
    title: "북촌·인사동 문화 산책",
    region: "서울",
    grade: ["D"],
    season: ["spring", "fall", "winter"],
    duration_days: 1,
    tags: ["문화", "혼자", "사진"],
    description: "북촌 한옥마을과 인사동 거리를 걸으며 전통 문화 체험",
  },
  {
    id: "seoul-city-2d",
    title: "서울 시티 위크엔드",
    region: "서울",
    grade: ["B", "C"],
    season: ["spring", "fall"],
    duration_days: 2,
    tags: ["문화", "커플", "도시"],
    description: "첫날 경복궁·삼청동, 둘째날 남산·이태원 코스",
  },
  {
    id: "seoul-3d-citytrip",
    title: "서울 심층 탐방 2박 3일",
    region: "서울",
    grade: ["A"],
    season: ["spring", "fall"],
    duration_days: 3,
    tags: ["문화", "도시", "미식"],
    description: "성수·강남·종로 권역별 딥다이브. 숨은 맛집·갤러리 포함",
  },
  {
    id: "busan-haeundae-1d",
    title: "해운대·광안리 당일 해변",
    region: "부산",
    grade: ["D", "C"],
    season: ["spring", "summer", "fall"],
    duration_days: 1,
    tags: ["바다", "사진", "혼자"],
    description: "해운대에서 광안리까지 해변 산책 및 카페 투어",
  },
  {
    id: "busan-2d-weekend",
    title: "부산 핵심 1박 2일",
    region: "부산",
    grade: ["B", "C"],
    season: ["spring", "summer", "fall"],
    duration_days: 2,
    tags: ["바다", "미식", "커플"],
    description: "해운대·남포동·송정해수욕장 코스",
  },
  {
    id: "jeju-olle-1d",
    title: "제주 올레길 당일 트레킹",
    region: "제주",
    grade: ["D", "C"],
    season: ["spring", "fall"],
    duration_days: 1,
    tags: ["자연", "혼자", "운동"],
    description: "올레 7코스(외돌개~월평) 당일 트레킹",
  },
  {
    id: "jeju-3d-full",
    title: "제주 핵심 2박 3일",
    region: "제주",
    grade: ["A"],
    season: ["spring", "summer", "fall"],
    duration_days: 3,
    tags: ["자연", "미식", "가족"],
    description: "한라산·올레길·카멜리아힐·제주시 맛집 투어",
  },
  {
    id: "gangwon-gyeongpo-1d",
    title: "경포대·강릉 해변 당일",
    region: "강원",
    grade: ["D", "C"],
    season: ["summer", "spring"],
    duration_days: 1,
    tags: ["바다", "커플", "카페"],
    description: "경포대 해변 + 강릉 커피거리 투어",
  },
  {
    id: "gyeongju-history-1d",
    title: "경주 역사유적 당일 투어",
    region: "경주",
    grade: ["D", "C"],
    season: ["spring", "fall"],
    duration_days: 1,
    tags: ["문화", "역사", "가족"],
    description: "불국사·석굴암·대릉원 핵심 코스",
  },
  {
    id: "jeonju-hanok-1d",
    title: "전주 한옥마을 당일",
    region: "전주",
    grade: ["D", "C"],
    season: ["spring", "fall"],
    duration_days: 1,
    tags: ["문화", "미식", "사진"],
    description: "경기전·한옥마을 골목·전동성당·비빔밥 맛집 코스",
  },
];

const TRIP_TYPE_TAGS = {
  자연: ["자연", "등산", "운동", "계곡", "드라이브", "스포츠"],
  문화: ["문화", "역사", "도시", "사진"],
  미식: ["미식", "카페"],
  휴양: ["휴식", "바다", "야경", "가족", "커플", "혼자"],
};

export async function apiFetchActivities({ grade, region, season, max_days, trip_type }) {
  let items = [...MOCK_ACTIVITIES];
  if (grade)     items = items.filter((a) => a.grade.includes(grade));
  if (region)    items = items.filter((a) => a.region === region);
  if (season)    items = items.filter((a) => a.season.includes(season));
  if (max_days)  items = items.filter((a) => a.duration_days <= max_days);
  if (trip_type && TRIP_TYPE_TAGS[trip_type]) {
    const target = TRIP_TYPE_TAGS[trip_type];
    items = items.filter((a) => a.tags.some((t) => target.includes(t)));
  }
  return { activities: items, total: items.length };
}
