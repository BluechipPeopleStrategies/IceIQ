import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const candidate=path.join(root,'tmp/practice-ui-release');
const files=JSON.parse(fs.readFileSync(path.join(root,'tmp/practice-ui-files.json'),'utf8').replace(/^\uFEFF/,''));
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
if(git(['diff','--cached','--name-only'])) throw Error('Index was not empty; refusing to mix staged work');
const partial=[];
for(const file of files){
  if(file.includes('..')||path.isAbsolute(file))throw Error(`Invalid path ${file}`);
  const source=path.join(candidate,file),destination=path.join(root,file);
  if(!fs.existsSync(source))throw Error(`Missing candidate ${file}`);
  if(!fs.existsSync(destination)){
    fs.mkdirSync(path.dirname(destination),{recursive:true}); fs.copyFileSync(source,destination);
  }
  if(!fs.readFileSync(source).equals(fs.readFileSync(destination)))partial.push(file);
  const hash=git(['hash-object','-w',`--path=${file}`,source]);
  git(['update-index','--add','--cacheinfo',`100644,${hash},${file}`]);
}
console.log(JSON.stringify({stagedFiles:files.length,workingCopiesPreserved:partial},null,2));
