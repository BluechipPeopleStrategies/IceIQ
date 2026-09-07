export function CoachFeedback({ coach, headline, correct, explanation }) {
  return (
    <div role="status" style={{ padding: 12, borderRadius: 10, background: correct ? "#E8F7EE" : "#FFF2E5", border: `1px solid ${correct ? "#2E8B57" : "#C26A1B"}`, marginBottom: 10, color: "#0B1A33" }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 900 }}>{headline}</div>
        {explanation && <div style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 3 }}>{explanation}</div>}
      </div>
      <div data-testid="coach-attribution" style={{ display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid rgba(11,26,51,.14)", marginTop: 10, paddingTop: 8 }}>
        <img src={coach.imageUrl} alt={coach.name} width="32" height="32" style={{ borderRadius: "50%", objectFit: "cover" }} />
        <div style={{ fontSize: 11, lineHeight: 1.25 }}>
          <div style={{ fontWeight: 900 }}>{coach.name}</div>
          <div style={{ fontWeight: 600, opacity: 0.72 }}>{coach.role}</div>
        </div>
      </div>
    </div>
  );
}
