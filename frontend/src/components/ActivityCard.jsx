const GRADE_STYLE = {
  S: { bg: "#14532d", text: "#fff" },
  A: { bg: "#15803d", text: "#fff" },
  B: { bg: "#16a34a", text: "#fff" },
  C: { bg: "#4ade80", text: "#14532d" },
  D: { bg: "#d1fae5", text: "#14532d" },
};

const SEASON_EMOJI = { spring: "🌸", summer: "☀️", fall: "🍂", winter: "❄️" };

export default function ActivityCard({ activity, onConfirm }) {
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      background: "var(--card)",
      boxShadow: "var(--shadow-sm)",
      marginBottom: 10,
      overflow: "hidden",
      transition: "box-shadow .15s, transform .15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "none"; }}
    >
      {/* Top bar */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "var(--primary-light)",
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-1)" }}>
          {activity.title}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {activity.grade.map(g => (
            <span key={g} style={{
              background: GRADE_STYLE[g]?.bg || "#6b7280",
              color: GRADE_STYLE[g]?.text || "#fff",
              fontSize: 11, fontWeight: 700,
              borderRadius: 5, padding: "2px 7px",
            }}>
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={chipStyle}>📍 {activity.region}</span>
          <span style={chipStyle}>📅 {activity.duration_days}일</span>
          {activity.season?.map(s => (
            <span key={s} style={chipStyle}>{SEASON_EMOJI[s] || "🗓"} {s}</span>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
          {activity.description}
        </p>
        {activity.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {activity.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 11, color: "var(--primary)", background: "var(--primary-light)",
                border: "1px solid var(--primary-border)",
                borderRadius: 99, padding: "2px 8px",
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {onConfirm && (
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", textAlign: "right" }}>
          <button
            onClick={() => onConfirm(activity)}
            style={{
              background: "var(--primary)", color: "#fff",
              border: "none", borderRadius: 8,
              padding: "8px 18px", fontSize: 13, fontWeight: 600,
              transition: "background .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--primary-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--primary)"}
          >
            이 활동으로 확정 →
          </button>
        </div>
      )}
    </div>
  );
}

const chipStyle = {
  fontSize: 11, color: "var(--text-2)",
  background: "#f1f5f9", border: "1px solid var(--border)",
  borderRadius: 6, padding: "3px 8px",
};
