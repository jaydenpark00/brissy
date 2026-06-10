const GRADE_COLOR = { S:"#137333", A:"#188038", B:"#1e8e3e", C:"#34a853", D:"#81c784" };
const GRADE_BG    = { S:"#e6f4ea", A:"#e6f4ea", B:"#e6f4ea", C:"#e6f4ea", D:"#e8f5e9" };

export default function ActivityCard({ activity, onConfirm }) {
  return (
    <div style={{
      border:"1px solid var(--border)",
      borderRadius:"var(--r)",
      background:"#ffffff",
      marginBottom:12, overflow:"hidden",
      transition:"border-color .2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor="var(--border-2)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; }}
    >
      <div style={{
        padding:"12px 14px",
        borderBottom:"1px solid var(--border)",
        display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8,
      }}>
        <span style={{ fontWeight:600, fontSize:14, color:"var(--text-1)", lineHeight:1.4 }}>
          {activity.title}
        </span>
        <div style={{ display:"flex", gap:5, flexShrink:0 }}>
          {activity.grade.map(g => (
            <span key={g} style={{
              fontSize:11, fontWeight:600,
              color: GRADE_COLOR[g] || "#188038",
              background: GRADE_BG[g] || "#e6f4ea",
              border:`1px solid ${GRADE_COLOR[g] || "#188038"}30`,
              borderRadius:4, padding:"2px 8px",
            }}>{g}</span>
          ))}
        </div>
      </div>

      <div style={{ padding:"12px 14px" }}>
        <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
          <Tag>📍 {activity.region}</Tag>
          <Tag>📅 {activity.duration_days}일</Tag>
        </div>
        <p style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.6, margin:0 }}>
          {activity.description}
        </p>
        {activity.tags?.length > 0 && (
          <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
            {activity.tags.map(t => (
              <span key={t} style={{
                fontSize:11, color:"var(--accent)",
                background:"var(--accent-bg)",
                borderRadius:4, padding:"3px 8px", fontWeight:500,
              }}>#{t}</span>
            ))}
          </div>
        )}
        {onConfirm && (
          <button onClick={() => onConfirm(activity)} style={{
            marginTop:12, width:"100%",
            background:"var(--accent)",
            color:"#fff",
            border:"none",
            borderRadius:"var(--rs)", padding:"10px",
            fontSize:13, fontWeight:500,
            cursor:"pointer",
            transition:"background .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background="var(--accent-2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background="var(--accent)"; }}
          >✓ 확정하기</button>
        )}
      </div>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span style={{
      fontSize:11, color:"var(--text-2)",
      background:"var(--bg-3)", border:"1px solid var(--border)",
      borderRadius:4, padding:"3px 8px", fontWeight:500,
    }}>{children}</span>
  );
}
