#!/usr/bin/env sh
set -eu

REPO="${COMET_REPO:-fraiocc/comet}"
INSTALL_DIR="${COMET_INSTALL_DIR:-$HOME/.local/bin}"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$OS" in
  linux) TARGET_OS="linux" ;;
  darwin) TARGET_OS="apple-darwin" ;;
  *) echo "Unsupported OS: $OS" >&2; exit 1 ;;
esac

case "$ARCH" in
  x86_64|amd64) TARGET_ARCH="x86_64" ;;
  arm64|aarch64) TARGET_ARCH="aarch64" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

echo "Installing Comet CLI ($TARGET_ARCH-$TARGET_OS)..."

RELEASE_JSON="$(curl -fsSL -H "User-Agent: comet-installer" "https://api.github.com/repos/$REPO/releases/latest")"
DOWNLOAD_URL="$(printf '%s' "$RELEASE_JSON" | grep -oE "https://[^\"]+${TARGET_ARCH}[^\"]+${TARGET_OS}[^\"]+\.tar\.gz" | head -n 1)"

if [ -z "$DOWNLOAD_URL" ]; then
  echo "No matching release asset found for $TARGET_ARCH-$TARGET_OS." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

curl -fsSL "$DOWNLOAD_URL" -o "$TMP_DIR/comet.tar.gz"
tar -xzf "$TMP_DIR/comet.tar.gz" -C "$TMP_DIR"

mkdir -p "$INSTALL_DIR"
BIN_PATH="$(find "$TMP_DIR" -name comet -type f | head -n 1)"
install -m 755 "$BIN_PATH" "$INSTALL_DIR/comet"

echo "Comet installed to $INSTALL_DIR/comet"
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) echo "Add $INSTALL_DIR to your PATH, then run: comet" ;;
esac
