import dayjs from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");

const DOW   = ["일","월","화","수","목","금","토"];
const GRADE_COLOR = { S:"#047857", A:"#059669", B:"#10B981", C:"#34D399", D:"#6EE7B7" };
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
        background:"var(--bg-2)",
        border:"1.5px solid var(--border)",
        borderRadius:"var(--r)",
        boxShadow:"0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(124,111,247,.1)",
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
            <div style={{ fontSize:16, fontWeight:800, color:"var(--text-1)", lineHeight:1.2 }}>
              {d.format("M월 D일")}
              <span style={{
                marginLeft:6, fontSize:12, fontWeight:600,
                color: dow===0 ? "#EF4444" : dow===6 ? "#3B82F6" : "var(--text-3)",
              }}>{DOW[dow]}요일</span>
            </div>
            {grade && (
              <div style={{
                marginTop:5, display:"inline-flex", alignItems:"center", gap:5,
                background:`${GRADE_COLOR[grade]}12`,
                border:`1px solid ${GRADE_COLOR[grade]}30`,
                borderRadius:99, padding:"3px 9px",
                fontSize:11, fontWeight:700, color:GRADE_COLOR[grade],
              }}>
                ✨ {GRADE_LABEL[grade]}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            width:26, height:26, borderRadius:8, flexShrink:0,
            background:"none", border:"1.5px solid transparent",
            color:"var(--text-3)", fontSize:14,
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all .15s",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.background="var(--bg-3)"; e.currentTarget.style.borderColor="var(--border)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.borderColor="transparent"; }}
          >×</button>
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
                  padding:"7px 10px", marginBottom:5,
                  background:"var(--bg-3)",
                  border:"1px solid var(--border)",
                  borderRadius:12,
                }}>
                  <span style={{ fontSize:13, color:"var(--text-1)", flex:1, lineHeight:1.3 }}>
                    {ev.label}
                  </span>
                  <button
                    onClick={() => { if(window.confirm(`"${ev.label}" 삭제할까요?`)) { onDelete(ev.id); } }}
                    style={{
                      width:22, height:22, borderRadius:6, flexShrink:0,
                      background:"none", border:"none",
                      color:"var(--text-3)", fontSize:11,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      transition:"all .15s",
                    }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="rgba(239,68,68,.1)"; e.currentTarget.style.color="#EF4444"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color="var(--text-3)"; }}
                  >✕</button>
                </div>
              ))}

              {confirmed && (
                <div style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"7px 10px",
                  background:"rgba(37,99,235,.05)",
                  border:"1px solid rgba(37,99,235,.2)",
                  borderRadius:12,
                }}>
                  <span style={{ fontSize:11, color:"#2563EB", fontWeight:700 }}>✓</span>
                  <span style={{ fontSize:13, color:"#2563EB", flex:1, fontWeight:500 }}>
                    {confirmed.activity}
                  </span>
                  <span style={{
                    fontSize:10, fontWeight:700,
                    background:"rgba(37,99,235,.1)", color:"#2563EB",
                    borderRadius:6, padding:"2px 6px",
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
            fontSize:13, fontWeight:700,
            boxShadow:"0 2px 8px rgba(124,111,247,.3)",
            transition:"opacity .15s, transform .1s",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.opacity=".88"; e.currentTarget.style.transform="translateY(-1px)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="translateY(0)"; }}
          >➕ 이 날 일정 추가</button>
        </div>
      </div>
    </>
  );
}
