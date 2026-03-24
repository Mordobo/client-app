#!/usr/bin/env bash
# React Native filtered logcat. When several devices are connected, set ANDROID_SERIAL.
set -euo pipefail

FILTERS=('*:S' 'ReactNative:V' 'ReactNativeJS:V')

if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  exec adb -s "$ANDROID_SERIAL" logcat "${FILTERS[@]}"
fi

count=$(adb devices 2>/dev/null | awk '/\tdevice$/ { c++ } END { print c + 0 }')
if [[ "$count" -eq 0 ]]; then
  echo "No Android device/emulator in 'device' state. Run: adb devices" >&2
  exit 1
fi

if [[ "$count" -gt 1 ]]; then
  echo "adb: more than one device/emulator — choose your phone's serial:" >&2
  adb devices -l >&2
  echo "" >&2
  echo "Then (replace SERIAL):" >&2
  echo "  ANDROID_SERIAL=SERIAL npm run android:logs" >&2
  exit 1
fi

exec adb logcat "${FILTERS[@]}"
