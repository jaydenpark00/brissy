import { useState, useEffect, useCallback } from "react";
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
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [tab, setTab]             = useState("events");
  const [selectedDate, setSelectedDate] = useState(null);
  const [popoverInfo, setPopoverInfo]   = useState(null);

  const notify = (msg, type="success") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (MOCK) {
        const [e,c,w] = await Promise.all([
          apiFetchEvents(month),
          apiFetchConfirmed(month),
          apiFetchFreeWindows(month),
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
          method:"POST",
          headers:{"Content-Type":"application/json"},
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

  async function recommend() {
    const grade = windows[0]?.grade;
    try {
      if (MOCK) {
        const d = await apiFetchActivities({ grade, region, season });
        setActs(d.activities||[]);
      } else {
        const p = new URLSearchParams({ region, season });
        if (grade) p.append("grade", grade);
        setActs(((await (await fetch(`${API}/activities?${p}`)).json()).activities)||[]);
      }
      setTab("activities");
    } catch { notify("추천 실패","error"); }
  }

  async function confirm(act) {
    const d = windows[0]?.dates[0] || dayjs().format("YYYY-MM-DD");
    const g = windows[0]?.grade    || "D";
    try {
      if (MOCK) await apiCreateConfirmed({ user_id:UID, date:d, activity:act.title, grade:g });
      else await fetch(`${API}/confirmed`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ user_id:UID, date:d, activity:act.title, grade:g }),
      });
      setActs([]); load(); notify(`🎉 "${act.title}" 확정됐어요!`);
    } catch { notify("확정 실패","error"); }
  }

  function handleDateClick(date, el) {
    setDate(date);
    setTab("events");
    setSelectedDate(date);
    setPopoverInfo({ date, rect: el.getBoundingClientRect() });
  }

  function closePopover() {
    setPopoverInfo(null);
    setSelectedDate(null);
  }

  const ml        = dayjs(`${month}-01`).format("YYYY년 M월");
  const canSubmit = !saving && !!label.trim();
  const topGrade  = windows[0]?.grade;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"var(--bg)" }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* ── 헤더 ── */}
      <header style={{
        height:"var(--header)", flexShrink:0,
        display:"flex", alignItems:"center", gap:16, padding:"0 24px",
        background:"var(--bg-2)",
        boxShadow:"0 1px 0 var(--border), 0 2px 20px rgba(0,0,0,.04)",
        position:"relative", zIndex:10,
      }}>
        {/* 로고 */}
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{
            width:36, height:36, borderRadius:12,
            background:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, boxShadow:"0 2px 10px rgba(124,111,247,.4)",
          }}>🗓</div>
          <span style={{ fontWeight:800, fontSize:18, color:"var(--text-1)", letterSpacing:"-.03em" }}>Brissy</span>
        </div>

        <div style={{ width:1, height:22, background:"var(--border)" }}/>

        {/* 월 네비게이션 */}
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <NavBtn onClick={()=>setMonth(dayjs(`${month}-01`).subtract(1,"month").format("YYYY-MM"))}>‹</NavBtn>
          <span style={{
            fontSize:16, fontWeight:700, color:"var(--text-1)",
            minWidth:115, textAlign:"center",
          }}>{ml}</span>
          <NavBtn onClick={()=>setMonth(dayjs(`${month}-01`).add(1,"month").format("YYYY-MM"))}>›</NavBtn>
          <NavBtn onClick={()=>setMonth(dayjs().format("YYYY-MM"))} small>오늘</NavBtn>
        </div>

        {loading && (
          <span style={{ fontSize:12, color:"var(--text-3)", fontStyle:"italic" }}>불러오는 중…</span>
        )}

        {/* 통계 칩 */}
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          {events.length > 0 && (
            <StatChip color="#D97706" bg="rgba(217,119,6,.08)" border="rgba(217,119,6,.25)">
              📅 일정 {events.length}
            </StatChip>
          )}
          {topGrade && (
            <StatChip
              color={GRADE_COLOR[topGrade]}
              bg={`${GRADE_COLOR[topGrade]}14`}
              border={`${GRADE_COLOR[topGrade]}35`}
            >
              ✨ 최우선 {topGrade}등급
            </StatChip>
          )}
          {confirmed.length > 0 && (
            <StatChip color="#2563EB" bg="rgba(37,99,235,.08)" border="rgba(37,99,235,.25)">
              ✓ 확정 {confirmed.length}
            </StatChip>
          )}
        </div>
      </header>

      {/* ── 바디 ── */}
      <div style={{ flex:1, display:"flex", minHeight:0, padding:"14px 18px 18px", gap:16 }}>

        {/* 캘린더 */}
        <div style={{
          flex:1, minWidth:0,
          borderRadius:"var(--r)", overflow:"hidden",
          border:"1.5px solid var(--border)",
          boxShadow:"0 2px 16px rgba(124,111,247,.07)",
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
            onAddEvent={() => { setTab("events"); closePopover(); }}
            onDelete={del}
          />
        )}

        {/* 사이드바 */}
        <div style={{
          width:314, flexShrink:0,
          display:"flex", flexDirection:"column",
          borderRadius:"var(--r)", overflow:"hidden",
          border:"1.5px solid var(--border)",
          boxShadow:"0 2px 16px rgba(124,111,247,.07)",
        }}>

          {/* 일정 추가 폼 */}
          <form onSubmit={addEvent} style={{
            padding:"18px 18px 16px",
            borderBottom:"1.5px solid var(--border)",
            flexShrink:0,
            background:"var(--bg-2)",
          }}>
            <p style={{
              fontSize:11, fontWeight:700, color:"var(--text-3)",
              letterSpacing:".1em", textTransform:"uppercase",
              marginBottom:12, display:"flex", alignItems:"center", gap:6,
            }}>
              <span style={{
                width:20, height:20, borderRadius:6,
                background:"var(--accent-bg)",
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                fontSize:11,
              }}>📝</span>
              일정 추가
            </p>

            <label style={labelStyle}>날짜</label>
            <input
              type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{ ...inp, marginBottom:10 }}
              onFocus={e=>{ e.target.style.borderColor="var(--accent)"; e.target.style.background="var(--bg-2)"; }}
              onBlur={e=>{ e.target.style.borderColor="var(--border)"; e.target.style.background="var(--bg-3)"; }}
            />

            <label style={labelStyle}>내용</label>
            <input
              type="text" placeholder="일정 내용을 입력하세요…" value={label}
              onChange={e=>setLabel(e.target.value)} maxLength={50}
              style={{ ...inp, marginBottom:10 }}
              onFocus={e=>{ e.target.style.borderColor="var(--accent)"; e.target.style.background="var(--bg-2)"; }}
              onBlur={e=>{ e.target.style.borderColor="var(--border)"; e.target.style.background="var(--bg-3)"; }}
            />

            <button type="submit" disabled={!canSubmit} style={{
              width:"100%", padding:"11px",
              background: canSubmit ? "var(--accent)" : "var(--border)",
              color: canSubmit ? "#fff" : "var(--text-3)",
              border:"none",
              borderRadius:"var(--rs)", fontSize:14, fontWeight:700,
              transition:"all .2s",
              cursor: canSubmit ? "pointer" : "not-allowed",
              boxShadow: canSubmit ? "0 2px 10px rgba(124,111,247,.3)" : "none",
            }}
            onMouseEnter={e=>{ if(canSubmit){ e.currentTarget.style.opacity=".88"; e.currentTarget.style.transform="translateY(-1px)"; } }}
            onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="translateY(0)"; }}
            >{saving ? "추가 중…" : "✚ 추가하기"}</button>
          </form>

          {/* 탭 */}
          <div style={{
            display:"flex", gap:5, padding:"12px 18px",
            borderBottom:"1.5px solid var(--border)",
            flexShrink:0,
            background:"var(--bg-2)",
          }}>
            {[
              ["events",     "📅", `일정${events.length   ? ` (${events.length})`   : ""}`],
              ["windows",    "✨", `빈 날${windows.length  ? ` (${windows.length})`  : ""}`],
              ["activities", "🧭", "추천"],
              ["summary",    "📊", "요약"],
            ].map(([k, icon, l]) => (
              <button key={k} onClick={()=>setTab(k)} style={{
                flex:1, padding:"7px 2px",
                background: tab===k ? "var(--accent)" : "transparent",
                border: tab===k ? "none" : "1.5px solid var(--border)",
                borderRadius:99,
                fontSize:11, fontWeight: tab===k ? 700 : 500,
                color: tab===k ? "#fff" : "var(--text-2)",
                transition:"all .2s",
                display:"flex", alignItems:"center", justifyContent:"center", gap:3,
              }}>{icon} {l}</button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px 18px", background:"var(--bg)" }}>

            {/* 일정 탭 */}
            {tab==="events" && (
              events.length===0
                ? <Empty icon="📭" text="등록된 일정이 없어요" sub="위 폼이나 GPTs로\n일정을 추가해보세요" />
                : events.map(ev => <EventCard key={ev.id} event={ev} onDelete={del} />)
            )}

            {/* 빈 날 탭 */}
            {tab==="windows" && (
              windows.length===0
                ? <Empty icon="🌿" text="빈 날이 없어요" sub="일정을 추가하면\n자동으로 계산됩니다" />
                : windows.map((w, i) => (
                  <div key={i} style={{
                    padding:"13px 14px", marginBottom:8,
                    background:"var(--bg-2)",
                    border:`1.5px solid ${i===0 ? GRADE_COLOR[w.grade]+"55" : "var(--border)"}`,
                    borderRadius:"var(--r)",
                    display:"flex", alignItems:"center", gap:12,
                    position:"relative", overflow:"hidden",
                    boxShadow: i===0 ? "0 2px 12px rgba(0,0,0,.06)" : "none",
                  }}>
                    {/* 상단 그라디언트 바 (최우선만) */}
                    {i===0 && (
                      <div style={{
                        position:"absolute", top:0, left:0, right:0, height:3,
                        background:`linear-gradient(90deg, ${GRADE_COLOR[w.grade]}, ${GRADE_COLOR[w.grade]}60)`,
                        borderRadius:"var(--r) var(--r) 0 0",
                      }} />
                    )}
                    {/* 등급 배지 */}
                    <div style={{
                      width:40, height:40, borderRadius:12, flexShrink:0,
                      background:`${GRADE_COLOR[w.grade]}15`,
                      border:`1.5px solid ${GRADE_COLOR[w.grade]}30`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:15, fontWeight:800, color:GRADE_COLOR[w.grade],
                    }}>{w.grade}</div>
                    {/* 날짜 정보 */}
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--text-1)" }}>
                        {w.dates[0]}{w.dates.length>1 ? ` ~ ${w.dates[w.dates.length-1]}` : ""}
                      </div>
                      <div style={{ fontSize:11, color:"var(--text-3)", marginTop:3, display:"flex", gap:8 }}>
                        <span>📆 {w.duration_days}일</span>
                        {w.has_weekend && <span style={{ color:"#3B82F6" }}>🏖 주말 포함</span>}
                      </div>
                    </div>
                  </div>
                ))
            )}

            {/* 추천 탭 */}
            {tab==="activities" && (
              <div>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <div style={{ flex:1 }}>
                    <label style={{ ...labelStyle, marginBottom:5 }}>📍 지역</label>
                    <select value={region} onChange={e=>setRegion(e.target.value)}
                      style={{ ...inp }}
                      onFocus={e=>{ e.target.style.borderColor="var(--accent)"; }}
                      onBlur={e=>{ e.target.style.borderColor="var(--border)"; }}
                    >
                      {["서울","부산","제주","강원","경주","전주"].map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ ...labelStyle, marginBottom:5 }}>🌤 계절</label>
                    <select value={season} onChange={e=>setSeason(e.target.value)}
                      style={{ ...inp }}
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
                  width:"100%", marginBottom:14,
                  background:"var(--accent)", color:"#fff",
                  border:"none",
                  borderRadius:"var(--rs)", padding:"11px",
                  fontSize:14, fontWeight:700,
                  boxShadow:"0 2px 10px rgba(124,111,247,.3)",
                  transition:"opacity .15s, transform .1s",
                }}
                onMouseEnter={e=>{ e.currentTarget.style.opacity=".88"; e.currentTarget.style.transform="translateY(-1px)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="translateY(0)"; }}
                >🔍 추천 받기</button>

                {activities.length===0
                  ? <Empty icon="🗺️" text="활동 추천" sub={"지역과 계절을 선택하고\n추천 받기를 눌러보세요"} />
                  : activities.map(a=><ActivityCard key={a.id} activity={a} onConfirm={confirm}/>)
                }
              </div>
            )}

            {/* 요약 탭 */}
            {tab==="summary" && (
              <SummaryView events={events} confirmed={confirmed} windows={windows} month={month} />
            )}

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
      background:"var(--bg-3)",
      border:"1.5px solid var(--border)",
      borderRadius:99,
      padding: small ? "5px 14px" : "5px 13px",
      fontSize: small ? 13 : 17,
      color:"var(--text-2)",
      fontWeight: small ? 700 : 400,
      lineHeight:1,
      transition:"all .15s",
    }}
    onMouseEnter={e=>{ e.currentTarget.style.background="var(--accent-bg)"; e.currentTarget.style.borderColor="var(--accent)"; e.currentTarget.style.color="var(--accent)"; }}
    onMouseLeave={e=>{ e.currentTarget.style.background="var(--bg-3)"; e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text-2)"; }}
    >{children}</button>
  );
}

function StatChip({ color, bg, border, children }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:5,
      background: bg, border:`1.5px solid ${border}`,
      borderRadius:99, padding:"5px 12px",
      fontSize:12, fontWeight:600, color,
    }}>{children}</div>
  );
}

function Empty({ icon, text, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 16px" }}>
      <div style={{ fontSize:42, marginBottom:14 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:700, color:"var(--text-2)", marginBottom:8 }}>{text}</div>
      {sub && <div style={{ fontSize:12, lineHeight:1.75, color:"var(--text-3)", whiteSpace:"pre-line" }}>{sub}</div>}
    </div>
  );
}

const GRADE_LABELS = { S:"S등급", A:"A등급", B:"B등급", C:"C등급", D:"D등급" };

function SummaryView({ events, confirmed, windows, month }) {
  const daysInMonth = dayjs(`${month}-01`).daysInMonth();
  const busyDays    = new Set(events.map(e => e.date)).size;
  const freeDays    = windows.reduce((s, w) => s + w.duration_days, 0);
  const topWindow   = windows[0];

  // 등급별 자유 일수 합산
  const gradeDays = windows.reduce((acc, w) => {
    acc[w.grade] = (acc[w.grade] || 0) + w.duration_days;
    return acc;
  }, {});

  const busyPct = Math.round((busyDays / daysInMonth) * 100);
  const freePct = Math.round((freeDays / daysInMonth) * 100);

  return (
    <div>
      {/* 상단 스탯 카드 3개 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
        <StatCard value={busyDays}        label="일정 있는 날"  color="#D97706" bg="rgba(217,119,6,.08)"  border="rgba(217,119,6,.2)"  />
        <StatCard value={`${freeDays}일`} label="자유 시간"     color="#047857" bg="rgba(4,120,87,.08)"   border="rgba(4,120,87,.2)"   />
        <StatCard value={confirmed.length} label="확정 활동"   color="#2563EB" bg="rgba(37,99,235,.08)"  border="rgba(37,99,235,.2)"  />
      </div>

      {/* 이번 달 바쁨 / 자유 비율 바 */}
      <div style={{
        background:"var(--bg-2)", border:"1.5px solid var(--border)",
        borderRadius:"var(--r)", padding:"14px 16px", marginBottom:12,
      }}>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>
          이번 달 {daysInMonth}일 개요
        </div>
        {/* 비율 바 */}
        <div style={{ display:"flex", borderRadius:99, overflow:"hidden", height:10, marginBottom:10, background:"var(--bg-3)" }}>
          {busyDays > 0 && (
            <div style={{ width:`${busyPct}%`, background:"#FCD34D", transition:"width .4s ease" }} />
          )}
          {freeDays > 0 && (
            <div style={{ width:`${freePct}%`, background:"#10B981", transition:"width .4s ease" }} />
          )}
        </div>
        <div style={{ display:"flex", gap:14 }}>
          <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--text-2)" }}>
            <span style={{ width:8, height:8, borderRadius:2, background:"#FCD34D", display:"inline-block" }}/>
            바쁜 날 {busyDays}일
          </span>
          <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--text-2)" }}>
            <span style={{ width:8, height:8, borderRadius:2, background:"#10B981", display:"inline-block" }}/>
            자유 시간 {freeDays}일
          </span>
          <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--text-3)" }}>
            <span style={{ width:8, height:8, borderRadius:2, background:"var(--bg-3)", border:"1px solid var(--border)", display:"inline-block" }}/>
            기타 {daysInMonth - busyDays}일
          </span>
        </div>
      </div>

      {/* 등급별 자유 창 분포 */}
      {windows.length > 0 && (
        <div style={{
          background:"var(--bg-2)", border:"1.5px solid var(--border)",
          borderRadius:"var(--r)", padding:"14px 16px", marginBottom:12,
        }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>
            빈 날 등급 분포
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {["S","A","B","C","D"].map(g => {
              const days = gradeDays[g] || 0;
              const maxDays = Math.max(...Object.values(gradeDays), 1);
              return (
                <div key={g} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{
                    width:22, height:22, borderRadius:7, flexShrink:0,
                    background:`${GRADE_COLOR[g]}15`, border:`1px solid ${GRADE_COLOR[g]}30`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, fontWeight:800, color:GRADE_COLOR[g],
                  }}>{g}</span>
                  <div style={{ flex:1, background:"var(--bg-3)", borderRadius:99, height:6, overflow:"hidden" }}>
                    <div style={{
                      width: days > 0 ? `${(days/maxDays)*100}%` : "0%",
                      height:"100%", background:GRADE_COLOR[g],
                      borderRadius:99, transition:"width .4s ease",
                    }} />
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, color: days > 0 ? GRADE_COLOR[g] : "var(--text-3)", minWidth:28, textAlign:"right" }}>
                    {days > 0 ? `${days}일` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 최우선 창 */}
      {topWindow && (
        <div style={{
          background:`${GRADE_COLOR[topWindow.grade]}08`,
          border:`1.5px solid ${GRADE_COLOR[topWindow.grade]}30`,
          borderRadius:"var(--r)", padding:"14px 16px",
          position:"relative", overflow:"hidden",
        }}>
          <div style={{
            position:"absolute", top:0, left:0, right:0, height:3,
            background:`linear-gradient(90deg, ${GRADE_COLOR[topWindow.grade]}, ${GRADE_COLOR[topWindow.grade]}50)`,
          }} />
          <div style={{ fontSize:11, fontWeight:700, color:GRADE_COLOR[topWindow.grade], letterSpacing:".06em", textTransform:"uppercase", marginBottom:8 }}>
            ✨ 최우선 자유 창
          </div>
          <div style={{ fontSize:15, fontWeight:800, color:"var(--text-1)", marginBottom:4 }}>
            {topWindow.dates[0]}{topWindow.dates.length > 1 ? ` ~ ${topWindow.dates[topWindow.dates.length-1]}` : ""}
          </div>
          <div style={{ display:"flex", gap:8, fontSize:11, color:"var(--text-2)" }}>
            <span>📆 {topWindow.duration_days}일</span>
            {topWindow.has_weekend && <span style={{ color:"#3B82F6" }}>🏖 주말 포함</span>}
            <span style={{
              background:`${GRADE_COLOR[topWindow.grade]}15`,
              border:`1px solid ${GRADE_COLOR[topWindow.grade]}30`,
              borderRadius:6, padding:"1px 7px",
              fontWeight:700, color:GRADE_COLOR[topWindow.grade],
            }}>{topWindow.grade}등급</span>
          </div>
        </div>
      )}

      {/* 데이터 없는 경우 */}
      {events.length === 0 && windows.length === 0 && confirmed.length === 0 && (
        <Empty icon="📊" text="아직 데이터가 없어요" sub="일정을 추가하면\n이번 달 요약이 여기 나타납니다" />
      )}
    </div>
  );
}

function StatCard({ value, label, color, bg, border }) {
  return (
    <div style={{
      background: bg, border:`1.5px solid ${border}`,
      borderRadius:16, padding:"14px 10px", textAlign:"center",
    }}>
      <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:"var(--text-3)", marginTop:5, fontWeight:600, lineHeight:1.3 }}>{label}</div>
    </div>
  );
}

const inp = {
  display:"block", width:"100%",
  border:"1.5px solid var(--border)",
  borderRadius:"var(--rs)",
  padding:"10px 12px",
  fontSize:13, outline:"none",
  background:"var(--bg-3)",
  color:"var(--text-1)",
  transition:"border-color .15s, background .15s",
};

const labelStyle = {
  fontSize:12, fontWeight:600, color:"var(--text-2)",
  display:"block", marginBottom:6,
};
