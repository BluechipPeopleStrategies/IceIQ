import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
// Explicit public teaching artifacts only. Never copy the whole docs tree.
const artifacts = [
  ['docs/factory/calibration/index.html', 'docs/factory/calibration/index.html'],
  ['docs/factory/calibration/README.md', 'docs/factory/calibration/README.md'],
  ['docs/factory/calibration/skating-movement-2026-09-06.json', 'docs/factory/calibration/skating-movement-2026-09-06.json'],
  ['docs/factory/curriculum-map/index.html', 'docs/factory/curriculum-map/index.html'],
  ['docs/factory/curriculum-map/coverage.json', 'docs/factory/curriculum-map/coverage.json'],
  ['docs/factory/curriculum-map/README.md', 'docs/factory/curriculum-map/README.md'],
  ['docs/factory/RinkReads-Claude-Project-2026-09-05.zip', 'docs/factory/RinkReads-Claude-Project-2026-09-05.zip'],
];

export async function createPracticeContentAssets() {
  return Promise.all(artifacts.map(async ([sourcePath, fileName]) => ({
    fileName, source: await readFile(new URL(sourcePath, root)),
  })));
}

export function practiceContentAssetsPlugin() {
  return {
    name: 'rinkreads-public-practice-content',
    apply: 'build',
    async generateBundle() {
      for (const asset of await createPracticeContentAssets()) this.emitFile({ type: 'asset', ...asset });
    },
  };
}
