const fs=require('fs');
const assert=require('assert');

const r2=fs.readFileSync('r2.js','utf8');
const css=fs.readFileSync('r2.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');

function test(name,fn){
  try{fn();console.log('PASS',name);}
  catch(e){console.error('FAIL',name);throw e;}
}

test('R2 is the final runtime layer above R1',()=>{
  assert(sw.includes("'./r1.css'"));
  assert(sw.includes("'./r1.js'"));
  assert(sw.includes("'./r2.css'"));
  assert(sw.includes("'./r2.js'"));
  assert(sw.indexOf("html.includes('r2.css')")>sw.indexOf("html.includes('r1.css')"));
  assert(sw.indexOf("html.includes('r2.js')")>sw.indexOf("html.includes('r1.js')"));
});

test('R2 uses a new cache identity',()=>{
  assert(sw.includes("const CACHE_VERSION = 'r2-0-position-actions-20261006-1';"));
  assert(index.includes('service-worker.js?v=r2-0-position-actions-20261006-1'));
  assert(index.includes('tactical-recon-sw-reload-r2-0-position-actions-20261006-1'));
});

test('R2 location display preferences separate primary, visibility and order',()=>{
  assert(r2.includes("tactical_recon_location_display_v2"));
  assert(r2.includes("primary:'MGRS'"));
  assert(r2.includes("visible:['MGRS','WGS84','ADDRESS']"));
  assert(r2.includes("order:['MGRS','WGS84','ADDRESS']"));
  assert(r2.includes('function normalizeDisplay'));
  assert(r2.includes('if(!visible.includes(primary))visible.push(primary)'));
});

test('R2 adds position display controls under POSITION',()=>{
  assert(r2.includes("document.querySelector('#control-position .field-control-grid')"));
  assert(r2.includes("id='r2PositionDisplayBtn'")||r2.includes("btn.id='r2PositionDisplayBtn'"));
  assert(r2.includes("POSITION DISPLAY"));
  assert(r2.includes('r2PrimarySelect'));
  assert(r2.includes('r2FormatRows'));
  assert(css.includes('.r2-format-moves button'));
  assert(css.includes('width:44px'));
});

test('R2 keeps legacy reticle fields but reduces permanent HUD density',()=>{
  assert(index.includes('id="reticleMgrs"'));
  assert(index.includes('id="reticleLat"'));
  assert(index.includes('id="reticleLon"'));
  assert(index.includes('id="reticleZoom"'));
  assert(css.includes('.telemetry-osd .osd-subgrid'));
  assert(css.includes('display:none !important'));
  assert(r2.includes('renderReticlePrimary'));
});

test('Map position readout opens unified POSITION actions',()=>{
  assert(r2.includes('function openMapPositionActions'));
  assert(r2.includes("source:'MAP'"));
  assert(r2.includes("root.r1.openLocation(target,'LOCATION')"));
  assert(r2.includes('root.copyReticleMGRS=wrapped'));
});

test('POINT detail shows enabled formats and row-level copy',()=>{
  assert(r2.includes('r2LocationFormats'));
  assert(r2.includes("settings.order.filter(f=>settings.visible.includes(f))"));
  assert(r2.includes("row.dataset.format=format"));
  assert(r2.includes("COPY ALL POSITION DATA"));
  assert(r2.includes('SOURCE '));
  assert(css.includes('.r2-location-format.primary'));
});

test('Address display is truthful about network state and does not fall back silently in HUD',()=>{
  assert(r2.includes('OFFLINE · ADDRESS UNAVAILABLE'));
  assert(r2.includes('RESOLVING ADDRESS'));
  assert(r2.includes('reverseAddress'));
  assert(r2.includes('addressCache'));
});

test('R2 identifies itself as the new baseline',()=>{
  assert(r2.includes("VERSION='2.0'"));
  assert(r2.includes("document.title='TACTICAL RECON // R2.0 FIELD TERMINAL'"));
  assert(r2.includes("document.body.classList.add('r2-runtime')"));
});

test('Pages validation includes R2 branch and checks',()=>{
  assert(workflow.includes('r2-position-actions'));
  assert(workflow.includes('node --check r2.js'));
  assert(workflow.includes('node --check test_r2.js'));
  assert(workflow.includes('node test_r2.js'));
});

console.log('R2 regression checks complete.');
