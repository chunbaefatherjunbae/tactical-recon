from pathlib import Path
import re

ROOT = Path(".")

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing anchor: {label}")
    return text.replace(old, new, 1)

def regex_once(text, pattern, repl, label):
    out, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"regex anchor failed ({count}): {label}")
    return out

# --- index.html ---
path="baseline/index.html"
s=read(path)
if 'class="map-tech-grid"' not in s:
    s=regex_once(
        s,
        r'(<div[^>]*id=["\']map["\'][^>]*></div>)',
        r'\1\n    <div class="map-tech-grid" aria-hidden="true"></div>',
        "map grid overlay"
    )
if 'id="layerBtn"' not in s:
    layer_button='''\n      <button class="quick-btn layer-btn" id="layerBtn" type="button" aria-label="레이어" aria-pressed="false" title="레이어">
        <span class="layer-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3 3.5 8 12 13l8.5-5L12 3Z"/><path d="m5.5 12 6.5 3.8 6.5-3.8"/><path d="m5.5 16 6.5 3.8 6.5-3.8"/></svg>
        </span>
      </button>'''
    s=regex_once(
        s,
        r'(<button[^>]*id=["\']settingsBtn["\'][\s\S]*?</button>)',
        r'\1' + layer_button,
        "layer button"
    )
write(path,s)

# --- app.js ---
path="baseline/app.js"
s=read(path)

# Quick active state includes layers.
if "panel === 'layers'" not in s:
    s=replace_once(
        s,
        "    $('settingsBtn')?.classList.toggle('active',panel === 'settings');",
        "    $('settingsBtn')?.classList.toggle('active',panel === 'settings');\n    $('layerBtn')?.classList.toggle('active',panel === 'layers');",
        "setActiveQuick"
    )

layer_code=r'''
  const LAYER_PREF_KEY='baseline-layer-visibility-v1';
  const layerDefaults=Object.freeze({
    registered:true,
    user:true,
    unexplored:true,
    secured:true,
    plan:true,
    track:true
  });
  let layerVisibility={...layerDefaults};

  try {
    const saved=JSON.parse(localStorage.getItem(LAYER_PREF_KEY) || 'null');
    if(saved && typeof saved === 'object'){
      Object.keys(layerDefaults).forEach(key => {
        if(typeof saved[key] === 'boolean') layerVisibility[key]=saved[key];
      });
    }
  } catch {}

  function persistLayerVisibility(){
    try { localStorage.setItem(LAYER_PREF_KEY,JSON.stringify(layerVisibility)); } catch {}
  }

  function applyLayerVisibility(){
    const root=document.body;
    Object.keys(layerDefaults).forEach(key => {
      root.classList.toggle('layer-hide-' + key,!layerVisibility[key]);
    });
    const btn=$('layerBtn');
    if(btn){
      const hidden=Object.values(layerVisibility).filter(value => !value).length;
      btn.classList.toggle('layer-filtered',hidden>0);
      btn.setAttribute('aria-label',hidden ? '레이어 · ' + hidden + '개 숨김' : '레이어');
      btn.title=hidden ? '레이어 · ' + hidden + '개 숨김' : '레이어';
    }
  }

  function layerRow(key,label,detail){
    const on=layerVisibility[key] !== false;
    return '<button type="button" class="layer-toggle-row' + (on ? ' active' : '') + '" data-layer-key="' + key + '" aria-pressed="' + String(on) + '">' +
      '<span><strong>' + esc(label) + '</strong><small>' + esc(detail) + '</small></span>' +
      '<i class="layer-toggle-switch" aria-hidden="true"><b></b></i>' +
    '</button>';
  }

  function layerPanelHtml(){
    return '<div class="layer-control-list">' +
      layerRow('registered','등록 거점','기본 등록 거점') +
      layerRow('user','내 거점','직접 등록한 거점') +
      layerRow('unexplored','미개척','무작위 탐색 좌표') +
      layerRow('secured','개척','개척 완료 거점') +
      layerRow('plan','계획','계획선 · 출발/경유/목적지') +
      layerRow('track','TRACK','현재 항법 궤적') +
    '</div>' +
    '<p class="sheet-note">지도 표시만 변경합니다. 거점·계획·기록 데이터는 삭제되지 않습니다.</p>';
  }

  function openLayers(){
    openSheet('layers',{title:'레이어',html:layerPanelHtml()});
    document.querySelectorAll('[data-layer-key]').forEach(btn => btn.addEventListener('click',() => {
      const key=btn.dataset.layerKey;
      if(!(key in layerDefaults)) return;
      layerVisibility[key]=!layerVisibility[key];
      persistLayerVisibility();
      applyLayerVisibility();
      openLayers();
    }));
  }

'''
if "const LAYER_PREF_KEY='baseline-layer-visibility-v1';" not in s:
    s=replace_once(s,"  function openSettings() {",layer_code+"  function openSettings() {","layer functions")

if "$('layerBtn')?.addEventListener('click', openLayers);" not in s:
    s=replace_once(
        s,
        "  $('settingsBtn')?.addEventListener('click', openSettings);",
        "  $('settingsBtn')?.addEventListener('click', openSettings);\n  $('layerBtn')?.addEventListener('click', openLayers);",
        "layer listener"
    )

if "  applyLayerVisibility();\n  renderSiteMarkers();" not in s:
    s=replace_once(
        s,
        "  renderSiteMarkers();\n  renderScale();\n  renderReticleCoordinate();\n  refresh();",
        "  applyLayerVisibility();\n  renderSiteMarkers();\n  renderScale();\n  renderReticleCoordinate();\n  refresh();",
        "layer initial apply"
    )
write(path,s)

# --- navigation-ui.js ---
path="baseline/navigation-ui.js"
s=read(path)
if "className:'baseline-plan-path'" not in s:
    s=replace_once(
        s,
        "      L.polyline(nodes,{\n        interactive:false,",
        "      L.polyline(nodes,{\n        interactive:false,\n        className:'baseline-plan-path',",
        "plan path class"
    )
if "className:'baseline-track-path'" not in s:
    s=replace_once(
        s,
        "      L.polyline(segment.map(p => [p.lat,p.lon]),{\n        interactive:false,",
        "      L.polyline(segment.map(p => [p.lat,p.lon]),{\n        interactive:false,\n        className:'baseline-track-path',",
        "track path class"
    )
if "className:'baseline-plan-drawing'" not in s:
    anchor="      L.polyline(seg.points,{\n        interactive:false,"
    if anchor in s:
        s=replace_once(
            s,
            anchor,
            "      L.polyline(seg.points,{\n        interactive:false,\n        className:'baseline-plan-drawing',",
            "plan drawing class"
        )
write(path,s)

# --- styles.css ---
path="baseline/styles.css"
s=read(path)
marker="/* ---------- RECON HUD DESIGN PASS 01 ---------- */"
if marker not in s:
    s += r'''

/* ---------- RECON HUD DESIGN PASS 01 ---------- */

/* A quiet electronic grid over the map: visible enough to feel instrumented,
   weak enough to never outrank roads, contour lines, or labels. */
.map-tech-grid {
  position:absolute;
  z-index:315;
  inset:0 0 var(--bottom-h);
  pointer-events:none;
  opacity:.48;
  background-image:
    linear-gradient(rgba(34,255,102,.045) 1px, transparent 1px),
    linear-gradient(90deg,rgba(34,255,102,.045) 1px, transparent 1px),
    linear-gradient(rgba(34,255,102,.016) 1px, transparent 1px),
    linear-gradient(90deg,rgba(34,255,102,.016) 1px, transparent 1px);
  background-size:96px 96px,96px 96px,24px 24px,24px 24px;
  box-shadow:inset 0 0 110px rgba(34,255,102,.018);
}

/* The coordinate HUD is not a card. It is a projected OSD field:
   one vertical rail, one divider, and a blurred darkness that dissolves right. */
.position-hud {
  isolation:isolate;
  padding:4px 0 5px 12px;
  border:0!important;
  border-left:2px solid rgba(82,255,133,.92)!important;
  background:none!important;
  box-shadow:none!important;
}
.position-hud::before {
  content:'';
  position:absolute;
  z-index:-1;
  left:-8px;
  top:-8px;
  right:-42px;
  bottom:-8px;
  background:rgba(0,11,4,.48);
  -webkit-backdrop-filter:blur(3px);
  backdrop-filter:blur(3px);
  -webkit-mask-image:linear-gradient(90deg,#000 0%,#000 54%,rgba(0,0,0,.64) 72%,transparent 100%);
  mask-image:linear-gradient(90deg,#000 0%,#000 54%,rgba(0,0,0,.64) 72%,transparent 100%);
  pointer-events:none;
}
.position-hud #positionCoord,
.position-hud .reticle-coordinate,
.position-hud .position-status-row {
  position:relative;
  z-index:1;
}
.position-hud .reticle-coordinate {
  width:max-content;
  min-width:100%;
  padding-bottom:6px;
  margin-bottom:3px;
  border-bottom:1px solid rgba(108,255,150,.72);
}
.position-status-row {
  gap:11px;
}
.position-status-row span {
  color:#91d69e!important;
  text-shadow:0 1px 2px rgba(0,0,0,.96),0 0 4px rgba(34,255,102,.12)!important;
}
.position-status-row .map-mode-status {
  color:#7fc98e!important;
}

/* Hardware-like control faces without building a visible outer panel. */
.quick-stack { gap:7px; }
.quick-btn {
  border-color:rgba(80,204,112,.46)!important;
  background:linear-gradient(180deg,rgba(5,18,9,.94),rgba(1,8,3,.92))!important;
  box-shadow:
    inset 0 0 0 1px rgba(34,255,102,.018),
    inset 0 -10px 22px rgba(0,0,0,.18),
    0 2px 8px rgba(0,0,0,.34)!important;
}
.quick-btn svg {
  fill:none;
  stroke:currentColor;
  stroke-width:1.7;
  stroke-linecap:round;
  stroke-linejoin:round;
}
.quick-btn.active,
.quick-btn.layer-filtered {
  border-color:rgba(34,255,102,.82)!important;
  box-shadow:
    inset 0 0 18px rgba(34,255,102,.07),
    0 0 8px rgba(34,255,102,.10)!important;
}
.layer-glyph {
  width:22px;
  height:22px;
  display:grid;
  place-items:center;
}
.layer-glyph svg { width:22px; height:22px; }

/* Reticle and tactical symbols emit only a restrained phosphor halo. */
.reticle-h,
.reticle-v,
.reticle-core {
  box-shadow:0 0 5px rgba(34,255,102,.34);
}
.marker-symbol,
.tactical-route-wrapper,
.baseline-marker.temp {
  filter:drop-shadow(0 0 3px rgba(34,255,102,.34));
}

/* Layer visibility: presentation only, never destructive. */
body.layer-hide-registered .marker-registered,
body.layer-hide-user .marker-user,
body.layer-hide-unexplored .marker-unexplored,
body.layer-hide-secured .marker-secured,
body.layer-hide-plan .baseline-plan-path,
body.layer-hide-plan .baseline-plan-drawing,
body.layer-hide-plan .tactical-route-wrapper,
body.layer-hide-track .baseline-track-path {
  display:none!important;
}

/* Layer sheet */
.layer-control-list {
  display:grid;
  gap:1px;
  border-top:1px solid var(--border);
  border-bottom:1px solid var(--border);
}
.layer-toggle-row {
  min-height:54px;
  width:100%;
  display:grid;
  grid-template-columns:minmax(0,1fr) 42px;
  align-items:center;
  gap:10px;
  padding:7px 2px;
  border:0;
  border-bottom:1px solid rgba(34,255,102,.09);
  background:transparent;
  color:var(--text-main);
  text-align:left;
}
.layer-toggle-row:last-child { border-bottom:0; }
.layer-toggle-row > span strong,
.layer-toggle-row > span small { display:block; }
.layer-toggle-row > span strong {
  font-size:14px;
  font-weight:850;
  color:var(--text-main);
}
.layer-toggle-row > span small {
  margin-top:3px;
  font-size:11px;
  color:var(--text-dim);
}
.layer-toggle-switch {
  position:relative;
  width:38px;
  height:22px;
  border:1px solid rgba(117,130,121,.55);
  border-radius:12px;
  background:rgba(117,130,121,.20);
}
.layer-toggle-switch b {
  position:absolute;
  width:16px;
  height:16px;
  left:3px;
  top:2px;
  border-radius:50%;
  background:#7b837d;
  transition:left .12s ease,background-color .12s ease,box-shadow .12s ease;
}
.layer-toggle-row.active .layer-toggle-switch {
  border-color:rgba(34,255,102,.68);
  background:rgba(34,255,102,.13);
}
.layer-toggle-row.active .layer-toggle-switch b {
  left:18px;
  background:var(--accent);
  box-shadow:0 0 6px rgba(34,255,102,.38);
}

/* Bottom navigation should feel attached to the device, not float over the map. */
.bottom-nav {
  background:linear-gradient(180deg,rgba(2,10,5,.94),rgba(1,6,3,.99))!important;
  border-top-color:rgba(34,255,102,.24)!important;
  -webkit-backdrop-filter:blur(8px);
  backdrop-filter:blur(8px);
}
.bottom-nav button {
  letter-spacing:.12px;
}
.bottom-nav button.active {
  background:linear-gradient(180deg,rgba(34,255,102,.055),rgba(34,255,102,.025))!important;
  box-shadow:inset 0 2px 0 rgba(34,255,102,.9),inset 0 0 18px rgba(34,255,102,.025)!important;
}

/* Keep the distance scale in the agreed U shape: |____| */
.scale-line {
  border-top:0!important;
  border-left:1px solid currentColor!important;
  border-right:1px solid currentColor!important;
  border-bottom:1px solid currentColor!important;
  box-shadow:none!important;
}

@media(max-width:350px) {
  .position-hud::before { right:-26px; }
  .map-tech-grid { background-size:84px 84px,84px 84px,21px 21px,21px 21px; }
}
'''
write(path,s)

# --- browser regression ---
path="scripts/test-baseline-browser.cjs"
s=read(path)
if "map-tech-grid" not in s:
    s=replace_once(
        s,
        "      assert.equal(await page.locator('#reticleCoord').count(), 1);",
        """      assert.equal(await page.locator('#reticleCoord').count(), 1);
      assert.equal(await page.locator('.map-tech-grid').count(), 1);
      assert.equal(await page.locator('#layerBtn').count(), 1);
      assert.equal(await page.locator('.position-hud').evaluate(el => getComputedStyle(el,'::before').content !== 'none'), true);""",
        "design assertions"
    )

layer_test=r'''
      await page.locator('#layerBtn').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '레이어');
      assert.equal(await page.locator('[data-layer-key]').count(), 6);
      await page.locator('[data-layer-key="registered"]').click();
      assert.equal(await page.evaluate(() => document.body.classList.contains('layer-hide-registered')), true);
      await page.locator('[data-layer-key="registered"]').click();
      assert.equal(await page.evaluate(() => document.body.classList.contains('layer-hide-registered')), false);
      await page.locator('#sheetClose').click();

'''
if "data-layer-key="registered"" not in s:
    s=replace_once(
        s,
        "      await page.locator('#settingsBtn').click();",
        layer_test+"      await page.locator('#settingsBtn').click();",
        "layer regression"
    )
write(path,s)

print("BASELINE design pass patched successfully")
