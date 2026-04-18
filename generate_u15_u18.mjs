import fs from 'fs';

const qb = JSON.parse(fs.readFileSync('./src/data/questions.json', 'utf8'));

// U15 TF Questions
const u15TF = [
  { id: "u15tf1", cat: "Systems Play", concept: "Pinching on rush",
    sit: "When your team is in the defensive zone with the puck, the first forward should immediately pinch the boards on every play.",
    ok: false, why: "Pinching should be situational — only when you're sure you'll win the puck.", tip: "Pinch smart, not automatic." },
  { id: "u15tf2", cat: "Gap Control", concept: "Gap vs speed",
    sit: "Against a forward attacking at full speed, you should always back up to maintain gap control rather than challenge them.",
    ok: true, why: "Backing up maintains gap and forces their decision.", tip: "Control the gap." }
];

const u15Questions = [];

for (const q of u15TF) {
  u15Questions.push({
    ...q, pos: ["F", "D"], d: 2, type: "tf",
    source: "Hockey Canada — Bantam Program / NCCP Certification Materials"
  });
}

// Add to QB
qb["U15 / Bantam"] = qb["U15 / Bantam"] || [];
qb["U15 / Bantam"].push(...u15Questions);

fs.writeFileSync('./src/data/questions.json', JSON.stringify(qb));
console.log(`✓ Added ${u15Questions.length} U15 new questions`);
