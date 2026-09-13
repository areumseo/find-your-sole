#!/usr/bin/env bash
#
# Set up a macOS machine for signed iOS builds of Find Your Sole.
#
# Verifies the Flutter version, applies the macOS 26 codesign patch if it is
# missing, and installs project dependencies. Safe to re-run: every step is
# idempotent, and the patch step is a no-op once applied.
#
# Usage:  ./tools/setup-macos-dev.sh
#
set -euo pipefail

EXPECTED_FLUTTER="3.47.4"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PATCH="$REPO_ROOT/tools/flutter-macos26-codesign.patch"

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
fail() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }

step "Checking prerequisites"
command -v flutter >/dev/null || fail "flutter not found on PATH. Install Flutter $EXPECTED_FLUTTER first."
command -v xcodebuild >/dev/null || fail "xcodebuild not found. Install Xcode and run: xcode-select --install"
command -v pod >/dev/null || fail "CocoaPods not found. Install it with: sudo gem install cocoapods"

FLUTTER_ROOT="$(dirname "$(dirname "$(which flutter)")")"
FLUTTER_VERSION="$(flutter --version | sed -n 's/^Flutter \([0-9.]*\).*/\1/p' | head -1)"
echo "flutter    $FLUTTER_VERSION  ($FLUTTER_ROOT)"
echo "xcodebuild $(xcodebuild -version | head -1 | awk '{print $2}')"

if [ "$FLUTTER_VERSION" != "$EXPECTED_FLUTTER" ]; then
  echo
  echo "warning: this project is pinned to Flutter $EXPECTED_FLUTTER but you have $FLUTTER_VERSION."
  echo "         Builds may differ from the ones released to TestFlight."
fi

step "Applying macOS 26 codesign patch"
# tools/README.md documents this workaround. It must be re-applied after every
# 'flutter upgrade', so check before applying rather than assuming.
MARKER="$FLUTTER_ROOT/packages/flutter_tools/lib/src/ios/mac.dart"
if [ "$(grep -c 'fileprovider.fpfs' "$MARKER" || true)" -gt 0 ]; then
  echo "already applied, skipping"
elif git -C "$FLUTTER_ROOT" apply --check "$PATCH" 2>/dev/null; then
  git -C "$FLUTTER_ROOT" apply "$PATCH"
  echo "applied"
else
  fail "patch does not apply cleanly to $FLUTTER_ROOT.
       The Flutter SDK may have changed upstream. See tools/README.md."
fi

step "Installing dependencies"
cd "$REPO_ROOT/flutter_app"
flutter pub get
(cd ios && pod install)

step "Done"
cat <<'NEXT'
Setup is complete. To verify the toolchain end to end:

    cd flutter_app && flutter build ios --no-codesign

Signed builds (Archive / TestFlight) additionally need an Apple Developer
account signed in under Xcode > Settings > Accounts, plus a provisioning
profile for the app's bundle identifier.
NEXT
