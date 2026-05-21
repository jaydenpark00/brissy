import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === "success" ? "#16a34a" : "#ef4444";
  const icon = type === "success" ? "✓" : "✕";

  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 10,
      background: bg, color: "#fff",
      padding: "12px 18px", borderRadius: 10,
      boxShadow: "0 8px 24px rgba(0,0,0,.15)",
      fontSize: 14, fontWeight: 500,
      animation: "slideIn .2s ease",
    }}>
      <span style={{ fontWeight: 700, fontSize: 16 }}>{icon}</span>
      {message}
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", opacity: .7, marginLeft: 4, padding: 0, fontSize: 16 }}>×</button>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </div>
  );
}
