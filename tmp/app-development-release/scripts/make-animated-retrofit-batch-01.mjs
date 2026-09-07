import fs from "node:fs";

const input = "docs/animated-retrofit-candidates.json";
const output = "docs/animated-retrofit-batch-01.md";

const candidates = JSON.parse(fs.readFileSync(input, "utf8"));

const high = candidates
  .filter((c) => c.fit === "high-animation-fit")
  .slice(0, 12);

const variants = candidates
  .filter((c) => c.fit === "variant-candidate")
  .slice(0, 8);

let md = `# Animated Retrofit Batch 01

Purpose: choose the first existing IceIQ/RinkReads questions or scenarios to retrofit into animated plays.

## Recommended First Conversions

`;

if (!high.length) {
  md += `_No high-animation-fit candidates found._\n\n`;
} else {
  high.forEach((item, index) => {
    md += `### ${index + 1}. ${item.file}\n\n`;
    md += `- **Score:** ${item.score}\n`;
    md += `- **Suggested use:** ${item.suggestedUse}\n`;
    md += `- **Matched terms:** ${item.matchedAnimationTerms.join(", ") || "none"}\n`;
    md += `- **Snippet:** line ${item.snippet.line}: ${item.snippet.text || "_No snippet_"}\n`;
    md += `- **Decision:** TODO - full animated scenario / variant / keep static\n\n`;
  });
}

md += `\n## Recommended Variant Candidates\n\n`;

if (!variants.length) {
  md += `_No variant candidates found._\n\n`;
} else {
  variants.forEach((item, index) => {
    md += `### ${index + 1}. ${item.file}\n\n`;
    md += `- **Score:** ${item.score}\n`;
    md += `- **Suggested use:** ${item.suggestedUse}\n`;
    md += `- **Matched animation terms:** ${item.matchedAnimationTerms.join(", ") || "none"}\n`;
    md += `- **Matched variant terms:** ${item.matchedVariantTerms.join(", ") || "none"}\n`;
    md += `- **Snippet:** line ${item.snippet.line}: ${item.snippet.text || "_No snippet_"}\n`;
    md += `- **Decision:** TODO - attach to existing play / create new variant family / keep static\n\n`;
  });
}

md += `\n## Selection Notes\n\nPick 5–10 from this list for the first retrofit build. Prioritize scenarios where the correct answer depends on spacing, pressure, lanes, timing, or body position.\n`;

fs.writeFileSync(output, md, "utf8");

console.log(`Wrote ${output}`);
