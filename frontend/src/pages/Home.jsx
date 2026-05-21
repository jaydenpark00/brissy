import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { supabase } from "../supabaseClient";
import Calendar from "../components/Calendar";
import EventCard from "../components/EventCard";
import ActivityCard from "../components/ActivityCard";
import Toast from "../components/Toast";
import {
  apiFetchEvents, apiCreateEvent, apiDeleteEvent,
  apiFetchConfirmed, apiCreateConfirmed,
  apiFetchFreeWindows, apiFetchActivities,
} from "../mockApi";

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === "true";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USER_ID = "default-user";

export default function Home() {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [events, setEvents] = useState([]);
  const [confirmed, setConfirmed] = useState([]);
  const [freeWindows, setFreeWindows] = useState([]);
  const [activities, setActivities] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [newDate, setNewDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [activityRegion, setActivityRegion] = useState("서울");
  const [activitySeason, setActivitySeason] = useState("spring");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      if (MOCK_MODE) {
        const [evs, confs, fw] = await Promise.all([
          apiFetchEvents(month), apiFetchConfirmed(month), apiFetchFreeWindows(month),
        ]);
        setEvents(evs); setConfirmed(confs); setFreeWindows(fw.free_windows || []);
      } else {
        const [evRes, confRes, fwRes] = await Promise.all([
          fetch(`${API}/events?month=${month}&userId=${USER_ID}`),
          fetch(`${API}/confirmed?month=${month}&userId=${USER_ID}`),
          fetch(`${API}/free-windows?month=${month}&userId=${USER_ID}`),
        ]);
        setEvents(await evRes.json());
        setConfirmed(await confRes.json());
        setFreeWindows((await fwRes.json()).free_windows || []);
      }
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (MOCK_MODE) return;
    const ev = supabase.channel("ev").on("postgres_changes", { event: "*", schema: "public", table: "events" }, fetchAll).subscribe();
    const cf = supabase.channel("cf").on("postgres_changes", { event: "*", schema: "public", table: "confirmed" }, fetchAll).subscribe();
    return () => { supabase.removeChannel(ev); supabase.removeChannel(cf); };
  }, [fetchAll]);

  async function handleAddEvent(e) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setSubmitting(true);
    try {
      if (MOCK_MODE) {
        await apiCreateEvent({ user_id: USER_ID, date: newDate, label: newLabel.trim() });
      } else {
        const res = await fetch(`${API}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: USER_ID, date: newDate, label: newLabel.trim() }),
        });
        if (!res.ok) throw new Error();
      }
      setNewLabel("");
      fetchAll();
      showToast("일정이 추가됐어요!");
    } catch {
      showToast("일정 추가에 실패했어요.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEvent(id) {
    try {
      if (MOCK_MODE) await apiDeleteEvent(id);
      else await fetch(`${API}/events/${id}`, { method: "DELETE" });
      fetchAll();
      showToast("일정을 삭제했어요.");
    } catch {
      showToast("삭제에 실패했어요.", "error");
    }
  }

  async function fetchActivities() {
    const grade = freeWindows[0]?.grade;
    try {
      if (MOCK_MODE) {
        const data = await apiFetchActivities({ grade, region: activityRegion, season: activitySeason });
        setActivities(data.activities || []);
      } else {
        const params = new URLSearchParams({ region: activityRegion, season: activitySeason });
        if (grade) params.append("grade", grade);
        const res = await fetch(`${API}/activities?${params}`);
        setActivities((await res.json()).activities || []);
      }
    } catch {
      showToast("추천을 불러오지 못했어요.", "error");
    }
  }

  async function handleConfirm(activity) {
    const startDate = freeWindows[0]?.dates[0] || dayjs().format("YYYY-MM-DD");
    const grade = freeWindows[0]?.grade || "D";
    try {
      if (MOCK_MODE) {
        await apiCreateConfirmed({ user_id: USER_ID, date: startDate, activity: activity.title, grade });
      } else {
        await fetch(`${API}/confirmed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: USER_ID, date: startDate, activity: activity.title, grade }),
        });
      }
      setActivities([]);
      fetchAll();
      showToast(`"${activity.title}" 확정됐어요! 🎉`);
    } catch {
      showToast("확정에 실패했어요.", "error");
    }
  }

  const prevMonth = () => setMonth(dayjs(`${month}-01`).subtract(1, "month").format("YYYY-MM"));
  const nextMonth = () => setMonth(dayjs(`${month}-01`).add(1, "month").format("YYYY-MM"));
  const monthLabel = dayjs(`${month}-01`).format("YYYY년 M월");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🗓</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: "var(--text-1)" }}>Brissy</span>
            <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 2 }}>월간 플래너</span>
          </div>

          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={prevMonth} style={navBtn}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 15, minWidth: 110, textAlign: "center", color: "var(--text-1)" }}>
              {monthLabel}
            </span>
            <button onClick={nextMonth} style={navBtn}>›</button>
            {loading && (
              <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 4 }}>불러오는 중…</span>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* Calendar */}
        <Calendar month={month} events={events} confirmed={confirmed} freeWindows={freeWindows} />

        {/* Bottom grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>

          {/* Left: Add + Events */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Add event card */}
            <div style={card}>
              <h2 style={sectionTitle}>
                <span style={titleIcon}>＋</span> 일정 추가
              </h2>
              <form onSubmit={handleAddEvent} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={labelStyle}>날짜</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>내용</label>
                  <input
                    type="text"
                    placeholder="예: 팀 회의, 치과 예약…"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    style={inputStyle}
                    maxLength={50}
                  />
                </div>
                <button type="submit" disabled={submitting || !newLabel.trim()} style={{
                  ...primaryBtn,
                  opacity: submitting || !newLabel.trim() ? .5 : 1,
                }}>
                  {submitting ? "추가 중…" : "일정 추가"}
                </button>
              </form>
            </div>

            {/* Events list */}
            <div style={card}>
              <h2 style={sectionTitle}>
                <span style={titleIcon}>📋</span>
                이번 달 일정
                {events.length > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "var(--primary-light)", padding: "2px 8px", borderRadius: 99 }}>
                    {events.length}개
                  </span>
                )}
              </h2>
              {events.length === 0 ? (
                <div style={emptyState}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 일정이 없어요</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>GPTs 채팅이나 위 폼으로 추가해보세요</div>
                </div>
              ) : (
                events.map(ev => <EventCard key={ev.id} event={ev} onDelete={handleDeleteEvent} />)
              )}
            </div>
          </div>

          {/* Right: Free windows + Activities */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Free windows */}
            <div style={card}>
              <h2 style={sectionTitle}>
                <span style={titleIcon}>🕐</span>
                빈 시간 창
                {freeWindows.length > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "var(--primary-light)", padding: "2px 8px", borderRadius: 99 }}>
                    {freeWindows.length}개
                  </span>
                )}
              </h2>
              {freeWindows.length === 0 ? (
                <div style={emptyState}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                  <div style={{ fontWeight: 600 }}>빈 날이 없어요</div>
                </div>
              ) : (
                freeWindows.slice(0, 5).map((w, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px",
                    background: i === 0 ? "var(--primary-light)" : "#f8fafc",
                    border: `1px solid ${i === 0 ? "var(--primary-border)" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)",
                    marginBottom: 6,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        fontWeight: 800, fontSize: 13,
                        color: i === 0 ? "var(--primary)" : "var(--text-2)",
                        minWidth: 20,
                      }}>{w.grade}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                          {w.dates[0]}{w.dates.length > 1 ? ` ~ ${w.dates[w.dates.length - 1]}` : ""}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                          {w.duration_days}일{w.has_weekend ? " · 주말 포함" : ""}
                        </div>
                      </div>
                    </div>
                    {w.has_weekend && (
                      <span style={{ fontSize: 10, background: "#3b82f6", color: "#fff", borderRadius: 4, padding: "2px 6px", fontWeight: 600 }}>주말</span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Activity recommend */}
            <div style={card}>
              <h2 style={sectionTitle}>
                <span style={titleIcon}>✨</span> 활동 추천
              </h2>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <select value={activityRegion} onChange={e => setActivityRegion(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                  {["서울","부산","제주","강원","경주","전주"].map(r => <option key={r}>{r}</option>)}
                </select>
                <select value={activitySeason} onChange={e => setActivitySeason(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                  {[["spring","🌸 봄"],["summer","☀️ 여름"],["fall","🍂 가을"],["winter","❄️ 겨울"]].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <button onClick={fetchActivities} style={{ ...primaryBtn, whiteSpace: "nowrap" }}>
                  추천 받기
                </button>
              </div>
              {activities.length === 0 ? (
                <div style={{ ...emptyState, padding: "16px 0" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🗺</div>
                  <div style={{ fontSize: 13, color: "var(--text-3)" }}>지역과 계절을 선택하고 추천 받기를 눌러보세요</div>
                </div>
              ) : (
                activities.map(a => <ActivityCard key={a.id} activity={a} onConfirm={handleConfirm} />)
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Styles
const navBtn = {
  background: "none", border: "1px solid var(--border)",
  borderRadius: 8, padding: "4px 12px",
  fontSize: 18, color: "var(--text-2)",
  transition: "all .15s", cursor: "pointer",
};

const card = {
  background: "var(--card)", borderRadius: "var(--radius)",
  border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)",
  padding: "20px",
};

const sectionTitle = {
  fontSize: 14, fontWeight: 700, color: "var(--text-1)",
  margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6,
};

const titleIcon = {
  fontSize: 16,
};

const primaryBtn = {
  background: "var(--primary)", color: "#fff",
  border: "none", borderRadius: 8,
  padding: "10px 16px", fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "background .15s", width: "100%",
};

const inputStyle = {
  width: "100%", border: "1px solid var(--border)", borderRadius: 8,
  padding: "9px 12px", fontSize: 13, outline: "none",
  background: "#fff", color: "var(--text-1)",
  transition: "border-color .15s",
};

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "var(--text-2)", marginBottom: 5,
};

const emptyState = {
  textAlign: "center", padding: "24px 0",
  color: "var(--text-2)", fontSize: 13,
};
