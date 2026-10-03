from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SW = ROOT / "service-worker.js"

html = INDEX.read_text(encoding="utf-8")
if "V27.1 // COMPACT FIELD WORKFLOW" in html:
    print("V27.1 patch already applied")
    raise SystemExit(0)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, got {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, repl, label):
    out, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one regex match, got {count}")
    return out


html = replace_once(
    html,
    "<title>TACTICAL RECON // FIELD TERMINAL V27</title>",
    "<title>TACTICAL RECON // FIELD TERMINAL V27.1</title>",
    "document title",
)

html = replace_once(
    html,
    "const mapOptions = { center:baseLocation, zoom:12, zoomControl:false };",
    "const mapOptions = { center:baseLocation, zoom:12, zoomControl:false, zoomSnap:0.25, zoomDelta:0.5 };",
    "map zoom options",
)

# Global GPS controls live outside every mode. GPS power no longer consumes a bottom-bar slot.
gps_controls = r'''  <!-- 전역 GPS 조작부: 모든 모드에서 동일 위치 -->
  <div class="global-gps-controls" id="globalGpsControls" aria-label="GPS controls">
    <button class="global-gps-button" id="gpsPowerBtn" type="button" onclick="toggleGpsPower()" aria-pressed="false" title="GPS ON/OFF">
      <span id="gpsPowerLabel">GPS</span>
    </button>
    <button class="global-gps-button gps-center-button" id="gpsCenterBtn" type="button" onclick="centerGpsNow()" aria-label="GPS 위치로 이동" title="GPS 위치로 이동" disabled>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5" class="gps-center-core"/></svg>
    </button>
  </div>

'''
html = replace_once(
    html,
    "  <!-- 좌측 조준점 텔레메트리 OSD -->\n",
    gps_controls + "  <!-- 좌측 조준점 텔레메트리 OSD -->\n",
    "global GPS controls insertion",
)

# Replace the stacked V27 PLAN/NAV action matrix with compact mode-specific bottom bars.
new_target_panel = r'''  <!-- 목표 추적 / 경로 계획 -->
  <div class="target-mode-panel" id="targetModePanel">
    <div class="target-mode-head" id="planInfoTrigger" role="button" tabindex="0" aria-disabled="true" onclick="startTargetNavigation()" onkeydown="handlePlanInfoKey(event)">
      <div class="target-mode-copy">
        <div class="target-mode-kicker">TARGET MODE // ROUTE PLAN</div>
        <div class="target-mode-name" id="targetModeName">NO TARGET</div>
      </div>
      <div class="target-mode-stats" id="targetModeStats">ROUTE 0.0 KM<br>0 SEG</div>
      <div class="plan-nav-hint">
        <span id="planNavHint">POSITION REQUIRED</span>
        <button class="plan-share-inline" id="targetShareBtn" type="button" onclick="event.stopPropagation();shareTargetRoute()" disabled>SHARE</button>
      </div>
    </div>

    <div class="nav-riding-hud" id="navRidingHud" aria-live="polite">
      <div class="nav-hud-topline">
        <span class="nav-hud-target" id="navHudTarget">NO TARGET</span>
        <span class="nav-hud-orient" id="navHudOrient">NORTH UP</span>
        <button class="target-panel-collapse" id="targetPanelCollapseBtn" type="button" onclick="toggleNavPanelCollapse(event)">HIDE</button>
      </div>
      <div class="nav-hud-mainline">
        <div class="nav-hud-distance-block">
          <div><span class="nav-hud-distance" id="navHudDistance">--.-</span><span class="nav-hud-unit" id="navHudUnit">KM</span></div>
          <div class="nav-hud-distance-label" id="navHudDistanceLabel">DIRECT TO TARGET</div>
        </div>
        <div class="nav-hud-side">
          <strong id="navHudBearing">BRG ---°</strong>
          <span class="nav-hud-leg" id="navHudLeg">LEG 1 · TARGET</span>
          <span class="nav-hud-elapsed" id="navHudElapsed">TOTAL 00:00:00 · LEG 00:00:00</span>
          <span id="navHudGps">GPS NO FIX</span>
          <span class="nav-hud-ref" id="navHudRef">REF --</span>
          <span id="navHudTrack">TRACK OFF</span>
        </div>
      </div>
      <div class="nav-collapsed-actions">
        <button class="osb-btn" id="navCollapsedNextLegBtn" type="button" onclick="nextNavLeg()">NEXT LEG</button>
        <button class="osb-btn action-primary" type="button" onclick="stopTargetNavigation()">STOP</button>
      </div>
    </div>

    <div class="target-mode-actions v271-mode-toolbar" id="targetModeToolbar">
      <!-- PLAN -->
      <button class="osb-btn plan-main-only" id="planSearchBtn" type="button" onclick="openPlanSearch()">SEARCH</button>
      <button class="osb-btn plan-main-only" id="planSetBtn" type="button" onclick="enterPlanSetMode()">SET</button>
      <button class="osb-btn plan-main-only" id="targetDrawBtn" type="button" onclick="enterPlanDrawMode()">DRAW</button>
      <button class="osb-btn plan-main-only" id="planUndoBtn" type="button" onclick="undoPlanEdit()" disabled>UNDO</button>
      <button class="osb-btn plan-main-only" type="button" onclick="exitTargetMode()">EXIT</button>

      <!-- SET -->
      <button class="osb-btn set-only" type="button" onclick="setPlanPointAtReticle('START')">START</button>
      <button class="osb-btn set-only" type="button" onclick="setPlanPointAtReticle('VIA')">VIA</button>
      <button class="osb-btn set-only" type="button" onclick="setPlanPointAtReticle('END')">END</button>
      <button class="osb-btn set-only action-primary" type="button" onclick="exitPlanSubmode()">DONE</button>

      <!-- DRAW -->
      <button class="osb-btn draw-only draw-kind-btn" id="targetDrawKindBtn" type="button" onclick="toggleDrawKind()">ROUTE</button>
      <button class="osb-btn draw-only" id="drawUndoBtn" type="button" onclick="undoPlanEdit()" disabled>UNDO</button>
      <button class="osb-btn draw-only" id="drawClearBtn" type="button" onclick="clearRouteDraft()" disabled>CLEAR</button>
      <button class="osb-btn draw-only action-primary" type="button" onclick="exitPlanSubmode()">DONE</button>

      <!-- NAV -->
      <button class="osb-btn nav-only" id="targetRecenterBtn" type="button" onclick="recenterTargetNavigation()">RECENTER</button>
      <button class="osb-btn nav-only gps-follow-toggle" type="button" onclick="toggleGpsFollow()" aria-pressed="false">FOLLOW OFF</button>
      <button class="osb-btn nav-only" id="targetNextLegBtn" type="button" onclick="nextNavLeg()">NEXT LEG</button>
      <button class="osb-btn nav-only action-primary" id="targetNavStopBtn" type="button" onclick="stopTargetNavigation()">STOP</button>
      <button class="osb-btn nav-only" id="navMoreBtn" type="button" onclick="openNavMore()">MORE</button>
    </div>
  </div>

  <!-- 하단 야전 단말 조작부 -->'''
html = regex_once(
    html,
    r"  <!-- 목표 추적 / 경로 계획 -->\n.*?\n  <!-- 하단 야전 단말 조작부 -->",
    new_target_panel,
    "target mode panel",
)

# Normal map mode keeps four primary actions. GPS is now globally fixed at upper-right.
new_bottom = r'''  <div class="mfd-bottom-bar">
    <div class="osb-cluster v26-main-cluster">
      <button class="osb-btn v26-primary" id="primaryCenterBtn" onclick="recenterPrimary()">RECENTER</button>
      <button class="osb-btn v26-primary" onclick="openFieldControls('target')">TARGET</button>
      <button class="osb-btn v26-primary" onclick="openPlanShortcut()">PLAN</button>
      <button class="osb-btn v26-primary" onclick="openFieldControls('menu')">MENU</button>
    </div>
  </div>

  <!-- 거점 지정 모달 -->'''
html = regex_once(
    html,
    r"  <div class=\"mfd-bottom-bar\">.*?\n  <!-- 거점 지정 모달 -->",
    new_bottom,
    "normal bottom bar",
)

# Compact bottom sheets for PLAN search, PLAN point info, and NAV secondary controls.
v271_sheets = r'''  <!-- V27.1 PLAN SEARCH bottom sheet -->
  <section class="v271-bottom-sheet" id="planSearchSheet" aria-hidden="true">
    <div class="v271-sheet-head">
      <span>SEARCH</span>
      <button class="v271-sheet-close" type="button" onclick="closePlanSearch()" aria-label="검색 닫기">×</button>
    </div>
    <div class="v271-search-row">
      <input type="search" class="promo-input" id="planSearchInput" placeholder="주소 / WGS84 / MGRS" autocomplete="off" />
      <button class="osb-btn active" id="planSearchGoBtn" type="button" onclick="searchPlanLocation()">SEARCH</button>
    </div>
    <div class="address-search-results v271-search-results" id="planSearchResults">
      <div class="address-search-empty">주소·좌표·MGRS를 입력하십시오.</div>
    </div>
    <div class="v271-sheet-section">
      <div class="v271-sheet-label">QUICK</div>
      <div class="v271-quick-grid">
        <button class="osb-btn" id="planSearchHomeBtn" type="button" onclick="movePlanToHome()" disabled>HOME</button>
        <button class="osb-btn" id="planSearchTempBtn" type="button" onclick="movePlanToTemp()" disabled>TEMP POS</button>
      </div>
    </div>
    <div class="v271-sheet-section">
      <div class="v271-sheet-label">PLAN POINTS</div>
      <div class="v271-quick-grid">
        <button class="osb-btn" id="planSearchStartBtn" type="button" onclick="movePlanToPoint('START')" disabled>START</button>
        <button class="osb-btn" id="planSearchEndBtn" type="button" onclick="movePlanToPoint('END')" disabled>END</button>
      </div>
      <div class="v271-via-list" id="planSearchViaList"></div>
    </div>
  </section>

  <!-- V27.1 PLAN point info bottom sheet -->
  <section class="v271-bottom-sheet v271-point-sheet" id="planPointSheet" aria-hidden="true">
    <div class="v271-sheet-head">
      <div style="min-width:0;">
        <div class="v271-sheet-label" id="planPointType">POINT</div>
        <strong class="v271-point-name" id="planPointName">--</strong>
      </div>
      <button class="v271-sheet-close" type="button" onclick="closePlanPointInfo()" aria-label="포인트 정보 닫기">×</button>
    </div>
    <button class="v271-copy-row" type="button" onclick="copyPlanPointValue('WGS84')">
      <span>WGS84</span><strong id="planPointWgs84">--</strong>
    </button>
    <button class="v271-copy-row" type="button" onclick="copyPlanPointValue('MGRS')">
      <span>MGRS</span><strong id="planPointMgrs">--</strong>
    </button>
    <div class="v271-point-address" id="planPointAddress" hidden></div>
    <button class="osb-btn v271-delete-button" id="planPointDeleteBtn" type="button" onclick="deleteSelectedPlanPoint()">DELETE POINT</button>
  </section>

  <!-- V27.1 NAV secondary controls -->
  <section class="v271-bottom-sheet" id="navMoreSheet" aria-hidden="true">
    <div class="v271-sheet-head">
      <span>NAV CONTROLS</span>
      <button class="v271-sheet-close" type="button" onclick="closeNavMore()" aria-label="NAV 메뉴 닫기">×</button>
    </div>
    <div class="v271-more-grid">
      <button class="osb-btn" id="targetTrackRecBtn" type="button" onclick="toggleTrackRecording()">TRACK REC</button>
      <button class="osb-btn" id="targetBacktrackBtn" type="button" onclick="toggleBacktrack()">BACKTRACK</button>
      <button class="osb-btn" id="targetNavOpticBtn" type="button" onclick="openNavOptic();closeNavMore()">DISPLAY</button>
      <button class="osb-btn" id="targetShareNavBtn" type="button" onclick="shareTargetRoute()">SHARE</button>
      <button class="osb-btn" id="targetOrientationBtn" type="button" onclick="toggleNavMapOrientation()">NORTH UP</button>
      <button class="osb-btn v271-delete-button" type="button" onclick="closeNavMore();exitTargetMode()">EXIT TARGET</button>
    </div>
  </section>

  <div class="v271-toast" id="v271Toast" role="status" aria-live="polite"></div>

'''
html = replace_once(
    html,
    "  <!-- GPS / MANUAL REFERENCE STATUS -->\n",
    v271_sheets + "  <!-- GPS / MANUAL REFERENCE STATUS -->\n",
    "V27.1 sheets insertion",
)

css = r'''

    /* ============================================================
       V27.1 // COMPACT FIELD WORKFLOW
       mode-specific bottom bar + global GPS + bottom sheets
       ============================================================ */
    :root { --v271-toolbar-h: calc(54px + env(safe-area-inset-bottom)); }

    button:disabled,
    .osb-btn:disabled,
    .global-gps-button:disabled {
      opacity:.28 !important;
      color:var(--field-dim) !important;
      border-color:var(--field-line) !important;
      background:transparent !important;
      box-shadow:none !important;
      cursor:default !important;
      pointer-events:none !important;
      filter:grayscale(1);
    }

    .global-gps-controls {
      position:fixed;
      top:max(50px, calc(env(safe-area-inset-top) + 44px));
      right:8px;
      z-index:2550;
      display:flex;
      flex-direction:column;
      gap:4px;
      width:48px;
    }
    .global-gps-button {
      width:48px;
      min-height:38px;
      padding:0;
      display:flex;
      align-items:center;
      justify-content:center;
      border:1px solid var(--field-line);
      background:rgba(3,8,5,.88);
      color:var(--field-dim);
      font:900 9px/1 var(--font-mono);
      letter-spacing:.7px;
      cursor:pointer;
      backdrop-filter:blur(2px);
      -webkit-backdrop-filter:blur(2px);
    }
    .global-gps-button.active {
      color:var(--field-active);
      border-color:var(--field-line-strong);
      box-shadow:0 0 10px rgba(0,0,0,.35);
    }
    .gps-center-button svg { width:19px; height:19px; fill:none; stroke:currentColor; stroke-width:1.5; }
    .gps-center-button .gps-center-core { fill:currentColor; stroke:none; }

    @media (min-width:769px) {
      .sitrep-panel { right:70px; }
    }

    body.target-mode .mfd-bottom-bar { display:none !important; }
    .target-mode-panel {
      left:8px !important;
      right:8px !important;
      bottom:var(--v271-toolbar-h) !important;
      width:auto !important;
      transform:none !important;
      padding:9px 10px !important;
      border-bottom:0;
      z-index:2320;
    }
    .target-mode-head {
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      gap:5px 10px;
      align-items:start;
      padding:2px 1px 0;
      border-bottom:0;
      cursor:pointer;
      touch-action:manipulation;
    }
    .target-mode-head.nav-unavailable { cursor:default; }
    .target-mode-copy { min-width:0; }
    .target-mode-name { max-width:none !important; }
    .target-mode-stats { align-self:start; }
    .plan-nav-hint {
      grid-column:1 / -1;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-top:4px;
      padding-top:6px;
      border-top:1px solid var(--field-line);
      color:var(--field-active);
      font-size:8px;
      font-weight:900;
      letter-spacing:.9px;
    }
    .target-mode-head.nav-unavailable #planNavHint { color:var(--field-dim); }
    .plan-share-inline {
      min-width:48px;
      min-height:24px;
      padding:0 6px;
      border:1px solid var(--field-line);
      background:transparent;
      color:var(--field-dim);
      font:900 8px var(--font-mono);
      cursor:pointer;
    }

    .target-mode-actions.v271-mode-toolbar {
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      z-index:2360;
      margin:0 !important;
      padding:5px 6px max(5px, env(safe-area-inset-bottom));
      min-height:var(--v271-toolbar-h);
      background:rgba(3,8,5,.96);
      border:0;
      border-top:1px solid var(--field-line-strong);
      display:grid;
      grid-template-columns:repeat(5,minmax(0,1fr)) !important;
      gap:4px;
    }
    .target-mode-actions.v271-mode-toolbar .osb-btn {
      min-width:0;
      min-height:42px;
      padding:0 3px;
      border:0;
      border-right:1px solid var(--field-line);
      font-size:9px;
    }
    .target-mode-actions.v271-mode-toolbar .osb-btn:last-child { border-right:0; }
    .set-only,.draw-only,.nav-only { display:none !important; }
    body.plan-set-submode .target-mode-actions.v271-mode-toolbar,
    body.plan-draw-submode .target-mode-actions.v271-mode-toolbar { grid-template-columns:repeat(4,minmax(0,1fr)) !important; }
    body.plan-set-submode .target-mode-actions .plan-main-only,
    body.plan-draw-submode .target-mode-actions .plan-main-only { display:none !important; }
    body.plan-set-submode .target-mode-actions .set-only { display:flex !important; }
    body.plan-draw-submode .target-mode-actions .draw-only { display:flex !important; }
    body.target-nav .target-mode-actions.v271-mode-toolbar { grid-template-columns:repeat(5,minmax(0,1fr)) !important; }
    body.target-nav .target-mode-actions .plan-main-only,
    body.target-nav .target-mode-actions .set-only,
    body.target-nav .target-mode-actions .draw-only { display:none !important; }
    body.target-nav .target-mode-actions .nav-only { display:flex !important; }

    .nav-riding-hud { padding:0; }
    .nav-hud-topline { gap:8px; }
    .nav-hud-target { max-width:none !important; flex:1 1 auto; }
    .nav-hud-orient { margin-left:auto; flex:0 0 auto; }
    .target-panel-collapse { flex:0 0 50px; }
    .nav-hud-elapsed { font-variant-numeric:tabular-nums; }
    .nav-collapsed-actions { display:none; }

    body.target-nav.nav-panel-collapsed .target-mode-panel {
      left:0 !important;
      right:0 !important;
      bottom:0 !important;
      width:auto !important;
      transform:none !important;
      padding:7px 8px max(7px, env(safe-area-inset-bottom)) !important;
      border-left:0;
      border-right:0;
      border-bottom:0;
    }
    body.target-nav.nav-panel-collapsed .target-mode-actions { display:none !important; }
    body.target-nav.nav-panel-collapsed .nav-hud-topline { gap:7px; }
    body.target-nav.nav-panel-collapsed .nav-hud-target {
      max-width:none !important;
      font-size:10px !important;
      flex:1 1 auto;
    }
    body.target-nav.nav-panel-collapsed .nav-hud-orient {
      font-size:8px !important;
      margin-left:auto;
    }
    body.target-nav.nav-panel-collapsed .target-panel-collapse {
      min-width:48px;
      min-height:28px;
      flex:0 0 48px;
    }
    body.target-nav.nav-panel-collapsed .nav-hud-mainline {
      display:grid;
      grid-template-columns:auto minmax(0,1fr);
      align-items:center;
      gap:8px;
      margin-top:4px;
      padding-top:5px;
    }
    body.target-nav.nav-panel-collapsed .nav-hud-distance { font-size:24px !important; }
    body.target-nav.nav-panel-collapsed .nav-hud-unit { font-size:10px !important; }
    body.target-nav.nav-panel-collapsed .nav-hud-side {
      min-width:0;
      align-items:flex-end;
      gap:2px;
      font-size:7px;
    }
    body.target-nav.nav-panel-collapsed .nav-hud-side strong { font-size:13px !important; }
    body.target-nav.nav-panel-collapsed .nav-hud-elapsed {
      display:block !important;
      font-size:7px;
      white-space:nowrap;
    }
    body.target-nav.nav-panel-collapsed .nav-hud-ref,
    body.target-nav.nav-panel-collapsed #navHudGps,
    body.target-nav.nav-panel-collapsed #navHudTrack,
    body.target-nav.nav-panel-collapsed .nav-hud-distance-label { display:none !important; }
    body.target-nav.nav-panel-collapsed .nav-collapsed-actions {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:4px;
      margin-top:5px;
      padding-top:5px;
      border-top:1px solid var(--field-line);
    }
    body.target-nav.nav-panel-collapsed .nav-collapsed-actions .osb-btn { min-height:34px; font-size:8px; }

    .v271-bottom-sheet {
      position:fixed;
      left:8px;
      right:8px;
      bottom:var(--v271-toolbar-h);
      z-index:2700;
      display:none;
      flex-direction:column;
      gap:8px;
      max-height:min(58vh,520px);
      overflow-y:auto;
      -webkit-overflow-scrolling:touch;
      padding:10px;
      background:rgba(4,10,6,.985);
      border:1px solid var(--field-line-strong);
      border-bottom:0;
      color:var(--field-text);
      box-shadow:0 -10px 30px rgba(0,0,0,.28);
    }
    .v271-bottom-sheet.open { display:flex; }
    .v271-sheet-head { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:34px; border-bottom:1px solid var(--field-line); padding-bottom:6px; color:var(--field-active); font-size:10px; font-weight:900; letter-spacing:1px; }
    .v271-sheet-close { width:36px; height:32px; border:0; background:transparent; color:var(--field-active); font:900 18px/1 var(--font-mono); cursor:pointer; }
    .v271-search-row { display:flex; gap:5px; }
    .v271-search-row .promo-input { flex:1; min-width:0; margin:0; }
    .v271-search-row .osb-btn { flex:0 0 72px; }
    .v271-search-results { max-height:180px; margin-top:0; }
    .v271-sheet-section { display:flex; flex-direction:column; gap:5px; }
    .v271-sheet-label { color:var(--field-dim); font-size:8px; font-weight:900; letter-spacing:1px; }
    .v271-quick-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px; }
    .v271-via-list { display:flex; flex-direction:column; gap:4px; max-height:150px; overflow-y:auto; }
    .v271-via-list .osb-btn { justify-content:flex-start; min-height:36px; text-align:left; }
    .v271-via-empty { padding:7px; border:1px dashed var(--field-line); color:var(--field-dim); font-size:8px; text-align:center; }
    .v271-point-name { display:block; margin-top:2px; color:var(--field-active); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .v271-copy-row { width:100%; min-height:42px; display:grid; grid-template-columns:auto minmax(0,1fr); gap:12px; align-items:center; border:1px solid var(--field-line); background:transparent; color:var(--field-dim); font:800 9px var(--font-mono); text-align:left; cursor:pointer; }
    .v271-copy-row strong { color:var(--field-text); text-align:right; overflow-wrap:anywhere; }
    .v271-point-address { padding:7px 8px; border-left:1px solid var(--field-line); color:var(--field-dim); font-size:8px; line-height:1.4; }
    .v271-delete-button { color:#ef7777 !important; border-color:rgba(239,119,119,.35) !important; }
    .v271-more-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px; }

    .v271-toast {
      position:fixed;
      left:50%;
      bottom:calc(var(--v271-toolbar-h) + 18px);
      transform:translate(-50%,8px);
      z-index:5000;
      opacity:0;
      pointer-events:none;
      padding:7px 12px;
      background:rgba(2,8,4,.96);
      border:1px solid var(--field-line-strong);
      color:var(--field-active);
      font:900 9px var(--font-mono);
      letter-spacing:1px;
      transition:opacity .12s, transform .12s;
    }
    .v271-toast.show { opacity:1; transform:translate(-50%,0); }
    .coord-copy-feedback:not(:empty) { color:var(--field-active) !important; font-weight:900; font-size:9px; }

    body.target-mode .map-scale-osd { bottom:calc(148px + env(safe-area-inset-bottom)) !important; }
    body.target-nav:not(.nav-panel-collapsed) .map-scale-osd { bottom:calc(210px + env(safe-area-inset-bottom)) !important; }
    body.target-nav.nav-panel-collapsed .map-scale-osd { bottom:calc(142px + env(safe-area-inset-bottom)) !important; }

    #map.route-draw-active { touch-action:none !important; }
    body.plan-draw-submode .target-mode-head { opacity:.78; }

    @media (max-width:768px) {
      .global-gps-controls { right:7px; width:46px; }
      .global-gps-button { width:46px; min-height:37px; }
      .target-mode-panel { left:0 !important; right:0 !important; }
      .target-mode-name { font-size:10px; }
      .target-mode-stats { font-size:7px; }
      .plan-nav-hint { font-size:7px; }
      .target-mode-actions.v271-mode-toolbar { padding-left:4px; padding-right:4px; gap:2px; }
      .target-mode-actions.v271-mode-toolbar .osb-btn { font-size:8px; padding:0 2px; }
      .v271-bottom-sheet { left:0; right:0; padding:9px 8px; }
    }
'''
html = replace_once(html, "\n  </style>\n", css + "\n  </style>\n", "V27.1 CSS")

js = r'''

    /* ============================================================
       V27.1 // COMPACT FIELD WORKFLOW
       ============================================================ */
    let planUiSubmode = 'MAIN';
    let planUndoStack = [];
    let selectedPlanPointRef = null;
    let planSearchToken = 0;
    let planSearchOpen = false;
    let v271ToastTimer = 0;
    let pendingDrawUndo = null;

    function setV271Sheet(id, open) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('open', Boolean(open));
      el.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    function closePlanSearch() {
      planSearchToken++;
      planSearchOpen = false;
      setV271Sheet('planSearchSheet', false);
    }

    function closePlanPointInfo() {
      selectedPlanPointRef = null;
      setV271Sheet('planPointSheet', false);
    }

    function closeNavMore() { setV271Sheet('navMoreSheet', false); }

    function closeV271Sheets() {
      closePlanSearch();
      closePlanPointInfo();
      closeNavMore();
    }

    function showV271Toast(text) {
      const el = document.getElementById('v271Toast');
      if (!el) return;
      clearTimeout(v271ToastTimer);
      el.textContent = text;
      el.classList.add('show');
      v271ToastTimer = setTimeout(() => el.classList.remove('show'), 1000);
    }

    function capturePlanEditState() {
      return {
        startPoint:cloneRouteEndpoint(routeStartPoint),
        endPoint:cloneRouteEndpoint(routeEndPoint),
        viaPoints:cloneRouteViaPoints(routeViaPoints),
        routeSegments:cloneRouteSegments(routeDraftSegments),
        overlaySegments:cloneRouteSegments(routeMarkSegments)
      };
    }

    function recordPlanUndo(snapshot) {
      if (!snapshot || !targetModeActive || targetModePhase !== 'PLAN') return;
      planUndoStack.push(snapshot);
      if (planUndoStack.length > 40) planUndoStack.shift();
      syncKnownActionAvailability();
    }

    function restorePlanEditState(snapshot) {
      if (!snapshot) return;
      routeStartPoint = cloneRouteEndpoint(snapshot.startPoint);
      routeEndPoint = cloneRouteEndpoint(snapshot.endPoint);
      routeViaPoints = cloneRouteViaPoints(snapshot.viaPoints);
      routeDraftSegments = cloneRouteSegments(snapshot.routeSegments);
      routeMarkSegments = cloneRouteSegments(snapshot.overlaySegments);
      routeDirty = true;
      closePlanPointInfo();
      renderRouteDraft();
      renderPlanSearchPoints();
      updateTargetModePanel();
    }

    function undoPlanEdit() {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !planUndoStack.length) return;
      restorePlanEditState(planUndoStack.pop());
    }

    function enterPlanSetMode() {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      closeV271Sheets();
      setMapRouteDrawInteraction(false);
      planUiSubmode = 'SET';
      updateTargetModePanel();
    }

    function enterPlanDrawMode() {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      closeV271Sheets();
      routeDrawKind = 'ROUTE';
      planUiSubmode = 'DRAW';
      setMapRouteDrawInteraction(true);
      updateTargetModePanel();
    }

    function exitPlanSubmode() {
      if (routeDrawEnabled) setMapRouteDrawInteraction(false);
      planUiSubmode = 'MAIN';
      updateTargetModePanel();
    }

    function setPlanPointAtReticle(role) {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !['START','VIA','END'].includes(role)) return;
      const c = map.getCenter();
      const snapshot = capturePlanEditState();
      const coords = [c.lat, c.lng];
      if (role === 'START') routeStartPoint = { name:'START', coords, source:'RETICLE' };
      else if (role === 'END') routeEndPoint = { name:'END', coords, source:'RETICLE' };
      else {
        if (routeViaPoints.length >= 100) return;
        routeViaPoints.push({ id:`VIA-${Date.now()}-${routeViaPoints.length+1}`, name:`VIA ${routeViaPoints.length+1}`, coords, address:'', source:'RETICLE' });
      }
      recordPlanUndo(snapshot);
      routeDirty = true;
      renderRouteDraft();
      renderPlanSearchPoints();
      updateTargetModePanel();
    }

    function selectedPlanPoint() {
      if (!selectedPlanPointRef) return null;
      if (selectedPlanPointRef.role === 'START') return routeStartPoint;
      if (selectedPlanPointRef.role === 'END') return routeEndPoint;
      if (selectedPlanPointRef.role === 'VIA') return routeViaPoints.find(v => String(v.id) === String(selectedPlanPointRef.id)) || null;
      return null;
    }

    function openPlanPointInfo(role, id = null, event = null) {
      if (event) {
        try { event.originalEvent && L.DomEvent.stopPropagation(event.originalEvent); } catch (e) {}
      }
      if (!targetModeActive || targetModePhase !== 'PLAN' || routeDrawEnabled) return;
      selectedPlanPointRef = { role, id };
      const point = selectedPlanPoint();
      if (!point?.coords) { closePlanPointInfo(); return; }
      closePlanSearch();
      const type = document.getElementById('planPointType');
      const name = document.getElementById('planPointName');
      const wgs = document.getElementById('planPointWgs84');
      const mgrsEl = document.getElementById('planPointMgrs');
      const addr = document.getElementById('planPointAddress');
      if (type) type.textContent = role === 'VIA' ? 'VIA POINT' : `${role} POINT`;
      if (name) name.textContent = point.name || role;
      if (wgs) wgs.textContent = `${point.coords[0].toFixed(6)}, ${point.coords[1].toFixed(6)}`;
      if (mgrsEl) mgrsEl.textContent = calcMGRS(point.coords[0], point.coords[1]);
      if (addr) {
        const address = String(point.address || '').trim();
        addr.hidden = !address;
        addr.textContent = address;
      }
      setV271Sheet('planPointSheet', true);
    }

    async function copyPlanPointValue(kind) {
      const point = selectedPlanPoint();
      if (!point?.coords) return;
      const value = kind === 'MGRS'
        ? calcMGRS(point.coords[0], point.coords[1])
        : `${point.coords[0].toFixed(6)}, ${point.coords[1].toFixed(6)}`;
      if (await writeClipboardText(value)) showV271Toast('COPIED');
    }

    function deleteSelectedPlanPoint() {
      const point = selectedPlanPoint();
      if (!point || !selectedPlanPointRef) return;
      const label = selectedPlanPointRef.role === 'VIA' ? (point.name || 'VIA') : selectedPlanPointRef.role;
      if (!confirm(`${label} 포인트를 삭제하시겠습니까?`)) return;
      const snapshot = capturePlanEditState();
      if (selectedPlanPointRef.role === 'START') routeStartPoint = null;
      else if (selectedPlanPointRef.role === 'END') routeEndPoint = null;
      else routeViaPoints = routeViaPoints.filter(v => String(v.id) !== String(selectedPlanPointRef.id));
      recordPlanUndo(snapshot);
      routeDirty = true;
      closePlanPointInfo();
      renderRouteDraft();
      renderPlanSearchPoints();
      updateTargetModePanel();
    }

    // All PLAN point markers share the same tap -> info -> delete lifecycle.
    renderRouteEndpoints = function() {
      if (routeStartMarker && map.hasLayer(routeStartMarker)) map.removeLayer(routeStartMarker);
      if (routeEndMarker && map.hasLayer(routeEndMarker)) map.removeLayer(routeEndMarker);
      routeStartMarker = routeEndMarker = null;
      if (!targetModeActive) return;
      if (routeStartPoint) {
        routeStartMarker = L.marker(routeStartPoint.coords,{icon:fieldDivIcon('route-start-marker','START'),keyboard:false,zIndexOffset:48}).addTo(map);
        routeStartMarker.on('click', e => openPlanPointInfo('START', null, e));
      }
      if (routeEndPoint) {
        routeEndMarker = L.marker(routeEndPoint.coords,{icon:fieldDivIcon('route-end-marker','END'),keyboard:false,zIndexOffset:48}).addTo(map);
        routeEndMarker.on('click', e => openPlanPointInfo('END', null, e));
      }
    };

    renderRouteViaPoints = function() {
      if (!routeViaLayer) return;
      routeViaLayer.clearLayers();
      if (!targetModeActive) return;
      routeViaPoints.forEach(via => {
        const marker = L.marker(via.coords,{icon:routeViaIcon(via),keyboard:false,riseOnHover:true}).addTo(routeViaLayer);
        marker.on('click', e => openPlanPointInfo('VIA', via.id, e));
      });
    };

    clearRouteDraft = function() {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      const bucket = routeDrawKind === 'MARK' ? routeMarkSegments : routeDraftSegments;
      if (!bucket.length) return;
      const label = routeDrawKind === 'MARK' ? 'OVERLAY' : 'ROUTE';
      if (!confirm(`${label} 선을 모두 지우시겠습니까?`)) return;
      const snapshot = capturePlanEditState();
      if (routeDrawKind === 'MARK') routeMarkSegments = []; else routeDraftSegments = [];
      recordPlanUndo(snapshot);
      routeDirty = true;
      renderRouteDraft();
      updateTargetModePanel();
    };

    // Capture a PLAN snapshot before a stroke, then add it to the undo stack only when a stroke actually commits.
    routeMapContainer.addEventListener('pointerdown', event => {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !routeDrawEnabled) return;
      if (routeGestureMode || routeActivePointers.size > 1) { pendingDrawUndo = null; return; }
      if (routePointerId === event.pointerId) {
        pendingDrawUndo = {
          snapshot:capturePlanEditState(),
          before:routeDraftSegments.length + routeMarkSegments.length,
          pointerId:event.pointerId
        };
      }
    }, { passive:true });
    const settleDrawUndo = event => {
      if (!pendingDrawUndo || pendingDrawUndo.pointerId !== event.pointerId) return;
      const after = routeDraftSegments.length + routeMarkSegments.length;
      if (after > pendingDrawUndo.before) recordPlanUndo(pendingDrawUndo.snapshot);
      pendingDrawUndo = null;
    };
    routeMapContainer.addEventListener('pointerup', settleDrawUndo, { passive:true });
    routeMapContainer.addEventListener('pointercancel', () => { pendingDrawUndo = null; }, { passive:true });

    function renderPlanSearchPoints() {
      const home = getHomePoint();
      const homeBtn = document.getElementById('planSearchHomeBtn');
      const tempBtn = document.getElementById('planSearchTempBtn');
      const startBtn = document.getElementById('planSearchStartBtn');
      const endBtn = document.getElementById('planSearchEndBtn');
      if (homeBtn) homeBtn.disabled = !home?.coords;
      if (tempBtn) tempBtn.disabled = !tempMarkPoint?.coords;
      if (startBtn) startBtn.disabled = !routeStartPoint?.coords;
      if (endBtn) endBtn.disabled = !routeEndPoint?.coords;
      const list = document.getElementById('planSearchViaList');
      if (!list) return;
      list.textContent = '';
      if (!routeViaPoints.length) {
        const empty = document.createElement('div');
        empty.className = 'v271-via-empty';
        empty.textContent = 'NO VIA';
        list.appendChild(empty);
        return;
      }
      routeViaPoints.forEach((via,index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'osb-btn';
        btn.textContent = `VIA ${String(index+1).padStart(2,'0')} · ${via.name || 'POINT'}`;
        btn.onclick = () => movePlanMapTo(via.coords);
        list.appendChild(btn);
      });
    }

    function openPlanSearch() {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      setMapRouteDrawInteraction(false);
      planUiSubmode = 'MAIN';
      closePlanPointInfo();
      closeNavMore();
      planSearchToken++;
      planSearchOpen = true;
      const input = document.getElementById('planSearchInput');
      const results = document.getElementById('planSearchResults');
      const button = document.getElementById('planSearchGoBtn');
      if (input) input.value = '';
      if (results) results.innerHTML = '<div class="address-search-empty">주소·좌표·MGRS를 입력하십시오.</div>';
      if (button) button.disabled = false;
      renderPlanSearchPoints();
      setV271Sheet('planSearchSheet', true);
      updateTargetModePanel();
      setTimeout(() => input?.focus(), 80);
    }

    function movePlanMapTo(coords, zoom = 15) {
      if (!validCoordinates(coords)) return;
      closePlanSearch();
      map.setView(coords, Math.max(map.getZoom(), zoom), {animate:false});
      flushReticleTelemetry();
    }
    function movePlanToHome() { const p=getHomePoint(); if (p?.coords) movePlanMapTo(p.coords,14); }
    function movePlanToTemp() { if (tempMarkPoint?.coords) movePlanMapTo(tempMarkPoint.coords,14); }
    function movePlanToPoint(role) {
      const p = role === 'START' ? routeStartPoint : role === 'END' ? routeEndPoint : null;
      if (p?.coords) movePlanMapTo(p.coords,15);
    }

    function appendPlanSearchResult(result, title, subtitle) {
      const results = document.getElementById('planSearchResults');
      if (!results || !result) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'address-search-item';
      const name = document.createElement('span');
      name.className = 'address-search-name';
      name.textContent = title;
      const coords = document.createElement('span');
      coords.className = 'address-search-coords';
      coords.textContent = subtitle;
      btn.append(name, coords);
      btn.onclick = () => movePlanMapTo([result.lat,result.lon],16);
      results.appendChild(btn);
    }

    async function searchPlanLocation() {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      const input = document.getElementById('planSearchInput');
      const results = document.getElementById('planSearchResults');
      const button = document.getElementById('planSearchGoBtn');
      const query = input?.value.trim();
      if (!query || !results) { input?.focus(); return; }
      const token = ++planSearchToken;
      results.innerHTML = '<div class="address-search-empty">SEARCHING...</div>';
      if (button) button.disabled = true;
      try {
        const direct = parseDirectRouteLocation(query);
        if (direct) {
          if (token !== planSearchToken) return;
          results.textContent = '';
          appendPlanSearchResult(direct, `${direct.source} COORDINATE`, `${direct.lat.toFixed(6)}, ${direct.lon.toFixed(6)} · ${calcMGRS(direct.lat,direct.lon)}`);
          return;
        }
        if (!navigator.onLine) {
          results.innerHTML = '<div class="address-search-empty">OFFLINE · 주소 검색은 사용할 수 없습니다. WGS84 또는 MGRS를 입력하십시오.</div>';
          return;
        }
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=6&addressdetails=1&accept-language=ko&q=${encodeURIComponent(query)}`;
        const res = await fetch(url,{headers:{Accept:'application/json'}});
        if (!res.ok) throw new Error('search failed');
        const data = await res.json();
        if (token !== planSearchToken) return;
        results.textContent = '';
        if (!Array.isArray(data) || !data.length) {
          results.innerHTML = '<div class="address-search-empty">검색 결과가 없습니다.</div>';
          return;
        }
        data.forEach(row => {
          const lat=Number(row.lat), lon=Number(row.lon);
          if (!Number.isFinite(lat)||!Number.isFinite(lon)) return;
          const address=normalizeKoreanAddress(row,row.display_name||query);
          appendPlanSearchResult({lat,lon}, address || row.display_name || query, `${lat.toFixed(5)}, ${lon.toFixed(5)} · ${calcMGRS(lat,lon)}`);
        });
      } catch (e) {
        if (token !== planSearchToken) return;
        results.innerHTML = '<div class="address-search-empty">위치 검색에 실패했습니다.</div>';
      } finally {
        if (button && token === planSearchToken) button.disabled = false;
      }
    }

    function handlePlanInfoKey(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      startTargetNavigation();
    }

    function centerGpsNow() {
      if (!gpsPowerEnabled || !hasGpsFix) return;
      map.setView(baseLocation, Math.max(map.getZoom(),13), {animate:false});
      flushReticleTelemetry();
    }

    // Power and centering are intentionally separate controls in V27.1.
    toggleGpsPower = function() {
      if (!navigator.geolocation) return;
      gpsPowerEnabled ? stopGpsTracking() : startGpsTracking(false);
    };

    recenterPrimary = function() {
      const ref=getReferencePosition();
      if (!ref?.coords) return;
      map.setView(ref.coords, Math.max(map.getZoom(), ref.type === 'GPS' ? 13 : 14), {animate:false});
      flushReticleTelemetry();
    };

    // GPS marker is global while GPS is ON+FIX; PLAN no longer has a separate MY POS visibility toggle.
    syncGpsMarkerVisibility = function() {
      if (!gpsMarker) return;
      const shouldShow = gpsPowerEnabled && hasGpsFix;
      const shown = map.hasLayer(gpsMarker);
      if (shouldShow && !shown) gpsMarker.addTo(map);
      if (!shouldShow && shown) map.removeLayer(gpsMarker);
    };

    function navSequence() {
      const seq = routeViaPoints.filter(v => validCoordinates(v?.coords)).map(v => ({...v, __navRole:'VIA'}));
      if (targetModeTarget?.coords) seq.push({...targetModeTarget, __navRole:'TARGET'});
      if (routeEndPoint?.coords) seq.push({...routeEndPoint, __navRole:'END'});
      return seq;
    }

    getCurrentNavDestination = function() {
      if (backtrackActive) return getBacktrackDestination();
      const seq = navSequence();
      return seq[Math.min(navLegIndex, Math.max(0,seq.length-1))] || targetModeTarget;
    };

    function hasNextNavLeg() {
      if (backtrackActive) return false;
      return navLegIndex < navSequence().length - 1;
    }

    nextNavLeg = function() {
      if (!targetModeActive || targetModePhase !== 'NAV' || !hasNextNavLeg()) return;
      navLegTimes[navLegIndex] = Date.now() - (navLegStartedAt || Date.now());
      navLegIndex += 1;
      navLegStartedAt = Date.now();
      updateTargetModePanel();
    };

    startTargetNavigation = function() {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !targetModeTarget) return;
      const ref=getReferencePosition();
      if (!ref?.coords) return;
      if (!preserveActivePlan()) return;
      closeV271Sheets();
      setMapRouteDrawInteraction(false);
      planUiSubmode='MAIN';
      activateTargetNavigation();
    };

    function stopTargetNavigation() {
      if (!targetModeActive || targetModePhase !== 'NAV') return;
      navLegTimes[navLegIndex] = Date.now() - (navLegStartedAt || Date.now());
      closeNavMore();
      navPanelCollapsed=false;
      returnToTargetPlan();
    }

    function openNavMore() {
      if (!targetModeActive || targetModePhase !== 'NAV' || navPanelCollapsed) return;
      closePlanSearch(); closePlanPointInfo();
      setV271Sheet('navMoreSheet', true);
      syncKnownActionAvailability();
    }

    const v271ToggleNavPanelCollapse = toggleNavPanelCollapse;
    toggleNavPanelCollapse = function(event) {
      closeNavMore();
      v271ToggleNavPanelCollapse(event);
    };

    const v271CopyPointCoordinate = copyPointCoordinate;
    copyPointCoordinate = async function(id) {
      await v271CopyPointCoordinate(id);
      const el=document.getElementById(id);
      if (el?.parentElement?.querySelector('.coord-copy-feedback')?.textContent === 'COPIED') showV271Toast('COPIED');
    };

    function syncKnownActionAvailability() {
      const ref=getReferencePosition();
      const gpsReady=Boolean(gpsPowerEnabled && hasGpsFix);
      const gpsBtn=document.getElementById('gpsPowerBtn');
      const gpsCenter=document.getElementById('gpsCenterBtn');
      const primaryCenter=document.getElementById('primaryCenterBtn');
      if (gpsBtn) {
        gpsBtn.disabled = !navigator.geolocation;
        gpsBtn.classList.toggle('active', gpsPowerEnabled);
        gpsBtn.setAttribute('aria-pressed', String(gpsPowerEnabled));
      }
      if (gpsCenter) gpsCenter.disabled = !gpsReady;
      if (primaryCenter) primaryCenter.disabled = !ref?.coords;

      const undoDisabled = planUndoStack.length === 0;
      const undo=document.getElementById('planUndoBtn');
      const drawUndo=document.getElementById('drawUndoBtn');
      if (undo) undo.disabled=undoDisabled;
      if (drawUndo) drawUndo.disabled=undoDisabled;
      const clear=document.getElementById('drawClearBtn');
      if (clear) clear.disabled=(routeDrawKind==='MARK'?routeMarkSegments:routeDraftSegments).length===0;

      const planHead=document.getElementById('planInfoTrigger');
      const hint=document.getElementById('planNavHint');
      const navReady=Boolean(targetModeActive && targetModePhase==='PLAN' && ref?.coords);
      if (planHead) {
        planHead.classList.toggle('nav-unavailable',!navReady);
        planHead.setAttribute('aria-disabled',String(!navReady));
        planHead.tabIndex=navReady?0:-1;
      }
      if (hint) hint.textContent=navReady?'TAP TO START':'POSITION REQUIRED';

      const shareReady=routeDraftSegments.length>0;
      const share=document.getElementById('targetShareBtn');
      const shareNav=document.getElementById('targetShareNavBtn');
      if (share) share.disabled=!shareReady;
      if (shareNav) shareNav.disabled=!shareReady;

      const recenter=document.getElementById('targetRecenterBtn');
      if (recenter) recenter.disabled=!ref?.coords;
      const nextDisabled=!hasNextNavLeg();
      const next=document.getElementById('targetNextLegBtn');
      const nextCompact=document.getElementById('navCollapsedNextLegBtn');
      if (next) next.disabled=nextDisabled;
      if (nextCompact) nextCompact.disabled=nextDisabled;

      const track=document.getElementById('targetTrackRecBtn');
      if (track) track.disabled=!(trackRecording || pendingTrackStart || gpsReady);
      const back=document.getElementById('targetBacktrackBtn');
      if (back) back.disabled=!backtrackActive && trackLogPoints.length<2;

      document.querySelectorAll('[data-radius]').forEach(btn => {
        btn.disabled = String(btn.dataset.radius) !== 'all' && !gpsReady;
      });
      const centerHomeBtn=document.querySelector('button[onclick*="centerHome()"]');
      const clearHomeBtn=document.querySelector('button[onclick*="clearHomePoint()"]');
      const clearTempBtn=document.querySelector('button[onclick*="clearTempMark()"]');
      const quickMarkBtn=document.querySelector('button[onclick*="quickOfflineMark()"]');
      if (centerHomeBtn) centerHomeBtn.disabled=!getHomePoint()?.coords;
      if (clearHomeBtn) clearHomeBtn.disabled=!getHomePoint()?.coords;
      if (clearTempBtn) clearTempBtn.disabled=!tempMarkPoint?.coords;
      if (quickMarkBtn) quickMarkBtn.disabled=!ref?.coords;
      document.querySelectorAll('button[onclick*="deployRegisteredRecon"],button[onclick*="deployWildRecon"]').forEach(btn => {
        btn.disabled = selectedRadius !== 'all' && !gpsReady;
      });

      renderPlanSearchPoints();
    }

    const v271RefreshGpsPowerUi = refreshGpsPowerUi;
    refreshGpsPowerUi = function() {
      v271RefreshGpsPowerUi();
      const label=document.getElementById('gpsPowerLabel');
      if (label) label.textContent='GPS';
      syncKnownActionAvailability();
    };

    const v271UpdateTargetModePanel = updateTargetModePanel;
    updateTargetModePanel = function() {
      v271UpdateTargetModePanel();
      document.body.classList.toggle('plan-set-submode',targetModeActive&&targetModePhase==='PLAN'&&planUiSubmode==='SET');
      document.body.classList.toggle('plan-draw-submode',targetModeActive&&targetModePhase==='PLAN'&&planUiSubmode==='DRAW');
      const kind=document.getElementById('targetDrawKindBtn');
      if (kind) {
        kind.textContent=routeDrawKind==='MARK'?'OVERLAY':'ROUTE';
        kind.classList.toggle('active',routeDrawKind==='MARK');
      }
      const seq=navSequence();
      const dest=getCurrentNavDestination();
      const leg=document.getElementById('navHudLeg');
      const label=document.getElementById('navHudDistanceLabel');
      if (targetModeActive&&targetModePhase==='NAV'&&!backtrackActive&&dest) {
        if (leg) leg.textContent=`LEG ${Math.min(navLegIndex+1,Math.max(seq.length,1))}/${Math.max(seq.length,1)} · ${dest.__navRole||'TARGET'}`;
        if (label) label.textContent=`DIRECT TO ${dest.__navRole||'TARGET'}`;
      }
      syncKnownActionAvailability();
      updateMapScale();
    };

    const v271EnterTargetMode = enterTargetMode;
    enterTargetMode = function(target) {
      const beforeId=targetModeTarget?.id;
      v271EnterTargetMode(target);
      if (targetModeActive && String(targetModeTarget?.id||'') !== String(beforeId||'')) {
        planUndoStack=[];
        planUiSubmode='MAIN';
        closeV271Sheets();
        updateTargetModePanel();
      }
    };

    const v271ExitTargetMode = exitTargetMode;
    exitTargetMode = function(force=false) {
      const wasActive=targetModeActive;
      closeV271Sheets();
      v271ExitTargetMode(force);
      if (wasActive && !targetModeActive) {
        planUndoStack=[];
        planUiSubmode='MAIN';
        document.body.classList.remove('plan-set-submode','plan-draw-submode');
      }
    };

    const v271ReturnToTargetPlan = returnToTargetPlan;
    returnToTargetPlan = function() {
      closeNavMore();
      v271ReturnToTargetPlan();
      planUiSubmode='MAIN';
      updateTargetModePanel();
    };

    // Better two-finger draw gesture: smaller zoom increments avoid the V27 one-level jump feel.
    const v271HandleRoutePointerMove = handleRoutePointerMove;
    handleRoutePointerMove = function(event) {
      if (!targetModeActive || !routeDrawEnabled || !routeActivePointers.has(event.pointerId) || !routeGestureMode) {
        return v271HandleRoutePointerMove(event);
      }
      const point=routeContainerPoint(event);
      routeActivePointers.set(event.pointerId,point);
      event.preventDefault();
      const pair=routeGesturePair();
      if (!pair) return;
      const metrics=routeGestureMetrics(pair);
      if (routeGestureLastCenter) {
        const dx=metrics.center.x-routeGestureLastCenter.x;
        const dy=metrics.center.y-routeGestureLastCenter.y;
        if (Math.abs(dx)+Math.abs(dy)>.35) map.panBy([-dx,-dy],{animate:false,noMoveStart:true});
      }
      if (routeGestureLastDistance>0) {
        const ratio=metrics.distance/routeGestureLastDistance;
        if (ratio>1.045 && map.getZoom()<map.getMaxZoom()) {
          map.setZoomAround(metrics.center,Math.min(map.getMaxZoom(),map.getZoom()+0.25),{animate:false});
          routeGestureLastDistance=metrics.distance;
        } else if (ratio<0.957 && map.getZoom()>map.getMinZoom()) {
          map.setZoomAround(metrics.center,Math.max(map.getMinZoom(),map.getZoom()-0.25),{animate:false});
          routeGestureLastDistance=metrics.distance;
        }
      }
      routeGestureLastCenter=metrics.center;
    };
    routeMapContainer.removeEventListener('pointermove',v271HandleRoutePointerMove);
    routeMapContainer.addEventListener('pointermove',handleRoutePointerMove,{passive:false});

    // Blank-map tap dismisses transient information instead of forcing explicit close buttons.
    map.on('click', () => {
      if (routeDrawEnabled) return;
      if (currentActiveTarget) closeSitrep();
      closePlanPointInfo();
      closePlanSearch();
      closeNavMore();
    });

    document.getElementById('planSearchInput')?.addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();searchPlanLocation();}
    });
    document.querySelectorAll('.v271-bottom-sheet').forEach(sheet=>{
      sheet.addEventListener('pointerdown',event=>event.stopPropagation());
      sheet.addEventListener('click',event=>event.stopPropagation());
    });

    // Update known impossible actions whenever field controls open as well.
    const v271OpenFieldControls=openFieldControls;
    openFieldControls=function(section){ v271OpenFieldControls(section); syncKnownActionAvailability(); };

    // New DRAW mode owns draw activation; no separate DRAW ON step remains.
    const v271ToggleDrawKind=toggleDrawKind;
    toggleDrawKind=function(){ v271ToggleDrawKind(); syncKnownActionAvailability(); };
'''

html = replace_once(
    html,
    "\n\n    updateWpCounter();\n",
    js + "\n\n    updateWpCounter();\n",
    "V27.1 JS",
)

# PWA cache/version bump so iPhone installed mode actually receives the patch.
html = replace_once(html, "service-worker.js?v=27'", "service-worker.js?v=27.1'", "service worker query")
html = replace_once(html, "tactical-recon-sw-reload-v27'", "tactical-recon-sw-reload-v27-1'", "service worker reload key")

INDEX.write_text(html, encoding="utf-8")

sw = SW.read_text(encoding="utf-8")
sw = replace_once(sw, "const CACHE_VERSION = 'v27-20261003';", "const CACHE_VERSION = 'v27-1-20261004';", "service worker cache version")
SW.write_text(sw, encoding="utf-8")

# Static sanity checks. These are intentionally narrow: browser/real-device behavior is still tested separately.
required = [
    'id="globalGpsControls"', 'id="gpsCenterBtn"', 'id="planSearchSheet"',
    'id="planPointSheet"', 'id="navMoreSheet"', 'id="planUndoBtn"',
    'function syncKnownActionAvailability()', 'function stopTargetNavigation()',
    "service-worker.js?v=27.1"
]
for token in required:
    if token not in html:
        raise RuntimeError(f"missing required token: {token}")

for unique_id in [
    'gpsPowerBtn','gpsPowerLabel','gpsCenterBtn','targetModePanel','targetDrawBtn','targetDrawKindBtn',
    'targetNextLegBtn','targetTrackRecBtn','targetBacktrackBtn','planSearchSheet','planPointSheet','navMoreSheet'
]:
    count = html.count(f'id="{unique_id}"')
    if count != 1:
        raise RuntimeError(f"duplicate/missing id {unique_id}: {count}")

print("V27.1 patch applied")
