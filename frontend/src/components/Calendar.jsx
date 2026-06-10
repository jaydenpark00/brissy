import { useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");

const GRADE = {
  S: { color: "#137333", bg: "#e6f4ea", text: "#137333" },
  A: { color: "#188038", bg: "#e6f4ea", text: "#188038" },
  B: { color: "#1e8e3e", bg: "#e6f4ea", text: "#1e8e3e" },
  C: { color: "#34a853", bg: "#e6f4ea", text: "#34a853" },
  D: { color: "#81c784", bg: "#e8f5e9", text: "#137333" },
};

const WD = ["일", "월", "화", "수", "목", "금", "토"];

export default function Calendar({ month, events, confirmed, freeWindows, onDateClick, selectedDate }) {
  const base = dayjs(`${month}-01`);
  const today = dayjs().format("YYYY-MM-DD");

  const eMap = useMemo(() => {
    const m = {};
    for (const e of events) m[e.date] = [...(m[e.date] || []), e.label];
    return m;
  }, [events]);

  const cMap = useMemo(() => {
    const m = {};
    for (const c of confirmed) m[c.date] = c.activity;
    return m;
  }, [confirmed]);

  const gMap = useMemo(() => {
    const m = {};
    for (const w of freeWindows) for (const d of w.dates) m[d] = w.grade;
    return m;
  }, [freeWindows]);

  const { cells, rows } = useMemo(() => {
    const blanks = Array(base.day()).fill(null);
    const days = Array.from({ length: base.daysInMonth() }, (_, i) =>
      base.add(i, "day").format("YYYY-MM-DD")
    );
    const all = [...blanks, ...days];
    return { cells: all, rows: Math.ceil(all.length / 7) };
  }, [base]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>

      {/* 요일 헤더 */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7,1fr)",
        flexShrink: 0,
        borderBottom: "1px solid var(--border)",
        background: "#ffffff",
      }}>
        {WD.map((w, i) => (
          <div key={w} style={{
            textAlign: "center", padding: "10px 0",
            fontSize: 11, fontWeight: 600,
            color: i === 0 ? "#d93025" : i === 6 ? "#1a73e8" : "var(--text-2)",
          }}>{w}</div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div style={{
        flex: 1, minHeight: 0,
        display: "grid",
        gridTemplateColumns: "repeat(7,1fr)",
        gridTemplateRows: `repeat(${rows},1fr)`,
      }}>
        {cells.map((date, i) => {
          if (!date) return (
            <div key={`b${i}`} style={{
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg)",
            }} />
          );

          const busy = eMap[date] || [];
          const conf = cMap[date];
          const grade = gMap[date];
          const dow = dayjs(date).day();
          const dn = parseInt(date.slice(-2), 10);
          const isToday = date === today;
          const g = grade ? GRADE[grade] : null;

          const isSelected = date === selectedDate;
          const cellBg = "#ffffff";

          return (
            <div key={date}
              className="calendar-cell"
              onClick={e => onDateClick?.(date, e.currentTarget)}
              style={{
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                background: isSelected ? "var(--bg-3)" : cellBg,
                padding: "6px 8px", overflow: "hidden",
                position: "relative",
                cursor: onDateClick ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {/* 선택 아웃라인 */}
              {isSelected && (
                <div style={{
                  position: "absolute", inset: 0,
                  border: "2px solid var(--accent)",
                  pointerEvents: "none",
                  zIndex: 1,
                }} />
              )}

              {/* 날짜 숫자 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  fontSize: 12, fontWeight: isToday ? 700 : 500,
                  background: isToday ? "var(--accent)" : "transparent",
                  color: isToday ? "#ffffff"
                    : dow === 0 ? "#d93025"
                      : dow === 6 ? "#1a73e8"
                        : "var(--text-1)",
                }}>{dn}</span>
              </div>

              {/* 일정 (Busy) */}
              {busy.slice(0, 2).map((l, idx) => (
                <div key={idx} style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#fef7e0",
                  color: "#b06000",
                  borderLeft: "3px solid #f9ab00",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }} title={l}>
                  {l}
                </div>
              ))}
              {busy.length > 2 && (
                <div style={{ fontSize: 10, color: "var(--text-3)", padding: "0 6px", fontWeight: 500 }}>
                  외 {busy.length - 2}개 더
                </div>
              )}

              {/* 확정 (Confirmed) */}
              {conf && (
                <div style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#e8f0fe",
                  color: "#1a73e8",
                  borderLeft: "3px solid #1a73e8",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }} title={conf}>
                  ✓ {conf}
                </div>
              )}

              {/* 빈 날 (Free Windows) */}
              {g && !busy.length && !conf && (
                <div style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#e6f4ea",
                  color: "#137333",
                  borderLeft: "3px solid #188038",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  ✨ {grade}등급 자유
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div style={{
        display: "flex", gap: 14, padding: "10px 16px",
        borderTop: "1px solid var(--border)",
        flexShrink: 0, flexWrap: "wrap",
        background: "#ffffff",
      }}>
        {Object.entries(GRADE).map(([g, { color }]) => (
          <span key={g} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-2)", fontWeight: 500 }}>
            <span style={{ width: 10, height: 3, background: color, display: "inline-block", borderRadius: 99 }} />
            {g}등급 자유
          </span>
        ))}
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-2)", fontWeight: 500 }}>
          <span style={{ width: 10, height: 3, background: "#f9ab00", display: "inline-block", borderRadius: 99 }} />
          일정
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-2)", fontWeight: 500 }}>
          <span style={{ width: 10, height: 3, background: "#1a73e8", display: "inline-block", borderRadius: 99 }} />
          확정
        </span>
      </div>
    </div>
  );
}
