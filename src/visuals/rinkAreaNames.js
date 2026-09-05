// Approximate coaching vocabulary, not rulebook boundaries or grading zones.
// Both ends share names. Attack direction remains owned by each question.
export const RINK_AREAS = [
 {id:'neutral',name:'Neutral zone',x:0,y:0,description:'The space between the two blue lines.'},
 ...[-1,1].flatMap(side=>[
  {id:`${side}-crease`,name:'Crease',x:side*26.2,y:0,description:'The marked area immediately in front of the net.'},
  {id:`${side}-slot`,name:'Slot',x:side*22,y:0,description:'The central scoring area in front of the net.'},
  {id:`${side}-high-slot`,name:'High slot',x:side*15,y:0,description:'The central area farther from the net, above the lower slot.'},
  {id:`${side}-point`,name:'Point',x:side*9.2,y:-8,description:'An attacking support area near the blue line.'},
  {id:`${side}-half-wall`,name:'Half wall',x:side*18,y:11.2,description:'The side boards partway between the corner and blue line.'},
  {id:`${side}-corner`,name:'Corner',x:side*26,y:-8.8,description:'The curved area where the side boards meet the end boards.'},
  {id:`${side}-behind`,name:'Behind the net',x:side*29,y:1,description:'The ice between the goal line and end boards.'},
 ])
];
export function rinkAreaAt(point){
 const x=Math.abs(point.x),y=Math.abs(point.y);
 if(x<7.62)return 'neutral zone';
 if(x>27)return y<4?'behind the net':'corner';
 if(x>24.3&&y<1.8)return 'crease area';
 if(x>24&&y>7)return 'corner';
 if(y>9)return 'half wall';
 if(x<11)return 'point area';
 if(y<4)return x>19?'slot':'high slot';
 return 'faceoff-circle area';
}
const FULL_RINK_BOUNDS = Object.freeze({ minX: -30.48, maxX: 30.48, minY: -12.954, maxY: 12.954 });
const BLUE_LINE_X = 7.62;
const X_MARGIN = 3.25;
const Y_MARGIN = 3.1;
const MIN_FOCUS_WIDTH = 12;
const MIN_FOCUS_HEIGHT = 10;

const finitePoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.y);
const expandRange = (low, high, minimum, limitLow, limitHigh) => {
 let start = low, end = high;
 if (end - start < minimum) {
  const middle = (start + end) / 2;
  start = middle - minimum / 2;
  end = middle + minimum / 2;
 }
 if (start < limitLow) { end += limitLow - start; start = limitLow; }
 if (end > limitHigh) { start -= end - limitHigh; end = limitHigh; }
 return { start: Math.max(limitLow, start), end: Math.min(limitHigh, end) };
};

/**
 * Choose a camera-only opening view from the visible play. End-zone scenes
 * retain the attacking blue line and net; local reads use the players, puck
 * and any supplied placement area; broad transitions keep their rink context.
 * `focusPoints` are framing hints only (for example a position answer target).
 */
export function scenarioFocusBounds(state, { focusPoints = [] } = {}) {
 const actors = Array.isArray(state?.actors) ? state.actors : [];
 const skaters = actors.filter(actor => actor.role !== 'goalie' && finitePoint(actor));
 const goalies = actors.filter(actor => actor.role === 'goalie' && finitePoint(actor));
 const extras = (Array.isArray(focusPoints) ? focusPoints : [focusPoints]).filter(finitePoint);
 const puck = finitePoint(state?.puck) ? [state.puck] : [];
 if (!skaters.length && !puck.length && !extras.length) return { ...FULL_RINK_BOUNDS };

 const skaterMinX = skaters.length ? Math.min(...skaters.map(actor => actor.x)) : Math.min(...[...puck, ...extras].map(point => point.x));
 const skaterMaxX = skaters.length ? Math.max(...skaters.map(actor => actor.x)) : Math.max(...[...puck, ...extras].map(point => point.x));
 const spanX = skaterMaxX - skaterMinX;
 const attackingRight = skaters.length > 0 && skaterMinX >= BLUE_LINE_X;
 const attackingLeft = skaters.length > 0 && skaterMaxX <= -BLUE_LINE_X;
 // A play spanning both ends is a transition read. Preserve its context, but
 // keep the across-ice crop readable instead of forcing the full width and
 // full height for every scenario.
 const broadTransition = spanX >= 36 || (skaterMinX <= -20 && skaterMaxX >= 20);
 const relevantGoalies = broadTransition ? goalies
  : attackingRight ? goalies.filter(goalie => goalie.x >= 0)
    : attackingLeft ? goalies.filter(goalie => goalie.x <= 0)
      : goalies.filter(goalie => goalie.x >= skaterMinX - X_MARGIN && goalie.x <= skaterMaxX + X_MARGIN);
 const points = [...skaters, ...relevantGoalies, ...puck, ...extras];
 let minX = Math.min(...points.map(point => point.x)) - X_MARGIN;
 let maxX = Math.max(...points.map(point => point.x)) + X_MARGIN;
 let minY = Math.min(...points.map(point => point.y)) - Y_MARGIN;
 let maxY = Math.max(...points.map(point => point.y)) + Y_MARGIN;

 if (broadTransition) {
  minX = FULL_RINK_BOUNDS.minX;
  maxX = FULL_RINK_BOUNDS.maxX;
 } else if (attackingRight) {
  minX = Math.max(0, Math.min(minX, BLUE_LINE_X - .6));
  maxX = FULL_RINK_BOUNDS.maxX;
 } else if (attackingLeft) {
  minX = FULL_RINK_BOUNDS.minX;
  maxX = Math.min(0, Math.max(maxX, -BLUE_LINE_X + .6));
 }
 const xRange = expandRange(minX, maxX, MIN_FOCUS_WIDTH, FULL_RINK_BOUNDS.minX, FULL_RINK_BOUNDS.maxX);
 const yRange = expandRange(minY, maxY, MIN_FOCUS_HEIGHT, FULL_RINK_BOUNDS.minY, FULL_RINK_BOUNDS.maxY);
 return { minX: xRange.start, maxX: xRange.end, minY: yRange.start, maxY: yRange.end };
}
