import React from 'react';
import {createRoot} from 'react-dom/client';
import ExperimentalPractice from '/src/one-on-one/ExperimentalPractice.jsx';
import bank from './scenes.json';
createRoot(document.getElementById('root')).render(<><aside style={{padding:20,fontFamily:'system-ui',background:'#203345'}}>Staged companion lessons: 8 scenes, 48 questions. Not admitted to the live bank. This is the actual practice interface with an isolated draft bank and draft attempt key. <a style={{color:'#e7bf61'}} href="./validation.json">Validation</a></aside><ExperimentalPractice bank={bank} playerId="companion-lessons-8-staged-20260907"/></>);
