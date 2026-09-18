export function welcomeTourKey(playerId,variant){return `rinkreads_welcome_tour_v1:${encodeURIComponent(playerId)}:${variant}`;}
export function readWelcomeTour(storage,playerId,variant){
  if(!storage)return {seen:false,available:false};
  try{const raw=storage.getItem(welcomeTourKey(playerId,variant));const value=raw?JSON.parse(raw):null;return {seen:value?.version===1&&['complete','skipped'].includes(value.status),available:true};}
  catch{return {seen:false,available:false};}
}
export function finishWelcomeTour(storage,playerId,variant,status){
  if(!storage||!['complete','skipped'].includes(status))return false;
  try{storage.setItem(welcomeTourKey(playerId,variant),JSON.stringify({version:1,status}));return true;}catch{return false;}
}
export const PILOT_TOUR_STEPS=[
  {title:'Start here, then pick up where you left off',body:'The Start button opens your first activity. After you explore, it changes to Continue so you can return to your place. Progress is saved for this player and age in this browser.'},
  {title:'Follow your six-step learning path',body:'Know the ice shows important rink spots. Meet the positions explains player roles. Pack your gear introduces equipment. Read the referee teaches signals, Try a few calls lets you try them, and Your recap looks back at what you explored.'},
  {title:'Explore the pictures',body:'You can turn and zoom the 3D rink. The gear and referee study sections also have optional 3D samples. Use the labelled buttons or switch to 2D whenever you prefer. Moving a picture does not count as an answer.'},
  {title:'Find help in For parents',body:'Open For parents below for guidance about adult support and saved progress. In the player home, it also holds the player profile, earlier activity and hockey-world links. You can open this walkthrough again with Show me around.'},
];
