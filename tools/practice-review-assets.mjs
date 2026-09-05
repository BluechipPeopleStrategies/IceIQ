import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const screenshots = [
  'read-scene-desktop.png',
  'all-scenario-source-contact.png',
  'u11-three-reads-desktop.png',
  'brain-gym-bluechip-desktop.png',
  'shootout-bluechip-desktop.png',
  'character-studio-gold-goalie-desktop.png',
];
const characters = [
  'skater-navy-transparent-v1.png',
  'skater-gold-transparent-v1.png',
  'skater-black-light-skin-transparent-v2.png',
  'goalie-navy-transparent-v1.png',
  'goalie-gold-transparent-v1.png',
  'goalie-black-transparent-v1.png',
];

const read = path => readFile(new URL(path, root));
const noIndex = html => html.replace('</head>', '<meta name="robots" content="noindex,nofollow"></head>');

// Publish an explicit review-artifact allowlist, never the docs tree or local dev server.
export async function createPracticeReviewAssets() {
  let review = (await read('docs/one-on-one/review.html')).toString();
  review = review
    .replaceAll('href="evidence/', 'href="/review/images/')
    .replaceAll('src="evidence/', 'src="/review/images/')
    .replaceAll('../art/animation-pack/index.html', '/review/characters/')
    .replace('<section class="note">', '<section class="note" id="review-notes">')
    .replace('Read the full review', 'What is ready?')
    .replace('The new arena is a development preview.', 'The arena is a shared prototype with device-local practice saves.')
    .replace('the new arena is a development preview.', 'the arena is a shared prototype with device-local practice saves.')
    .replace('the local adapter and feedback panels work, but no key is configured. No live AI judgment has run.', 'AI feedback is not enabled on this shared preview. Answers are not sent for AI grading.')
    .replace(/<div class="links"><a href="verification\.md">[\s\S]*?<\/div>/, '<div class="links"><a href="/#practice-arena">Open the arena</a><a href="/review/characters/">View the characters</a></div>')
    .replace('<a href="site-quality-review.md">Review findings and fixes</a>', '<a href="#review-notes">Preview status</a>')
    .replaceAll('href="morning-review.md"', 'href="#review-notes"');

  let studio = (await read('docs/art/animation-pack/index.html')).toString();
  studio = studio
    .replaceAll("url('fonts/Inter.ttf')", "url('/fonts/Inter.ttf')")
    .replaceAll("url('fonts/PlayfairDisplay.ttf')", "url('/fonts/PlayfairDisplay.ttf')")
    .replace('href="#" aria-label="RinkReads Character Studio"', 'href="/review/" aria-label="Return to the RinkReads review"')
    .replace(/<section class="pack-card glass">[\s\S]*?<\/section>/, '<section class="pack-card glass"><h3>The game preview</h3><a class="pack-link" href="/#practice-arena">Practice arena →</a><a class="pack-link" href="/#shootout-now">Goalie shootout →</a><a class="pack-link" href="/review/">Return to the review →</a></section>')
    .replace('<a href="README.md">Read the full pack notes</a>', '<a href="/review/">Return to the review</a>');

  const assets = [
    { fileName: 'review/index.html', source: noIndex(review) },
    { fileName: 'review/characters/index.html', source: noIndex(studio) },
  ];
  for (const file of screenshots) {
    assets.push({ fileName: 'review/images/' + file, source: await read('docs/one-on-one/evidence/' + file) });
  }
  for (const file of characters) {
    assets.push({ fileName: 'review/characters/references/' + file, source: await read('docs/art/animation-pack/references/' + file) });
  }
  return assets;
}

export function practiceReviewAssetsPlugin() {
  return {
    name: 'rinkreads-public-practice-review',
    apply: 'build',
    async generateBundle() {
      for (const asset of await createPracticeReviewAssets()) {
        this.emitFile({ type: 'asset', ...asset });
      }
    },
  };
}
