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

const GRADE_COLOR = { S:"#137333", A:"#188038", B:"#1e8e3e", C:"#34a853", D:"#81c784" };

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
  const [tab, setTab]                   = useState("events");

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

  const today    = dayjs().format("YYYY-MM-DD");
  const nextTrip = confirmed.filter(c => c.date >= today).sort((a,b) => a.date.localeCompare(b.date))[0];
  const dday     = nextTrip ? dayjs(nextTrip.date).diff(dayjs(), "day") : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#f8f9fa" }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      <header style={{
        height:"var(--header)", flexShrink:0,
        display:"flex", alignItems:"center", gap:20, padding:"0 24px",
        background:"#ffffff",
        borderBottom:"1px solid var(--border)",
        position:"relative", zIndex:10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:32, height:32, borderRadius:4,
            background:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, color:"#ffffff", fontWeight:700,
          }}>31</div>
          <span style={{ fontWeight:400, fontSize:20, color:"var(--text-1)", fontFamily:"'Google Sans', Roboto, Arial, sans-serif", letterSpacing:"-0.02em" }}>Brissy</span>
        </div>

        <div style={{ width:1, height:22, background:"var(--border)", margin:"0 4px" }}/>

        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <NavBtn onClick={()=>setMonth(dayjs().format("YYYY-MM"))} small>오늘</NavBtn>
          <NavBtn onClick={()=>setMonth(dayjs(`${month}-01`).subtract(1,"month").format("YYYY-MM"))}>‹</NavBtn>
          <NavBtn onClick={()=>setMonth(dayjs(`${month}-01`).add(1,"month").format("YYYY-MM"))}>›</NavBtn>
          <span style={{ fontSize:18, fontWeight:400, color:"var(--text-1)", marginLeft:12, minWidth:115 }}>{ml}</span>
        </div>

        {loading && <span style={{ fontSize:12, color:"var(--text-3)", fontStyle:"italic" }}>불러오는 중…</span>}

        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          {dday !== null && (
            <StatChip color="#7c6ff7" bg="rgba(124,111,247,0.08)" border="rgba(124,111,247,0.25)">
              🗺️ {dday === 0 ? "오늘 여행!" : `D-${dday}`}
            </StatChip>
          )}
          {events.length > 0 && (
            <StatChip color="#b06000" bg="#fef7e0" border="rgba(249,171,0,0.3)">
              📅 일정 {events.length}
            </StatChip>
          )}
          {topGrade && (
            <StatChip color={GRADE_COLOR[topGrade]} bg="#e6f4ea" border="rgba(24,128,56,0.3)">
              ✨ 최우선 {topGrade}등급
            </StatChip>
          )}
          {confirmed.length > 0 && (
            <StatChip color="#1a73e8" bg="#e8f0fe" border="rgba(26,115,232,0.3)">
              ✓ 확정 {confirmed.length}
            </StatChip>
          )}
        </div>
      </header>

      <div style={{ flex:1, display:"flex", minHeight:0, padding:"16px", gap:16 }}>
        <div style={{ flex:1, minWidth:0, borderRadius:"var(--r)", overflow:"hidden", border:"1px solid var(--border)", background:"#ffffff" }}>
          <Calendar month={month} events={events} confirmed={confirmed} freeWindows={windows} onDateClick={handleDateClick} selectedDate={selectedDate} />
        </div>

        {popoverInfo && (
          <DatePopover
            info={popoverInfo}
            events={events.filter(e => e.date === popoverInfo.date)}
            confirmed={confirmed.find(c => c.date === popoverInfo.date)}
            grade={windows.find(w => w.dates.includes(popoverInfo.date))?.grade}
            onClose={closePopover}
            onAddEvent={() => { setTab("events"); closePopover(); }}
            onDelete={del}
          />
        )}

        <div style={{ width:314, flexShrink:0, display:"flex", flexDirection:"column", borderRadius:"var(--r)", overflow:"hidden", border:"1px solid var(--border)", background:"#ffffff" }}>
          <form onSubmit={addEvent} style={{ padding:"16px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
            <label style={labelStyle}>날짜</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp, marginBottom:10}} />
            <label style={labelStyle}>내용</label>
            <input type="text" placeholder="일정 내용을 입력하세요…" value={label} onChange={e=>setLabel(e.target.value)} maxLength={50} style={{...inp, marginBottom:10}} />
            <button type="submit" disabled={!canSubmit} style={{ width:"100%", padding:"10px", background: canSubmit ? "var(--accent)" : "var(--bg-3)", color: canSubmit ? "#fff" : "var(--text-3)", border:"none", borderRadius:"var(--rs)", fontSize:13, fontWeight:500, cursor: canSubmit ? "pointer" : "not-allowed" }}>{saving ? "추가 중…" : "✚ 추가하기"}</button>
          </form>

          <div style={{ display:"flex", padding:"0 12px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
            {[ ["events", "📅", "일정"], ["windows", "✨", "빈 날"], ["activities", "🧭", "추천"], ["summary", "📊", "요약"] ].map(([k, icon, l]) => (
              <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:"12px 2px", background:"transparent", border:"none", borderBottom: tab===k ? "2px solid var(--accent)" : "2px solid transparent", fontSize:12, fontWeight: tab===k ? 600 : 500, color: tab===k ? "var(--accent)" : "var(--text-2)", cursor:"pointer" }}>{icon} {l}</button>
            ))}
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"16px", background:"#ffffff" }}>
            {tab==="events" && (events.length===0 ? <Empty icon="📭" text="등록된 일정이 없어요" /> : events.map(ev => <EventCard key={ev.id} event={ev} onDelete={del} />))}
            {tab==="windows" && (windows.length===0 ? <Empty icon="🌿" text="빈 날이 없어요" /> : windows.map((w, i) => (
              <div key={i} style={{ padding:"10px 12px", marginBottom:8, border:`1px solid ${i===0 ? GRADE_COLOR[w.grade] : "var(--border)"}`, borderLeft:`4px solid ${GRADE_COLOR[w.grade]}`, borderRadius:"var(--rs)", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:"var(--rs)", flexShrink:0, background:`${GRADE_COLOR[w.grade]}15`, border:`1px solid ${GRADE_COLOR[w.grade]}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:GRADE_COLOR[w.grade] }}>{w.grade}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:"var(--text-1)" }}>{w.dates[0]}{w.dates.length>1 ? ` ~ ${w.dates[w.dates.length-1]}` : ""}</div>
                  <div style={{ fontSize:11, color:"var(--text-3)", marginTop:3 }}>📆 {w.duration_days}일</div>
                </div>
                <button onClick={() => findTripForWindow(w)} style={{ padding:"6px 10px", background:"var(--accent-bg)", color:"var(--accent)", border:"1px solid var(--accent)", borderRadius:"var(--rs)", fontSize:11, fontWeight:500, cursor:"pointer" }}>여행 찾기 →</button>
              </div>
            )))}
            {tab==="activities" && (
              <div ref={recommendRef}>
                <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
                  {[ [null, "전체"], ["자연", "🌿 자연"], ["문화", "🏛️ 문화"], ["미식", "🍽️ 미식"], ["휴양", "🏖️ 휴양"] ].map(([val, label]) => (
                    <button key={String(val)} onClick={() => setTripType(val)} style={{ padding:"5px 12px", background: tripType === val ? "var(--accent)" : "var(--bg-3)", color: tripType === val ? "#fff" : "var(--text-2)", border:"none", borderRadius:99, fontSize:11, cursor:"pointer" }}>{label}</button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <div style={{ flex:1 }}><label style={labelStyle}>📍 지역</label><select value={region} onChange={e=>setRegion(e.target.value)} style={inp}>{["서울","부산","제주","강원","경주","전주"].map(r=><option key={r}>{r}</option>)}</select></div>
                  <div style={{ flex:1 }}><label style={labelStyle}>🌤 계절</label><select value={season} onChange={e=>setSeason(e.target.value)} style={inp}>{ [["spring","🌸 봄"],["summer","☀️ 여름"],["fall","🍂 가을"],["winter","❄️ 겨울"]].map(([v,l])=><option key={v} value={v}>{l}</option>) }</select></div>
                </div>
                <button onClick={() => recommend()} style={{ width:"100%", marginBottom:14, background:"var(--accent)", color:"#fff", border:"none", borderRadius:"var(--rs)", padding:"10px", cursor:"pointer" }}>🔍 추천 받기</button>
                {activities.length===0 ? <Empty icon="🗺️" text="활동 추천" /> : activities.map(a=><ActivityCard key={a.id} activity={a} onConfirm={confirm}/>)}
              </div>
            )}
            {tab==="summary" && <SummaryView events={events} confirmed={confirmed} windows={windows} month={month} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ onClick, children, small }) {
  return <button onClick={onClick} style={{ background: small ? "#ffffff" : "transparent", border:"1px solid var(--border)", borderRadius:4, padding: small ? "6px 12px" : "6px 10px", fontSize:14, color:"var(--text-1)", fontWeight:500, cursor:"pointer" }} onMouseEnter={e=>e.currentTarget.style.background="var(--bg-3)"} onMouseLeave={e=>e.currentTarget.style.background=small?"#ffffff":"transparent"}>{children}</button>;
}

function StatChip({ color, bg, border, children }) {
  return <div style={{ display:"flex", alignItems:"center", gap:5, background: bg, border:`1px solid ${border}`, borderRadius:4, padding:"4px 10px", fontSize:12, fontWeight:500, color }}>{children}</div>;
}

function Empty({ icon, text, sub }) {
  return <div style={{ textAlign:"center", padding:"40px 16px" }}><div style={{ fontSize:36, marginBottom:10 }}>{icon}</div><div style={{ fontSize:13, fontWeight:500, color:"var(--text-1)", marginBottom:4 }}>{text}</div>{sub && <div style={{ fontSize:11, color:"var(--text-3)", whiteSpace:"pre-line" }}>{sub}</div>}</div>;
}

function SummaryView({ events, confirmed, windows, month }) {
  const busyDays = new Set(events.map(e => e.date)).size;
  const freeDays = windows.reduce((s, w) => s + w.duration_days, 0);
  return <div><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}><StatCard value={busyDays} label="일정" color="#b06000" bg="#fef7e0" border="rgba(249,171,0,0.2)" /><StatCard value={`${freeDays}일`} label="자유" color="#137333" bg="#e6f4ea" border="rgba(24,128,56,0.2)" /><StatCard value={confirmed.length} label="확정" color="#1a73e8" bg="#e8f0fe" border="rgba(26,115,232,0.2)" /></div></div>;
}

function StatCard({ value, label, unit="", color, bg, border }) {
  return (
    <div style={{
      background: bg, border:`1px solid ${border}`,
      borderRadius:"var(--r)", padding:"12px 8px", textAlign:"center",
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



const inp = {
  display:"block", width:"100%",
  border:"1.5px solid var(--border)", borderRadius:"var(--rs)",
  padding:"9px 11px", fontSize:13, outline:"none",
  background:"var(--bg-3)", color:"var(--text-1)",
  transition:"border-color .15s, background .15s",
  boxSizing:"border-box",
};

const labelStyle = {
  fontSize:11, fontWeight:600, color:"var(--text-3)",
  display:"block", marginBottom:5, letterSpacing:".03em",
};
