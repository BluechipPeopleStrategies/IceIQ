// Isolated from qbLoader, approved scenarios and mastery. These are original
// experimental teaching drafts, explicitly requested for learner inspection.
const files=import.meta.glob('./experimental-bank/u*.json',{eager:true,import:'default'});
import {composeExperimentalBank} from './experimentalExpansionCore.js';
import release from './experimental-expansion/release.json';
const newFiles=import.meta.glob('./experimental-expansion/u*-scenarios.json',{eager:true,import:'default'});
const additions=import.meta.glob('./experimental-expansion/u*-additions.json',{eager:true,import:'default'});
const released=entries=>Object.entries(entries).filter(([path])=>release.ages.some(age=>path.includes(`/${age.toLowerCase()}-`))).flatMap(([,value])=>value);
export const EXPERIMENTAL_BANK=composeExperimentalBank(Object.values(files).flat(),released(newFiles),released(additions));
