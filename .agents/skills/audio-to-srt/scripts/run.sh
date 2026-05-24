#!/usr/bin/env bash
# Audio-to-SRT entry wrapper.
# - Verifies a compatible Python is reachable (Whisper backends require >=3.9).
# - uv prefers an already-installed Python; only fetches one if none is found.
# - Detects platform to pick the fastest available Whisper backend.
# - Auto-installs the chosen backend on first run (cached by uv).
set -euo pipefail

# Minimum Python required by all three Whisper backends.
PY_MIN="3.9"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v uv >/dev/null 2>&1; then
  echo "❌ uv is not installed. Install with: brew install uv" >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "❌ ffmpeg is not installed. Install with: brew install ffmpeg" >&2
  exit 1
fi

# Report which Python uv resolves to (best-effort, non-fatal).
RESOLVED_PY="$(uv python find ">=$PY_MIN" 2>/dev/null || echo "?")"

OS="$(uname -s)"
ARCH="$(uname -m)"

if [[ "$OS" == "Darwin" && "$ARCH" == "arm64" ]]; then
  BACKEND="mlx-whisper"
elif command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1; then
  BACKEND="faster-whisper"
else
  BACKEND="openai-whisper"
fi

echo "🎯 Backend: $BACKEND  (OS=$OS ARCH=$ARCH, Python ≥$PY_MIN → $RESOLVED_PY)"

export AUDIO_TO_SRT_BACKEND="$BACKEND"

exec uv run \
  --python ">=$PY_MIN" \
  --with "$BACKEND" \
  --with pydub \
  "$SCRIPT_DIR/audio_to_srt.py" "$@"
