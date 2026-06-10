import { useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");

const WD = ["일","월","화","수","목","금","토"];

export default function Calendar({ month, events, confirmed, freeWindows, onDateClick, selectedDate }) {
  const base  = dayjs(`${month}-01`);
  const today = dayjs().format("YYYY-MM-DD");

  const eMap = useMemo(() => {
    const m = {};
    for (const e of events) m[e.date] = [...(m[e.date]||[]), e.label];
    return m;
  }, [events]);

  const cMap = useMemo(() => {
    const m = {};
    for (const c of confirmed) m[c.date] = c.activity;
    return m;
  }, [confirmed]);

  const { cells, rows } = useMemo(() => {
    const blanks = Array(base.day()).fill(null);
    const days   = Array.from({ length: base.daysInMonth() }, (_, i) =>
      base.add(i,"day").format("YYYY-MM-DD")
    );
    const all = [...blanks, ...days];
    return { cells: all, rows: Math.ceil(all.length / 7) };
  }, [base]);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"var(--bg-2)" }}>

      {/* 요일 헤더 */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(7,1fr)",
        flexShrink:0,
        borderBottom:"1.5px solid var(--border)",
        background:"var(--bg-2)",
      }}>
        {WD.map((w,i) => (
          <div key={w} style={{
            textAlign:"center", padding:"16px 0",
            fontSize:11, fontWeight:700, letterSpacing:".08em",
            color: i===0 ? "#EF4444" : i===6 ? "#3B82F6" : "var(--text-3)",
          }}>{w}</div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div style={{
        flex:1, minHeight:0,
        display:"grid",
        gridTemplateColumns:"repeat(7,1fr)",
        gridTemplateRows:`repeat(${rows},1fr)`,
      }}>
        {cells.map((date, i) => {
          if (!date) return (
            <div key={`b${i}`} style={{
              borderRight:"1px solid var(--border)",
              borderBottom:"1px solid var(--border)",
              background:"var(--bg)",
            }} />
          );

          const busy    = eMap[date] || [];
          const conf    = cMap[date];
          const dow     = dayjs(date).day();
          const dn      = parseInt(date.slice(-2), 10);
          const isToday = date === today;

          const cellBg = conf        ? "rgba(37,99,235,.05)"
                       : busy.length ? "rgba(245,158,11,.06)"
                       : "var(--bg-2)";

          const isSelected = date === selectedDate;

          return (
            <div key={date}
              onClick={e => onDateClick?.(date, e.currentTarget)}
              style={{
                borderRight:"1px solid var(--border)",
                borderBottom:"1px solid var(--border)",
                background: cellBg,
                padding:"9px 10px", overflow:"hidden",
                transition:"background .15s",
                position:"relative",
                cursor: onDateClick ? "pointer" : "default",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-3)"}
              onMouseLeave={e => e.currentTarget.style.background = isSelected ? "var(--bg-3)" : cellBg}
            >
              {/* 선택 링 */}
              {isSelected && (
                <div style={{
                  position:"absolute", inset:0,
                  border:"2px solid var(--accent)",
                  borderRadius:3, pointerEvents:"none",
                  zIndex:1,
                }} />
              )}

              {/* 날짜 숫자 */}
              <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:4 }}>
                <span style={{
                  display:"inline-flex", alignItems:"center", justifyContent:"center",
                  width:24, height:24, borderRadius:"50%", flexShrink:0,
                  fontSize:12, fontWeight: isToday ? 800 : 400,
                  background: isToday ? "var(--accent)" : "transparent",
                  color: isToday ? "#fff"
                       : dow===0   ? "#EF4444"
                       : dow===6   ? "#3B82F6"
                       : "var(--text-1)",
                }}>{dn}</span>
              </div>

              {/* 일정 */}
              {busy.slice(0,2).map((l,idx) => (
                <div key={idx} style={{
                  fontSize:10, lineHeight:1.4, marginBottom:2,
                  color:"#D97706",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>· {l}</div>
              ))}
              {busy.length > 2 && (
                <div style={{ fontSize:9, color:"var(--text-3)" }}>+{busy.length-2}</div>
              )}

              {/* 확정 */}
              {conf && (
                <div style={{
                  fontSize:10, lineHeight:1.4, color:"#2563EB",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>✓ {conf}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div style={{
        display:"flex", gap:14, padding:"10px 16px",
        borderTop:"1.5px solid var(--border)",
        flexShrink:0, flexWrap:"wrap",
        background:"var(--bg-2)",
      }}>
        <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--text-3)" }}>
          <span style={{ width:10, height:3, background:"#D97706", display:"inline-block", borderRadius:99 }}/>
          일정
        </span>
        <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--text-3)" }}>
          <span style={{ width:10, height:3, background:"#2563EB", display:"inline-block", borderRadius:99 }}/>
          확정
        </span>
      </div>
    </div>
  );
}
