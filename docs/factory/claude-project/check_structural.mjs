import { validateExperimentalBank } from './validation/src/one-on-one/experimentalBankCore.js';
import fs from 'node:fs';
const p = JSON.parse(fs.readFileSync('./packets/packet-32.json', 'utf8'));
const s = p.scenarios.find(x => x.id === 'exp26-u15-010');
const errors = validateExperimentalBank([s]);
console.log('errors:', errors);
