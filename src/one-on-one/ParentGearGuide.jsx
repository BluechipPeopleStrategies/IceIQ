import {useState} from 'react';
import './ParentGearGuide.css';
import {GearArt} from './GearPacking.jsx';
const HC='https://www.hockeycanada.ca/en-ca/videos?title=equipment-fitting-player-';
const BAUER='https://www.bauer.com/pages/size-guide-';
const rows=[
  ['Helmet & face protection','Measure head circumference using the chosen model’s measuring instructions; compare with its size chart.','Check forehead position, a steady fit and comfortable chin-cup contact. The helmet and cage/shield must be compatible.',HC+'the-hockey-helmet','Hockey Canada helmet checks',BAUER+'helmet'],
  ['Shoulder pads','Measure around the widest part of the chest. Compare chest, height and weight with the exact model’s chart.','Pads rest on the shoulders; arm and body straps secure them. They should stay put as your child moves.',HC+'shoulder-pads','Hockey Canada shoulder-pad checks',BAUER+'shoulder-pads'],
  ['Elbow pads','Bauer’s guide measures from the back of the elbow to the wrist crease with the arm bent 90°. Use that brand’s chart.','Elbows sit in the pad pockets. Check left/right labels, comfortable straps and whether the pads stay in place when bending.',HC+'elbow-pads','Hockey Canada elbow-pad checks',BAUER+'elbow-pads'],
  ['Hockey gloves','Bauer measures from the middle-finger tip to the wrist crease. Compare that measurement with its glove chart.','Fingers reach the ends comfortably, wrists move freely and the child can grip their stick.',HC+'hockey-gloves','Hockey Canada glove checks',BAUER+'gloves'],
  ['Hockey pants','Check the model’s waist/pant-size, height and weight chart. Ask a fitter if the measurements fall into different sizes.','Pants stay at the hips, slightly overlap the knee pads and allow movement without sagging.',HC+'hockey-pants','Hockey Canada pant checks','https://ca.bauer.com/pages/size-guide-player-pants'],
  ['Shin pads','Bauer measures from the kneecap centre to the centre of the outer ankle. Use its chart and try the pads with skates.','Knees sit in the centre pockets. Straps feel comfortable and stop slipping; check the lower pad/skate relationship in the fitting demonstration.',HC+'shin-pads','Hockey Canada shin-pad checks',BAUER+'shin-pads'],
  ['Skates','Have both feet measured and use the specific skate model’s sizing system. Shoe size alone is not a fitting check.','Heels stay comfortably in place. Avoid an oversized boot bought for growing room; ask a skate fitter to check fit.',HC+'skates','Hockey Canada skate checks'],
  ['Neck guard','Use the neck-size range and fitting instructions on the product.','Check for the BNQ mark, comfortable fit and coverage across the front of the throat.',HC+'neck-guard','Hockey Canada neck-guard checks'],
  ['Groin / pelvic protection','Choose protection suited to the child’s anatomy, then follow the product’s size chart.','Try the protective shorts/support as part of the kit and have an adult check comfort and placement.',HC+'pelvic-area-protection','Hockey Canada pelvic-protection guide'],
  ['Mouthguard','Follow the product’s fitting directions; ask the child’s dentist about fit, especially with braces.','Recheck as the mouth grows. Replace a damaged or poorly fitting mouthguard.','https://www.mouthhealthy.org/all-topics-a-z/mouthguards','ADA mouthguard guidance'],
  ['Jersey & hockey socks','Try the clothing over the pads it will cover; use the clothing manufacturer’s length/size chart.','The jersey should allow arm movement over the pads without being oversized. Check the sock attachment with the protective shorts.',HC+'hockey-jersey','Hockey Canada jersey checks'],
  ['Stick','Choose a youth-appropriate stick with help from a coach or fitter; check length while wearing skates.','Hockey Canada’s beginner guide uses approximately mouth/nose height in skates as a starting point. Confirm before cutting.',HC+'hockey-stick','Hockey Canada stick guide'],
];
// Manufacturer reference, verified in the live expanded chart on 2026-09-18.
const shoulders=[['Youth S',20,22],['Youth M',22,23],['Youth L',23,25],['Junior S',24,26],['Junior M',26,28],['Intermediate M',28,32]];
export default function ParentGearGuide(){
  const [metric,setMetric]=useState(true);
  return <details className="pg-guide"><summary>For parents: gear fit & sizing</summary>
    <h2>Fit the child, then choose the size.</h2>
    <p>U7, U9 and U11 are playing groups—not equipment sizes. Start with measurements and the exact brand/model chart, then try the pieces together. A chart cannot confirm fit. Ask a knowledgeable hockey-equipment fitter to check the actual kit.</p>
    <section className="pg-helmet"><h3>Helmet fit: front and side examples</h3><img src="/assets/gear/helmet-fit-kids-v1.png" alt="Illustrated front and side views of a child wearing a level hockey helmet with a full face cage and chin cup" loading="lazy"/>
      <p className="ff-note">AI-generated visual examples. Use the checks below and the official demonstration to assess real equipment; the picture itself is not a safety approval.</p>
      <ol><li><strong>Forehead:</strong> Hockey Canada describes about one to two finger widths above the eyebrows. Follow the exact helmet’s instructions.</li><li><strong>Chin:</strong> the chin rests comfortably in its cup, without a hanging gap.</li><li><strong>Stability:</strong> adjust and fasten according to the model’s instructions; the helmet should not wobble. Check the actual helmet’s CSA certification.</li></ol>
      <a href={HC+'the-hockey-helmet'} target="_blank" rel="noreferrer">Watch Hockey Canada’s helmet-fitting example</a>
    </section>
    <section><h3>Shoulder pads: a real sizing example</h3><GearArt id="shoulder" label="Hockey shoulder pads"/><p>Measure chest circumference at its widest point. These are <strong>Bauer reference ranges</strong>, not universal sizes or a recommendation for your child. Also compare height and weight on the full chart and check the model you are buying.</p>
      <div className="ff-options" aria-label="Shoulder chart units"><button aria-pressed={metric} onClick={()=>setMetric(true)}>Centimetres</button><button aria-pressed={!metric} onClick={()=>setMetric(false)}>Inches</button></div>
      <table><caption>Bauer shoulder-pad chest ranges · checked September 18, 2026</caption><thead><tr><th scope="col">Category & size</th><th scope="col">Chest circumference</th></tr></thead><tbody>{shoulders.map(([name,min,max])=><tr key={name}><th scope="row">{name}</th><td>{metric?`${(min*2.54).toFixed(1)}–${(max*2.54).toFixed(1)} cm`:`${min}–${max} in`}</td></tr>)}</tbody></table>
      <p className="ff-note">Centimetres are converted from the published inch ranges. Overlap is expected; “Youth L” and “Junior S” are different categories. Do not choose by age alone.</p><a href={BAUER+'shoulder-pads'} target="_blank" rel="noreferrer">Open Bauer’s full shoulder-pad chart and measuring guide</a>
    </section>
    <h3>Check the rest of the kit</h3><div className="pg-items">{rows.map(([name,measure,check,url,label,chart])=><details key={name}><summary>{name}</summary><p><strong>Start here:</strong> {measure}</p><p><strong>Try it on:</strong> {check}</p><p><a href={url} target="_blank" rel="noreferrer">{label}</a>{chart&&<> · <a href={chart} target="_blank" rel="noreferrer">Manufacturer size chart</a></>}</p></details>)}</div>
    <p className="ff-note">Sources checked September 18, 2026. Player equipment; goalie fitting is different. Ask for a new fit check as your child grows. This guide does not award a “safe to play” result.</p>
  </details>;
}
