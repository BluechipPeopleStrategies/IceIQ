export const CHARACTER_STAGES = Object.freeze({
 young: Object.freeze({ eyeHeight: 1.33875, bodyScale: .72, widthScale: .98, headScale: 1.45, eyeScale: 1.8 }),
 youth: Object.freeze({ eyeHeight: 1.545, bodyScale: 1, widthScale: 1, headScale: 1, eyeScale: 1 }),
 older: Object.freeze({ eyeHeight: 1.6737, bodyScale: 1.13, widthScale: 1.06, headScale: .96, eyeScale: .9 }),
});
export function resolveCharacterStage(ageBand) {
 if (Object.hasOwn(CHARACTER_STAGES, ageBand)) return ageBand;
 const age = Number(String(ageBand ?? '').match(/(?:U\s*)?(\d+)/i)?.[1]);
 return age > 0 && age <= 9 ? 'young' : age >= 15 ? 'older' : 'youth';
}
export function characterProportions(ageBand, stage) {
 return CHARACTER_STAGES[Object.hasOwn(CHARACTER_STAGES, stage) ? stage : resolveCharacterStage(ageBand)];
}
