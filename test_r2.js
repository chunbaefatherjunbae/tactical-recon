const fs=require('fs');
const assert=require('assert');

const r1=fs.readFileSync('r1.js','utf8');
const r2=fs.readFileSync('r2.js','utf8');
const css=fs.readFileSync('r2.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const base=fs.readFileSync('app-base.js','utf8');
const locationCore=fs.readFileSync('location-core.js','utf8');
const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');

function test(name,fn){
  try{fn();console.log('PASS',name);}
  catch(e){console.error('FAIL',name);throw e;}
}

test('R2 is the final explicit runtime layer above R1',()=>{
  assert(sw.includes("'./r1.css'"));
  assert(sw.includes("'./r1.js'"));
  assert(sw.includes("'./r2.css'"));
  assert(sw.includes("'./r2.js'"));
  assert(index.indexOf('href="./r2.css"')>index.indexOf('href="./r1.css"'));
  assert(index.indexOf('src="./r2.js"')>index.indexOf('src="./r1.js"'));
  assert(index.indexOf('src="./location-core.js"')<index.indexOf('src="./app-base.js"'));
  assert.strictEqual(sw.includes('injectStableOverlay'),false);
});

test('R2.3 uses a fresh PWA identity',()=>{
  assert(sw.includes("const CACHE_VERSION = 'r2-3-viewport-coordinates-20261006-1';"));
  assert(base.includes('service-worker.js?v=r2-3-viewport-coordinates-20261006-1'));
  assert(base.includes('tactical-recon-sw-reload-r2-3-viewport-coordinates-20261006-1'));
  assert(sw.includes("'./location-core.js'"));
});

test('R2 location display preferences remain configurable',()=>{
  assert(r2.includes("tactical_recon_location_display_v2"));
  assert(r2.includes("primary:'MGRS'"));
  assert(r2.includes("visible:['MGRS','WGS84','ADDRESS']"));
  assert(r2.includes("order:['MGRS','WGS84','ADDRESS']"));
  assert(r2.includes('function normalizeDisplay'));
  assert(r2.includes('if(!visible.includes(primary))visible.push(primary)'));
});

test('Map selection stays separate from actual objective state',()=>{
  assert(r1.includes("function showR1LocationCard(target,statusType='LOCATION',options={})"));
  assert(r1.includes("const activateLegacyTarget=options?.activateLegacyTarget===true"));
  assert(r2.includes("root.r1.openLocation(target,'LOCATION',{activateLegacyTarget:false})"));
  assert(r1.includes("getLocationTarget:()=>r1LocationTarget"));
});

test('R2.3 owns one canonical tactical viewport layer',()=>{
  assert(css.includes('R2.3 // CURRENT RUNTIME LAYER'));
  assert(css.includes('R2.3 // CANONICAL TACTICAL VIEWPORT'));
  assert.strictEqual((css.match(/R2\.3 \/\/ CANONICAL TACTICAL VIEWPORT/g)||[]).length,1);
  assert.strictEqual(css.includes("R2.2 // GOD'S EYE-INSPIRED FIELD VISUAL SYSTEM"),false);
  assert.strictEqual(css.includes('width:144px !important'),false);
});

test('Theme tokens derive directly from the active body theme',()=>{
  assert(css.includes('--r23-accent:var(--field-active,var(--accent))'));
  assert(css.includes('--r23-text:var(--field-text,var(--text-main))'));
  assert(css.includes('--r23-line-strong:var(--field-line-strong,var(--border-accent))'));
  assert(css.includes('--r23-panel:var(--field-panel-solid,var(--bg-panel))'));
  assert(css.includes('--r23-glow:var(--accent-glow)'));
  assert.strictEqual(css.includes('--r22-line:color-mix'),false);
});

test('Full optical frame surrounds the usable map viewport',()=>{
  assert(css.includes('body.r2-runtime .viewfinder-frame'));
  assert(css.includes('top:var(--r23-frame-top) !important'));
  assert(css.includes('bottom:var(--r23-frame-bottom) !important'));
  assert(css.includes('border:1px solid var(--r23-line) !important'));
  assert(css.includes("content:'TACTICAL RECON // FIELD DISPLAY'"));
  assert(css.includes('body.r2-runtime .bracket.tl{top:-1px !important'));
  assert(css.includes('body.r2-runtime .bracket.br{bottom:-1px !important'));
});

test('Military coordinate HUD is permanent and visually primary',()=>{
  assert(r2.includes('function ensureR22Hud'));
  assert(r2.includes("head.textContent='RETICLE'"));
  assert(r2.includes("secondary.id='r22MgrsSecondary'"));
  assert(css.includes("GOD'S EYE-style readout hierarchy"));
  assert(css.includes('font:900 14px/1.12 var(--font-mono) !important'));
  assert(css.includes('background:linear-gradient(90deg,rgba(0,0,0,.34)'));
  assert(css.includes('body.r2-runtime .telemetry-osd .osd-subgrid'));
  assert(css.includes('display:none !important'));
});

test('GPS recenter and TEMP are a vertical right-hand rail',()=>{
  assert(r2.includes('function ensureR23TempButton'));
  assert(r2.includes("btn.id='tempQuickBtn'"));
  assert(r2.includes("btn.className='global-gps-button global-temp-button'"));
  assert(r2.includes("ensureR23TempButton();"));
  assert(css.includes('body.r2-runtime .global-gps-controls'));
  assert(css.includes('flex-direction:column !important'));
  assert(css.includes('--r23-control-size:48px'));
  assert(css.includes('body.r2-runtime #tempQuickBtn'));
  assert.strictEqual(css.includes('grid-template-columns:repeat(3,48px)'),false);
});

test('Search surface leaves a dedicated vertical-control gutter',()=>{
  assert(r2.includes("search.dataset.r22Decorated='1'"));
  assert(r2.includes("MGRS · WGS84 · 주소"));
  assert(css.includes('body.r2-runtime .r1-map-search'));
  assert(css.includes('right:84px !important'));
  assert(css.includes('height:48px !important'));
});

test('Reticle is always strong and centered',()=>{
  assert(css.includes('Reticle is a primary measuring instrument'));
  assert(css.includes('width:104px !important'));
  assert(css.includes('height:104px !important'));
  assert(css.includes('top:50dvh !important'));
  assert(css.includes('left:50vw !important'));
  assert(css.includes('width:38px !important'));
  assert(css.includes('body.r2-runtime .target-gate::before'));
  assert(css.includes('opacity:1 !important'));
});

test('Bottom UI has one owner and target mode cannot expose home bar behind its toolbar',()=>{
  assert(css.includes('body.r2-runtime.target-mode .mfd-bottom-bar'));
  assert(css.includes('body.r2-runtime.target-nav .mfd-bottom-bar'));
  assert(css.includes('display:none !important'));
  assert(css.includes('body.r2-runtime .target-mode-panel'));
  assert(css.includes('bottom:max(8px,env(safe-area-inset-bottom,0px)) !important'));
  assert(css.includes('position:static !important'));
  assert(css.includes('grid-template-columns:repeat(5,minmax(0,1fr)) !important'));
});

test('Location card actions participate in layout instead of overlaying content',()=>{
  assert(css.includes('body.r2-runtime .r1-location-card'));
  assert(css.includes('max-height:min(40dvh,390px) !important'));
  assert(css.includes('body.r2-runtime .r1-location-actions'));
  assert(css.includes('position:static !important'));
  assert(css.includes('body.r2-runtime .r1-location-more'));
});

test('Panel surfaces share one theme-derived equipment language',()=>{
  for(const selector of [
    'body.r2-runtime .r1-location-card',
    'body.r2-runtime .r1-records-sheet',
    'body.r2-runtime .field-control-tray',
    'body.r2-runtime .target-mode-panel',
    'body.r2-runtime .r2-display-shell'
  ]) assert(css.includes(selector));
  assert(css.includes('background:var(--r23-panel) !important'));
  assert(css.includes('border:1px solid var(--r23-line-strong) !important'));
});

test('Position rows remain one surface with dividers, not nested cards',()=>{
  assert(css.includes('body.r2-runtime .r2-location-format'));
  assert(css.includes('border-bottom:1px solid var(--r23-line) !important'));
  assert(css.includes('body.r2-runtime .r2-location-format.primary'));
  assert(css.includes('box-shadow:inset 2px 0 var(--r23-accent) !important'));
  assert(r2.includes('COPY ALL POSITION DATA'));
});

test('Address HUD requests remain debounced abortable and deduplicated',()=>{
  assert(r2.includes('const addressInFlight=new Map()'));
  assert(r2.includes("e&&e.name==='AbortError'"));
  assert(r2.includes('function scheduleHudAddressResolve'));
  assert(r2.includes('new AbortController()'));
  assert(r2.includes('},220);'));
  assert(r2.includes('addressInFlight.has(key)'));
});

test('Low-data viewport refresh still avoids full GeoJSON restyle',()=>{
  assert(r1.includes('let lightMapRefreshTimer=null'));
  const hook=r1.slice(r1.indexOf('function installLowDataRefreshHooks()'),r1.indexOf('function suppressLightMapNetworkTiles()'));
  assert(hook.includes('refreshLowDataPlaces()'));
  assert.strictEqual(hook.includes('refreshLowDataBaseStyle()'),false);
  assert(hook.includes('},48);'));
  assert(css.includes('body.r2-runtime.r16-light-map .leaflet-tile-pane'));
});

test('Network status remains truthful',()=>{
  assert(index.includes('<span>NET <b id="hudLinkState"'));
  assert(base.includes("el.dataset.state = online ? 'online' : 'offline'"));
  assert(css.includes('#hudLinkState[data-state="offline"]'));
});

test('R2.3 identifies itself as the current baseline',()=>{
  assert(r2.includes("VERSION='2.3'"));
  assert(r2.includes("document.title='TACTICAL RECON // R2.3 FIELD TERMINAL'"));
  assert(index.includes('<title>TACTICAL RECON // R2.3 FIELD TERMINAL</title>'));
  assert(r2.includes("document.body.classList.add('r2-runtime','r23-ui')"));
});

test('Shared coordinate core is installed and used by direct coordinate parsing',()=>{
  assert(locationCore.includes('function decodeFull'));
  assert(locationCore.includes('function validateCoordinateLike'));
  assert(base.includes('window.ReconLocationCore'));
  assert(r1.includes('const core=root.ReconLocationCore'));
  assert(r1.includes("error.code='GRID_CONTEXT_MISMATCH'"));
});

test('Pages validation covers location core and R2 regressions',()=>{
  assert(workflow.includes('node --check location-core.js'));
  assert(workflow.includes('node test_location_core.js'));
  assert(workflow.includes('node --check r2.js'));
  assert(workflow.includes('node test_r2.js'));
});

console.log('R2.3 regression checks complete.');
