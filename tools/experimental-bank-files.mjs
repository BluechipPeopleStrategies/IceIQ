import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {composeExperimentalBank} from '../src/one-on-one/experimentalExpansionCore.js';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const readJson = path => JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
export function readBankFiles({originalOnly=false,ages=[]}={}) {
  const base = join(projectRoot,'src/one-on-one/experimental-bank');
  const expansion = join(projectRoot,'src/one-on-one/experimental-expansion');
  const original = ['u7','u9','u11','u13','u15','u18'].flatMap(age => readJson(join(base,`${age}.json`)));
  const files = !originalOnly && existsSync(expansion) ? readdirSync(expansion).sort().filter(f=>!ages.length||ages.some(age=>f.startsWith(`${age.toLowerCase()}-`))) : [];
  const newScenarios = files.filter(f => /^u\d+-scenarios\.json$/.test(f)).flatMap(f => readJson(join(expansion,f)));
  const additions = files.filter(f => /^u\d+-additions\.json$/.test(f)).flatMap(f => readJson(join(expansion,f)));
  return {original, newScenarios, additions, bank:composeExperimentalBank(original,newScenarios,additions)};
}
