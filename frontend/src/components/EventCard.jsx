import dayjs from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");

const DOW = ["일","월","화","수","목","금","토"];

export default function EventCard({ event, onDelete }) {
  const d = dayjs(event.date);
  const isWeekend = d.day()===0 || d.day()===6;

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12,
      padding:"10px 12px",
      background:"#ffffff",
      border:"1px solid var(--border)",
      borderRadius:"var(--r)",
      marginBottom:8,
      transition:"border-color .15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor="var(--border-2)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; }}
    >
      {/* 날짜 배지 */}
      <div style={{
        width:40, height:40, borderRadius:"var(--rs)", flexShrink:0,
        background:"var(--bg-3)",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
      }}>
        <div style={{ fontSize:15, fontWeight:600, lineHeight:1, color:"var(--text-1)" }}>{d.date()}</div>
        <div style={{ fontSize:9, fontWeight:500, marginTop:2,
          color: isWeekend ? "#d93025" : "var(--text-2)" }}>
          {DOW[d.day()]}
        </div>
      </div>

      {/* 내용 */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:13, fontWeight:500, color:"var(--text-1)",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        }}>
          {event.label}
        </div>
        <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>{event.date}</div>
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={() => { if(window.confirm(`"${event.label}" 삭제할까요?`)) onDelete(event.id); }}
        style={{
          width:24, height:24, borderRadius:"50%", flexShrink:0,
          background:"none", border:"none",
          color:"var(--text-3)", fontSize:12,
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all .15s",
          cursor:"pointer",
        }}
        onMouseEnter={e => { e.currentTarget.style.background="rgba(217,119,6,0.1)"; e.currentTarget.style.color="#d93025"; }}
        onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.color="var(--text-3)"; }}
      >✕</button>
    </div>
  );
}
