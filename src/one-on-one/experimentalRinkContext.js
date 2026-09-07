// Existing scenes default to navy +x; staged scenes may explicitly reverse it.
// Report puck zone in rink coordinates, never camera-relative left/right.
export function experimentalRinkContext(scene,attackDirection=1){
 const rawX=scene?.puck?.x;
 if(!Number.isFinite(rawX))return 'Navy attacks Gold’s net';
 const x=rawX * (attackDirection===-1?-1:1);
 if(x < -7.62)return 'Navy defensive zone · Navy defends this end';
 if(x > 7.62)return 'Navy attacking zone · Gold defends this end';
 return 'Neutral zone · Navy attacks toward Gold’s net';
}
