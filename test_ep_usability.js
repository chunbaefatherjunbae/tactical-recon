const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const stabilize=fs.readFileSync('v29-stabilize.js','utf8');
const shell=fs.readFileSync('ep-ui-shell.js','utf8');
const flow=fs.readFileSync('ep-ui-flow.js','utf8');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

test('bottom random opens range-first panel instead of immediate deployment',()=>{
  assert(shell.includes("root.openFieldControls('recon')"));
  const fn=shell.slice(shell.indexOf('function runRandom()'),shell.indexOf('function openRecords()'));
  assert.strictEqual(fn.includes('deployWildRecon'),false);
  assert(shell.includes('id="epRandomLabel"'));
  assert(shell.includes("range==='all'?'무작위':'무작위 · '+range+'KM'"));
});

test('range uses current EP reference rather than GPS-only state',()=>{
  assert(index.includes('function getRangeReferencePosition()'));
  assert(index.includes("const ref = typeof getReferencePosition === 'function' ? getReferencePosition() : null"));
  assert(index.includes("alert('범위를 사용하려면 GPS, TEMP 또는 마지막 위치가 필요합니다.')"));
  const setRadar=index.slice(index.indexOf('function setRadar'),index.indexOf('function setGpsFollow'));
  assert.strictEqual(setRadar.includes('!hasGpsFix'),false);
  const circle=index.slice(index.indexOf('function syncRadiusCirclePosition'),index.indexOf('function syncMarkerVisibility'));
  assert(circle.includes('radiusCircle.setLatLng(ref.coords)'));
});

test('random panel terminology is stable and distinct from records',()=>{
  assert(stabilize.includes("recon:'무작위'"));
  assert(stabilize.includes("reconRecorded:'등록 거점'"));
  assert(stabilize.includes("reconWild:'미개척 좌표'"));
  assert(stabilize.includes("reconRange:'범위'"));
  assert(stabilize.includes("sourceBuiltin:'등록 거점'"));
  assert(stabilize.includes("sourceLocal:'내 거점'"));
  assert.strictEqual(stabilize.includes("reconRecorded:'기록 거점 탐색'"),false);
});

test('destination terminology is consistent in Korean UI',()=>{
  assert(stabilize.includes("objectiveInfo:'목적지 정보'"));
  assert(stabilize.includes("objectiveChange:'목적지 변경'"));
  assert(stabilize.includes("pickerObjective:'목적지로 지정'"));
  assert(stabilize.includes("noObjective:'목적지 미지정'"));
  assert(flow.includes("?'목적':(role==='START'?'출발':role==='END'?'종료':'경유')"));
});

test('EP flow exposes Korean plan and mission labels',()=>{
  assert(flow.includes('<span class="ep-flow-kicker">계획</span>'));
  assert(flow.includes('<span class="ep-flow-kicker">다음</span>'));
  assert(flow.includes("+' 지점'"));
  assert(flow.includes("='임무 '+formatElapsed"));
  assert(flow.includes("return '등록 거점'"));
  assert(flow.includes("return '내 거점'"));
});

if(failed){console.error('EP usability failed: '+failed);process.exit(1);}
console.log('EP usability passed: '+passed);
