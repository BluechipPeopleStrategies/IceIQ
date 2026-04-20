// Generates tools/rink-editor.jsx from src/Rink.jsx for use by dashboard.html.
//
// The dashboard runs on file:// and cannot use ES module imports. This script
// rewrites the React import as a global-destructure and strips ES exports,
// wrapping everything in an IIFE that hangs `Rink` + `emptyScene` off window.
//
// Run manually after editing src/Rink.jsx:
//     npm run build:dashboard

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(here, "..", "src", "Rink.jsx");
const outPath = path.join(here, "rink-editor.jsx");

const src = fs.readFileSync(srcPath, "utf8");
const patched = src
  .replace(/^import React, \{ useState, useRef, useEffect, useCallback \} from 'react';/m,
           "const { useState, useRef, useEffect, useCallback } = React;")
  .replace(/^export const ZONES =/m, "const ZONES =")
  .replace(/^export const ZONE_KEYS =/m, "const ZONE_KEYS =")
  .replace(/^export function emptyScene/m, "function emptyScene")
  .replace(/^export default function Rink/m, "function Rink");

const out =
  "// AUTO-GENERATED from src/Rink.jsx — do not edit directly.\n" +
  "// When src/Rink.jsx changes, run: npm run build:dashboard\n" +
  "(function(){\n" +
  patched +
  "\nwindow.IceIQRink = Rink;\nwindow.IceIQEmptyScene = emptyScene;\n" +
  "window.dispatchEvent(new CustomEvent('iceiq-rink-ready'));\n" +
  "})();\n";

fs.writeFileSync(outPath, out);
console.log(`Wrote ${path.relative(process.cwd(), outPath)} (${out.length} bytes)`);
