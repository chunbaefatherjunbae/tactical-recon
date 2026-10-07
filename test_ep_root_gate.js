const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

test('root runtime is V29 stable plus ECHOPOINT, not R overlay stack',()=>{
  ['v27-stable.js','v28-runtime.js','v29.js','v29-stabilize.js','ep-runtime-bridge.js','ep-ui-shell.js','ep-ui-flow.js'].forEach(src=>{
    assert(index.includes('src="./'+src+'"'));
  });
  assert.strictEqual(index.includes('src="./r1.js"'),false);
  assert.strictEqual(index.includes('src="./r2.js"'),false);
  assert.strictEqual(index.includes('href="./r1.css"'),false);
  assert.strictEqual(index.includes('href="./r2.css"'),false);
});

test('R files remain preserved as inactive migration reference',()=>{
  ['r1.js','r2.js','r1.css','r2.css'].forEach(path=>assert(fs.existsSync(path)));
});

test('service worker caches EP root runtime and does not inject R runtime',()=>{
  ['ep-runtime-bridge.js','ep-plan-bridge.js','ep-mission-bridge.js','ep-surface-bridge.js','ep-overlay-bridge.js','ep-ui-shell.js','ep-ui-flow.js'].forEach(src=>assert(sw.includes("'./"+src+"'")));
  assert.strictEqual(sw.includes("'./r1.js'"),false);
  assert.strictEqual(sw.includes("'./r2.js'"),false);
});

test('legacy ECHOPOINT experiments remain available outside root runtime',()=>{
  assert(fs.existsSync('echo/index.html'));
  assert(fs.existsSync('echopoint/index.html'));
  assert.strictEqual(index.includes('echopoint/index.html'),false);
});

if(failed){console.error('EP root gate failed: '+failed);process.exit(1);}
console.log('EP root gate passed: '+passed);
