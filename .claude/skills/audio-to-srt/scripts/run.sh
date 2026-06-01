#!/usr/bin/env bash
# Audio-to-SRT entry wrapper.
# - Verifies a compatible Python is reachable (Whisper backends require >=3.9).
# - uv prefers an already-installed Python; only fetches one if none is found.
# - Detects platform to pick the fastest available Whisper backend.
# - Auto-installs the chosen backend on first run (cached by uv).
# - Forces UTF-8 stdio so emoji status lines work on Windows consoles.
set -euo pipefail

# Minimum Python required by all three Whisper backends.
PY_MIN="3.9"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OS="$(uname -s)"
ARCH="$(uname -m)"

# Per-OS install hint shown when uv/ffmpeg is missing.
install_hint() {
  local pkg="$1"
  case "$OS" in
    Darwin)
      echo "  macOS:   brew install $pkg" ;;
    Linux)
      echo "  Linux:   apt install $pkg   # or: dnf/pacman/zypper install $pkg" ;;
    MINGW*|MSYS*|CYGWIN*)
      if [[ "$pkg" == "ffmpeg" ]]; then
        echo "  Windows: winget install Gyan.FFmpeg   # or: scoop install ffmpeg / choco install ffmpeg"
      else
        echo "  Windows: winget install astral-sh.uv  # or: scoop install uv / pipx install uv"
      fi
      echo "           (after install, open a new shell so PATH refreshes)" ;;
    *)
      echo "  Install '$pkg' via your platform's package manager" ;;
  esac
}

if ! command -v uv >/dev/null 2>&1; then
  echo "❌ uv is not installed." >&2
  install_hint uv >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "❌ ffmpeg is not installed." >&2
  install_hint ffmpeg >&2
  exit 1
fi

# Report which Python uv resolves to (best-effort, non-fatal).
RESOLVED_PY="$(uv python find ">=$PY_MIN" 2>/dev/null || echo "?")"

if [[ "$OS" == "Darwin" && "$ARCH" == "arm64" ]]; then
  BACKEND="mlx-whisper"
elif command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1; then
  BACKEND="faster-whisper"
else
  BACKEND="openai-whisper"
fi

echo "🎯 Backend: $BACKEND  (OS=$OS ARCH=$ARCH, Python ≥$PY_MIN → $RESOLVED_PY)"

export AUDIO_TO_SRT_BACKEND="$BACKEND"
# Force UTF-8 so child Python prints emoji safely on Windows zh consoles (cp936/cp950).
export PYTHONIOENCODING="utf-8"
export PYTHONUTF8="1"

exec uv run \
  --python ">=$PY_MIN" \
  --with "$BACKEND" \
  --with pydub \
  "$SCRIPT_DIR/audio_to_srt.py" "$@"
