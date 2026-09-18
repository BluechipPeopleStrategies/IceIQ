import {useState} from 'react';
const ACCESSORIES=[
  ['Cloth stick tape','For the blade or handle of your stick. Ask an adult or coach to help you tape it.'],
  ['Clear sock tape','Flexible tape for securing hockey socks. Keep it comfortable, not tight.'],
  ['Soft/stretch grip tape','A softer grip around the stick handle. An optional preference, not protective gear.'],
  ['Shield-approved anti-fog','For a clear full-face shield (“fishbowl”), only if its maker approves that exact product. An adult checks and applies it.'],
  ['Soft cleaning cloth','A clean, soft cloth for the shield; follow its cleaning instructions.'],
  ['Water bottle','Bring your own filled bottle for breaks.'],
  ['Hard skate guards','Blade covers for walking off the ice. Remove them before stepping onto the ice.'],
  ['Soft blade soakers','Soft covers for storage after drying the blades. These are not walking guards.'],
];
export default function GearAccessories(){
  const [chosen,setChosen]=useState([]);
  return <details className="ff-accessories"><summary>Optional accessories: useful extras for the bag</summary><p>Choose extras you want to remember for this visit. These do not count toward the 13 gear types.</p><div className="ff-accessory-grid">{ACCESSORIES.map(([name,note],i)=><button key={name} aria-pressed={chosen.includes(i)} onClick={()=>setChosen(c=>c.includes(i)?c.filter(n=>n!==i):[...c,i])}><span className="ff-accessory-art" aria-hidden="true" style={{backgroundPosition:`${(i%4)*100/3}% ${Math.floor(i/4)*100}%`}}/><strong>{name}</strong><span>{note}</span><small>{chosen.includes(i)?'On my extras list · tap to remove':'Add to my extras list'}</small></button>)}</div><p role="status">{chosen.length} optional extras on your list for this visit.</p><p className="ff-note">For shield care, check the exact product manual. For example, Bauer’s Concept 3 instructions restrict anti-fog and other chemicals to products specifically approved and sold by Bauer for that shield. <a href="https://www.bauer.com/pages/product-manuals" target="_blank" rel="noreferrer">Bauer product manuals</a>.</p></details>;
}
