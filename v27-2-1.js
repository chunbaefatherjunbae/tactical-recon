/* Tactical Recon V27.2.1 point/info hotfix */
(() => {
  'use strict';

  document.title = 'TACTICAL RECON // FIELD TERMINAL V27.2.1';
  document.body?.classList.add('v2721');

  function stopLeafletEvent(event) {
    try {
      if (event?.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
    } catch (e) {}
  }

  // HOME uses the same point-info sheet/copy behavior as START/VIA/END.
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

  // Nominatim sometimes omits address.house_number even though display_name
  // still contains it (e.g. "20, 압구정로14길, ..."). Preserve an adjacent
  // building number from display_name instead of collapsing the result to road only.
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
    const fallbackHouse = explicitHouse || adjacentHouseNumber(fallback, road);
    if (!fallbackHouse) return normalized;

    const compactNormalized = String(normalized || '').replace(/\s+/g, '');
    const compactRoadHouse = `${String(road).replace(/\s+/g, '')}${fallbackHouse}`;
    if (compactNormalized.includes(compactRoadHouse)) return normalized;

    return `${String(normalized || '').trim()} ${fallbackHouse}`.trim();
  };
})();
