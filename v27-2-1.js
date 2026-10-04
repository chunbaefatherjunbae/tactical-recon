/* Tactical Recon V27.2.1 point/info hotfix */
(() => {
  'use strict';

  document.title = 'TACTICAL RECON // FIELD TERMINAL V27.2.1';
  document.body?.classList.add('v2721');

  let drawerLastGps = null;

  function validCoords(coords) {
    return Array.isArray(coords) && coords.length >= 2 &&
      Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1])) &&
      Math.abs(Number(coords[0])) <= 90 && Math.abs(Number(coords[1])) <= 180;
  }

  function stopLeafletEvent(event) {
    try {
      if (event?.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
    } catch (e) {}
  }

  function rememberDrawerGps(pos) {
    const lat = Number(pos?.coords?.latitude);
    const lon = Number(pos?.coords?.longitude);
    if (!validCoords([lat, lon])) return;
    drawerLastGps = {
      name:'LAST GPS',
      coords:[lat, lon],
      source:'LAST_GPS',
      capturedAt:Number(pos?.timestamp) || Date.now()
    };
  }

  const baseApplyGpsPositionV2721 = applyGpsPosition;
  applyGpsPosition = function(pos, shouldRecenter = false, session = gpsSessionId) {
    const out = baseApplyGpsPositionV2721(pos, shouldRecenter, session);
    if (gpsPowerEnabled && hasGpsFix) rememberDrawerGps(pos);
    return out;
  };

  const baseStopGpsTrackingV2721 = stopGpsTracking;
  stopGpsTracking = function() {
    if (hasGpsFix && validCoords(baseLocation)) {
      drawerLastGps = { name:'LAST GPS', coords:[...baseLocation], source:'LAST_GPS', capturedAt:Date.now() };
    } else if (latestGpsPosition) {
      rememberDrawerGps(latestGpsPosition);
    }
    return baseStopGpsTrackingV2721();
  };

  const baseSelectedPlanPoint = selectedPlanPoint;
  selectedPlanPoint = function() {
    if (selectedPlanPointRef?.role === 'HOME') return getHomePoint();
    return baseSelectedPlanPoint();
  };

  function fillHomePointInfo(event = null) {
    stopLeafletEvent(event);
    const home = getHomePoint();
    if (!home?.coords) return;

    selectedPlanPointRef = { role:'HOME', id:null };
    try { closePlanSearch(); } catch (e) {}
    try { closeNavMore(); } catch (e) {}

    const type = document.getElementById('planPointType');
    const name = document.getElementById('planPointName');
    const wgs = document.getElementById('planPointWgs84');
    const mgrsEl = document.getElementById('planPointMgrs');
    const addr = document.getElementById('planPointAddress');
    const deleteBtn = document.getElementById('planPointDeleteBtn');

    if (type) type.textContent = 'HOME POINT';
    if (name) name.textContent = home.name || 'HOME / EXIT';
    if (wgs) wgs.textContent = `${home.coords[0].toFixed(6)}, ${home.coords[1].toFixed(6)}`;
    if (mgrsEl) mgrsEl.textContent = calcMGRS(home.coords[0], home.coords[1]);
    if (addr) {
      const address = String(home.address || '').trim();
      addr.hidden = !address;
      addr.textContent = address;
    }
    if (deleteBtn) deleteBtn.textContent = 'DELETE HOME';
    setV271Sheet('planPointSheet', true);
  }

  const baseOpenPlanPointInfo = openPlanPointInfo;
  openPlanPointInfo = function(role, id = null, event = null) {
    const deleteBtn = document.getElementById('planPointDeleteBtn');
    if (deleteBtn) deleteBtn.textContent = 'DELETE POINT';
    return baseOpenPlanPointInfo(role, id, event);
  };

  const baseDeleteSelectedPlanPoint = deleteSelectedPlanPoint;
  deleteSelectedPlanPoint = function() {
    if (selectedPlanPointRef?.role === 'HOME') {
      const home = getHomePoint();
      if (!home) return;
      if (!confirm('HOME 포인트를 삭제하시겠습니까?')) return;
      clearHomePoint();
      closePlanPointInfo();
      return;
    }
    return baseDeleteSelectedPlanPoint();
  };

  function bindHomeInfo() {
    if (!homeMarker || homeMarker.__v2721InfoBound) return;
    homeMarker.on('click', fillHomePointInfo);
    homeMarker.__v2721InfoBound = true;
  }

  const baseRenderHomeMarker = renderHomeMarker;
  renderHomeMarker = function() {
    const out = baseRenderHomeMarker();
    bindHomeInfo();
    return out;
  };
  bindHomeInfo();

  function referenceEntries() {
    const entries = [];
    const home = getHomePoint();
    if (home?.coords && validCoords(home.coords)) {
      entries.push({ type:'HOME', name:home.name || 'HOME / EXIT', coords:[...home.coords], stale:false });
    }
    if (tempMarkPoint?.coords && validCoords(tempMarkPoint.coords)) {
      entries.push({ type:'TEMP', name:tempMarkPoint.name || 'TEMP POS', coords:[...tempMarkPoint.coords], stale:false });
    }
    if (drawerLastGps?.coords && validCoords(drawerLastGps.coords)) {
      entries.push({ type:'LAST GPS', name:'LAST GPS', coords:[...drawerLastGps.coords], stale:true });
    }
    return entries;
  }

  function renderReferenceDrawerGroup() {
    const container = document.getElementById('wpListContainer');
    if (!container) return;
    container.querySelector('.v2721-reference-group')?.remove();

    const entries = referenceEntries();
    if (!entries.length) return;

    const section = document.createElement('section');
    section.className = 'wp-group v2721-reference-group';

    const head = document.createElement('div');
    head.className = 'wp-group-head v2721-reference-head';
    head.innerHTML = `<span class="wp-group-chevron">◆</span><span class="wp-group-name">REFERENCE</span><span class="wp-group-count">${entries.length}</span>`;
    section.appendChild(head);

    const body = document.createElement('div');
    body.className = 'wp-group-body';

    entries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'wp-item v2721-reference-item';
      item.innerHTML = `
        <div class="wp-item-meta"><span class="wp-item-status"></span></div>
        <div class="wp-item-name"></div>
        <div class="wp-item-coords"></div>
      `;
      item.querySelector('.wp-item-status').textContent = entry.stale ? `[STALE] ${entry.type}` : `[REFERENCE] ${entry.type}`;
      item.querySelector('.wp-item-name').textContent = entry.name;
      item.querySelector('.wp-item-coords').textContent = `${calcMGRS(entry.coords[0], entry.coords[1])} · ${entry.coords[0].toFixed(5)}, ${entry.coords[1].toFixed(5)}`;
      item.onclick = () => {
        map.setView(entry.coords, Math.max(map.getZoom(), 15), { animate:false });
        flushReticleTelemetry();
        try { toggleWpDrawer(); } catch (e) {}
        if (entry.type === 'HOME') setTimeout(() => fillHomePointInfo(), 0);
      };
      body.appendChild(item);
    });

    section.appendChild(body);
    container.prepend(section);
  }

  const baseRenderWpDrawerList = renderWpDrawerList;
  renderWpDrawerList = function() {
    const out = baseRenderWpDrawerList();
    renderReferenceDrawerGroup();
    return out;
  };

  const baseNormalizeKoreanAddress = normalizeKoreanAddress;

  function adjacentHouseNumber(rawValue, roadValue) {
    const raw = String(rawValue || '').replace(/\s+/g, '');
    const road = String(roadValue || '').replace(/\s+/g, '');
    if (!raw || !road) return '';
    const idx = raw.indexOf(road);
    if (idx < 0) return '';

    const before = raw.slice(Math.max(0, idx - 18), idx);
    const after = raw.slice(idx + road.length, idx + road.length + 18);
    const beforeMatch = before.match(/(\d+(?:-\d+)?),?$/);
    if (beforeMatch) return beforeMatch[1];
    const afterMatch = after.match(/^,?(\d+(?:-\d+)?)(?:,|$)/);
    return afterMatch ? afterMatch[1] : '';
  }

  normalizeKoreanAddress = function(data, fallback) {
    const normalized = baseNormalizeKoreanAddress(data, fallback);
    const a = data?.address || {};
    const road = a.road || a.pedestrian || a.residential || a.path;
    if (!road) return normalized;

    const explicitHouse = String(a.house_number || '').trim();
    const searchSources = [
      fallback,
      document.getElementById('planSearchInput')?.value,
      document.getElementById('routeLocateInput')?.value
    ];
    const inferredHouse = searchSources.map(value => adjacentHouseNumber(value, road)).find(Boolean) || '';
    const fallbackHouse = explicitHouse || inferredHouse;
    if (!fallbackHouse) return normalized;

    const compactNormalized = String(normalized || '').replace(/\s+/g, '');
    const compactRoadHouse = `${String(road).replace(/\s+/g, '')}${fallbackHouse}`;
    if (compactNormalized.includes(compactRoadHouse)) return normalized;

    return `${String(normalized || '').trim()} ${fallbackHouse}`.trim();
  };
})();
