import data from './foundationContent.json' with {type:'json'};

export function rinkLandmarks(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return [];
  const ax=Math.abs(x),ay=Math.abs(y),hits=[];
  const add=id=>{if(!hits.includes(id))hits.push(id);};
  if(y>=-16.8&&y<=-14.8&&((x>=-16&&x<=-3)||(x>=3&&x<=16)))return ['benches'];
  if(ax<3.2&&y>10&&y<14)add('official');
  const radius=6.7,qx=Math.max(ax-(30.48-radius),0),qy=Math.max(ay-(12.954-radius),0);
  const edge=Math.hypot(qx,qy)-radius;
  if(ax>31.2||ay>13.7||edge>.7)return hits;
  if(edge>-.8)add('boards');
  if(Math.hypot(x,y)<1)add('dot');
  if(Math.abs(ax-7.9248)<.65)add('blue');
  if(ax<.5)add('centre');
  if(Math.abs(ax-26.91384)<.5)add('goal');
  if(ax>=26.85&&ax<28.5&&ay<1.25)add('net');
  if(ax>24.2&&ax<26.95&&ay<1.9)add('crease');
  if(ax>23.8&&ax<26.85&&ay<3)add('netfront');
  if(ax>28.4&&ay<4)add('behind');
  if(Math.abs(ax-6.2)<1&&Math.abs(ay-6.25)<1)add('neutraldots');
  if(Math.abs(ax-21.03)<1&&Math.abs(ay-1.75)<.8)add('hash');
  if(data.lines.circles.some(([cx,cy])=>Math.hypot(x-cx,y-cy)<4.9))add('circles');
  if(ax>25&&ay>8.5)add('corners');
  if(ax>=14&&ax<=23&&ay>10.3)add('halfwall');
  if(ax>8.5&&ax<12.5&&ay>5.5&&ay<10.5)add('points');
  if(ax>=18&&ax<24&&ay<4)add('slot');
  if(ax>=11.5&&ax<18&&ay<5)add('highslot');
  if(edge<=0) add(x < -7.9248?'dz':x>7.9248?'oz':'nz');
  return hits;
}
export const initialRolePositions=()=>Object.fromEntries(Object.entries(data.roles).map(([id,r])=>[id,{x:r.x,y:r.y}]));
export function rinkRole(x,y,positions=initialRolePositions()){
  return Object.entries(positions).map(([id,p])=>({id,d:Math.hypot(x-p.x,y-p.y)})).filter(p=>p.d<=2.6).sort((a,b)=>a.d-b.d)[0]?.id||null;
}
export function clampRinkPoint(x,y){
  x=Math.max(-29.5,Math.min(29.5,Number.isFinite(x)?x:0));
  y=Math.max(-12,Math.min(12,Number.isFinite(y)?y:0));
  const cx=23.78,cy=6.254,r=5.7,dx=Math.max(Math.abs(x)-cx,0),dy=Math.max(Math.abs(y)-cy,0),d=Math.hypot(dx,dy);
  if(d>r){x=Math.sign(x)*(cx+dx*r/d);y=Math.sign(y)*(cy+dy*r/d);}
  return {x,y};
}
