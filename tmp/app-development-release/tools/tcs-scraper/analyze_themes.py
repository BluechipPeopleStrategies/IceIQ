"""Extract coaching themes from the cleaned transcripts.

Two passes:
1. Curated concept tally — how often known hockey-coaching concepts come up
   (breakout, forecheck, compete, culture, ...), overall and per channel.
2. Data-driven n-grams — top bigrams/trigrams (stopword-filtered) to surface
   themes we didn't pre-list.

Prints a compact report; no raw transcript text is dumped.
"""

import json
import re
from collections import Counter
from pathlib import Path

BASE = Path(__file__).parent / "transcripts"

# curated hockey-coaching concept -> regex alternatives
CONCEPTS = {
    "breakout": r"breakout|break out",
    "forecheck": r"forecheck|fore check|f1|f2|f3",
    "backcheck": r"backcheck|back check|back pressure",
    "neutral zone": r"neutral zone|nz\b|regroup",
    "d-zone coverage": r"d-?zone|defensive zone|d-?zone coverage|man on man|zone coverage",
    "power play": r"power ?play|pp\b|5 on 4|man advantage|umbrella|1-3-1",
    "penalty kill": r"penalty kill|pk\b|4 on 5|shorthanded|short handed|kill",
    "transition": r"transition|rush|odd man|2 on 1|3 on 2",
    "puck protection": r"puck protection|protect the puck|puck control|shoulder|leverage",
    "deception": r"deception|deceptive|fake|deke|misdirection|look off",
    "scanning": r"scanning|shoulder check|head on a swivel|awareness|read the",
    "edge work": r"edge|edges|crossover|mohawk|pivot|tight turn",
    "shooting": r"shooting|shot|release|one timer|one-timer|snap shot|wrist shot",
    "passing": r"passing|pass|saucer|give and go|give-and-go|support",
    "small area games": r"small area|sag\b|cross ?ice|half ice|battle drill|1 on 1",
    "compete / battle": r"compete|battle|work ethic|effort|win a puck|puck battle|physical",
    "practice design": r"practice plan|practice design|station|flow drill|rep|repetition|drill design",
    "skill development": r"skill development|skating|stickhandling|fundamentals|abcs|development model",
    "game sense / iq": r"hockey iq|game sense|read and react|decision making|situational|creativity",
    "culture": r"culture|team culture|standards|accountability|buy-in|buy in|identity",
    "leadership": r"leadership|leader|captain|character|role model|lead by",
    "mindset / psychology": r"mindset|confidence|mental|psychology|pressure|resilience|belief|nerves",
    "communication": r"communication|talk|verbal|feedback|language|vocabulary",
    "long-term dev / ltad": r"ltad|long term|age appropriate|adm|athlete development|multisport|multi-sport",
    "goaltending": r"goalie|goaltend|net|save|butterfly|crease",
    "analytics": r"analytics|data|expected goals|xg\b|tracking|numbers",
}

STOP = set("""the a an and or but if then of to in on for with at by from as is are was were
be been being it its this that these those i you he she we they them his her their our your my
me him us do does did have has had not no so up out about into over than too very can will just
would could should there here what when where who how which why all any some more most other
into your youre you're im i'm dont don't thats that's like really know think going get got go
one two three yeah okay right kind lot want way thing things time guys guy gonna wanna sort
because well said say says see look put come came make made take took give gave good great""".split())


def tokens(text):
    return [w for w in re.findall(r"[a-z][a-z'-]+", text.lower()) if w not in STOP and len(w) > 2]


def ngrams(toks, n):
    return [" ".join(toks[i:i+n]) for i in range(len(toks)-n+1)]


def main():
    overall = Counter()
    per_channel = {}
    all_bigrams = Counter()
    all_trigrams = Counter()
    corpus_len = 0

    for chan in sorted(p for p in BASE.iterdir() if p.is_dir()):
        texts = [f.read_text(encoding="utf-8", errors="ignore")
                 for f in chan.glob("*.txt")]
        if not texts:
            continue
        blob = " ".join(texts).lower()
        corpus_len += len(blob.split())
        cc = Counter()
        for concept, pat in CONCEPTS.items():
            n = len(re.findall(pat, blob))
            cc[concept] = n
            overall[concept] += n
        per_channel[chan.name] = cc
        toks = tokens(blob)
        all_bigrams.update(ngrams(toks, 2))
        all_trigrams.update(ngrams(toks, 3))

    print(f"# Coaching theme analysis — {corpus_len:,} words across "
          f"{len(per_channel)} channels\n")

    print("## Concept frequency (all channels, by mentions)")
    for concept, n in overall.most_common():
        print(f"{n:>5}  {concept}")

    print("\n## Per-channel top 6 concepts")
    for chan, cc in per_channel.items():
        top = ", ".join(f"{c} ({n})" for c, n in cc.most_common(6) if n)
        print(f"- {chan}: {top}")

    print("\n## Data-driven top bigrams")
    for g, n in all_bigrams.most_common(30):
        print(f"{n:>4}  {g}")

    print("\n## Data-driven top trigrams")
    for g, n in all_trigrams.most_common(20):
        print(f"{n:>4}  {g}")

    # save machine-readable
    out = {"words": corpus_len,
           "concepts_overall": dict(overall),
           "concepts_per_channel": {k: dict(v) for k, v in per_channel.items()},
           "top_bigrams": all_bigrams.most_common(50),
           "top_trigrams": all_trigrams.most_common(40)}
    (BASE / "theme-analysis.json").write_text(
        json.dumps(out, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
