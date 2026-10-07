const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const target = (pathname === '/' || pathname === '/baseline/' || pathname === '/baseline') ? '/baseline/index.html' : pathname;
  const file = path.join(root, target);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    res.setHeader('Content-Type',
      file.endsWith('.js') ? 'application/javascript' :
      file.endsWith('.css') ? 'text/css' :
      file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch {
    res.writeHead(404).end();
  }
});

(async () => {
  await new Promise(resolve => server.listen(8766, '127.0.0.1', resolve));
  fs.mkdirSync('ui-results-baseline', { recursive: true });
  let failures = 0;

  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'allow'
    });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://*.tile.openstreetmap.org/**', route => route.abort());
    await page.route('https://nominatim.openstreetmap.org/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        lat:'37.5663',
        lon:'126.9779',
        display_name:'서울특별시 중구 세종대로 110 대한민국',
        address:{state:'서울특별시',borough:'중구',road:'세종대로',house_number:'110'}
      }])
    }));

    try {
      await page.goto('http://127.0.0.1:8766/baseline/');
      await page.waitForFunction(() => window.BaselineApp?.version === 'R0.1-BASELINE');

      assert.equal(await page.locator('.bottom-nav button').count(), 4);
      assert.deepEqual(await page.locator('.bottom-nav button').allTextContents(), ['거점','탐색','계획','기록']);
      assert.equal(await page.locator('.quick-stack .quick-btn').count(), 5);
      assert.equal(await page.locator('.bottom-nav .nav-icon').count(), 0);
      assert.equal(await page.locator('#followBtn svg').count(), 1);
      assert.equal(await page.evaluate(() => BaselineApp.topoLayer?._url.includes('opentopomap.org')), true);
      assert.equal(await page.evaluate(() => BaselineApp.roadBoostLayer?._url.includes('openstreetmap.org')), true);
      assert.equal(await page.evaluate(() => document.body.classList.contains('theme-nvg-green')), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--bg-base').trim()), '#020904');
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--text-main').trim()), '#22ff66');
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent').trim()), '#9de3a4');
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--map-filter').includes('hue-rotate(76deg)')), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body, '::after').opacity), '0.18');
      await page.waitForTimeout(120);
      const topoTileFilter = await page.locator('.leaflet-tile:not(.road-boost-tiles)').first().evaluate(el => getComputedStyle(el).filter).catch(() => '');
      if (topoTileFilter) assert(topoTileFilter.includes('hue-rotate'));
      assert.equal(await page.evaluate(() => BaselineSites.getRegistered().length), 24);
      assert.equal(await page.locator('.site-map-marker').count(), 24);
      assert.equal(await page.locator('.reticle').count(), 1);
      assert.equal(await page.locator('[class*="corner"]').count(), 0);

      const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(x => x.name));
      assert.equal(resources.some(url => /\/(?:v27|v28|v29|ep-ui|ep-runtime|ep-overlay|ep-plan|ep-mission|ep-surface)/.test(url)), false, 'BASELINE must not load legacy runtime/UI layers');

      const registrations = await page.evaluate(async () => navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0);
      assert.equal(registrations, 0, 'BASELINE must not register legacy service worker');

      await page.locator('#tempBtn').click();
      let temp = await page.evaluate(() => BaselineState.state.temp);
      assert(temp && Number.isFinite(temp.lat) && Number.isFinite(temp.lon));
      assert.equal(await page.evaluate(() => BaselineState.reference()?.type), 'TEMP');
      assert(await page.locator('#tempBtn').evaluate(el => el.classList.contains('active')));
      assert.equal(await page.locator('.baseline-marker.temp').count(), 1);

      await page.evaluate(() => {
        const t = BaselineState.state.temp;
        BaselineState.setLastFix({ lat: t.lat + 0.01, lon: t.lon + 0.01, at: Date.now() + 5000 });
      });
      assert.equal(await page.evaluate(() => BaselineState.reference()?.type), 'LAST', 'GPS-off reference must use newest TEMP/LAST timestamp');

      await page.evaluate(() => {
        BaselineState.setGpsEnabled(true);
        BaselineState.setGpsFix({ lat: 37.57, lon: 126.98, accuracy: 7 });
      });
      assert.equal(await page.evaluate(() => BaselineState.reference()?.type), 'GPS', 'live GPS must own reference while enabled');

      await page.evaluate(() => {
        BaselineState.setGpsEnabled(false);
        BaselineState.setTemp({ lat: 37.41, lon: 127.01 });
        BaselineApp.map.setView([35.0, 129.0], 11, { animate:false });
      });
      const savedTemp = await page.evaluate(() => BaselineState.state.temp);
      await page.locator('#tempBtn').dispatchEvent('pointerdown', { pointerType:'touch', pointerId:1, isPrimary:true });
      await page.waitForTimeout(620);
      await page.locator('#tempBtn').dispatchEvent('pointerup', { pointerType:'touch', pointerId:1, isPrimary:true });
      await page.waitForTimeout(150);
      const center = await page.evaluate(() => {
        const c = BaselineApp.map.getCenter();
        return { lat:c.lat, lon:c.lng };
      });
      assert(Math.abs(center.lat - savedTemp.lat) < 0.002 && Math.abs(center.lon - savedTemp.lon) < 0.002, 'TEMP hold must move map to saved TEMP');

      await page.locator('.bottom-nav button[data-panel="sites"]').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '거점');
      assert.equal(await page.locator('[data-site-filter]').count(), 3);
      assert.equal(await page.locator('.site-row').count(), 24);
      await page.screenshot({ path:`ui-results-baseline/${name}-sites.png`, fullPage:true });
      await page.locator('.site-row').first().click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '거점 정보');
      assert(await page.locator('#siteMapGo').isVisible());
      assert.equal(await page.locator('#siteSecureToggle').textContent(), '개척 완료');
      await page.locator('#siteSecureToggle').click();
      assert.equal(await page.locator('#siteSecureToggle').textContent(), '미개척으로');
      assert.equal(await page.evaluate(() => BaselineSites.getSecured().length), 1);
      await page.locator('#sheetClose').click();

      await page.locator('.bottom-nav button[data-panel="sites"]').click();
      await page.locator('[data-site-filter="secured"]').click();
      assert.equal(await page.locator('.site-row').count(), 1);
      await page.locator('#sheetClose').click();

      await page.locator('.bottom-nav button[data-panel="explore"]').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '탐색');
      assert.equal(await page.locator('[data-explore-radius]').count(), 4);
      assert.equal(await page.locator('#exploreRegisteredBtn').count(), 1);
      assert.equal(await page.locator('#exploreWildBtn').count(), 1);
      await page.locator('[data-explore-radius="30"]').click();
      assert(await page.locator('[data-explore-radius="30"]').evaluate(el => el.classList.contains('active')));
      await page.evaluate(() => BaselineState.setTemp({lat:37.4267,lon:127.0544}));
      await page.waitForTimeout(60);
      assert.equal(await page.locator('.leaflet-interactive').count() > 0, true);
      const beforeWild = await page.evaluate(() => BaselineSites.getUserSites().length);
      await page.locator('#exploreWildBtn').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '거점 정보');
      assert.equal(await page.locator('.site-detail-grid').textContent().then(t => t.includes('미개척')), true);
      assert.equal(await page.evaluate(() => BaselineSites.getUserSites().length), beforeWild + 1);
      assert.equal(await page.locator('.site-map-marker').count(), 25);
      await page.locator('#sheetClose').click();

      await page.locator('.bottom-nav button[data-panel="sites"]').click();
      await page.locator('[data-site-filter="mine"]').click();
      assert.equal(await page.locator('.site-row').count(), 1);
      await page.locator('#sheetClose').click();

      // Unified PLAN + NAVIGATION vertical flow.
      await page.locator('.bottom-nav button[data-panel="plans"]').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '계획');
      assert.equal(await page.locator('#planNewBtn').count(), 1);
      await page.locator('#planNewBtn').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '계획 편집');
      assert.equal(await page.locator('[data-edit-point="START"]').count(), 1);
      assert.equal(await page.locator('[data-edit-point="DEST"]').count(), 1);

      assert.equal(await page.evaluate(() => BaselineNavigationUI.getDraft().start?.source), 'TEMP');
      await page.locator('#planNameInput').fill('BASELINE TEST PLAN');
      await page.locator('[data-edit-point="DEST"]').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '도착지 선택');
      assert.equal(await page.locator('#pointAddressInput').count(), 1);
      await page.locator('#pointAddressInput').fill('서울시청');
      await page.locator('#pointAddressSearch').click();
      await page.locator('[data-address-result="0"]').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '계획 편집');
      assert.equal(await page.evaluate(() => BaselineNavigationUI.getDraft().destination?.source), 'ADDRESS');

      await page.locator('#planAddVia').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '경유지 선택');
      await page.locator('#pointSiteSelect').selectOption({ index: 1 });
      await page.locator('#pointSiteUse').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '계획 편집');
      assert.equal(await page.locator('[data-edit-point="VIA"]').count(), 1);

      await page.locator('#planEditorSave').click();
      assert.equal(await page.evaluate(() => BaselinePlanStore.list().length), 1);
      await page.locator('#planEditorConfirm').click();
      assert.equal(await page.locator('#sheet').isHidden(), true);
      assert.equal(await page.locator('#navRouteSummary').isVisible(), true);
      assert.equal(await page.locator('#navigationHud').isVisible(), true);
      assert.equal(await page.locator('#navNowMetric').textContent().then(t => t.includes('MAG')), true);
      assert.equal(await page.locator('#navStartMetric').textContent().then(t => t.includes('GRID')), true);
      assert.equal(await page.locator('#navDeclination').textContent().then(t => t.includes('WMM2025')), true);
      assert.equal(await page.locator('#navNextBlock').count(), 0);
      assert.equal(await page.evaluate(() => Number.isFinite(BaselineNavigationCore.bearingBundle([37.5,127],[37.6,127.1]).magneticBearing)), true);
      const seoulDeclination = await page.evaluate(() => BaselineNavigationCore.wmmField(37.5665,126.9780,0,new Date('2026-10-07T00:00:00Z')).declination);
      assert(seoulDeclination < -7 && seoulDeclination > -11);
      await page.screenshot({ path:`ui-results-baseline/${name}-navigation-ready.png`, fullPage:true });

      // Drawing: one finger draws. Drawing mode owns gestures instead of legacy PLAN handlers.
      await page.locator('[data-nav-action="DRAW"]').click();
      assert.equal(await page.locator('#drawingCapture').isVisible(), true);
      const drawBox = await page.locator('#drawingCapture').boundingBox();
      await page.locator('#drawingCapture').dispatchEvent('pointerdown', { pointerId:11, pointerType:'touch', isPrimary:true, clientX:drawBox.x+120, clientY:drawBox.y+350 });
      await page.locator('#drawingCapture').dispatchEvent('pointermove', { pointerId:11, pointerType:'touch', isPrimary:true, clientX:drawBox.x+150, clientY:drawBox.y+370 });
      await page.locator('#drawingCapture').dispatchEvent('pointermove', { pointerId:11, pointerType:'touch', isPrimary:true, clientX:drawBox.x+180, clientY:drawBox.y+390 });
      await page.locator('#drawingCapture').dispatchEvent('pointerup', { pointerId:11, pointerType:'touch', isPrimary:true, clientX:drawBox.x+180, clientY:drawBox.y+390 });
      assert.equal(await page.evaluate(() => BaselineNavigationUI.getDraft().drawings.length), 1);

      // Two-finger gesture moves the map and must not create another drawing.
      const centerBeforeGesture = await page.evaluate(() => {
        const c = BaselineApp.map.getCenter();
        return [c.lat,c.lng];
      });
      await page.locator('#drawingCapture').dispatchEvent('pointerdown', { pointerId:21, pointerType:'touch', isPrimary:true, clientX:drawBox.x+100, clientY:drawBox.y+300 });
      await page.locator('#drawingCapture').dispatchEvent('pointerdown', { pointerId:22, pointerType:'touch', isPrimary:false, clientX:drawBox.x+210, clientY:drawBox.y+300 });
      await page.locator('#drawingCapture').dispatchEvent('pointermove', { pointerId:21, pointerType:'touch', isPrimary:true, clientX:drawBox.x+75, clientY:drawBox.y+315 });
      await page.locator('#drawingCapture').dispatchEvent('pointermove', { pointerId:22, pointerType:'touch', isPrimary:false, clientX:drawBox.x+185, clientY:drawBox.y+315 });
      await page.locator('#drawingCapture').dispatchEvent('pointerup', { pointerId:21, pointerType:'touch', isPrimary:true, clientX:drawBox.x+75, clientY:drawBox.y+315 });
      await page.locator('#drawingCapture').dispatchEvent('pointerup', { pointerId:22, pointerType:'touch', isPrimary:false, clientX:drawBox.x+185, clientY:drawBox.y+315 });
      assert.equal(await page.evaluate(() => BaselineNavigationUI.getDraft().drawings.length), 1);
      const centerAfterGesture = await page.evaluate(() => {
        const c = BaselineApp.map.getCenter();
        return [c.lat,c.lng];
      });
      assert(Math.abs(centerAfterGesture[0]-centerBeforeGesture[0]) > 0.00001 || Math.abs(centerAfterGesture[1]-centerBeforeGesture[1]) > 0.00001);

      await page.locator('#drawDoneBtn').click();
      assert.equal(await page.locator('#drawingCapture').isHidden(), true);

      // Session lifecycle: start -> lap -> pause -> resume -> stop -> record.
      await page.locator('[data-nav-action="START"]').click();
      assert.equal(await page.evaluate(() => BaselineRecordStore.getActive()?.status), 'RUNNING');
      assert.equal(await page.locator('#navTimer').isVisible(), true);
      await page.locator('[data-nav-action="LAP"]').click();
      assert.equal(await page.evaluate(() => BaselineRecordStore.getActive()?.laps.length), 1);
      await page.locator('[data-nav-action="PAUSE"]').click();
      assert.equal(await page.evaluate(() => BaselineRecordStore.getActive()?.status), 'PAUSED');
      assert.equal(await page.locator('[data-nav-action="PAUSE"]').textContent(), '재개');

      await page.reload();
      await page.waitForFunction(() => window.BaselineApp?.version === 'R0.1-BASELINE');
      assert.equal(await page.evaluate(() => BaselineRecordStore.getActive()?.status), 'PAUSED');
      assert.equal(await page.locator('#navRouteSummary').isVisible(), true);
      assert.equal(await page.locator('[data-nav-action="PAUSE"]').textContent(), '재개');

      await page.locator('[data-nav-action="PAUSE"]').click();
      assert.equal(await page.evaluate(() => BaselineRecordStore.getActive()?.status), 'RUNNING');
      page.once('dialog', dialog => dialog.accept());
      await page.locator('[data-nav-action="STOP"]').click();
      assert.equal(await page.evaluate(() => BaselineRecordStore.getActive()), null);
      assert.equal(await page.evaluate(() => BaselineRecordStore.list().length), 1);

      await page.locator('.bottom-nav button[data-panel="records"]').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '기록');
      assert.equal(await page.locator('.record-row').count(), 1);
      await page.locator('.record-row').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '기록 상세');
      assert.equal(await page.locator('.record-lap').count(), 1);
      await page.screenshot({ path:`ui-results-baseline/${name}-navigation-record.png`, fullPage:true });
      await page.locator('#sheetClose').click();

      await page.locator('.bottom-nav button[data-panel="plans"]').click();
      assert.equal(await page.locator('.plan-library-row').count(), 1);
      assert.equal(await page.locator('[data-plan-share]').count(), 1);
      await page.screenshot({ path:`ui-results-baseline/${name}-plans.png`, fullPage:true });
      await page.locator('#sheetClose').click();

      await page.locator('#searchBtn').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '검색');
      assert(await page.locator('#baselineSearchInput').isVisible());
      await page.locator('#sheetClose').click();

      await page.locator('#settingsBtn').click();
      assert.equal(await page.locator('#sheetTitle').textContent(), '설정');
      assert.equal(await page.locator('#sheetBody').textContent().then(t => t.includes('NVG-G')), true);
      await page.locator('#sheetClose').click();

      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(() => BaselineApp.map.invalidateSize());
        const quick = await page.locator('.quick-stack').boundingBox();
        const hud = await page.locator('.position-hud').boundingBox();
        assert(quick.x >= 0 && quick.x + quick.width <= width + 1);
        assert(hud.x >= 0 && hud.x + hud.width <= width + 1);
        await page.screenshot({ path:`ui-results-baseline/${name}-${width}.png`, fullPage:true });
      }

      assert.deepEqual(errors, []);
    } catch (error) {
      failures++;
      console.error(name, error.stack);
      await page.screenshot({ path:`ui-results-baseline/${name}-failure.png`, fullPage:true });
    }

    await browser.close();
  }

  server.close();
  if (failures) process.exitCode = 1;
})().catch(error => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
