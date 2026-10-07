const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req,res) => {
  const file = path.join(root, new URL(req.url,'http://localhost').pathname === '/' ? 'index.html' : new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try {res.setHeader('Content-Type', file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}
  catch {res.writeHead(404).end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));
  fs.mkdirSync('ui-results',{recursive:true});
  let failures=0;
  for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await engine.launch();
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.dismiss());
    await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765')?route.continue():route.abort());
    try{
      await page.goto('http://127.0.0.1:8765');
      await page.locator('#epRandomBtn').click();
      const activeBg=await page.locator('#epMoreBtn').evaluate(el=>getComputedStyle(el).backgroundColor);
      assert(!activeBg.includes('0.035'),'active More background must remain legible');
      await page.screenshot({path:`ui-results/${name}-random.png`});
      await page.locator('#v29RecordedRecon').click();
      await page.waitForTimeout(100);
      const result=await page.evaluate(()=>({overlay:EpRuntimeBridge.state.overlay,selected:EpRuntimeBridge.state.selected,card:getComputedStyle(document.getElementById('epLocationCard')).display,more:getComputedStyle(document.getElementById('epMoreBtn')).backgroundColor,flow:getComputedStyle(document.getElementById('epFlow')).display}));
      console.log(name,JSON.stringify(result));
      await page.screenshot({path:`ui-results/${name}-registered.png`});
      assert.equal(result.overlay,'LOCATION');assert(result.selected);assert.notEqual(result.card,'none');
      assert.equal(await page.locator('#epLocationKind').textContent(),'등록 거점');
      assert(await page.locator('#epLocationDesc').isVisible());
      await page.locator('#epLocPromote').click();
      assert(await page.locator('#promoModalBackdrop').isVisible());
      await page.evaluate(()=>closePromotionModal());
      await page.locator('#epLocationClose').click();
      await page.locator('#epRecordsBtn').click();
      await page.locator('#v29Sheet .v29-close').click();
      await page.locator('#epRandomBtn').click();
      await page.locator('#v29RecordedRecon').click();
      await page.evaluate(()=>setTempMark([37.4267,127.0544],'TEST REFERENCE'));
      await page.locator('#epLocDest').click();
      if(await page.locator('#v29MissionMapPlan').isVisible())await page.locator('#v29MissionMapPlan').click();
      assert.equal(await page.evaluate(()=>EpRuntimeBridge.state.surface),'PLAN');
      assert(await page.locator('#epPlanActions').isVisible());
      await page.screenshot({path:`ui-results/${name}-plan.png`});
      assert.equal(await page.locator('#epDrawActions').isVisible(),false,'draw toolbar must be hidden in normal plan');
      await page.locator('#epPlanList button').first().click();
      assert(await page.locator('#epLocationCard').isVisible());
      assert.equal(await page.locator('#epPlanShell').isVisible(),false,'plan must not cover location card');
      await page.locator('#epLocationClose').click();
      await page.locator('#epPlanDraw').click();
      assert(await page.locator('#epDrawActions').isVisible());
      assert.equal(await page.locator('#epPlanActions').isVisible(),false);
      await page.locator('#epDrawDone').click();
      assert(await page.locator('#epPlanActions').isVisible());
      await page.locator('#epPlanExit').click();
      assert.equal(await page.evaluate(()=>EpRuntimeBridge.state.surface),'MAP');
      for(const width of [320,390,768]){
        await page.setViewportSize({width,height:844});
        await page.locator('#epRandomBtn').click();
        await page.locator('#v29RecordedRecon').click();
        const box=await page.locator('#epLocationCard').boundingBox();
        assert(box.x>=0 && box.x+box.width<=width+1 && box.y>=0 && box.y+box.height<=844);
        await page.screenshot({path:`ui-results/${name}-${width}-card.png`});
        await page.locator('#epLocationClose').click();
      }
      assert.deepEqual(errors,[]);
      // If the replacement flow cannot load, legacy details must remain usable.
      const fallback=await context.newPage();fallback.setDefaultTimeout(8000);
      await fallback.route('**/ep-ui-flow.js*',route=>route.abort());
      await fallback.goto('http://127.0.0.1:8765');
      await fallback.locator('#epRandomBtn').click();await fallback.locator('#v29RecordedRecon').click();
      assert(await fallback.locator('#sitrepPanel').isVisible());
      await fallback.close();
    }catch(e){failures++;console.error(name,e.stack);await page.screenshot({path:`ui-results/${name}-failure.png`});}
    await browser.close();
  }
  server.close();if(failures)process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
