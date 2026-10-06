# PROJECT ECHOPOINT clean foundation

This directory is a clean runtime. It does not load the legacy V27/V28/V29/R1/R2 application runtime.

## Reused logic

- Coordinate parsing/validation is ported from `location-core.js`.
- Track acceptance thresholds, measured/estimated segments, pause/resume and recovery semantics are extracted from V28 TrackV2.
- Haversine and initial bearing math are extracted from V29 pure geographic helpers.

## Not reused

Legacy global state, DOM ownership, TARGET/NAV/BACKTRACK modes, function wrappers and UI overlays are intentionally excluded.

## Domain rules

- Canonical coordinate: `{lat, lon}`.
- Reference: GPS fix, otherwise the newer of TEMP and LAST FIX.
- PLAN points are an ordered list. START/VIA/DEST are derived from index.
- RouteDraw is independent of PLAN points.
- TRACK is an independent global recorder.
- A track started during a mission stores the mission id. A track already running before a mission remains independent.
- Mission navigation uses manual NEXT/PREV.
