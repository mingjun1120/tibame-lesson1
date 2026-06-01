---
name: Audio to SRT Converter
description: This skill should be used when the user asks to "convert audio to srt", "generate subtitles from audio", "create srt from mp3/wav/m4a/flac", "transcribe audio to subtitles", or needs to generate SRT subtitle files from audio files (MP3, WAV, M4A, FLAC, etc.) with customizable character limits and timeline adjustments.
version: 0.3.0
---

# Audio to SRT Converter

Multi-backend Whisper pipeline that turns audio files into SRT subtitles. Backend is auto-selected per machine; `uv` is used to resolve any compatible Python already on the system (without pinning a specific version).

## Purpose

Convert audio (MP3, WAV, M4A, FLAC, OGG, AAC, WMA) into SRT subtitles with:
- Automatic, system-aware backend selection (Apple Silicon / NVIDIA / generic)
- Flexible Python detection — uses whatever Python ≥ 3.9 is available; uv only fetches one if none qualifies
- Customizable character limits per subtitle line (default 22, minimum 4)
- Timeline gap merging when gaps are below 0.3 s
- Sequentially numbered output at `<audio_dir>/origin.srt`

## When to Use This Skill

Trigger phrases include "轉成 SRT 字幕", "轉逐字稿", "generate subtitles from audio", "transcribe audio". Use it whenever an audio file needs subtitle output.

## Environment Model

- **No Python lock.** The wrapper passes `--python ">=3.9"` to uv. uv prefers an already-installed Python that matches (system Python, Homebrew Python, pyenv, etc.); only downloads a managed CPython if nothing on the machine qualifies.
- The minimum (`3.9`) is set in `scripts/run.sh` (`PY_MIN`) and is dictated by the Whisper backends.
- UTF-8 stdio is forced inside both `run.sh` and `audio_to_srt.py`, so the emoji status lines render safely on Windows zh consoles (cp936/cp950).
- System dependencies (must exist on PATH):

| OS | uv | ffmpeg |
|----|-----|--------|
| macOS | `brew install uv` | `brew install ffmpeg` |
| Linux | `pipx install uv` *(or distro pkg)* | `apt install ffmpeg` *(or dnf/pacman/zypper)* |
| Windows | `winget install astral-sh.uv` *(or `scoop install uv`)* | `winget install Gyan.FFmpeg` *(or `scoop install ffmpeg`)* |

> **Windows note:** `run.sh` is a Bash script — run it from **Git Bash** (bundled with Git for Windows) or WSL. After installing tools via winget, open a fresh shell so PATH refreshes.

The wrapper aborts with an actionable, OS-specific install hint if either tool is missing.

## Backend Selection

`scripts/run.sh` chooses the backend before launching Python:

| Platform | Backend | Notes |
|----------|---------|-------|
| macOS + arm64 (Apple Silicon) | `mlx-whisper` | Apple MLX, ~5–10× faster than reference |
| Linux/Windows with `nvidia-smi` | `faster-whisper` | CTranslate2 + CUDA |
| Other (CPU-only Linux/Windows/Intel Mac) | `openai-whisper` | Reference implementation |

The chosen package is installed into a cached uv environment on first run, so subsequent runs start instantly.

## Core Workflow

1. **Validate** — wrapper checks `uv`, `ffmpeg`, input file, output dir.
2. **Resolve Python** — `uv python find ">=3.9"` reports the chosen interpreter.
3. **Detect platform** — pick backend from `uname -s`/`uname -m` and `nvidia-smi`.
4. **Provision** — `uv run --python ">=3.9" --with $BACKEND --with pydub ...` materializes deps.
5. **Transcribe** — backend-specific module loads model, runs ASR with timestamps.
6. **Normalize** — segments converted to common `{start, end, text}` shape.
7. **Reflow** — text split to `--max-chars` per line; CJK split by character, others by word boundary.
8. **Smooth timeline** — merge segments with gap < 0.3 s.
9. **Write** — emit numbered SRT to `<audio_dir>/origin.srt`.

## Usage

```bash
.agents/skills/audio-to-srt/scripts/run.sh <audio_file> [options]
```

### Options

- `--max-chars N` — characters per subtitle line (default 22, min 4)
- `--model NAME` — `tiny` / `base` / `small` / `medium` / `large` / `turbo` (default `medium`)
- `--language CODE` — Whisper language code (default `zh`)
- `--output PATH` — override output path

### Examples

```bash
# default (medium model, 22 chars/line)
scripts/run.sh audio/audio-example.m4a

# faster but rougher transcription
scripts/run.sh audio/audio-example.m4a --model base

# wider lines, English source
scripts/run.sh path/to/talk.mp3 --max-chars 30 --language en
```

## Output Format

```
1
00:00:00,000 --> 00:00:03,500
這是第一行字幕

2
00:00:03,500 --> 00:00:07,200
這是第二行字幕
```

## Files

- `scripts/run.sh` — environment check + platform detection + uv invocation wrapper
- `scripts/audio_to_srt.py` — multi-backend transcription core
