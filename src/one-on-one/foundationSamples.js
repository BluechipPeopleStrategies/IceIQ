export const HELMET_PARTS = [
  {id:'shell',name:'Outer shell',description:'The hard outside of the helmet covers the head. An adult checks the real helmet and its fit.'},
  {id:'cage',name:'Face cage',description:'The cage is the wire face protector. An adult checks that it is attached and fits correctly.'},
  {id:'strap',name:'Chin strap',description:'The strap fastens under the chin to help keep the helmet in place. An adult checks the fastening and fit.'},
];
export const HOLDING_DURATION = 2400;
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,n)=>a.map(v=>v*n);
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),len=a=>Math.hypot(...a),unit=a=>mul(a,1/len(a));
// Fixed-length upper/lower arm. Bend away from the body in the target plane.
export function elbowFor(shoulder,wrist,side){
  const delta=sub(wrist,shoulder),d=len(delta),axis=unit(delta),upper=.57,lower=.55;
  const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  const outward=[side,0,0],bend=unit(sub(outward,mul(axis,dot(outward,axis))));
  return add(add(shoulder,mul(axis,along)),mul(bend,height));
}
export function holdingPose(progress){
  const t=Math.max(0,Math.min(1,progress)),e=t*t*(3-2*t);
  return [-1,1].map(side=>{
    const shoulder=[side*.47,.74,0],start=[side*.62,-.30,.20];
    const end=side===1?[-.08,.43,.61]:[-.10,.47,.73];
    const wrist=start.map((v,i)=>v+(end[i]-v)*e);
    return {side,shoulder,wrist,elbow:elbowFor(shoulder,wrist,side)};
  });
}
