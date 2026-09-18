import {useRef,useState} from 'react';
import {GEAR_ART_IDS,GEAR_CHALLENGES,matchesGearChallenge,gearChoices,packingChoice} from './gearPacking.js';
import MovableIllustration from './MovableIllustration.jsx';
import './GearPacking.css';

export function GearArt({id,label,large=false}){
  const index=GEAR_ART_IDS.indexOf(id);
  return <span className={`ff-gear-art${large?' is-large':''}`} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} style={{backgroundPosition:`${(index%4)*100/3}% ${[0,33,64.8,96][Math.floor(index/4)]}%`}}/>;
}
export default function GearPacking({gear,packed,onPack,onEmpty,ageBand}){
  const [selected,setSelected]=useState(null),[note,setNote]=useState('What belongs in your hockey bag?'),[dragging,setDragging]=useState(false);
  const [game,setGame]=useState(false),[round,setRound]=useState(0),[gameNote,setGameNote]=useState('');
  const cards=useRef(null);
  const choices=gearChoices(gear),item=choices.find(g=>g[0]===selected);
  function choose(id,remove=false){
    const result=packingChoice(gear,packed,id);
    if(result.kind==='unknown')return;
    if(game&&round<GEAR_CHALLENGES.length&&!remove){
      if(matchesGearChallenge(round,id)){setRound(r=>r+1);setGameNote(`You found it! ${round===GEAR_CHALLENGES.length-1?'Three clues solved. Try free packing or play again.':`Next clue: ${GEAR_CHALLENGES[round+1].prompt}`}`);}
      else {setSelected(id);setNote(result.note);setGameNote(result.kind==='play'?result.note:'That is hockey gear, but try another piece for this clue.');return;}
    }
    setSelected(id);setNote((remove&&result.kind==='gear'?'Taken out. ':'')+result.note);
    if(result.kind==='gear')onPack(id,remove);
  }
  return <>
    <div className="ff-options" aria-label="Packing game mode"><button aria-pressed={!game} onClick={()=>setGame(false)}>Free packing</button><button aria-pressed={game} onClick={()=>{setGame(true);setRound(0);setGameNote('');}}>Find the gear</button></div>
    {game&&<section className="ff-gear-challenge" aria-label="Find the gear challenge"><strong>{round<GEAR_CHALLENGES.length?`Clue ${round+1} of ${GEAR_CHALLENGES.length}`:'Three clues solved'}</strong><h2>{GEAR_CHALLENGES[round]?.prompt||'Nice finding! Ready to pack the rest?'}</h2><p role="status">{gameNote||'Choose a picture below. You can try as often as you like.'}</p>{round<GEAR_CHALLENGES.length?<button onClick={()=>setGameNote(GEAR_CHALLENGES[round].hint)}>Give me a hint</button>:<button onClick={()=>{setRound(0);setGameNote('');}}>Play again</button>} <button onClick={()=>setGame(false)}>Return to free packing</button></section>}
    <p>{ageBand==='U7'?'Pack together with an adult. Say each name as you put it in.':'Choose the playing gear and explain why each piece belongs.'} A few silly extras have sneaked in! Drag to the open bag or tap a card. {game&&round<GEAR_CHALLENGES.length?'Choose the item that matches the clue.':'Tap packed gear again to unpack.'}</p>
    <div className="ff-gear-layout">
      <div className="ff-gear" ref={cards}>{choices.map(g=><button key={g[0]} data-foundation-gear={g[0]} draggable aria-pressed={gear.some(item=>item[0]===g[0])?packed.includes(g[0]):undefined} aria-describedby={selected===g[0]?'ff-packing-feedback':undefined} onDragStart={e=>{e.dataTransfer.setData('text/plain',g[0]);e.dataTransfer.effectAllowed='copy';setDragging(true);}} onDragEnd={()=>setDragging(false)} onClick={()=>choose(g[0],!(game&&round<GEAR_CHALLENGES.length)&&packed.includes(g[0]))}>
        <GearArt id={g[0]}/><span>{g[1]}</span><small>{game&&round<GEAR_CHALLENGES.length?'Tap to answer the clue':packed.includes(g[0])?'Packed · tap to remove':selected===g[0]&&packingChoice(gear,packed,g[0]).kind==='play'?'For after hockey':'Drag or tap to pack'}</small>
        {selected===g[0]&&packingChoice(gear,packed,g[0]).kind==='play'&&<span className="ff-toy-note">{g[2]}</span>}
      </button>)}</div>
      <aside className={`ff-bag ff-real-bag${dragging?' is-over':''}`} aria-label="Hockey bag drop area" onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);choose(e.dataTransfer.getData('text/plain'));}}>
        <h2>Your hockey bag</h2>
        <div className="ff-bag-scene"><img src="/assets/gear/hockey-bag-v1.png" alt="Open navy hockey equipment bag with gold trim" draggable="false"/><span className="ff-bag-drop-label">{dragging?'Drop it in here':'Drop gear into the bag'}</span></div>
        <p role="status"><strong>{packed.length} of {gear.length}</strong> gear types packed</p>
        <progress max={gear.length} value={packed.length} aria-label="Gear packed"/>
        <p id="ff-packing-feedback" aria-live="polite" aria-atomic="true">{note}</p>
        {packed.length>0&&<div className="ff-packed-items" aria-label="Packed gear">{packed.map(id=><button key={id} aria-label={`Unpack ${gear.find(g=>g[0]===id)?.[1]}`} onClick={()=>{choose(id,true);cards.current?.querySelector(`[data-foundation-gear="${id}"]`)?.focus();}}><GearArt id={id}/></button>)}</div>}
        <button onClick={()=>{onEmpty();setSelected(null);setNote('Bag emptied. Ready to try again?');}}>Empty the bag</button>
        {item&&<details className="ff-gear-inspect"><summary>Look closely at this item</summary><h3>{item[1]}</h3><MovableIllustration key={item[0]} label={item[1]}><GearArt id={item[0]} label={item[1]} large/></MovableIllustration></details>}
      </aside>
    </div>
  </>;
}
