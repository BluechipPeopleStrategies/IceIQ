// Experimental scenes use the canonical navy +x attack direction.
// Report puck zone in rink coordinates, never camera-relative left/right.
export function experimentalRinkContext(scene){
 const x=scene?.puck?.x;
 if(!Number.isFinite(x))return 'Navy attacks Gold’s net';
 if(x < -7.62)return 'Navy defensive zone · Navy defends this end';
 if(x > 7.62)return 'Navy attacking zone · Gold defends this end';
 return 'Neutral zone · Navy attacks toward Gold’s net';
}
