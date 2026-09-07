"""Convert yt-dlp auto-caption VTT files into clean, de-duplicated .txt transcripts.

YouTube auto-captions use a rolling window, so lines repeat heavily. This strips
timestamps, tags, and cue markup, then collapses the rolling duplication into
readable prose. One .txt per episode + a per-channel index.json + a master index.
"""

import json
import re
from pathlib import Path

BASE = Path(__file__).parent / "transcripts"
TAG = re.compile(r"<[^>]+>")
TIMING = re.compile(r"\d{2}:\d{2}:\d{2}\.\d{3}\s*-->")


def clean_vtt(path: Path) -> str:
    words_out = []
    last_line = ""
    for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if (not line or line == "WEBVTT" or TIMING.search(line)
                or line.startswith(("Kind:", "Language:"))
                or line.replace(".", "").isdigit()):
            continue
        line = TAG.sub("", line).replace("&gt;", ">").replace("&lt;", "<")
        line = line.replace("&amp;", "&").replace("[music]", "").strip()
        line = re.sub(r"\s+", " ", line)
        if not line or line == last_line:
            continue
        # rolling-window overlap: skip if line is contained in the tail we have
        tail = " ".join(words_out[-30:])
        if line and line not in tail:
            words_out.append(line)
        last_line = line
    text = " ".join(words_out)
    return re.sub(r"\s+", " ", text).strip()


def main():
    master = []
    for chan_dir in sorted(BASE.iterdir()):
        raw = chan_dir / "raw"
        if not raw.is_dir():
            continue
        index = []
        seen = set()
        for vtt in sorted(raw.glob("*.vtt")):
            stem = vtt.name.rsplit(".", 2)[0]  # drop .en.vtt / .en-orig.vtt
            if stem in seen:  # en + en-orig collapse to one transcript
                continue
            seen.add(stem)
            parts = stem.split("__")
            date = parts[0] if parts else ""
            title = parts[1].replace("_", " ") if len(parts) > 1 else stem
            text = clean_vtt(vtt)
            if len(text) < 200:
                continue
            out = chan_dir / f"{stem}.txt"
            out.write_text(text, encoding="utf-8")
            rec = {"channel": chan_dir.name, "date": date, "title": title,
                   "words": len(text.split()), "file": out.name}
            index.append(rec)
            master.append(rec)
        (chan_dir / "index.json").write_text(
            json.dumps(index, indent=2), encoding="utf-8")
        print(f"{chan_dir.name}: {len(index)} transcripts")
    (BASE / "index.json").write_text(
        json.dumps(master, indent=2), encoding="utf-8")
    print(f"TOTAL: {len(master)} transcripts, "
          f"{sum(r['words'] for r in master):,} words")


if __name__ == "__main__":
    main()
