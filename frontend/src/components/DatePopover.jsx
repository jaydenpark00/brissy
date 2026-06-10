import dayjs from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");

const DOW   = ["일","월","화","수","목","금","토"];
const GRADE_COLOR = { S:"#137333", A:"#188038", B:"#1e8e3e", C:"#34a853", D:"#81c784" };
const GRADE_LABEL = { S:"최우선 자유일", A:"A등급 자유일", B:"B등급 자유일", C:"C등급 자유일", D:"D등급 자유일" };

export default function DatePopover({ info, events, confirmed, grade, onClose, onAddEvent, onDelete }) {
  const { date, rect } = info;
  const d   = dayjs(date);
  const dow = d.day();

  /* 위치 계산: 셀 오른쪽 → 부족하면 왼쪽 */
  const PW  = 284;
  let left  = rect.right + 10;
  if (left + PW > window.innerWidth - 8) left = rect.left - PW - 10;
  left = Math.max(8, left);
  const top = Math.min(Math.max(rect.top, 12), window.innerHeight - 340);

  return (
    <>
      {/* 배경 클릭 시 닫기 */}
      <div
        style={{ position:"fixed", inset:0, zIndex:999 }}
        onClick={onClose}
      />

      {/* 팝오버 카드 */}
      <div style={{
        position:"fixed", left, top,
        width:PW, zIndex:1000,
        background:"#ffffff",
        border:"1px solid var(--border)",
        borderRadius:"var(--r)",
        boxShadow:"var(--shadow)",
        overflow:"hidden",
        animation:"popIn .18s ease",
      }}>
        <style>{`@keyframes popIn { from { opacity:0; transform:scale(.96) translateY(-4px) } to { opacity:1; transform:scale(1) translateY(0) } }`}</style>

        {/* 헤더 */}
        <div style={{
          padding:"14px 16px 12px",
          borderBottom:"1px solid var(--border)",
          display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        }}>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:"var(--text-1)", lineHeight:1.2 }}>
              {d.format("M월 D일")}
              <span style={{
                marginLeft:6, fontSize:12, fontWeight:500,
                color: dow===0 ? "#d93025" : dow===6 ? "#1a73e8" : "var(--text-2)",
              }}>{DOW[dow]}요일</span>
            </div>
            {grade && (
              <div style={{
                marginTop:5, display:"inline-flex", alignItems:"center", gap:5,
                background:"#e6f4ea",
                border:"1px solid rgba(24,128,56,0.2)",
                borderRadius:4, padding:"3px 8px",
                fontSize:11, fontWeight:600, color:GRADE_COLOR[grade],
              }}>
                ✨ {GRADE_LABEL[grade]}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            width:28, height:28, borderRadius:"50%", flexShrink:0,
            background:"none", border:"none",
            color:"var(--text-2)", fontSize:16,
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"background .15s",
            cursor:"pointer",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.background="var(--bg-3)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="none"; }}
          >✕</button>
        </div>

        {/* 일정 목록 */}
        <div style={{ padding:"12px 16px", maxHeight:200, overflowY:"auto" }}>
          {events.length === 0 && !confirmed ? (
            <div style={{ textAlign:"center", padding:"16px 0", color:"var(--text-3)", fontSize:13 }}>
              등록된 일정이 없어요
            </div>
          ) : (
            <>
              {events.map(ev => (
                <div key={ev.id} style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"6px 10px", marginBottom:6,
                  background:"#fef7e0",
                  border:"1px solid rgba(249,171,0,0.2)",
                  borderLeft:"4px solid #f9ab00",
                  borderRadius:4,
                }}>
                  <span style={{ fontSize:13, color:"#b06000", flex:1, fontWeight:500, lineHeight:1.3 }}>
                    {ev.label}
                  </span>
                  <button
                    onClick={() => { if(window.confirm(`"${ev.label}" 삭제할까요?`)) { onDelete(ev.id); } }}
                    style={{
                      width:20, height:20, borderRadius:"50%", flexShrink:0,
                      background:"none", border:"none",
                      color:"#b06000", fontSize:10,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      transition:"background .15s",
                      cursor:"pointer",
                    }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="rgba(217,119,6,.15)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="none"; }}
                  >✕</button>
                </div>
              ))}

              {confirmed && (
                <div style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"6px 10px",
                  background:"#e8f0fe",
                  border:"1px solid rgba(26,115,232,0.2)",
                  borderLeft:"4px solid #1a73e8",
                  borderRadius:4,
                }}>
                  <span style={{ fontSize:11, color:"#1a73e8", fontWeight:700 }}>✓</span>
                  <span style={{ fontSize:13, color:"#1a73e8", flex:1, fontWeight:500 }}>
                    {confirmed.activity}
                  </span>
                  <span style={{
                    fontSize:10, fontWeight:700,
                    background:"rgba(26,115,232,.12)", color:"#1a73e8",
                    borderRadius:4, padding:"2px 6px",
                  }}>확정</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* 일정 추가 버튼 */}
        <div style={{ padding:"0 16px 14px" }}>
          <button onClick={onAddEvent} style={{
            width:"100%", padding:"9px",
            background:"var(--accent)", color:"#fff",
            border:"none", borderRadius:"var(--rs)",
            fontSize:13, fontWeight:500,
            cursor:"pointer",
            transition:"background .15s",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.background="var(--accent-2)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="var(--accent)"; }}
          >➕ 이 날 일정 추가</button>
        </div>
      </div>
    </>
  );
}
