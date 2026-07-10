export function CoachFeedback({ coach, reaction, correct, explanation }) {
  return (
    <div role="status" style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 10, background: correct ? "#E8F7EE" : "#FFF2E5", border: `1px solid ${correct ? "#2E8B57" : "#C26A1B"}`, marginBottom: 10 }}>
      <img src={coach.imageUrl} alt={coach.name} width="48" height="48" style={{ borderRadius: "50%", objectFit: "cover" }} />
      <div style={{ color: "#0B1A33" }}>
        <div style={{ fontSize: 12, fontWeight: 900 }}>{coach.name} <span style={{ fontWeight: 600 }}>· {coach.role}</span></div>
        <div style={{ fontSize: 15, fontWeight: 900 }}>{correct ? "Correct" : "Not quite"} {reaction}</div>
        {explanation && <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{explanation}</div>}
      </div>
    </div>
  );
}
