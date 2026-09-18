export const GEAR_ART_IDS=['helmet','mouth','neck','shoulder','elbow','gloves','groin','pants','shin','socks','skates','stick','jersey','yoyo','duck','teddy'];
export const PLAY_ITEMS=[
  ['yoyo','Yo-yo','Great tricks! Save the yo-yo for after hockey. It is not part of your playing gear.'],
  ['duck','Rubber duck','Quack! This teammate belongs in the bath. Leave the duck out of your hockey kit.'],
  ['teddy','Teddy bear','A very cuddly fan! Teddy can cheer from off the ice. Keep your playing gear in this bag.'],
];
export const GEAR_CHALLENGES=[
  {id:'helmet',prompt:'Find the gear for your head and face.',hint:'Look for the helmet with a face cage.'},
  {id:'shin',prompt:'Find what covers your knees and shins.',hint:'Look for the pair of shin pads.'},
  {id:'gloves',prompt:'Find what covers your hands while you hold the stick.',hint:'Look for padded hockey gloves.'},
];
export const matchesGearChallenge=(round,id)=>GEAR_CHALLENGES[round]?.id===id;
export function packingChoice(gear,packed,id){
  const toy=PLAY_ITEMS.find(item=>item[0]===id);
  if(toy)return {kind:'play',note:toy[2],packed};
  const item=gear.find(item=>item[0]===id);
  if(!item)return {kind:'unknown',packed};
  return {kind:'gear',note:item[2],packed:[...new Set([...packed,id])]};
}
export function gearChoices(gear){
  const choices=[...gear];
  // Keep the playful choices mixed into the kit, rather than labelling the answer first.
  choices.splice(3,0,PLAY_ITEMS[0]);choices.splice(8,0,PLAY_ITEMS[1]);choices.splice(13,0,PLAY_ITEMS[2]);
  return choices;
}
