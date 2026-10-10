#!/usr/bin/env python3
"""Turn a voice-pack.json saved from the game's "My Voice" page into the voice/ folder the game plays from.

    python3 tools/unpack-voice.py ~/Downloads/voice-pack.json
"""
import base64
import json
import pathlib
import re
import sys

pack = json.loads(pathlib.Path(sys.argv[1]).expanduser().read_text())
out = pathlib.Path(__file__).resolve().parent.parent / "voice"
out.mkdir(exist_ok=True)

ids = []
for clip_id, data in pack["clips"].items():
    if not re.fullmatch(r"[a-z0-9-]+", clip_id):
        continue
    wav = base64.b64decode(data)
    if wav[:4] != b"RIFF":
        continue
    (out / f"{clip_id}.wav").write_bytes(wav)
    ids.append(clip_id)

# keep clips published earlier that are not in this pack
ids = sorted(set(ids) | {p.stem for p in out.glob("*.wav")})
(out / "index.json").write_text(json.dumps({"voice": pack.get("voice", ""), "ids": ids}))
print(f"{len(ids)} clips in {out}")
