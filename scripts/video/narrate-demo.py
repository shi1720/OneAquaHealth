"""Generate disclosed synthetic narration, aligned subtitles, and the final demo.

Requires FFmpeg with libass, FFprobe, and OPENAI_API_KEY in the environment or
the ignored owner-only .env.narration.local file. Never writes credentials to
media, metadata, request logs, or source. Use --audio-only before final capture.
"""
from pathlib import Path
import argparse
import difflib
import hashlib
import json
import os
import re
import shutil
import subprocess
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output/video"
CACHE = OUT / "narration"
FFMPEG = os.environ.get("RILL_FFMPEG") or ("/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg" if Path("/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg").exists() else shutil.which("ffmpeg") or "ffmpeg")
MODEL = "gpt-4o-mini-tts"
VOICE = "cedar"
INSTRUCTIONS = (
    "Narrate a thoughtful product demonstration in clear, warm, natural English. "
    "Use a calm conversational pace of about 150 words per minute. "
    "Be concise with pauses. Do not add words, filler, music, or sound effects. "
    "Pronounce Rill as the English word rill. Pronounce OneAquaHealth as one aqua health. "
    "Pronounce FHIR as fire; spell CSV and JSON clearly. This is a disclosed synthetic narrator, "
    "not an impersonation of the project creator."
)


def run(*args, capture=False):
    result = subprocess.run([str(a) for a in args], capture_output=capture, text=capture)
    if result.returncode:
        raise RuntimeError(f"Media command failed: {args[0]}")
    return result.stdout if capture else None


def duration(path):
    return float(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path, capture=True))


def api(path, data, content_type="application/json"):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        env = ROOT / ".env.narration.local"
        if env.exists():
            key = next((line.split("=", 1)[1].strip() for line in env.read_text().splitlines() if line.startswith("OPENAI_API_KEY=")), None)
    if not key:
        raise RuntimeError("Set OPENAI_API_KEY privately before generating narration.")
    for attempt in range(3):
        request = urllib.request.Request("https://api.openai.com/v1/" + path, data=data, headers={"Authorization": "Bearer " + key, "Content-Type": content_type})
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503) or attempt == 2:
                raise RuntimeError(f"OpenAI request failed with HTTP {error.code}; no credentials or response body were logged.") from None
            time.sleep(2 ** attempt)
    raise RuntimeError("Speech request did not complete.")


def seconds(value):
    minute, second = map(int, value.split(":"))
    return minute * 60 + second


def stamp(value, ass=False):
    factor = 100 if ass else 1000
    number = round(value * factor)
    h, number = divmod(number, 3600 * factor)
    m, number = divmod(number, 60 * factor)
    s, fraction = divmod(number, factor)
    return f"{h}:{m:02}:{s:02}.{fraction:02}" if ass else f"{h:02}:{m:02}:{s:02},{fraction:03}"


def transcribe(audio):
    cached = CACHE / (hashlib.sha256(audio.read_bytes()).hexdigest()[:20] + "-words.json")
    if cached.exists():
        return json.loads(cached.read_text())
    boundary = "rill" + uuid.uuid4().hex
    chunks = []
    for name, value in [("model", "whisper-1"), ("response_format", "verbose_json"), ("timestamp_granularities[]", "word"), ("language", "en"), ("prompt", "Rill. Shivam Gupta. OneAquaHealth. FHIR R4. JSON, CSV and GeoJSON.")]:
        chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="rill-narration.wav"\r\nContent-Type: audio/wav\r\n\r\n'.encode() + audio.read_bytes() + b"\r\n")
    chunks.append(f"--{boundary}--\r\n".encode())
    result = json.loads(api("audio/transcriptions", b"".join(chunks), "multipart/form-data; boundary=" + boundary))
    cached.write_text(json.dumps(result, indent=2))
    return result


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--audio-only", action="store_true")
    options = args.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    source = (ROOT / "scripts/video/voiceover-timed.md").read_text()
    pattern = r"\*\*(\d+:\d+)[\u2013-](\d+:\d+)\s*[\u00b7:]\s*([^*]+)\*\*\s*\n\n(.*?)(?=\n\*\*\d+:|\Z)"
    sections = [{"start": seconds(a), "end": seconds(b), "label": label, "text": text.strip()} for a, b, label, text in re.findall(pattern, source, flags=re.S)]
    if not sections or sections[0]["start"] != 0 or sections[-1]["end"] != 238:
        raise RuntimeError("Narration must cover the complete 238-second film.")
    if any(a["end"] != b["start"] for a, b in zip(sections, sections[1:])):
        raise RuntimeError("Narration timings must be contiguous.")
    def prepare(section):
        payload = {"model": MODEL, "voice": VOICE, "input": section["text"], "instructions": INSTRUCTIONS, "response_format": "wav"}
        identifier = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:20]
        raw = CACHE / (identifier + ".wav")
        if not raw.exists():
            raw.write_bytes(api("audio/speech", json.dumps(payload).encode()))
    with ThreadPoolExecutor(max_workers=3) as workers:
        list(workers.map(prepare, sections))
    for i, section in enumerate(sections):
        if "\u2014" in section["text"]:
            raise RuntimeError("Remove em dashes before narration.")
        payload = {"model": MODEL, "voice": VOICE, "input": section["text"], "instructions": INSTRUCTIONS, "response_format": "wav"}
        identifier = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:20]
        raw = CACHE / (identifier + ".wav")
        if not raw.exists():
            raw.write_bytes(api("audio/speech", json.dumps(payload).encode()))
        original = duration(raw)
        slot = section["end"] - section["start"]
        speed = max(1.0, original / (slot - 0.35))
        if speed > 1.25:
            raise RuntimeError(f"Section {i+1} needs shorter copy: {original:.1f}s for {slot}s slot.")
        padded = CACHE / f"segment-{i+1:02}.wav"
        run(FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af", f"atempo={speed:.6f},apad", "-t", slot, "-ar", 24000, "-ac", 1, "-c:a", "pcm_s16le", padded)
        section.update({"originalSeconds": round(original, 3), "tempo": round(speed, 6), "audio": str(padded.relative_to(OUT))})
        print(f"Narration {i+1}/{len(sections)}: {slot}s, tempo {speed:.3f}", flush=True)
    manifest = CACHE / "narration.ffconcat"
    manifest.write_text("ffconcat version 1.0\n" + "".join(f"file 'segment-{i+1:02}.wav'\n" for i in range(len(sections))))
    audio = OUT / "rill-narration.wav"
    run(FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", 0, "-i", manifest, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", 24000, "-ac", 1, audio)
    transcript = transcribe(audio)
    words = [dict(word) for word in transcript.get("words", [])]
    if len(words) < 300:
        raise RuntimeError("Narration transcription is unexpectedly short.")
    # Whisper supplies acoustic word timings. Recover spelling, punctuation and
    # capitalization from the authored script where the spoken tokens match.
    authored = " ".join(section["text"] for section in sections).split()
    authored_sections = [index for index, section in enumerate(sections) for _ in section["text"].split()]
    normalize = lambda word: re.sub(r"[^a-z0-9]", "", word.lower())
    matcher = difflib.SequenceMatcher(None, [normalize(w["word"]) for w in words], [normalize(w) for w in authored], autojunk=False)
    matched = 0
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            words[block.a + offset]["word"] = authored[block.b + offset]
            words[block.a + offset]["section"] = authored_sections[block.b + offset]
            matched += 1
    if matched / max(len(words), len(authored)) < 0.94:
        raise RuntimeError("The recorded narration differs materially from the script. Review the audio before publication.")
    token_match = round(matched / max(len(words), len(authored)), 4)
    transcribed_count = len(words)
    dropped_zero_duration = 0
    # Restore hyphenated words and their punctuation when the transcriber
    # splits them into acoustically identical tokens (for example follow-up).
    for operation, a, b, c, d in matcher.get_opcodes():
        if operation == "delete":
            for index in range(a, b):
                if words[index]["end"] - words[index]["start"] > 0.08:
                    raise RuntimeError("Unexpected spoken words need manual review before publication.")
                words[index]["word"] = ""
                dropped_zero_duration += 1
        if operation == "replace" and a < b and c < d and "".join(normalize(w["word"]) for w in words[a:b]) == "".join(normalize(w) for w in authored[c:d]):
            words[a]["word"] = " ".join(authored[c:d])
            words[a]["section"] = authored_sections[c]
            words[a]["end"] = words[b-1]["end"]
            for index in range(a+1, b):
                words[index]["word"] = ""
    words = [word for word in words if word["word"]]
    captions, chunk = [], []
    for word in words:
        section_index = word.get("section", max((i for i, section in enumerate(sections) if word["start"] >= section["start"] - 0.4), default=0))
        word["section"] = section_index
        word["start"] = max(word["start"], sections[section_index]["start"])
        word["end"] = min(word["end"], sections[section_index]["end"])
        # Respect natural gaps, sentence endings and readable two-line lengths.
        if chunk and (word["section"] != chunk[0]["section"] or len(" ".join(w["word"] for w in chunk)) + len(word["word"]) > 78 or word["end"] - chunk[0]["start"] > 5.5 or word["start"] - chunk[-1]["end"] > 0.7):
            captions.append(chunk)
            chunk = []
        chunk.append(word)
        if len(chunk) >= 5 and re.search(r"[.!?]$", word["word"]):
            captions.append(chunk)
            chunk = []
    if chunk:
        captions.append(chunk)
    # Avoid flashing a single final word or a zero-duration transcription token.
    readable = []
    for index, group in enumerate(captions):
        short = len(group) <= 2 or group[-1]["end"] - group[0]["start"] < 0.8
        following = captions[index+1] if index+1 < len(captions) else None
        def fits(left, right):
            return left[0]["section"] == right[0]["section"] and len(" ".join(w["word"] for w in left+right)) <= 94 and right[-1]["end"] - left[0]["start"] <= 6.5
        if short and following and fits(group, following):
            following[:0] = group
        elif short and readable and fits(readable[-1], group):
            readable[-1].extend(group)
        else:
            readable.append(group)
    captions = readable
    srt, events = [], []
    for i, group in enumerate(captions):
        start, end = group[0]["start"], min(238, group[-1]["end"] + 0.12)
        if i + 1 < len(captions):
            end = min(end, captions[i+1][0]["start"])
        tokens = [word["word"].strip().replace("\u2014", ",") for word in group]
        text = " ".join(tokens)
        if len(text) > 50:
            split = min(range(1, len(tokens)), key=lambda index: abs(len(" ".join(tokens[:index])) - len(" ".join(tokens[index:]))))
            text = " ".join(tokens[:split]) + "\n" + " ".join(tokens[split:])
        srt.append(f"{i+1}\n{stamp(start)} --> {stamp(end)}\n{text}\n")
        escaped = text.replace("{", "(").replace("}", ")").replace("\n", r"\N")
        events.append(f"Dialogue: 0,{stamp(start,True)},{stamp(end,True)},Default,,0,0,0,,{escaped}")
    (OUT / "rill-demo-narrated.srt").write_text("\n".join(srt))
    ass = CACHE / "subtitles.ass"
    ass.write_text("""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,32,&H00E9F5F4,&H00FFFFFF,&H00313D17,&H00313D17,0,0,0,0,100,100,0,0,1,0,0,2,120,120,34,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(events) + "\n")
    (OUT / "narration-proof.json").write_text(json.dumps({"model": MODEL, "voice": VOICE, "disclosure": "AI-generated narration, not Shivam Gupta's recorded voice", "durationSeconds": duration(audio), "sections": sections, "transcribedWords": transcribed_count, "scriptTokenMatch": token_match, "unmatchedZeroDurationTokensRemoved": dropped_zero_duration, "captionCount": len(captions)}, indent=2) + "\n")
    if options.audio_only:
        return
    metadata = json.loads((OUT / "timing.json").read_text())
    final = OUT / "rill-demo-narrated.mp4"
    subtitle_path = str(ass).replace("\\", "/").replace(":", "\\:")
    video_filter = f"scale=1536:960:flags=lanczos,pad=1920:1080:192:0:color=0x173d31,subtitles='{subtitle_path}',drawtext=text='AI-generated narration':fontcolor=0xd2e49d:fontsize=15:x=(w-tw)/2:y=1060"
    run(FFMPEG, "-hide_banner", "-loglevel", "warning", "-y", "-ss", metadata["videoLeadSeconds"], "-i", metadata["rawPath"], "-i", audio, "-vf", video_filter, "-map", "0:v:0", "-map", "1:a:0", "-t", 238, "-r", 25, "-c:v", "libx264", "-preset", "medium", "-crf", 19, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", final)
    print(f"Narrated film with burned-in subtitles: {final.name}", flush=True)


if __name__ == "__main__":
    main()
