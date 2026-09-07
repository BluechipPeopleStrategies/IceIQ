from pathlib import Path
p=Path('src/one-on-one/hockeyPlayerRig.js');s=p.read_text();anchor='function bladeGeometry() {'
helper='''// Optional shape study: one continuous torso skin with shared rings, no
// stacked hem/yoke plates. It stays a procedural Blender-editable candidate.
function roundedStudyTorso(width = 1) {
  const rings = [[.945,.46,.31,.008],[.99,.49,.335,0],[1.08,.51,.35,-.008],[1.18,.585,.355,-.026],[1.265,.62,.345,-.040],[1.31,.53,.31,-.048],[1.335,.34,.245,-.052]];
  const segments=32, vertices=[],uvs=[],indices=[];
  for(const [y,w,d,z] of rings) for(let j=0;j<segments;j++) {
    const angle=j/segments*Math.PI*2,c=Math.cos(angle),t=Math.sin(angle);
    vertices.push(Math.sign(c)*Math.abs(c)**.8*w*width/2,y,Math.sign(t)*Math.abs(t)**.8*d/2+z);
    uvs.push(j/segments,y);
  }
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++) {
    const a=i*segments+j,b=i*segments+(j+1)%segments,c=a+segments,d=b+segments;
    indices.push(a,c,b,b,c,d);
  }
  for(let j=1;j<segments-1;j++)indices.push(0,j,j+1,(rings.length-1)*segments,(rings.length-1)*segments+j+1,(rings.length-1)*segments+j);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

'''
s=s.replace(anchor,helper+anchor).replace('showStick = true, ageBand, stage','showStick = true, ageBand, stage, finish');s=s.replace('const group = new THREE.Group();','const group = new THREE.Group();\n  const roundedStudy = finish === \'rounded-study\';',1)
s=s.replace('''    partNames.add(name);
''','''    if (roundedStudy && ['shoulder-yoke','chest-crest-border','chest-crest','crest-bar'].includes(name)) {geometry.dispose();return;}
    partNames.add(name);
''',1)
s=s.replace("    rod(`${name}-stripe`", "    if (roundedStudy) return;\n    rod(`${name}-stripe`",1)
s=s.replace("  for (const [a, b, wa, wb, da, db, la, lb, material] of levels) part('tailored-jersey', jerseySection(a, b, wa * width, wb * width, da, db, la, lb), material);", "  if (roundedStudy) {\n    part('continuous-rounded-jersey',roundedStudyTorso(width),'jersey');\n    for(const side of [-1,1]) sphere('rounded-shoulder-padding',[.135,.102,.144],'jersey',[side*.248*width,1.26,-.038]);\n  } else for (const [a, b, wa, wb, da, db, la, lb, material] of levels) part('tailored-jersey', jerseySection(a, b, wa * width, wb * width, da, db, la, lb), material);")
s=s.replace("    bandedArm('upper-sleeve', shoulder, elbow, goalie ? .126 : .107);", "    bandedArm('upper-sleeve', shoulder, elbow, goalie ? .126 : .107);\n    if(roundedStudy) sphere('rounded-elbow-padding',[goalie?.119:.101,.108,.101],'jersey',elbow);")
s=s.replace("group.userData = { stage:", "group.userData = { finish: roundedStudy ? 'rounded-study' : 'integration-candidate', stage:")
p.write_text(s)
p=Path('tools/blender/export-player-candidates.mjs');s=p.read_text().replace('const records=[];',"const finish=process.argv[3] === 'rounded-study' ? 'rounded-study' : undefined;\nconst records=[];").replace('buildHockeyPlayerRig({stage,goalie,colour})','buildHockeyPlayerRig({stage,goalie,colour,finish})').replace('file:name,stage,goalie,colour,bytes:',"file:name,stage,goalie,colour,finish:finish??'integration-candidate',bytes:");p.write_text(s)
