export const COACH_PERSONAS = [
  { id: "kincaid", name: "Coach Kincaid", role: "Head Coach", imageUrl: "/assets/coaches/kincaid.png", flavorCorrect: { young: ["Smart.", "There it is."], mid: ["Sharp.", "Hockey brain."], older: ["Correct.", "No notes."] }, flavorIncorrect: { young: ["Reset.", "Read it."], mid: ["Reset.", "Watch the tape."], older: ["Reset.", "Tighten up."] } },
  { id: "danno", name: "Coach Danno", role: "Skills Coach", imageUrl: "/assets/coaches/danno.png", flavorCorrect: { young: ["Nice, bud.", "Beauty."], mid: ["Nice read.", "Smooth."], older: ["Beauty.", "Pro habit."] }, flavorIncorrect: { young: ["All good, bud.", "Next one."], mid: ["Shake it.", "Easy adjust."], older: ["Reset.", "Next shift."] } },
  { id: "marques", name: "Coach Marques", role: "Mental Performance Coach", imageUrl: "/assets/coaches/marques.png", flavorCorrect: { young: ["YES!", "BIG read!"], mid: ["YESSIR.", "Locked."], older: ["Elite.", "Pro-level."] }, flavorIncorrect: { young: ["Reset.", "You got this."], mid: ["Next rep.", "Trust it."], older: ["Short memory.", "Use it."] } },
  { id: "kowalski", name: "Coach Kowalski", role: "Assistant Coach", imageUrl: "/assets/coaches/kowalski.png", flavorCorrect: { young: ["Yep.", "Solid."], mid: ["Correct.", "Serviceable."], older: ["Veteran.", "Textbook."] }, flavorIncorrect: { young: ["No.", "Try again."], mid: ["No.", "Filed."], older: ["No.", "Move on."] } },
];

export function getAgeTier(level = "") {
  if (/U(5|7|9)/.test(level)) return "young";
  if (/U(15|18)/.test(level)) return "older";
  return "mid";
}

export function getCoachForQuestion(question) {
  const seed = String(question?.id || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return COACH_PERSONAS[seed % COACH_PERSONAS.length];
}

export function coachReaction(coach, correct, level, reactionIndex = 0) {
  const pool = (correct ? coach?.flavorCorrect : coach?.flavorIncorrect)?.[getAgeTier(level)] || [];
  return pool.length ? pool[Math.abs(reactionIndex) % pool.length] : (correct ? "Correct." : "Reset.");
}
