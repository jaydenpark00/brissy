import { useEffect } from "react";

export default function Toast({ message, type="success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  const isOk = type === "success";
  return (
    <div style={{
      position:"fixed", bottom:24, left:24, zIndex:9999,
      display:"flex", alignItems:"center", gap:10,
      background:"#323232", color:"#ffffff",
      border:"none",
      padding:"12px 16px", borderRadius:"var(--rs)",
      boxShadow:"0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px 0 rgba(0,0,0,.14), 0 1px 18px 0 rgba(0,0,0,.12)",
      fontSize:13, fontWeight:400,
      animation:"slideUp .25s ease",
    }}>
      <span style={{
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:18, height:18, borderRadius:"50%",
        background: isOk ? "rgba(129,199,132,.2)" : "rgba(229,115,115,.2)",
        color: isOk ? "#81c784" : "#e57373",
        fontWeight:800, fontSize:11, flexShrink:0,
      }}>
        {isOk ? "✓" : "✕"}
      </span>
      {message}
      <button onClick={onClose} style={{
        background:"none", border:"none", color:"#b0b0b0",
        marginLeft:10, fontSize:16, cursor:"pointer",
        transition:"color .15s",
      }}
      onMouseEnter={e=>e.currentTarget.style.color="#ffffff"}
      onMouseLeave={e=>e.currentTarget.style.color="#b0b0b0"}
      >×</button>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}
