const fs=require('fs');
const assert=require('assert');

const flow=fs.readFileSync('ep-ui-flow.js','utf8');
const css=fs.readFileSync('ep-ui-flow.css','utf8');
const plan=fs.readFileSync('ep-plan-bridge.js','utf8');
const index=fs.readFileSync('index.html','utf8');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

test('V skin keeps PLAN and MISSION as bottom field panels',()=>{
  assert(css.includes('.ep-plan-shell{'));
  assert(css.includes('bottom:var(--ep-toolbar-h)'));
  assert(css.includes('.ep-mission-shell{'));
  assert(css.includes('background:rgba(4,10,6,.97)'));
  assert(css.includes('.ep-plan-actions,.ep-draw-actions'));
  assert(css.includes('.ep-mission-stepper{'));
});

test('Unified Location Card has six fixed actions',()=>{
  ['epLocStart','epLocVia','epLocDest','epLocTemp','epLocSave','epLocRemove'].forEach(id=>assert(flow.includes('id="'+id+'"')));
  assert(flow.includes('<button id="epLocStart"'));
  assert(flow.includes('<button id="epLocDest" class="primary"'));
});

test('Location destination creates PLAN on MAP and updates objective on PLAN',()=>{
  assert(flow.includes("if(surface()==='PLAN')"));
  assert(flow.includes('root.EpPlanBridge?.setObjective?.(point)'));
  assert(flow.includes("root.enterTargetMode(point)"));
});

test('PLAN shell renders ordered points and agreed bottom actions',()=>{
  assert(flow.includes("root.EpPlanCore?.roleAt?.(index,points.length)"));
  ['epPlanDraw','epPlanImport','epPlanStart','epPlanAdd'].forEach(id=>assert(flow.includes('id="'+id+'"')));
  assert(flow.includes('＋ 위치'));
});

test('PLAN drawing stays on existing input engine with EP data owner',()=>{
  assert(flow.includes("root.enterPlanDrawMode"));
  assert(flow.includes("root.EpPlanBridge?.undoStroke?.('ROUTE')"));
  assert(flow.includes("drawTool('MARK')"));
});

test('MISSION shell uses MissionCore manual NEXT PREV',()=>{
  assert(flow.includes('root.EpMissionCore?.currentTarget?.(m)'));
  assert(flow.includes('root.EpMissionBridge?.previous?.()'));
  assert(flow.includes('root.EpMissionBridge?.next?.()'));
  assert(flow.includes('epMissionIndex'));
});

test('legacy target panel and SITREP are hidden by the V shell owner',()=>{
  const shellCss=fs.readFileSync('ep-ui.css','utf8');
  assert(shellCss.includes('body.ep-shell-ready .sitrep-panel'));
  assert(shellCss.includes('body.ep-shell-ready .target-mode-panel'));
});

test('surface transitions do not stop global TrackV2',()=>{
  const enter=index.slice(index.indexOf('function enterTargetMode(target)'),index.indexOf('function exitTargetMode'));
  const exit=index.slice(index.indexOf('function exitTargetMode'),index.indexOf('function toggleTargetMyPosition'));
  const back=index.slice(index.indexOf('function returnToTargetPlan'),index.indexOf('function routeContainerPoint'));
  assert.strictEqual(enter.includes('stopTrackRecording('),false);
  assert.strictEqual(exit.includes('stopTrackRecording('),false);
  assert.strictEqual(back.includes('stopTrackRecording('),false);
});

test('PlanBridge owns objective replacement and non-objective removal',()=>{
  assert(plan.includes('function setObjective(value)'));
  assert(plan.includes('function removePointById(pointId)'));
  assert(plan.includes('if(index===objective)return false'));
});

if(failed){console.error('EP UI flow failed: '+failed);process.exit(1);}
console.log('EP UI flow passed: '+passed);
