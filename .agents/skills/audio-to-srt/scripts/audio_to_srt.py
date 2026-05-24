#!/usr/bin/env python3
"""
Audio to SRT Converter — multi-backend dispatch.

Backend is chosen by the wrapper (scripts/run.sh) and passed via
the AUDIO_TO_SRT_BACKEND env var. Supported values:
  - mlx-whisper        (Apple Silicon, MLX framework)
  - faster-whisper     (CTranslate2, CPU/CUDA)
  - openai-whisper     (reference implementation, fallback)
"""

import argparse
import os
import sys
from datetime import timedelta
from pathlib import Path


SUPPORTED_FORMATS = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac", ".wma"}

# Map logical model size to backend-specific identifier.
MLX_MODEL_MAP = {
    "tiny": "mlx-community/whisper-tiny-mlx",
    "base": "mlx-community/whisper-base-mlx",
    "small": "mlx-community/whisper-small-mlx",
    "medium": "mlx-community/whisper-medium-mlx",
    "large": "mlx-community/whisper-large-v3-mlx",
    "large-v3": "mlx-community/whisper-large-v3-mlx",
    "turbo": "mlx-community/whisper-large-v3-turbo",
}


def format_timestamp(seconds: float) -> str:
    """Convert seconds to SRT timestamp format (HH:MM:SS,mmm)."""
    td = timedelta(seconds=seconds)
    total = td.total_seconds()
    hours = int(total // 3600)
    minutes = int((total % 3600) // 60)
    secs = int(total % 60)
    millis = int((total % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def split_text_by_chars(text: str, max_chars: int, min_chars: int = 4) -> list[str]:
    """Split text into chunks honoring word boundaries when present."""
    if len(text) <= max_chars:
        return [text]

    has_spaces = " " in text
    lines: list[str] = []

    if has_spaces:
        current = ""
        for word in text.split():
            test = f"{current} {word}".strip()
            if len(test) <= max_chars:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    else:
        # CJK / no-space text — slice by character count.
        for i in range(0, len(text), max_chars):
            lines.append(text[i:i + max_chars])

    # Merge any sub-min-chars tail into the previous line.
    result: list[str] = []
    for line in lines:
        if len(line) >= min_chars or not result:
            result.append(line)
        else:
            result[-1] += line if not has_spaces else f" {line}"
    return result


def merge_timeline_gaps(segments: list[dict], gap_threshold: float = 0.3) -> list[dict]:
    """Extend previous segment end to next start when gap < threshold."""
    if not segments:
        return segments
    merged = [segments[0]]
    for seg in segments[1:]:
        prev = merged[-1]
        if seg["start"] - prev["end"] < gap_threshold:
            prev["end"] = seg["start"]
        merged.append(seg)
    return merged


def transcribe_mlx(audio_path: Path, model: str, language: str) -> list[dict]:
    import mlx_whisper  # type: ignore

    repo = MLX_MODEL_MAP.get(model, model)
    print(f"🍎 mlx-whisper · model={repo}")
    result = mlx_whisper.transcribe(
        str(audio_path),
        path_or_hf_repo=repo,
        language=language,
    )
    return [
        {"start": s["start"], "end": s["end"], "text": s["text"]}
        for s in result["segments"]
    ]


def transcribe_faster(audio_path: Path, model: str, language: str) -> list[dict]:
    from faster_whisper import WhisperModel  # type: ignore

    print(f"⚡ faster-whisper · model={model}")
    wm = WhisperModel(model, device="auto", compute_type="auto")
    segments, _info = wm.transcribe(str(audio_path), language=language)
    return [{"start": s.start, "end": s.end, "text": s.text} for s in segments]


def transcribe_openai(audio_path: Path, model: str, language: str) -> list[dict]:
    import whisper  # type: ignore

    print(f"🐢 openai-whisper · model={model}")
    wm = whisper.load_model(model)
    result = wm.transcribe(str(audio_path), language=language)
    return [
        {"start": s["start"], "end": s["end"], "text": s["text"]}
        for s in result["segments"]
    ]


BACKENDS = {
    "mlx-whisper": transcribe_mlx,
    "faster-whisper": transcribe_faster,
    "openai-whisper": transcribe_openai,
}


def generate_srt(segments: list[dict], max_chars: int, min_chars: int) -> str:
    lines: list[str] = []
    idx = 1
    for seg in segments:
        text = seg["text"].strip()
        if not text:
            continue
        chunks = split_text_by_chars(text, max_chars, min_chars)
        duration = seg["end"] - seg["start"]
        per = duration / len(chunks) if chunks else duration
        for i, chunk in enumerate(chunks):
            start = seg["start"] + i * per
            end = seg["start"] + (i + 1) * per
            lines.append(str(idx))
            lines.append(f"{format_timestamp(start)} --> {format_timestamp(end)}")
            lines.append(chunk)
            lines.append("")
            idx += 1
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert audio to SRT subtitles (multi-backend)."
    )
    parser.add_argument("audio_file", help="Path to audio file (mp3/wav/m4a/flac/...)")
    parser.add_argument("--max-chars", type=int, default=22,
                        help="Max characters per subtitle line (default: 22, min: 4)")
    parser.add_argument("--model", default="medium",
                        help="Whisper model size: tiny/base/small/medium/large/turbo (default: medium)")
    parser.add_argument("--language", default="zh", help="Source language (default: zh)")
    parser.add_argument("--output", help="Output path (default: <audio_dir>/origin.srt)")
    args = parser.parse_args()

    if args.max_chars < 4:
        print("❌ --max-chars must be >= 4", file=sys.stderr)
        return 1

    audio_path = Path(args.audio_file)
    if not audio_path.exists():
        print(f"❌ File not found: {audio_path}", file=sys.stderr)
        return 1
    if audio_path.suffix.lower() not in SUPPORTED_FORMATS:
        print(f"❌ Unsupported format {audio_path.suffix}. "
              f"Supported: {', '.join(sorted(SUPPORTED_FORMATS))}", file=sys.stderr)
        return 1

    backend = os.environ.get("AUDIO_TO_SRT_BACKEND")
    if backend not in BACKENDS:
        print(f"❌ AUDIO_TO_SRT_BACKEND must be one of {list(BACKENDS)}. "
              f"Run via scripts/run.sh.", file=sys.stderr)
        return 1

    output_path = Path(args.output) if args.output else audio_path.parent / "origin.srt"

    raw_segments = BACKENDS[backend](audio_path, args.model, args.language)
    segments = merge_timeline_gaps(raw_segments)
    srt = generate_srt(segments, args.max_chars, min_chars=4)
    output_path.write_text(srt, encoding="utf-8")
    print(f"✅ Wrote {output_path} ({len(segments)} segments)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
