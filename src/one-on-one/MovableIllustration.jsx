import {useRef,useState} from 'react';
import './MovableIllustration.css';

// Local viewing state only: moving the drawing never changes hockey coordinates or answers.
export default function MovableIllustration({children,label}){
  const [view,setView]=useState({x:0,y:0,zoom:1});
  const drag=useRef(null),suppressClick=useRef(false);
  const move=(dx,dy)=>setView(v=>({...v,x:Math.max(-45,Math.min(45,v.x+dx)),y:Math.max(-45,Math.min(45,v.y+dy))}));
  const zoom=delta=>setView(v=>({...v,zoom:Math.max(1,Math.min(2.5,Math.round((v.zoom+delta)*100)/100))}));
  return <div className="mi-root">
    <div className="mi-viewport" tabIndex={0} role="group" aria-label={`${label}. Drag to move; arrow keys move the view. Use zoom and reset below.`}
      onPointerDown={e=>{if(e.button!==0||e.target.closest('[role="button"],button,a'))return;const r=e.currentTarget.getBoundingClientRect();drag.current={x:e.clientX,y:e.clientY,w:r.width,h:r.height,moved:false};suppressClick.current=false;e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.moved&&Math.hypot(dx,dy)<4)return;d.moved=true;move(dx/d.w*100,dy/d.h*100);d.x=e.clientX;d.y=e.clientY;}}
      onPointerUp={e=>{suppressClick.current=!!drag.current?.moved;drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
      onPointerCancel={()=>{drag.current=null;suppressClick.current=false;}}
      onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();suppressClick.current=false;}}}
      onKeyDown={e=>{if(e.target!==e.currentTarget)return;const moves={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]};if(moves[e.key]){e.preventDefault();move(...moves[e.key]);}}}>
      <div className="mi-content" style={{transform:`translate(${view.x}%,${view.y}%) scale(${view.zoom})`}}>{children}</div>
    </div>
    <div className="mi-controls" aria-label={`${label} view controls`}><button onClick={()=>zoom(.25)} disabled={view.zoom>=2.5} aria-label={`Zoom in ${label}`}>Zoom in</button><button onClick={()=>zoom(-.25)} disabled={view.zoom<=1} aria-label={`Zoom out ${label}`}>Zoom out</button><button onClick={()=>setView({x:0,y:0,zoom:1})}>Reset view</button><span role="status">{Math.round(view.zoom*100)}%</span></div>
    <p className="mi-hint">Drag to explore the illustration. Keyboard: focus the picture and use arrow keys. Moving the view does not change the activity.</p>
  </div>;
}
