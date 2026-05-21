import { useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");

const GRADE_COLOR = { S: "#16a34a", A: "#22c55e", B: "#4ade80", C: "#86efac", D: "#d1fae5" };
const GRADE_BG    = { S: "#dcfce7", A: "#dcfce7", B: "#f0fdf4", C: "#f0fdf4", D: "#f0fdf4" };
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function Calendar({ month, events, confirmed, freeWindows }) {
  const base = dayjs(`${month}-01`);
  const today = dayjs().format("YYYY-MM-DD");

  const eventDates = useMemo(() => {
    const map = {};
    for (const e of events) map[e.date] = [...(map[e.date] || []), e.label];
    return map;
  }, [events]);

  const confirmedDates = useMemo(() => {
    const map = {};
    for (const c of confirmed) map[c.date] = { activity: c.activity, grade: c.grade };
    return map;
  }, [confirmed]);

  const freeDateGrade = useMemo(() => {
    const map = {};
    for (const w of freeWindows) for (const d of w.dates) map[d] = w.grade;
    return map;
  }, [freeWindows]);

  const cells = useMemo(() => {
    const blanks = Array(base.day()).fill(null);
    const days = Array.from({ length: base.daysInMonth() }, (_, i) =>
      base.add(i, "day").format("YYYY-MM-DD")
    );
    return [...blanks, ...days];
  }, [base]);

  return (
    <div style={{ background: "var(--card)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
      {/* Weekday headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f8fafc", borderBottom: "1px solid var(--border)" }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{
            textAlign: "center", padding: "10px 0",
            fontSize: 12, fontWeight: 700, letterSpacing: ".02em",
            color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "var(--text-2)",
          }}>
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((dateStr, idx) => {
          if (!dateStr) return <div key={`b-${idx}`} style={{ borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", minHeight: 80 }} />;

          const busy = eventDates[dateStr] || [];
          const conf = confirmedDates[dateStr];
          const grade = freeDateGrade[dateStr];
          const dow = dayjs(dateStr).day();
          const dayNum = parseInt(dateStr.slice(-2), 10);
          const isToday = dateStr === today;

          let bg = "#fff";
          if (grade && !busy.length && !conf) bg = GRADE_BG[grade] || "#f0fdf4";
          if (busy.length) bg = "#fffbeb";
          if (conf) bg = "#eff6ff";

          return (
            <div key={dateStr} style={{
              background: bg,
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              minHeight: 80,
              padding: "6px 8px",
              position: "relative",
              transition: "background .15s",
            }}>
              {/* Day number */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 24, height: 24, borderRadius: "50%",
                  fontSize: 12, fontWeight: isToday ? 800 : 600,
                  background: isToday ? "var(--primary)" : "transparent",
                  color: isToday ? "#fff" : dow === 0 ? "#ef4444" : dow === 6 ? "#3b82f6" : "var(--text-1)",
                }}>
                  {dayNum}
                </span>
                {grade && !busy.length && !conf && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: GRADE_COLOR[grade],
                    background: "#fff", border: `1px solid ${GRADE_COLOR[grade]}`,
                    borderRadius: 4, padding: "0 4px", lineHeight: "18px",
                  }}>
                    {grade}
                  </span>
                )}
              </div>

              {/* Events */}
              {busy.slice(0, 2).map((label, i) => (
                <div key={i} style={{
                  fontSize: 10, lineHeight: 1.4,
                  background: "#fef08a", color: "#854d0e",
                  borderRadius: 3, padding: "1px 4px",
                  marginBottom: 2, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {label}
                </div>
              ))}
              {busy.length > 2 && (
                <div style={{ fontSize: 10, color: "var(--text-3)" }}>+{busy.length - 2}개</div>
              )}

              {/* Confirmed */}
              {conf && (
                <div style={{
                  fontSize: 10, lineHeight: 1.4,
                  background: "#bfdbfe", color: "#1e40af",
                  borderRadius: 3, padding: "1px 4px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  ✓ {conf.activity}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap",
        padding: "10px 16px", borderTop: "1px solid var(--border)",
        background: "#f8fafc",
      }}>
        {[["S","4일+"],["A","3일"],["B","2일(주말)"],["C","2일"],["D","1일"]].map(([g, desc]) => (
          <span key={g} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-2)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: GRADE_COLOR[g], display: "inline-block" }} />
            빈 날 {g} <span style={{ color: "var(--text-3)" }}>{desc}</span>
          </span>
        ))}
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-2)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "#fef08a", display: "inline-block" }} />일정
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-2)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "#bfdbfe", display: "inline-block" }} />확정
        </span>
      </div>
    </div>
  );
}
