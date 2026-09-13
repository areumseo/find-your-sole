# tools

## flutter-macos26-codesign.patch

Workaround for a codesign failure on macOS 26+:

```
resource fork, Finder information, or similar detritus not allowed
```

On macOS 26, `.framework` directories accumulate extended attributes
(`com.apple.FinderInfo`, `com.apple.fileprovider.fpfs#P`) that make `codesign`
fail during iOS builds. The patch extends Flutter's `removeExtendedAttributes`
to also clean the parent `.framework` directory and to strip
`com.apple.fileprovider.fpfs#P`.

Not yet fixed upstream as of Flutter 3.47.4, so it must be re-applied after
every `flutter upgrade`.

### Applying

```bash
cd "$(dirname "$(dirname "$(which flutter)")")"   # Flutter SDK root
git apply --check /path/to/flutter-macos26-codesign.patch && \
git apply /path/to/flutter-macos26-codesign.patch
```

### Checking whether it is applied

```bash
grep -c "fileprovider.fpfs" packages/flutter_tools/lib/src/ios/mac.dart
```

`1` means applied, `0` means not.

### Machines that need it

Any macOS 26+ machine that produces **signed** builds (Archive / TestFlight
upload). Currently: `imac`, `a-mini-server`.
