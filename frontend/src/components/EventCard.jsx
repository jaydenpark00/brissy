import dayjs from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");

const DOW = ["일","월","화","수","목","금","토"];

export default function EventCard({ event, onDelete }) {
  const d = dayjs(event.date);
  const dow = DOW[d.day()];
  const isWeekend = d.day() === 0 || d.day() === 6;

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px",
      background: "var(--card)", borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)",
      marginBottom: 8,
      transition: "box-shadow .15s",
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
    onMouseLeave={e => e.currentTarget.style.boxShadow = "var(--shadow-sm)"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: "#fffbeb", border: "1px solid #fde68a",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1, color: "#92400e" }}>
            {d.date()}
          </div>
          <div style={{ fontSize: 10, color: isWeekend ? "#ef4444" : "#b45309", fontWeight: 600 }}>
            {dow}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-1)" }}>{event.label}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>{event.date}</div>
        </div>
      </div>
      <button
        onClick={() => {
          if (window.confirm(`"${event.label}" 일정을 삭제할까요?`)) onDelete(event.id);
        }}
        style={{
          background: "none", border: "1px solid transparent", borderRadius: 6,
          color: "var(--text-3)", fontSize: 16, padding: "4px 8px",
          transition: "all .15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--danger-light)"; e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "#fecaca"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.borderColor = "transparent"; }}
        title="삭제"
      >
        ✕
      </button>
    </div>
  );
}
