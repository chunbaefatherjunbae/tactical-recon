# TACTICAL RECON V29 -> ECHOPOINT REWORK

## Baseline

The rework baseline is commit `0d9bf4899c2dde72edbbbce4cb8f3d279e6672f8`,
the last V-series commit immediately before the first R1 runtime commit.

The existing V29 application remains runnable while ownership is moved into ECHOPOINT
layers. No R1/R2 runtime or CSS overlay is loaded onto this branch.

## Product rule

Keep V-series proven field functions. Replace the ownership model and interaction
hierarchy with ECHOPOINT.

```
UI
  MAP / HUD / Location Card / PLAN / MISSION / Records
                |
App state
  GPS / Reference / Selection / Plan / Mission / Track / Overlay
                |
Domain
  Location / Plan / RouteDraw / Track / Mission / Record / Outpost
                |
Services
  Coordinate / Search / GPS / Bearing / Declination / GPX
                |
Data
  Saved locations / Outposts / Tracks / Plans / Recovery
                |
Infrastructure
  Leaflet / OSM / IndexedDB / Browser GPS / Service Worker
```

Lower layers must not manipulate UI.

## Phase order

### EP-V0 Baseline lock
- Freeze V29 pre-R baseline.
- Keep the existing V29 regression suite green.
- Create ECHOPOINT core modules without changing visible behavior.

### EP-V1 Ownership extraction
- Coordinate parsing and Working Grid become CoordinateCore.
- GPS/TEMP/LAST selection becomes ReferenceCore.
- PLAN becomes ordered `points[]` plus independent `routeStrokes[]`.
- Selected Location is separate from objective/target.
- TrackV2 remains the recording engine; an adapter will expose it to EP state.
- Mission gets its own snapshot and manual NEXT index.

### EP-V2 Backport valuable R functions
Backport logic, not R UI/runtime overlays:
- Working Grid short MGRS input.
- Strict WGS84/MGRS validation and grid mismatch rejection.
- Persistent LAST FIX presentation.
- Configurable MGRS/WGS84/address display.
- Selected Location separated from target/objective.
- LOW DATA as a base-map mode.
- Local low-data basemap and real coordinate grid.
- Topographic contour/peak/water refinements.

### EP-V3 Runtime bridge
- Replace direct global ownership one domain at a time.
- UI reads state; it does not own field state.
- Existing V features remain available while bridges are removed.

### EP-V4 Mode collapse
Legacy:
`TARGET / PLAN / NAV / BACKTRACK`

Target:
- surface: `MAP | PLAN | MISSION`
- overlay: `NONE | SEARCH | LOCATION | RECORDS | TOOLS`
- independent states: GPS, FOLLOW, TRACK, DRAW

Backtrack is track reuse, not a top-level application mode.

### EP-V5 ECHOPOINT shell
- Map-first layout.
- Frameless POS/TGT HUD.
- Clear V-style reticle.
- Fixed global GPS/FOLLOW/TEMP/TRACK controls.
- Unified Location Card.
- PLAN overlay and Mission HUD.

### EP-V6 Persistence/offline
- Preserve TrackV2 crash/recovery behavior.
- Normalize Plan/Mission/Saved Location storage.
- Integrate low-data provider.
- Clean service-worker ownership and cache versioning.

### EP-V7 Device gate
Real iPhone/iPad tests:
- GPS on/off and fallback.
- MGRS/Working Grid.
- PLAN reorder.
- drawing with pan/zoom.
- TRACK pause/resume/recovery.
- Mission NEXT and edits.
- offline/low-data.
- PWA reload.

Root deployment changes only after this gate.

## Reuse matrix

### Keep / extract
- V28 TrackV2 engine and recovery semantics.
- V29 track storage safety mirror.
- V29 GPX logic.
- V29 distance/bearing/declination math.
- V29 saved-track/plan reuse.
- V29 outpost data and exploration behavior.
- V29 search/address logic where provider behavior is still valid.

### Backport from R
- strict coordinate core.
- Working Grid UX.
- selected-location separation.
- LAST FIX field UX.
- location display preferences.
- low-data base-layer architecture.
- local basemap/grid/topographic refinements.

### Remove during bridge removal
- runtime function redefinition chains.
- UI-owned domain state.
- separate TARGET/NAV/BACKTRACK top-level modes.
- duplicate route/search/location panels.
- R-series visual overlays and CSS patch stacking.

## Change safety

Every ownership move must:
1. add/extend unit tests,
2. keep existing V29 regression tests green,
3. avoid unrelated visual changes,
4. preserve old persisted user data until a migration is verified.
