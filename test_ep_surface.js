const fs=require('fs');
const assert=require('assert');
const Surface=require('./ep-core/surface-core.js');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

test('surface derives MISSION over PLAN over MAP',()=>{
  assert.equal(Surface.derive({missionActive:true,planActive:true}),'MISSION');
  assert.equal(Surface.derive({missionActive:false,planActive:true}),'PLAN');
  assert.equal(Surface.derive({missionActive:false,planActive:false}),'MAP');
});

test('surface refuses PLAN without plan state unless forced',()=>{
  const s={surface:'MAP',plan:null,mission:null};
  assert.equal(Surface.enter(s,'PLAN'),false);
  assert.equal(s.surface,'MAP');
  assert(Surface.enter(s,'PLAN',{force:true,reason:'TEST'}));
  assert.equal(s.surface,'PLAN');
});

test('surface refuses MISSION without active mission',()=>{
  const s={surface:'PLAN',plan:{},mission:null};
  assert.equal(Surface.enter(s,'MISSION'),false);
  s.mission={status:'ACTIVE'};
  assert(Surface.enter(s,'MISSION',{reason:'START'}));
  assert.equal(s.surface,'MISSION');
});

test('surface bridge is the new semantic owner and legacy phase is mirror only',()=>{
  const source=fs.readFileSync('ep-surface-bridge.js','utf8');
  assert(source.includes("Surface.derive(snap)"));
  assert(source.includes("setSurface('PLAN'"));
  assert(source.includes("setSurface('MAP'"));
  assert(source.includes("phase:'NAV'"));
  assert(source.includes("phase:'PLAN'"));
});

test('runtime behavior gates prefer EP surface helpers',()=>{
  const index=fs.readFileSync('index.html','utf8');
  assert(index.includes('function epSurfaceName()'));
  assert(index.includes('function epIsPlanSurface()'));
  assert(index.includes('function epIsMissionSurface()'));
  assert(index.includes("document.body.classList.toggle('target-mode', !epIsMapSurface())"));
  assert(index.includes("routeDrawEnabled = Boolean(enabled && epIsPlanSurface())"));
  assert(index.includes("if (!epIsMissionSurface() || navPanelCollapsed) return;"));
});

test('targetModeActive is reduced to transition mirror and migration-port compatibility',()=>{
  const index=fs.readFileSync('index.html','utf8');
  assert(index.includes('function epHasActiveContext()'));
  const lines=index.split('\n').filter(line=>line.includes('targetModeActive'));
  const semanticReads=lines.filter(line=>
    !line.includes('let targetModeActive') &&
    !line.includes('if (!targetModeActive) return \'MAP\'') &&
    !line.includes('targetModeActive = true') &&
    !line.includes('targetModeActive = false') &&
    !line.includes('const wasActive=targetModeActive') &&
    !line.includes('wasActive && !targetModeActive') &&
    !line.includes('if (!snapshot || !targetModeActive)') &&
    !line.includes('if (!targetModeActive || !targetModeTarget) return null') &&
    !line.includes('if (!targetModeActive) return null') &&
    !line.includes('if (!targetModeActive) return false')
  );
  assert.deepEqual(semanticReads,[]);
});

test('direct legacy phase reads are reduced to compatibility mirror and fallback',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const lines=index.split('\n').filter(line=>line.includes('targetModePhase'));
  const semanticReads=lines.filter(line=>
    !line.includes("let targetModePhase") &&
    !line.includes("targetModePhase = 'PLAN'") &&
    !line.includes("targetModePhase = 'NAV'") &&
    !line.includes("targetModePhase === 'NAV' ? 'MISSION' : 'PLAN'") &&
    !line.includes("phase:String(targetModePhase") &&
    !line.includes("targetModePhase=String(next.phase)")
  );
  assert.deepEqual(semanticReads,[]);
});

test('body receives EP surface state for progressive UI replacement',()=>{
  const source=fs.readFileSync('ep-surface-bridge.js','utf8');
  assert(source.includes("document.body.dataset.epSurface=state.surface"));
  assert(source.includes("'ep-surface-map'"));
  assert(source.includes("'ep-surface-plan'"));
  assert(source.includes("'ep-surface-mission'"));
});

if(failed){console.error('EP surface failed: '+failed);process.exit(1);}
console.log('EP surface passed: '+passed);
