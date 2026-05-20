import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { supabase } from "../supabaseClient";
import Calendar from "../components/Calendar";
import EventCard from "../components/EventCard";
import ActivityCard from "../components/ActivityCard";
import {
  apiFetchEvents,
  apiCreateEvent,
  apiDeleteEvent,
  apiFetchConfirmed,
  apiCreateConfirmed,
  apiFetchFreeWindows,
  apiFetchActivities,
} from "../mockApi";

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === "true";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USER_ID = "";

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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      if (MOCK_MODE) {
        const [evs, confs, fw] = await Promise.all([
          apiFetchEvents(month),
          apiFetchConfirmed(month),
          apiFetchFreeWindows(month),
        ]);
        setEvents(evs);
        setConfirmed(confs);
        setFreeWindows(fw.free_windows || []);
      } else {
        const [evRes, confRes, fwRes] = await Promise.all([
          fetch(`${API}/events?month=${month}${USER_ID ? `&userId=${USER_ID}` : ""}`),
          fetch(`${API}/confirmed?month=${month}${USER_ID ? `&userId=${USER_ID}` : ""}`),
          fetch(`${API}/free-windows?month=${month}${USER_ID ? `&userId=${USER_ID}` : ""}`),
        ]);
        setEvents(await evRes.json());
        setConfirmed(await confRes.json());
        const fw = await fwRes.json();
        setFreeWindows(fw.free_windows || []);
      }
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (MOCK_MODE) return;
    const evChannel = supabase
      .channel("events-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, fetchAll)
      .subscribe();
    const confChannel = supabase
      .channel("confirmed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "confirmed" }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(evChannel);
      supabase.removeChannel(confChannel);
    };
  }, [fetchAll]);

  async function handleAddEvent(e) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    if (MOCK_MODE) {
      await apiCreateEvent({ user_id: USER_ID, date: newDate, label: newLabel.trim() });
    } else {
      await fetch(`${API}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: USER_ID, date: newDate, label: newLabel.trim() }),
      });
    }
    setNewLabel("");
    fetchAll();
  }

  async function handleDeleteEvent(id) {
    if (MOCK_MODE) {
      await apiDeleteEvent(id);
    } else {
      await fetch(`${API}/events/${id}`, { method: "DELETE" });
    }
    fetchAll();
  }

  async function fetchActivities() {
    const grade = freeWindows[0]?.grade;
    if (MOCK_MODE) {
      const data = await apiFetchActivities({ grade, region: activityRegion, season: activitySeason });
      setActivities(data.activities || []);
    } else {
      const params = new URLSearchParams({ region: activityRegion, season: activitySeason });
      if (grade) params.append("grade", grade);
      const res = await fetch(`${API}/activities?${params}`);
      const data = await res.json();
      setActivities(data.activities || []);
    }
  }

  async function handleConfirm(activity) {
    const startDate = freeWindows[0]?.dates[0] || dayjs().format("YYYY-MM-DD");
    const grade = freeWindows[0]?.grade || "D";
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
  }

  const prevMonth = () =>
    setMonth(dayjs(`${month}-01`).subtract(1, "month").format("YYYY-MM"));
  const nextMonth = () =>
    setMonth(dayjs(`${month}-01`).add(1, "month").format("YYYY-MM"));

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        월간 플래너
      </h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
        GPTs로 일정을 관리하고 빈 시간에 맞는 활동을 추천받으세요
      </p>

      {/* Month navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={prevMonth} style={btnStyle}>◀</button>
        <span style={{ fontWeight: 700, fontSize: 18, minWidth: 100, textAlign: "center" }}>
          {month}
        </span>
        <button onClick={nextMonth} style={btnStyle}>▶</button>
        {loading && <span style={{ fontSize: 12, color: "#9ca3af" }}>로딩 중…</span>}
      </div>

      {/* Calendar */}
      <Calendar
        month={month}
        events={events}
        confirmed={confirmed}
        freeWindows={freeWindows}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 28 }}>
        {/* Add event */}
        <div>
          <h2 style={sectionTitle}>일정 추가</h2>
          <form onSubmit={handleAddEvent} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="일정 내용 입력"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={inputStyle}
            />
            <button type="submit" style={primaryBtn}>추가</button>
          </form>

          <h2 style={{ ...sectionTitle, marginTop: 20 }}>이번 달 일정</h2>
          {events.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>등록된 일정이 없습니다.</p>
          ) : (
            events.map((ev) => (
              <EventCard key={ev.id} event={ev} onDelete={handleDeleteEvent} />
            ))
          )}
        </div>

        {/* Free windows & activities */}
        <div>
          <h2 style={sectionTitle}>빈 시간 창</h2>
          {freeWindows.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>빈 날이 없습니다.</p>
          ) : (
            freeWindows.slice(0, 5).map((w, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 700 }}>{w.grade}등급</span>
                {" · "}
                {w.duration_days}일{" · "}
                {w.dates[0]}
                {w.dates.length > 1 && ` ~ ${w.dates[w.dates.length - 1]}`}
                {w.has_weekend && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      background: "#3b82f6",
                      color: "#fff",
                      borderRadius: 4,
                      padding: "1px 5px",
                    }}
                  >
                    주말 포함
                  </span>
                )}
              </div>
            ))
          )}

          <h2 style={{ ...sectionTitle, marginTop: 20 }}>활동 추천</h2>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <select
              value={activityRegion}
              onChange={(e) => setActivityRegion(e.target.value)}
              style={inputStyle}
            >
              {["서울", "부산", "제주", "강원", "경주", "전주"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <select
              value={activitySeason}
              onChange={(e) => setActivitySeason(e.target.value)}
              style={inputStyle}
            >
              {[
                ["spring", "봄"],
                ["summer", "여름"],
                ["fall", "가을"],
                ["winter", "겨울"],
              ].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button onClick={fetchActivities} style={primaryBtn}>추천 받기</button>
          </div>
          {activities.map((a) => (
            <ActivityCard key={a.id} activity={a} onConfirm={handleConfirm} />
          ))}
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: 14,
};

const primaryBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 14px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const inputStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const sectionTitle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#111827",
  marginBottom: 8,
  marginTop: 0,
};
