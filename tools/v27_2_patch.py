from pathlib import Path

INDEX = Path('index.html')
SW = Path('service-worker.js')
AGENTS = Path('AGENTS.md')

html = INDEX.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str):
    global html
    count = html.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    html = html.replace(old, new, 1)


def replace_last(old: str, new: str, label: str):
    global html
    count = html.count(old)
    if count < 1:
        raise SystemExit(f'{label}: expected at least 1 match, found {count}')
    idx = html.rfind(old)
    html = html[:idx] + html[idx:].replace(old, new, 1)


def replace_text_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)

replace_once(
    '<title>TACTICAL RECON // FIELD TERMINAL V27.1</title>',
    '<title>TACTICAL RECON // FIELD TERMINAL V27.2</title>',
    'title version'
)

# PLAN toolbar no longer needs separators between every button.
replace_once(
    '      border:0;\n      border-right:1px solid var(--field-line);\n      font-size:9px;',
    '      border:0;\n      border-right:0;\n      font-size:9px;',
    'plan toolbar separators'
)

# Normal bottom bar no longer duplicates the global recenter control.
replace_once(
    '.mfd-bottom-bar .osb-cluster.v26-main-cluster { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); flex:4; width:auto; gap:5px; }',
    '.mfd-bottom-bar .osb-cluster.v26-main-cluster { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); flex:3; width:auto; gap:5px; }',
    'main bottom grid'
)
replace_once(
    '      <button class="osb-btn v26-primary" id="primaryCenterBtn" onclick="recenterPrimary()">RECENTER</button>\n',
    '',
    'remove bottom recenter'
)

# Global position controls: GPS power, context-sensitive center/follow, quick TEMP at reticle.
old_global = '''  <div class="global-gps-controls" id="globalGpsControls" aria-label="GPS controls">
    <button class="global-gps-button" id="gpsPowerBtn" type="button" onclick="toggleGpsPower()" aria-pressed="false" title="GPS ON/OFF">
      <span id="gpsPowerLabel">GPS</span>
    </button>
    <button class="global-gps-button gps-center-button" id="gpsCenterBtn" type="button" onclick="centerGpsNow()" aria-label="GPS 위치로 이동" title="GPS 위치로 이동" disabled>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5" class="gps-center-core"/></svg>
    </button>
  </div>'''
new_global = '''  <div class="global-gps-controls" id="globalGpsControls" aria-label="Position controls">
    <button class="global-gps-button" id="gpsPowerBtn" type="button" onclick="toggleGpsPower()" aria-pressed="false" title="GPS ON/OFF">
      <span id="gpsPowerLabel">GPS</span>
    </button>
    <button class="global-gps-button gps-center-button" id="gpsCenterBtn" type="button" onclick="handleGlobalCenterFollow()" aria-label="현재 기준 위치로 이동" title="RECENTER" disabled>
      <svg class="gps-center-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5" class="gps-center-core"/></svg>
      <svg class="gps-follow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 19 20l-7-3.2L5 20 12 2.8Z"/><path d="M12 7.2v9.1"/></svg>
    </button>
    <button class="global-gps-button global-temp-button" id="globalTempBtn" type="button" onclick="setTempMarkAtReticle();showV271Toast('TEMP SET');syncCenterFollowUi();" aria-label="현재 조준점에 TEMP POS 지정" title="TEMP POS @ RETICLE">TEMP</button>
  </div>'''
replace_once(old_global, new_global, 'global controls')

# Remove duplicate FOLLOW and TEMP-create actions from the menu. Clear TEMP remains available.
replace_once('        <button class="osb-btn gps-follow-toggle" onclick="toggleGpsFollow()" aria-pressed="false">FOLLOW OFF</button>\n', '', 'remove menu follow')
replace_once('        <button class="osb-btn" onclick="setTempMarkAtReticle();closeFieldControls();">TEMP POS @ RETICLE</button>\n', '', 'remove menu temp create')

# NAV bottom bar becomes NAV-only controls; global position button owns recenter/follow.
old_nav = '''      <!-- NAV -->
      <button class="osb-btn nav-only" id="targetRecenterBtn" type="button" onclick="recenterTargetNavigation()">RECENTER</button>
      <button class="osb-btn nav-only gps-follow-toggle" type="button" onclick="toggleGpsFollow()" aria-pressed="false">FOLLOW OFF</button>
      <button class="osb-btn nav-only" id="targetNextLegBtn" type="button" onclick="nextNavLeg()">NEXT LEG</button>
      <button class="osb-btn nav-only action-primary" id="targetNavStopBtn" type="button" onclick="stopTargetNavigation()">STOP</button>
      <button class="osb-btn nav-only" id="navMoreBtn" type="button" onclick="openNavMore()">MORE</button>'''
new_nav = '''      <!-- NAV -->
      <button class="osb-btn nav-only" id="navSearchBtn" type="button" onclick="openPlanSearch()">SEARCH</button>
      <button class="osb-btn nav-only" id="navPauseBtn" type="button" onclick="toggleNavPause()">PAUSE</button>
      <button class="osb-btn nav-only nav-next-hold" id="targetNextLegBtn" type="button">NEXT LEG</button>
      <button class="osb-btn nav-only action-primary" id="targetNavStopBtn" type="button" onclick="stopTargetNavigation()">STOP</button>
      <button class="osb-btn nav-only" id="navMoreBtn" type="button" onclick="openNavMore()">MORE</button>'''
replace_once(old_nav, new_nav, 'nav toolbar')

replace_once(
    '<button class="osb-btn" id="navCollapsedNextLegBtn" type="button" onclick="nextNavLeg()">NEXT LEG</button>',
    '<button class="osb-btn nav-next-hold" id="navCollapsedNextLegBtn" type="button">NEXT LEG</button>',
    'collapsed next leg'
)

replace_once(
    '      <button class="osb-btn" id="targetOrientationBtn" type="button" onclick="toggleNavMapOrientation()">NORTH UP</button>\n      <button class="osb-btn v271-delete-button" type="button" onclick="closeNavMore();exitTargetMode()">EXIT TARGET</button>',
    '      <button class="osb-btn" id="targetOrientationBtn" type="button" onclick="toggleNavMapOrientation()">NORTH UP</button>\n      <button class="osb-btn" id="navRevertLegBtn" type="button" onclick="revertNavLeg()" disabled>REVERT LEG</button>\n      <button class="osb-btn v271-delete-button" type="button" onclick="closeNavMore();exitTargetMode()">EXIT TARGET</button>',
    'revert leg button'
)

# Expand marker hitboxes while keeping the drawn marker size unchanged.
replace_once(
    "        iconSize:[24,24], iconAnchor:[12,12],",
    "        iconSize:[48,48], iconAnchor:[24,24],",
    'via hitbox'
)

# PLAN SEARCH also works while navigating. Moving the map explicitly breaks FOLLOW.
replace_once(
    "      if (!targetModeActive || targetModePhase !== 'PLAN') return;\n      setMapRouteDrawInteraction(false);\n      planUiSubmode = 'MAIN';\n      closePlanPointInfo();\n      closeNavMore();",
    "      if (!targetModeActive || !['PLAN','NAV'].includes(targetModePhase)) return;\n      if (targetModePhase === 'PLAN') setMapRouteDrawInteraction(false);\n      planUiSubmode = 'MAIN';\n      closePlanPointInfo();\n      closeNavMore();",
    'open search in nav'
)
replace_once(
    "      if (!targetModeActive || targetModePhase !== 'PLAN') return;\n      const input = document.getElementById('planSearchInput');",
    "      if (!targetModeActive || !['PLAN','NAV'].includes(targetModePhase)) return;\n      const input = document.getElementById('planSearchInput');",
    'search in nav'
)
replace_once(
    "    function movePlanMapTo(coords, zoom = 15) {\n      if (!validCoordinates(coords)) return;\n      closePlanSearch();",
    "    function movePlanMapTo(coords, zoom = 15) {\n      if (!validCoordinates(coords)) return;\n      if (gpsFollowEnabled) setGpsFollow(false, false);\n      closePlanSearch();",
    'search breaks follow'
)

# Known-action state for global center is based on any valid reference, not only live GPS.
replace_once(
    "      if (gpsCenter) gpsCenter.disabled = !gpsReady;",
    "      if (gpsCenter) gpsCenter.disabled = !ref?.coords;",
    'center availability'
)

# Version the PWA registration.
replace_once("navigator.serviceWorker.register('./service-worker.js?v=27.1'", "navigator.serviceWorker.register('./service-worker.js?v=27.2'", 'service worker registration')
replace_once("const reloadKey = 'tactical-recon-sw-reload-v27-1';", "const reloadKey = 'tactical-recon-sw-reload-v27-2';", 'reload key')

# V27.2 CSS overrides, intentionally appended after V27.1 so old mobile overrides cannot win.
v272_css = r'''

    /* ============================================================
       V27.2 // POSITION + NAV STABILIZATION
       ============================================================ */
    .gps-center-button .gps-follow-icon { display:none; }
    .gps-center-button.follow-mode .gps-center-icon { display:none; }
    .gps-center-button.follow-mode .gps-follow-icon { display:block; }
    .gps-center-button .gps-follow-icon { width:19px; height:19px; fill:none; stroke:currentColor; stroke-width:1.45; stroke-linejoin:miter; }
    .global-temp-button { font-size:8px; letter-spacing:.6px; }
    .global-temp-button.active { color:var(--field-active); border-color:var(--field-line-strong); }

    .target-mode-actions.v271-mode-toolbar .osb-btn,
    .target-mode-actions.v271-mode-toolbar .osb-btn:last-child { border-right:0 !important; }

    .v271-bottom-sheet .osb-btn,
    .v271-quick-grid .osb-btn,
    .v271-more-grid .osb-btn,
    .v271-via-list .osb-btn {
      display:flex;
      align-items:center;
      justify-content:center;
      text-align:center;
      min-width:0;
    }
    .v271-via-list .osb-btn { min-height:42px; padding:0 8px; }
    .v271-search-row { align-items:stretch; }
    .v271-search-row .osb-btn { min-height:42px; }

    .v271-point-sheet { gap:6px; padding:10px 10px max(10px, env(safe-area-inset-bottom)); }
    .v271-point-sheet .v271-sheet-head { min-height:48px; padding:0 0 7px; }
    .v271-copy-row,
    .v271-point-address {
      min-height:44px;
      padding:0 10px;
      display:grid;
      grid-template-columns:72px minmax(0,1fr);
      align-items:center;
      gap:10px;
      border:1px solid var(--field-line);
      background:transparent;
      color:var(--field-dim);
      font:800 9px var(--font-mono);
    }
    .v271-copy-row strong,
    .v271-point-address { text-align:right; }
    .v271-point-address { border-left:1px solid var(--field-line); line-height:1.35; }
    .v271-point-address::before { content:'ADDRESS'; text-align:left; color:var(--field-dim); letter-spacing:.4px; }
    .v271-point-address[hidden] { display:none !important; }
    .v271-point-sheet .v271-delete-button { min-height:44px; margin-top:2px; }

    .plan-point-hitbox,
    .route-via-wrapper {
      width:48px !important;
      height:48px !important;
      display:flex !important;
      align-items:center;
      justify-content:center;
      background:transparent !important;
      border:0 !important;
    }
    .plan-point-hitbox > .route-start-marker,
    .plan-point-hitbox > .route-end-marker,
    .route-via-wrapper > .route-via-icon { flex:0 0 auto; }

    .last-gps-marker {
      position:relative;
      width:26px;
      height:26px;
      color:var(--field-dim);
      filter:drop-shadow(0 0 3px rgba(0,0,0,.5));
    }
    .last-gps-marker::before {
      content:'L';
      position:absolute;
      inset:3px;
      display:flex;
      align-items:center;
      justify-content:center;
      border:1.5px dashed currentColor;
      background:rgba(0,0,0,.54);
      font:900 9px var(--font-mono);
    }
    .last-gps-marker .v26-map-label { color:var(--field-dim); }

    .nav-next-hold { position:relative; overflow:hidden; isolation:isolate; }
    .nav-next-hold::after {
      content:'';
      position:absolute;
      z-index:-1;
      left:0;
      top:0;
      bottom:0;
      width:0;
      background:rgba(255,255,255,.11);
      pointer-events:none;
      transition:width .7s linear;
    }
    .nav-next-hold.hold-armed::after { width:100%; }
    #navPauseBtn.active { color:var(--field-warning); }
'''
replace_once('\n  </style>\n</head>', v272_css + '\n\n  </style>\n</head>', 'append v272 css')

# Insert V27.2 behavior after V27.1 state declarations so it can wrap the final V27.1 implementations.
anchor = "    let pendingDrawUndo = null;\n"
if html.count(anchor) != 1:
    raise SystemExit(f'v272 state anchor: expected 1, found {html.count(anchor)}')
v272_state = r'''

    // V27.2 position/navigation state.
    let lastGpsReferencePoint = null;
    let lastGpsFixAt = 0;
    let tempMarkUpdatedAt = 0;
    let lastGpsMarker = null;
    let navPaused = false;
    let navPausedAt = null;
    let navPauseTotalMs = 0;
    let navLegPauseTotalMs = 0;
    let lastNavLegTransition = null;
    const NAV_NEXT_HOLD_MS = 700;
    let navNextHoldTimer = 0;
    let navNextHoldButton = null;
'''
html = html.replace(anchor, anchor + v272_state, 1)

# Endpoint hitboxes: create a large invisible touch target around the unchanged S/E visual.
marker_anchor = "    // All PLAN point markers share the same tap -> info -> delete lifecycle.\n"
if html.count(marker_anchor) != 1:
    raise SystemExit('plan marker anchor missing')
marker_helper = r'''
    function planPointHitIcon(cls, label) {
      return L.divIcon({
        className:'plan-point-hitbox',
        iconSize:[48,48],
        iconAnchor:[24,24],
        html:`<div class="${cls}"><span class="v26-map-label">${label}</span></div>`
      });
    }

'''
html = html.replace(marker_anchor, marker_helper + marker_anchor, 1)
replace_last("icon:fieldDivIcon('route-start-marker','START')", "icon:planPointHitIcon('route-start-marker','START')", 'start hitbox')
replace_last("icon:fieldDivIcon('route-end-marker','END')", "icon:planPointHitIcon('route-end-marker','END')", 'end hitbox')

# V27.2 behavior block is added before final initialization so all wrappers are active from first render.
final_anchor = "\n\n    updateWpCounter();\n"
if html.count(final_anchor) != 1:
    raise SystemExit(f'final init anchor: expected 1, found {html.count(final_anchor)}')
v272_js = r'''

    /* ============================================================
       V27.2 // POSITION + NAV STABILIZATION
       ============================================================ */
    referenceLabel = function(type) {
      if (type === 'TEMP') return 'TEMP POS';
      if (type === 'LAST_GPS') return 'LAST GPS';
      return type || 'NONE';
    };

    getReferencePosition = function() {
      if (gpsPowerEnabled && hasGpsFix) return { type:'GPS', coords:[baseLocation[0],baseLocation[1]] };
      const tempIsFresh = Boolean(tempMarkPoint?.coords && (!lastGpsReferencePoint?.coords || tempMarkUpdatedAt >= lastGpsFixAt));
      if (tempIsFresh) return { type:'TEMP', coords:[...tempMarkPoint.coords] };
      if (lastGpsReferencePoint?.coords) return { type:'LAST_GPS', coords:[...lastGpsReferencePoint.coords] };
      if (tempMarkPoint?.coords) return { type:'TEMP', coords:[...tempMarkPoint.coords] };
      return null;
    };

    function renderLastGpsMarker() {
      const show = Boolean(lastGpsReferencePoint?.coords && !(gpsPowerEnabled && hasGpsFix));
      if (!show) {
        if (lastGpsMarker && map.hasLayer(lastGpsMarker)) map.removeLayer(lastGpsMarker);
        return;
      }
      if (!lastGpsMarker) {
        lastGpsMarker = L.marker(lastGpsReferencePoint.coords, {
          icon:fieldDivIcon('last-gps-marker','LAST GPS'), keyboard:false, zIndexOffset:62
        });
      } else lastGpsMarker.setLatLng(lastGpsReferencePoint.coords);
      if (!map.hasLayer(lastGpsMarker)) lastGpsMarker.addTo(map);
    }

    const v272SetTempMark = setTempMark;
    setTempMark = function(coords, name='TEMP POS') {
      const lat=Number(coords?.[0]), lon=Number(coords?.[1]);
      if (!validCoordinates([lat,lon])) return;
      tempMarkUpdatedAt = Date.now();
      v272SetTempMark([lat,lon], name);
      syncCenterFollowUi();
    };

    const v272ClearTempMark = clearTempMark;
    clearTempMark = function() {
      tempMarkUpdatedAt = 0;
      v272ClearTempMark();
      syncCenterFollowUi();
    };

    const v272ApplyGpsPosition = applyGpsPosition;
    applyGpsPosition = function(pos, shouldRecenter=false, session=gpsSessionId) {
      const lat=Number(pos?.coords?.latitude), lon=Number(pos?.coords?.longitude);
      if (gpsPowerEnabled && session === gpsSessionId && validCoordinates([lat,lon])) {
        lastGpsFixAt = Number(pos?.timestamp) || Date.now();
        lastGpsReferencePoint = { name:'LAST GPS', coords:[lat,lon], source:'LAST_GPS', capturedAt:lastGpsFixAt };
      }
      v272ApplyGpsPosition(pos, shouldRecenter, session);
      renderLastGpsMarker();
      syncCenterFollowUi();
    };

    const v272RefreshPositionState = refreshPositionState;
    refreshPositionState = function() {
      v272RefreshPositionState();
      renderLastGpsMarker();
      syncCenterFollowUi();
    };

    function isReferenceCentered(coords, tolerancePx=18) {
      if (!validCoordinates(coords)) return false;
      const refPoint = map.latLngToContainerPoint(coords);
      const centerPoint = map.getSize().divideBy(2);
      return refPoint.distanceTo(centerPoint) <= tolerancePx;
    }

    function syncCenterFollowUi() {
      const ref = getReferencePosition();
      const centerBtn = document.getElementById('gpsCenterBtn');
      const tempBtn = document.getElementById('globalTempBtn');
      if (tempBtn) tempBtn.classList.toggle('active', Boolean(tempMarkPoint?.coords));
      if (!centerBtn) return;
      const centered = Boolean(ref?.coords && isReferenceCentered(ref.coords));
      const following = Boolean(ref?.type === 'GPS' && gpsFollowEnabled);
      centerBtn.disabled = !ref?.coords;
      centerBtn.classList.toggle('active', centered || following);
      centerBtn.classList.toggle('follow-mode', following);
      centerBtn.setAttribute('aria-pressed', String(following));
      centerBtn.setAttribute('aria-label', following ? 'GPS FOLLOW 해제' : '현재 기준 위치로 이동');
      centerBtn.title = following ? 'FOLLOW ON' : (centered ? (ref?.type === 'GPS' ? 'CENTERED · TAP FOR FOLLOW' : 'CENTERED') : 'RECENTER');
    }

    function handleGlobalCenterFollow() {
      const ref = getReferencePosition();
      if (!ref?.coords) return;
      const centered = isReferenceCentered(ref.coords);
      if (ref.type === 'GPS') {
        if (gpsFollowEnabled) {
          setGpsFollow(false, false);
          syncCenterFollowUi();
          return;
        }
        if (centered) {
          setGpsFollow(true, false);
          syncCenterFollowUi();
          return;
        }
      }
      if (gpsFollowEnabled) setGpsFollow(false, false);
      map.setView(ref.coords, Math.max(map.getZoom(), ref.type === 'GPS' ? 13 : 14), {animate:false});
      flushReticleTelemetry();
      syncCenterFollowUi();
    }

    // Keep the center state derived from the real map/reference, never from a remembered button mode.
    map.on('moveend zoomend', syncCenterFollowUi);
    map.on('dragstart', () => setTimeout(syncCenterFollowUi, 0));

    const v272RefreshGpsPowerUi = refreshGpsPowerUi;
    refreshGpsPowerUi = function() {
      v272RefreshGpsPowerUi();
      syncCenterFollowUi();
    };

    function navTotalElapsedMs(now=Date.now()) {
      if (!navStartedAt) return 0;
      const end = navPaused && navPausedAt ? navPausedAt : now;
      return Math.max(0, end - navStartedAt - navPauseTotalMs);
    }

    function navCurrentLegElapsedMs(now=Date.now()) {
      if (!navLegStartedAt) return 0;
      const end = navPaused && navPausedAt ? navPausedAt : now;
      return Math.max(0, end - navLegStartedAt - navLegPauseTotalMs);
    }

    const v272StartNavElapsed = startNavElapsed;
    startNavElapsed = function() {
      navPaused = false;
      navPausedAt = null;
      navPauseTotalMs = 0;
      navLegPauseTotalMs = 0;
      lastNavLegTransition = null;
      v272StartNavElapsed();
    };

    function toggleNavPause() {
      if (!targetModeActive || targetModePhase !== 'NAV') return;
      const now = Date.now();
      if (navPaused) {
        const pauseDelta = Math.max(0, now - (navPausedAt || now));
        navPauseTotalMs += pauseDelta;
        navLegPauseTotalMs += pauseDelta;
        navPaused = false;
        navPausedAt = null;
      } else {
        navPaused = true;
        navPausedAt = now;
      }
      updateTargetModePanel();
    }

    nextNavLeg = function() {
      if (!targetModeActive || targetModePhase !== 'NAV' || navPaused || !hasNextNavLeg()) return;
      const now = Date.now();
      const previousElapsed = navCurrentLegElapsedMs(now);
      lastNavLegTransition = {
        fromIndex:navLegIndex,
        previousElapsed,
        navLegTimes:[...navLegTimes]
      };
      navLegTimes[navLegIndex] = previousElapsed;
      navLegIndex += 1;
      navLegStartedAt = now;
      navLegPauseTotalMs = 0;
      updateTargetModePanel();
    };

    function revertNavLeg() {
      if (!targetModeActive || targetModePhase !== 'NAV' || !lastNavLegTransition) return;
      const snapshot = lastNavLegTransition;
      navLegIndex = snapshot.fromIndex;
      navLegTimes = [...snapshot.navLegTimes];
      navLegPauseTotalMs = 0;
      const end = navPaused && navPausedAt ? navPausedAt : Date.now();
      navLegStartedAt = end - Math.max(0, snapshot.previousElapsed || 0);
      lastNavLegTransition = null;
      closeNavMore();
      showV271Toast('LEG RESTORED');
      updateTargetModePanel();
    }

    function cancelNavNextHold() {
      clearTimeout(navNextHoldTimer);
      navNextHoldTimer = 0;
      if (navNextHoldButton) navNextHoldButton.classList.remove('hold-armed');
      navNextHoldButton = null;
    }

    function beginNavNextHold(event) {
      const btn = event.currentTarget;
      if (!btn || btn.disabled || navPaused || !hasNextNavLeg()) return;
      event.preventDefault();
      cancelNavNextHold();
      navNextHoldButton = btn;
      btn.classList.add('hold-armed');
      navNextHoldTimer = setTimeout(() => {
        const held = navNextHoldButton;
        navNextHoldTimer = 0;
        navNextHoldButton = null;
        held?.classList.remove('hold-armed');
        nextNavLeg();
      }, NAV_NEXT_HOLD_MS);
    }

    ['targetNextLegBtn','navCollapsedNextLegBtn'].forEach(id => {
      const btn=document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('pointerdown', beginNavNextHold, {passive:false});
      btn.addEventListener('pointerup', cancelNavNextHold);
      btn.addEventListener('pointercancel', cancelNavNextHold);
      btn.addEventListener('pointerleave', cancelNavNextHold);
      btn.addEventListener('contextmenu', event => event.preventDefault());
    });

    const v272StopTargetNavigation = stopTargetNavigation;
    stopTargetNavigation = function() {
      if (!targetModeActive || targetModePhase !== 'NAV') return;
      navLegTimes[navLegIndex] = navCurrentLegElapsedMs();
      navPaused = false;
      navPausedAt = null;
      navPauseTotalMs = 0;
      navLegPauseTotalMs = 0;
      lastNavLegTransition = null;
      cancelNavNextHold();
      closeNavMore();
      navPanelCollapsed = false;
      returnToTargetPlan();
    };

    const v272ReturnToTargetPlan = returnToTargetPlan;
    returnToTargetPlan = function() {
      navPaused = false;
      navPausedAt = null;
      navPauseTotalMs = 0;
      navLegPauseTotalMs = 0;
      lastNavLegTransition = null;
      cancelNavNextHold();
      v272ReturnToTargetPlan();
    };

    const v272UpdateTargetModePanel = updateTargetModePanel;
    updateTargetModePanel = function() {
      v272UpdateTargetModePanel();
      const isNav = targetModeActive && targetModePhase === 'NAV';
      const elapsed = document.getElementById('navHudElapsed');
      if (elapsed && isNav) {
        elapsed.textContent = `${navPaused ? 'PAUSED · ' : ''}TOTAL ${formatElapsed(navTotalElapsedMs())} · LEG ${formatElapsed(navCurrentLegElapsedMs())}`;
      }
      const pauseBtn=document.getElementById('navPauseBtn');
      if (pauseBtn) {
        pauseBtn.textContent = navPaused ? 'RESUME' : 'PAUSE';
        pauseBtn.classList.toggle('active', navPaused);
      }
      const nextDisabled = !hasNextNavLeg() || navPaused;
      const next=document.getElementById('targetNextLegBtn');
      const nextCompact=document.getElementById('navCollapsedNextLegBtn');
      if (next) next.disabled=nextDisabled;
      if (nextCompact) nextCompact.disabled=nextDisabled;
      const revert=document.getElementById('navRevertLegBtn');
      if (revert) revert.disabled=!lastNavLegTransition;
      syncCenterFollowUi();
    };

    // GPS loss keeps a LAST GPS reference rather than zeroing NAV distance/bearing.
    const v272StopGpsTracking = stopGpsTracking;
    stopGpsTracking = function() {
      v272StopGpsTracking();
      renderLastGpsMarker();
      syncCenterFollowUi();
      if (targetModeActive) updateTargetModePanel();
    };

    // PLAN/POINT/NAV sheets use the same alignment and state refresh path.
    const v272OpenNavMore = openNavMore;
    openNavMore = function() {
      v272OpenNavMore();
      const revert=document.getElementById('navRevertLegBtn');
      if (revert) revert.disabled=!lastNavLegTransition;
    };
'''
html = html.replace(final_anchor, v272_js + final_anchor, 1)

# Copy/status wording should acknowledge LAST GPS as a valid emergency reference.
html = html.replace("alert('GPS FIX 또는 TEMP POS가 필요합니다.');", "alert('GPS FIX, TEMP POS 또는 LAST GPS가 필요합니다.');")

INDEX.write_text(html, encoding='utf-8')

sw = SW.read_text(encoding='utf-8')
sw = replace_text_once(sw, "const CACHE_VERSION = 'v27-1-20261004';", "const CACHE_VERSION = 'v27-2-20261004';", 'sw cache version')
SW.write_text(sw, encoding='utf-8')

agents = AGENTS.read_text(encoding='utf-8')
agents = replace_text_once(
    agents,
    '- 현재 기준 위치의 우선순위는 **GPS ON + 유효한 FIX → TEMP → 없음**이다. HOME은 별도의 귀환 지점이다. 마지막 GPS 좌표, 현재 FIX, TEMP, 기준 위치의 의미를 임의로 섞거나 변경하지 않는다.',
    '- 현재 기준 위치의 우선순위는 **GPS ON + 유효한 FIX → 최근 GPS FIX 이후 사용자가 새로 지정한 TEMP → LAST GPS → (LAST GPS가 없을 때) TEMP → 없음**이다. HOME은 별도의 귀환 지점이다. LAST GPS는 GPS가 꺼지거나 FIX를 잃었을 때 자동 비상 기준으로만 유지하며 TEMP를 자동 덮어쓰지 않는다.',
    'agents reference priority'
)
AGENTS.write_text(agents, encoding='utf-8')

print('V27.2 patch applied')
