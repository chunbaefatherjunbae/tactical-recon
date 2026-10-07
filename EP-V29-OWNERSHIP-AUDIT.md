# EP-V29 ownership audit

Baseline: `0d9bf4899c2dde72edbbbce4cb8f3d279e6672f8`

This audit describes the ownership problems that must be removed without losing V29 behavior.

| Concern | V29 ownership observed | Target ECHOPOINT owner | Migration rule |
|---|---|---|---|
| GPS power/fix | `gpsPowerEnabled`, `hasGpsFix`, `baseLocation`, `latestGpsPosition` | AppState.gps + GpsService | UI only dispatches GPS actions |
| TEMP | `tempMarkPoint`, quick-button wrappers | AppState.temp | TEMP remains explicit user state |
| LAST FIX | V27/V29 stabilization wrappers around GPS lifecycle | ReferenceService + persistence | Persist once; renderer only reads |
| Reference choice | repeated `getReferencePosition` overrides | ReferenceCore | Single selector: GPS, else newer TEMP/LAST |
| Map target/reticle | map center + telemetry + target wrappers | AppState.target | Target is map center, not selected/objective |
| Selected location | `currentActiveTarget`, address/result selection and target context overlap | AppState.selected | Selecting never creates objective implicitly |
| PLAN points | `routeStartPoint`, `routeViaPoints`, `routeEndPoint` | Plan.points[] | START/VIA/DEST derived from list order |
| PLAN route | `routeDraftSegments`, `routeMarkSegments` | Plan.routeStrokes[] / overlays | Route never owns point order |
| PLAN UI mode | `planUiSubmode`, `routeDrawEnabled`, sheets | Surface/overlay/draw axes | UI mode cannot own domain data |
| Objective/target | `targetModeTarget` | selected -> explicit objective action | Objective is a plan point, not app-wide mode |
| NAV | `targetModePhase==='NAV'`, `navLegIndex`, pause state | MissionSession | Mission owns manual NEXT |
| BACKTRACK | `backtrackActive` and destination helpers | Record/Track reuse | Not a top-level mode |
| TRACK recording | V28 TrackV2 runtime + legacy UI flags | TrackEngine + Track state adapter | Keep engine semantics; remove UI ownership |
| TRACK storage | localStorage + V29 IndexedDB safety mirror | TrackRepository | Preserve recovery guarantees first |
| Search | address/MGRS/WGS84 entry points duplicated by context | SearchService | One parser/provider, multiple intents |
| Outposts/sites | built-in DB + local intel + verification overlays | OutpostRepository | Built-in data immutable; user state separate |
| UI panels | inline handlers + multiple sheets | feature UI | UI sends actions and renders selectors |
| Runtime layering | V27/V28/V29 functions reassign previous functions | explicit module calls | No runtime function override chains |

## Dependency direction

Allowed:

```
UI -> actions/store -> domain/services -> repositories/infrastructure
```

Forbidden:

```
TrackEngine -> DOM
CoordinateCore -> Leaflet
Repository -> HUD
Location Card -> mutate legacy globals directly
```

## Migration sequence

1. CoordinateCore and ReferenceCore.
2. Selected Location as independent state.
3. PLAN ordered points and independent RouteDraw.
4. TrackV2 adapter without changing TrackV2 persistence behavior.
5. MissionSession replaces NAV leg ownership.
6. Backtrack becomes saved Track reuse.
7. Search entry points converge on one SearchService.
8. Outpost repository separation.
9. Replace legacy UI bindings with EP actions/selectors.
10. Remove override layers only after their replacement is regression-tested.

## Compatibility constraints

- Existing TrackV2 records remain readable.
- Existing local intel/outpost state remains readable.
- Existing saved plans/tracks are not rewritten in place during early phases.
- GPS OFF remains a normal supported state.
- Offline MGRS/WGS84 must work without network.
- Address search failure must not disable coordinate search.
- V29 regression suite stays green after each ownership move.
