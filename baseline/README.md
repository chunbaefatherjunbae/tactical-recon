# TACTICAL RECON // BASELINE

BASELINE is the clean rebuild track for Tactical Recon.

## Rule

The BASELINE runtime does **not** load V27, V28, V29, ECHOPOINT bridges, legacy field tools, legacy PLAN/NAV/TRACK UI, theme layers, corner ornaments, or service-worker HTML injection.

Only neutral dependencies are reused:
- Leaflet
- MGRS library

## Initial model

- Map-first shell
- Left-top reference HUD
- Right-top search / settings / GPS / follow / TEMP controls
- TEMP: short press = set at reticle, long press = move to saved TEMP
- Reference selection:
  1. live GPS fix while GPS is enabled
  2. otherwise newest timestamp between TEMP and LAST FIX
- Bottom scale HUD
- Bottom navigation: 거점 / 탐색 / 계획 / 기록
- Theme system intentionally paused
- Legacy field tools intentionally removed

Later feature work must be added to BASELINE as new modules instead of wrapping legacy globals.
