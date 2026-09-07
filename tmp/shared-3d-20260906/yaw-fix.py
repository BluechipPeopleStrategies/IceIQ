from pathlib import Path
p=Path('src/one-on-one/hockeyPlayerRig.js');s=p.read_text().replace('new THREE.Euler(lean*.045,look,','new THREE.Euler(lean*.045,-look,');p.write_text(s)
p=Path('tools/blender/export-player-candidates.mjs');s=p.read_text();s=s.replace('const records=[];', '''const sourceFiles=[];
for(const name of ['src/one-on-one/hockeyPlayerRig.js','src/visuals/characterPresentation.js','tools/blender/export-player-candidates.mjs']) {
 const bytes=await fs.readFile(name);
 const snapshot=path.join('source',name);
 await fs.mkdir(path.dirname(path.join(output,snapshot)),{recursive:true});
 await fs.writeFile(path.join(output,snapshot),bytes);
 sourceFiles.push({file:name,snapshot:snapshot.replaceAll('\\\\','/'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
const records=[];''');s=s.replace("{generatedAt:new Date().toISOString(),units:","{generatedAt:new Date().toISOString(),sourceFiles,units:");p.write_text(s)
