import { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { supabase } from "../supabaseClient";
import Calendar from "../components/Calendar";
import EventCard from "../components/EventCard";
import ActivityCard from "../components/ActivityCard";
import Toast from "../components/Toast";
import DatePopover from "../components/DatePopover";
import {
  apiFetchEvents, apiCreateEvent, apiDeleteEvent,
  apiFetchConfirmed, apiCreateConfirmed,
  apiFetchFreeWindows, apiFetchActivities,
} from "../mockApi";

dayjs.locale("ko");

const MOCK = import.meta.env.VITE_MOCK_MODE === "true";
const API  = import.meta.env.VITE_API_URL || "http://localhost:8000";
const UID  = "default-user";

const GRADE_COLOR = { S:"#047857", A:"#059669", B:"#10B981", C:"#34D399", D:"#6EE7B7" };

export default function Home() {
  const [month, setMonth]         = useState(dayjs().format("YYYY-MM"));
  const [events, setEvents]       = useState([]);
  const [confirmed, setConfirmed] = useState([]);
  const [windows, setWindows]     = useState([]);
  const [activities, setActs]     = useState([]);
  const [label, setLabel]         = useState("");
  const [date, setDate]           = useState(dayjs().format("YYYY-MM-DD"));
  const [region, setRegion]       = useState("서울");
  const [season, setSeason]       = useState("spring");
  const [tripType, setTripType]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [popoverInfo, setPopoverInfo]   = useState(null);

  const eventsRef = useRef(null);
  const notify = (msg, type="success") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (MOCK) {
        const [e,c,w] = await Promise.all([
          apiFetchEvents(month), apiFetchConfirmed(month), apiFetchFreeWindows(month),
        ]);
        setEvents(e); setConfirmed(c); setWindows(w.free_windows||[]);
      } else {
        const [eR,cR,wR] = await Promise.all([
          fetch(`${API}/events?month=${month}&userId=${UID}`),
          fetch(`${API}/confirmed?month=${month}&userId=${UID}`),
          fetch(`${API}/free-windows?month=${month}&userId=${UID}`),
        ]);
        setEvents(await eR.json());
        setConfirmed(await cR.json());
        setWindows((await wR.json()).free_windows||[]);
      }
    } finally { setLoading(false); }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (MOCK) return;
    const a = supabase.channel("ev").on("postgres_changes",{event:"*",schema:"public",table:"events"},load).subscribe();
    const b = supabase.channel("cf").on("postgres_changes",{event:"*",schema:"public",table:"confirmed"},load).subscribe();
    return () => { supabase.removeChannel(a); supabase.removeChannel(b); };
  }, [load]);

  async function addEvent(e) {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    try {
      if (MOCK) await apiCreateEvent({ user_id:UID, date, label:label.trim() });
      else {
        const r = await fetch(`${API}/events`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ user_id:UID, date, label:label.trim() }),
        });
        if (!r.ok) throw 0;
      }
      setLabel(""); load(); notify("📅 일정이 추가됐어요!");
    } catch { notify("추가 실패", "error"); }
    finally { setSaving(false); }
  }

  async function del(id) {
    try {
      if (MOCK) await apiDeleteEvent(id);
      else await fetch(`${API}/events/${id}`, { method:"DELETE" });
      load(); notify("🗑 삭제됐어요");
    } catch { notify("삭제 실패","error"); }
  }

  async function recommend(overrideWindow = null) {
    const w        = overrideWindow || windows[0];
    const grade    = w?.grade;
    const max_days = w?.duration_days;
    try {
      if (MOCK) {
        const d = await apiFetchActivities({ grade, region, season, max_days, trip_type: tripType });
        setActs(d.activities||[]);
      } else {
        const p = new URLSearchParams({ region, season });
        if (grade)    p.append("grade", grade);
        if (max_days) p.append("max_days", max_days);
        if (tripType) p.append("trip_type", tripType);
        setActs(((await (await fetch(`${API}/activities?${p}`)).json()).activities)||[]);
      }
    } catch { notify("추천 실패","error"); }
  }

  const recommendRef = useRef(null);

  function findTripForWindow(w) {
    // 빈 날 창 카드의 "여행 찾기" 버튼 클릭 시
    recommend(w);
    setTimeout(() => recommendRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 100);
  }

  async function confirm(act) {
    const d = windows[0]?.dates[0] || dayjs().format("YYYY-MM-DD");
    const g = windows[0]?.grade    || "D";
    try {
      if (MOCK) await apiCreateConfirmed({ user_id:UID, date:d, activity:act.title, grade:g });
      else await fetch(`${API}/confirmed`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ user_id:UID, date:d, activity:act.title, grade:g }),
      });
      setActs([]); load(); notify(`🎉 "${act.title}" 확정됐어요!`);
    } catch { notify("확정 실패","error"); }
  }

  function handleDateClick(date, el) {
    setDate(date);
    setSelectedDate(date);
    setPopoverInfo({ date, rect: el.getBoundingClientRect() });
    setTimeout(() => eventsRef.current?.scrollIntoView({ behavior:"smooth", block:"nearest" }), 100);
  }

  function closePopover() {
    setPopoverInfo(null);
    setSelectedDate(null);
  }

  const ml       = dayjs(`${month}-01`).format("YYYY년 M월");
  const canSubmit = !saving && !!label.trim();
  const topGrade  = windows[0]?.grade;
  const busyDays  = new Set(events.map(e => e.date)).size;
  const freeDays  = windows.reduce((s, w) => s + w.duration_days, 0);

  // D-day: 오늘 이후 가장 가까운 확정 여행
  const today    = dayjs().format("YYYY-MM-DD");
  const nextTrip = confirmed.filter(c => c.date >= today).sort((a,b) => a.date.localeCompare(b.date))[0];
  const dday     = nextTrip ? dayjs(nextTrip.date).diff(dayjs(), "day") : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"var(--bg)" }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* ── 헤더 ── */}
      <header style={{
        height:"var(--header)", flexShrink:0,
        display:"flex", alignItems:"center", gap:16, padding:"0 24px",
        background:"var(--bg-2)",
        borderBottom:"1.5px solid var(--border)",
        position:"relative", zIndex:10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{
            width:34, height:34, borderRadius:11,
            background:"var(--accent)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:17, boxShadow:"0 2px 10px rgba(124,111,247,.35)",
          }}>🗓</div>
          <span style={{ fontWeight:800, fontSize:17, color:"var(--text-1)", letterSpacing:"-.03em" }}>Brissy</span>
        </div>

        <div style={{ width:1, height:20, background:"var(--border)", marginLeft:4 }}/>

        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <NavBtn onClick={()=>setMonth(dayjs(`${month}-01`).subtract(1,"month").format("YYYY-MM"))}>‹</NavBtn>
          <span style={{ fontSize:15, fontWeight:700, color:"var(--text-1)", minWidth:110, textAlign:"center" }}>{ml}</span>
          <NavBtn onClick={()=>setMonth(dayjs(`${month}-01`).add(1,"month").format("YYYY-MM"))}>›</NavBtn>
          <NavBtn onClick={()=>setMonth(dayjs().format("YYYY-MM"))} small>오늘</NavBtn>
        </div>

        {loading && <span style={{ fontSize:11, color:"var(--text-3)", fontStyle:"italic" }}>불러오는 중…</span>}

        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {dday !== null && (
            <HeaderChip color="#7C6FF7" bg="rgba(124,111,247,.1)" border="rgba(124,111,247,.25)">
              🗺️ {dday === 0 ? "오늘 여행!" : `D-${dday}`}
            </HeaderChip>
          )}
          {topGrade && (
            <HeaderChip color={GRADE_COLOR[topGrade]} bg={`${GRADE_COLOR[topGrade]}12`} border={`${GRADE_COLOR[topGrade]}30`}>
              ✨ 최우선 {topGrade}등급
            </HeaderChip>
          )}
          {confirmed.length > 0 && (
            <HeaderChip color="#2563EB" bg="rgba(37,99,235,.08)" border="rgba(37,99,235,.2)">
              ✓ 확정 {confirmed.length}개
            </HeaderChip>
          )}
        </div>
      </header>

      {/* ── 바디 ── */}
      <div style={{ flex:1, display:"flex", minHeight:0, padding:"16px 20px 20px", gap:16 }}>

        {/* 캘린더 */}
        <div style={{
          flex:1, minWidth:0,
          borderRadius:"var(--r)", overflow:"hidden",
          border:"1.5px solid var(--border)",
          boxShadow:"0 4px 24px rgba(124,111,247,.08)",
        }}>
          <Calendar
            month={month} events={events} confirmed={confirmed} freeWindows={windows}
            onDateClick={handleDateClick} selectedDate={selectedDate}
          />
        </div>

        {/* 날짜 팝오버 */}
        {popoverInfo && (
          <DatePopover
            info={popoverInfo}
            events={events.filter(e => e.date === popoverInfo.date)}
            confirmed={confirmed.find(c => c.date === popoverInfo.date)}
            grade={windows.find(w => w.dates.includes(popoverInfo.date))?.grade}
            onClose={closePopover}
            onAddEvent={closePopover}
            onDelete={del}
          />
        )}

        {/* ── 사이드바 ── */}
        <div style={{
          width:360, flexShrink:0,
          display:"flex", flexDirection:"column",
          borderRadius:"var(--r)", overflow:"hidden",
          border:"1.5px solid var(--border)",
          boxShadow:"0 4px 24px rgba(124,111,247,.08)",
          background:"var(--bg-2)",
        }}>

          {/* 스탯 위젯 (고정) */}
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10,
            padding:"16px 16px 14px",
            borderBottom:"1.5px solid var(--border)",
            flexShrink:0,
          }}>
            <MiniStat
              value={busyDays} label="바쁜 날"
              color="#D97706" bg="rgba(217,119,6,.08)" border="rgba(217,119,6,.18)"
            />
            <MiniStat
              value={freeDays} label="자유 시간" unit="일"
              color="#047857" bg="rgba(4,120,87,.08)" border="rgba(4,120,87,.18)"
            />
            <MiniStat
              value={confirmed.length} label="확정 활동"
              color="#2563EB" bg="rgba(37,99,235,.08)" border="rgba(37,99,235,.18)"
            />
          </div>

          {/* 스크롤 영역 */}
          <div style={{ flex:1, overflowY:"auto" }}>

            {/* ── 일정 추가 ── */}
            <div style={{ padding:"0 16px 20px", background:"var(--bg-2)" }}>
              <SectionHeader icon="✏️" title="일정 추가" />
              <form onSubmit={addEvent}>
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <label style={labelSt}>날짜</label>
                    <input
                      type="date" value={date} onChange={e=>setDate(e.target.value)}
                      style={inp}
                      onFocus={e=>{ e.target.style.borderColor="var(--accent)"; e.target.style.background="var(--bg-2)"; }}
                      onBlur={e=>{ e.target.style.borderColor="var(--border)"; e.target.style.background="var(--bg-3)"; }}
                    />
                  </div>
                  <div style={{ flex:2 }}>
                    <label style={labelSt}>내용</label>
                    <input
                      type="text" placeholder="일정 내용을 입력하세요…" value={label}
                      onChange={e=>setLabel(e.target.value)} maxLength={50}
                      style={inp}
                      onFocus={e=>{ e.target.style.borderColor="var(--accent)"; e.target.style.background="var(--bg-2)"; }}
                      onBlur={e=>{ e.target.style.borderColor="var(--border)"; e.target.style.background="var(--bg-3)"; }}
                    />
                  </div>
                </div>
                <button type="submit" disabled={!canSubmit} style={{
                  width:"100%", padding:"10px",
                  background: canSubmit ? "var(--accent)" : "var(--bg-3)",
                  color: canSubmit ? "#fff" : "var(--text-3)",
                  border: canSubmit ? "none" : "1.5px solid var(--border)",
                  borderRadius:"var(--rs)", fontSize:13, fontWeight:700,
                  transition:"all .2s", cursor: canSubmit ? "pointer" : "not-allowed",
                  boxShadow: canSubmit ? "0 2px 10px rgba(124,111,247,.25)" : "none",
                }}
                onMouseEnter={e=>{ if(canSubmit){ e.currentTarget.style.opacity=".88"; e.currentTarget.style.transform="translateY(-1px)"; }}}
                onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="translateY(0)"; }}
                >{saving ? "추가 중…" : "✚ 추가하기"}</button>
              </form>
            </div>

            <Divider />

            {/* ── 이번 달 일정 ── */}
            <div ref={eventsRef} style={{ padding:"0 16px 20px", background:"var(--bg-2)" }}>
              <SectionHeader icon="📅" title="이번 달 일정" count={events.length} />
              {events.length === 0
                ? <Empty icon="📭" text="등록된 일정이 없어요" sub="위에서 일정을 추가해보세요" />
                : events.map(ev => <EventCard key={ev.id} event={ev} onDelete={del} />)
              }
            </div>

            <Divider />

            {/* ── 빈 날 창 ── */}
            <div style={{ padding:"0 16px 20px", background:"var(--bg-2)" }}>
              <SectionHeader icon="✨" title="빈 날 창" count={windows.length} />
              {windows.length === 0
                ? <Empty icon="🌿" text="빈 날이 없어요" sub="일정을 추가하면 자동으로 계산됩니다" />
                : windows.map((w, i) => (
                  <div key={i} style={{
                    padding:"12px 14px", marginBottom:8,
                    background: i===0 ? `${GRADE_COLOR[w.grade]}08` : "var(--bg-3)",
                    border:`1.5px solid ${i===0 ? GRADE_COLOR[w.grade]+"40" : "var(--border)"}`,
                    borderRadius:"var(--rs)",
                    display:"flex", alignItems:"center", gap:12,
                    position:"relative", overflow:"hidden",
                  }}>
                    {i===0 && (
                      <div style={{
                        position:"absolute", top:0, left:0, right:0, height:3,
                        background:`linear-gradient(90deg, ${GRADE_COLOR[w.grade]}, ${GRADE_COLOR[w.grade]}50)`,
                      }} />
                    )}
                    <div style={{
                      width:38, height:38, borderRadius:11, flexShrink:0,
                      background:`${GRADE_COLOR[w.grade]}15`,
                      border:`1.5px solid ${GRADE_COLOR[w.grade]}30`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:14, fontWeight:800, color:GRADE_COLOR[w.grade],
                    }}>{w.grade}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--text-1)" }}>
                        {w.dates[0]}{w.dates.length>1 ? ` ~ ${w.dates[w.dates.length-1]}` : ""}
                      </div>
                      <div style={{ fontSize:11, color:"var(--text-3)", marginTop:3, display:"flex", gap:8 }}>
                        <span>📆 {w.duration_days}일</span>
                        {w.has_weekend && <span style={{ color:"#3B82F6" }}>🏖 주말 포함</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => findTripForWindow(w)}
                      style={{
                        flexShrink:0, padding:"6px 10px",
                        background:"var(--accent-bg)", color:"var(--accent)",
                        border:"1.5px solid var(--accent)", borderRadius:"var(--rs)",
                        fontSize:11, fontWeight:700, cursor:"pointer",
                        transition:"all .15s", whiteSpace:"nowrap",
                      }}
                      onMouseEnter={e=>{ e.currentTarget.style.background="var(--accent)"; e.currentTarget.style.color="#fff"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background="var(--accent-bg)"; e.currentTarget.style.color="var(--accent)"; }}
                    >여행 찾기 →</button>
                  </div>
                ))
              }
            </div>

            <Divider />

            {/* ── 추천 활동 ── */}
            <div ref={recommendRef} style={{ padding:"0 16px 24px", background:"var(--bg-2)" }}>
              <SectionHeader icon="🧭" title="추천 활동" />

              {/* 여행 타입 필터 */}
              <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
                {[
                  [null,   "전체"],
                  ["자연", "🌿 자연"],
                  ["문화", "🏛️ 문화"],
                  ["미식", "🍽️ 미식"],
                  ["휴양", "🏖️ 휴양"],
                ].map(([val, label]) => (
                  <button key={String(val)} onClick={() => setTripType(val)} style={{
                    padding:"5px 12px",
                    background: tripType === val ? "var(--accent)" : "var(--bg-3)",
                    color: tripType === val ? "#fff" : "var(--text-2)",
                    border: tripType === val ? "none" : "1.5px solid var(--border)",
                    borderRadius:99, fontSize:11, fontWeight:600,
                    cursor:"pointer", transition:"all .15s",
                  }}>{label}</button>
                ))}
              </div>

              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <label style={labelSt}>📍 지역</label>
                  <select value={region} onChange={e=>setRegion(e.target.value)} style={inp}
                    onFocus={e=>{ e.target.style.borderColor="var(--accent)"; }}
                    onBlur={e=>{ e.target.style.borderColor="var(--border)"; }}
                  >
                    {["서울","부산","제주","강원","경주","전주"].map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={labelSt}>🌤 계절</label>
                  <select value={season} onChange={e=>setSeason(e.target.value)} style={inp}
                    onFocus={e=>{ e.target.style.borderColor="var(--accent)"; }}
                    onBlur={e=>{ e.target.style.borderColor="var(--border)"; }}
                  >
                    {[["spring","🌸 봄"],["summer","☀️ 여름"],["fall","🍂 가을"],["winter","❄️ 겨울"]].map(([v,l])=>(
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={recommend} style={{
                width:"100%", marginBottom:14, padding:"10px",
                background:"var(--accent)", color:"#fff", border:"none",
                borderRadius:"var(--rs)", fontSize:13, fontWeight:700,
                boxShadow:"0 2px 10px rgba(124,111,247,.25)",
                transition:"opacity .15s, transform .1s",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.opacity=".88"; e.currentTarget.style.transform="translateY(-1px)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="translateY(0)"; }}
              >🔍 추천 받기</button>

              {activities.length === 0
                ? <Empty icon="🗺️" text="추천 활동" sub={"지역과 계절을 선택하고\n추천 받기를 눌러보세요"} />
                : activities.map(a => <ActivityCard key={a.id} activity={a} onConfirm={confirm} />)
              }
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 서브 컴포넌트 ── */

function NavBtn({ onClick, children, small }) {
  return (
    <button onClick={onClick} style={{
      background:"var(--bg-3)", border:"1.5px solid var(--border)", borderRadius:99,
      padding: small ? "5px 13px" : "5px 12px",
      fontSize: small ? 12 : 16,
      color:"var(--text-2)", fontWeight: small ? 700 : 400, lineHeight:1,
      transition:"all .15s",
    }}
    onMouseEnter={e=>{ e.currentTarget.style.background="var(--accent-bg)"; e.currentTarget.style.borderColor="var(--accent)"; e.currentTarget.style.color="var(--accent)"; }}
    onMouseLeave={e=>{ e.currentTarget.style.background="var(--bg-3)"; e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text-2)"; }}
    >{children}</button>
  );
}

function HeaderChip({ color, bg, border, children }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:5,
      background: bg, border:`1.5px solid ${border}`,
      borderRadius:99, padding:"5px 12px",
      fontSize:12, fontWeight:600, color,
    }}>{children}</div>
  );
}

function MiniStat({ value, label, unit="", color, bg, border }) {
  return (
    <div style={{
      background: bg, border:`1.5px solid ${border}`,
      borderRadius:14, padding:"12px 8px", textAlign:"center",
    }}>
      <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>
        {value}<span style={{ fontSize:12, fontWeight:600 }}>{unit}</span>
      </div>
      <div style={{ fontSize:10, color:"var(--text-3)", marginTop:5, fontWeight:600 }}>{label}</div>
    </div>
  );
}

function SectionHeader({ icon, title, count }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:7,
      padding:"18px 0 12px",
      borderBottom:"1px solid var(--border)",
      marginBottom:14,
    }}>
      <span style={{ fontSize:13 }}>{icon}</span>
      <span style={{ fontSize:12, fontWeight:700, color:"var(--text-2)", letterSpacing:".04em", textTransform:"uppercase" }}>{title}</span>
      {count != null && count > 0 && (
        <span style={{
          marginLeft:"auto",
          background:"var(--accent-bg)", color:"var(--accent)",
          borderRadius:99, padding:"2px 9px",
          fontSize:11, fontWeight:700,
        }}>{count}</span>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ height:8, background:"var(--bg)", marginLeft:-16, marginRight:-16 }} />;
}

function Empty({ icon, text, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"32px 16px" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:13, fontWeight:700, color:"var(--text-2)", marginBottom:6 }}>{text}</div>
      {sub && <div style={{ fontSize:12, lineHeight:1.75, color:"var(--text-3)", whiteSpace:"pre-line" }}>{sub}</div>}
    </div>
  );
}

const inp = {
  display:"block", width:"100%",
  border:"1.5px solid var(--border)", borderRadius:"var(--rs)",
  padding:"9px 11px", fontSize:13, outline:"none",
  background:"var(--bg-3)", color:"var(--text-1)",
  transition:"border-color .15s, background .15s",
  boxSizing:"border-box",
};

const labelSt = {
  fontSize:11, fontWeight:600, color:"var(--text-3)",
  display:"block", marginBottom:5, letterSpacing:".03em",
};
