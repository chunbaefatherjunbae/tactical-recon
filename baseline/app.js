(() => {
  'use strict';

  const S = window.BaselineState;
  const Sites = window.BaselineSites;
  const Explore = window.BaselineExplore;
  if (!S || !Sites || !Explore || !window.L) {
    console.error('[BASELINE] runtime dependency missing');
    return;
  }

  const DEFAULT_CENTER = [37.5665, 126.9780];
  const HOLD_MS = 560;
  const $ = id => document.getElementById(id);

  let toastTimer = null;
  let tempHoldTimer = null;
  let tempHoldTriggered = false;
  let tempMarker = null;
  let gpsMarker = null;
  let activeSiteFilter = 'registered';
  let exploreRadius = 'all';
  let exploreCircle = null;
  let sitePlacementActive = false;
  let sitePlacementAddressToken = 0;
  let editingSiteId = null;
  const siteMarkers = new Map();
  const siteLayer = L.layerGroup();

  const map = L.map('map', {
    center: DEFAULT_CENTER,
    zoom: 12,
    zoomControl: false,
    attributionControl: true,
    preferCanvas: true
  });

  const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxNativeZoom: 17,
    maxZoom: 19,
    className: 'baseline-topo-tiles',
    attribution: 'Map data © OpenStreetMap contributors · Map style © OpenTopoMap'
  }).addTo(map);

  map.createPane('roadBoostPane');
  map.getPane('roadBoostPane').style.zIndex = '250';
  map.getPane('roadBoostPane').style.pointerEvents = 'none';

  const roadBoostLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 10,
    maxZoom: 19,
    opacity: 0.24,
    pane: 'roadBoostPane',
    className: 'road-boost-tiles',
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  siteLayer.addTo(map);

  function toast(message) {
    const node = $('toast');
    if (!node) return;
    node.textContent = String(message || '');
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 1450);
  }

  function ageLabel(at) {
    if (!Number.isFinite(Number(at))) return '';
    const sec = Math.max(0, Math.floor((Date.now() - Number(at)) / 1000));
    if (sec < 10) return '방금';
    if (sec < 60) return sec + '초 전';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + '분 전';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + '시간 전';
    return Math.floor(hr / 24) + '일 전';
  }

  function formatMgrs(point) {
    if (!point) return 'POSITION --';
    try {
      if (window.mgrs?.forward) {
        return window.mgrs.forward([Number(point.lon), Number(point.lat)], 5).replace(/\s+/g, ' ').trim();
      }
    } catch {}
    return Number(point.lat).toFixed(5) + ', ' + Number(point.lon).toFixed(5);
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
    })[char]);
  }

  function siteMgrs(site) {
    if (!site?.coords) return '--';
    return formatMgrs({ lat:site.coords[0], lon:site.coords[1] });
  }

  function renderReference() {
    const ref = S.reference();
    const coord = $('positionCoord');
    const meta = $('positionMeta');
    if (!coord || !meta) return;

    if (!ref) {
      coord.textContent = 'POSITION --';
      meta.textContent = 'NO REFERENCE';
      return;
    }

    coord.textContent = formatMgrs(ref);
    const pieces = [ref.type];
    if (ref.type === 'GPS' && Number.isFinite(Number(ref.accuracy))) {
      pieces.push('±' + Math.round(Number(ref.accuracy)) + ' m');
    } else {
      pieces.push(ageLabel(ref.at));
    }
    meta.textContent = pieces.filter(Boolean).join(' · ');
  }

  function renderButtons() {
    const gps = $('gpsBtn');
    const follow = $('followBtn');
    const temp = $('tempBtn');
    gps?.classList.toggle('active', S.state.gps.enabled);
    gps?.setAttribute('aria-pressed', String(S.state.gps.enabled));
    follow?.classList.toggle('active', S.state.gps.follow);
    follow?.classList.toggle('following', S.state.gps.follow);
    follow?.setAttribute('aria-pressed', String(S.state.gps.follow));
    const followGlyph = $('followGlyph');
    if (followGlyph) {
      followGlyph.innerHTML = S.state.gps.follow
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4"/><circle cx="12" cy="12" r="2.5" class="follow-core"/><path d="M12 7v2M12 15v2M7 12h2M15 12h2"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5" class="follow-core"/></svg>';
    }
    temp?.classList.toggle('active', Boolean(S.state.temp));
    temp?.setAttribute('aria-pressed', String(Boolean(S.state.temp)));
  }

  function makeDot(colorClass) {
    return L.divIcon({
      className: 'baseline-marker-wrap',
      html: '<span class="baseline-marker ' + colorClass + '"></span>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }

  function makeSiteIcon(site) {
    const secured = site?.status === 'SECURED';
    const sourceClass = site?.source === 'WILD' ? ' wild' : (site?.source === 'USER' ? ' user' : ' registered');
    return L.divIcon({
      className: 'site-map-marker-wrap',
      html: '<span class="site-map-marker' + sourceClass + (secured ? ' secured' : '') + '"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  function renderSiteMarkers() {
    const sites = [...Sites.getRegistered(), ...Sites.getUserSites()];
    const liveIds = new Set();

    sites.forEach(site => {
      const id = String(site.id);
      liveIds.add(id);
      let marker = siteMarkers.get(id);
      if (!marker) {
        marker = L.marker(site.coords, {
          icon: makeSiteIcon(site),
          zIndexOffset: 100
        });
        marker.on('click', () => openSiteDetail(id));
        marker.addTo(siteLayer);
        siteMarkers.set(id, marker);
      } else {
        marker.setLatLng(site.coords);
        marker.setIcon(makeSiteIcon(site));
      }
    });

    for (const [id, marker] of siteMarkers.entries()) {
      if (!liveIds.has(id)) {
        marker.remove();
        siteMarkers.delete(id);
      }
    }
  }

  function renderMarkers() {
    const temp = S.state.temp;
    if (temp) {
      if (!tempMarker) {
        tempMarker = L.marker([temp.lat, temp.lon], {
          icon: makeDot('temp'),
          interactive: false,
          zIndexOffset: 300
        }).addTo(map);
      } else {
        tempMarker.setLatLng([temp.lat, temp.lon]);
      }
    } else if (tempMarker) {
      tempMarker.remove();
      tempMarker = null;
    }

    const fix = S.state.gps.fix;
    if (S.state.gps.enabled && fix) {
      if (!gpsMarker) {
        gpsMarker = L.marker([fix.lat, fix.lon], {
          icon: makeDot('gps'),
          interactive: false,
          zIndexOffset: 400
        }).addTo(map);
      } else {
        gpsMarker.setLatLng([fix.lat, fix.lon]);
      }
    } else if (gpsMarker) {
      gpsMarker.remove();
      gpsMarker = null;
    }
  }

  function niceDistance(value) {
    const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1, value))));
    const n = value / pow;
    const step = n >= 5 ? 5 : n >= 2 ? 2 : 1;
    return step * pow;
  }

  function renderScale() {
    const centerY = map.getSize().y / 2;
    const maxPx = Math.min(110, Math.max(70, map.getSize().x * 0.26));
    const left = map.containerPointToLatLng([map.getSize().x / 2, centerY]);
    const right = map.containerPointToLatLng([map.getSize().x / 2 + maxPx, centerY]);
    const metersAcross = map.distance(left, right);
    if (!Number.isFinite(metersAcross) || metersAcross <= 0) return;

    const meters = niceDistance(metersAcross);
    const px = Math.max(38, Math.min(maxPx, maxPx * (meters / metersAcross)));
    const line = $('scaleLine');
    const text = $('scaleText');
    if (line) line.style.width = px + 'px';
    if (text) text.textContent = meters >= 1000
      ? ((meters / 1000) % 1 ? (meters / 1000).toFixed(1) : String(meters / 1000)) + ' km'
      : Math.round(meters) + ' m';
  }

  function refresh() {
    renderReference();
    renderButtons();
    renderMarkers();
  }

  function stopGpsWatch() {
    const id = S.state.gps.watchId;
    if (id !== null && navigator.geolocation) {
      try { navigator.geolocation.clearWatch(id); } catch {}
    }
    S.setWatchId(null);
  }

  function gpsError(error) {
    stopGpsWatch();
    S.setGpsEnabled(false);
    S.clearLiveFix();
    const message = error?.code === 1 ? 'GPS 권한 필요' : 'GPS 수신 실패';
    toast(message);
  }

  function startGpsWatch() {
    if (!navigator.geolocation) {
      toast('GPS 미지원');
      S.setGpsEnabled(false);
      return;
    }

    const id = navigator.geolocation.watchPosition(position => {
      const fix = S.setGpsFix({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude
      });

      if (S.state.gps.follow) {
        map.panTo([fix.lat, fix.lon], { animate: true });
      }
    }, gpsError, {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 15000
    });

    S.setWatchId(id);
  }

  function toggleGps() {
    if (S.state.gps.enabled) {
      stopGpsWatch();
      S.setGpsEnabled(false);
      S.clearLiveFix();
      toast('GPS OFF');
      return;
    }

    S.setGpsEnabled(true);
    startGpsWatch();
    toast('GPS ON');
  }

  function centerOnReference({ engageFollow = false } = {}) {
    const ref = S.reference();
    if (!ref) {
      toast('기준 위치 없음');
      return false;
    }
    if (engageFollow) S.setFollow(true);
    map.setView([ref.lat, ref.lon], Math.max(map.getZoom(), 15), { animate: true });
    return true;
  }

  function toggleFollow() {
    if (S.state.gps.follow) {
      S.setFollow(false);
      toast('TRACK OFF');
      return;
    }

    if (!S.state.gps.enabled) {
      centerOnReference({ engageFollow: false });
      toast('기준 위치로 이동');
      return;
    }

    if (!centerOnReference({ engageFollow: true })) {
      toast('GPS FIX 대기');
      S.setFollow(true);
    } else {
      toast('TRACK ON');
    }
  }

  function setTempAtReticle() {
    const c = map.getCenter();
    S.setTemp({ lat: c.lat, lon: c.lng });
    toast('TEMP 지정');
  }

  function moveToTemp() {
    const temp = S.state.temp;
    if (!temp) {
      toast('TEMP 없음');
      return;
    }
    if (S.state.gps.follow) S.setFollow(false);
    map.setView([temp.lat, temp.lon], Math.max(map.getZoom(), 15), { animate:false });
    toast('TEMP로 이동');
  }

  function bindTempGesture() {
    const btn = $('tempBtn');
    if (!btn) return;

    const begin = event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      tempHoldTriggered = false;
      clearTimeout(tempHoldTimer);
      tempHoldTimer = setTimeout(() => {
        tempHoldTriggered = true;
        moveToTemp();
        try { navigator.vibrate?.(18); } catch {}
      }, HOLD_MS);
    };

    const finish = () => {
      clearTimeout(tempHoldTimer);
      if (!tempHoldTriggered) setTempAtReticle();
      tempHoldTriggered = false;
    };

    const cancel = () => {
      clearTimeout(tempHoldTimer);
      tempHoldTriggered = false;
    };

    btn.addEventListener('pointerdown', begin);
    btn.addEventListener('pointerup', finish);
    btn.addEventListener('pointercancel', cancel);
    btn.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse') cancel();
    });
    btn.addEventListener('contextmenu', event => event.preventDefault());
  }

  function siteList(filter) {
    if (filter === 'secured') return Sites.getSecured();
    if (filter === 'mine') return Sites.getUserSites();
    return Sites.getRegistered();
  }

  function siteStatusLabel(site) {
    if (site?.status === 'SECURED') return '개척 완료';
    if (site?.source === 'WILD') return '미개척';
    if (site?.source === 'USER') return '내 거점';
    return '등록 거점';
  }

  function uniqueAddressParts(parts) {
    const seen = new Set();
    return parts.filter(value => {
      const clean = String(value || '').trim();
      if (!clean || clean === '대한민국' || /^\d{5}$/.test(clean) || seen.has(clean)) return false;
      seen.add(clean);
      return true;
    }).map(value => String(value).trim());
  }

  function normalizeKoreanAddress(data, fallback = '') {
    const a = data?.address || {};
    const province = a.state || a.province || a.region;
    const city = a.city || a.municipality;
    const district = a.city_district || a.borough || a.county;
    const locality = a.town || a.village || a.suburb || a.quarter || a.neighbourhood;
    const road = a.road || a.pedestrian || a.residential || a.path;
    const house = a.house_number;
    const building = a.building || a.amenity || a.shop || a.tourism;
    let parts = uniqueAddressParts([province, city, district]);
    if (road) parts = uniqueAddressParts([...parts, road, house]);
    else parts = uniqueAddressParts([...parts, locality, building]);
    if (parts.length >= 2) return parts.join(' ');
    const display = String(data?.display_name || '').split(',').map(v => v.trim())
      .filter(v => v && v !== '대한민국' && !/^\d{5}$/.test(v));
    return display.length ? display.reverse().join(' ') : fallback;
  }

  function sitesHtml(filter) {
    const registeredCount = Sites.getRegistered().length;
    const mineCount = Sites.getUserSites().length;
    const securedCount = Sites.getSecured().length;
    const list = siteList(filter);

    const rows = list.length
      ? list.map(site => {
          const secured = site.status === 'SECURED';
          return '<button class="site-row' + (secured ? ' secured' : '') + '" type="button" data-site-id="' + esc(site.id) + '">' +
            '<strong>' + esc(site.name) + '</strong>' +
            '<small>' + esc(site.cat) + ' · ' + esc(site.opCode || site.id) + '</small>' +
            '<em>' + esc(siteStatusLabel(site)) + '</em>' +
          '</button>';
        }).join('')
      : '<div class="site-empty">' + (filter === 'mine' ? '내 거점 없음' : '개척 완료 거점 없음') + '</div>';

    return '<div class="site-filter-row">' +
      '<button class="site-filter ' + (filter === 'registered' ? 'active' : '') + '" type="button" data-site-filter="registered">등록 ' + registeredCount + '</button>' +
      '<button class="site-filter ' + (filter === 'mine' ? 'active' : '') + '" type="button" data-site-filter="mine">내 거점 ' + mineCount + '</button>' +
      '<button class="site-filter ' + (filter === 'secured' ? 'active' : '') + '" type="button" data-site-filter="secured">개척 ' + securedCount + '</button>' +
      '</div><button class="site-add-btn" id="siteAddBtn" type="button">+ 거점 추가</button><div class="site-list">' + rows + '</div>';
  }

  function bindSitesPanel() {
    $('siteAddBtn')?.addEventListener('click', openSiteAdd);
    document.querySelectorAll('[data-site-filter]').forEach(btn => {
      btn.addEventListener('click', () => openSites(btn.dataset.siteFilter));
    });
    document.querySelectorAll('[data-site-id]').forEach(btn => {
      btn.addEventListener('click', () => openSiteDetail(btn.dataset.siteId));
    });
  }

  function openSites(filter = activeSiteFilter) {
    activeSiteFilter = ['registered','mine','secured'].includes(filter) ? filter : 'registered';
    openSheet('sites', { title:'거점', html:sitesHtml(activeSiteFilter) });
    bindSitesPanel();
  }

  function ensureSitePlacementBar() {
    let bar = $('sitePlacementBar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'sitePlacementBar';
    bar.className = 'site-placement-bar';
    bar.hidden = true;
    bar.innerHTML = '<div><small>거점 위치</small><strong id="sitePlacementCoord">--</strong></div>' +
      '<button type="button" id="sitePlacementCancel">취소</button>' +
      '<button class="primary" type="button" id="sitePlacementConfirm">지점 선택</button>';
    document.body.appendChild(bar);
    $('sitePlacementCancel')?.addEventListener('click', cancelSitePlacement);
    $('sitePlacementConfirm')?.addEventListener('click', confirmSitePlacement);
    return bar;
  }

  function updateSitePlacementBar() {
    const bar = ensureSitePlacementBar();
    if (!sitePlacementActive) { bar.hidden = true; return; }
    bar.hidden = false;
    const center = map.getCenter();
    const node = $('sitePlacementCoord');
    if (node) node.textContent = formatMgrs({lat:center.lat,lon:center.lng});
  }

  function beginSitePlacement(coords = null) {
    sitePlacementActive = true;
    document.body.classList.add('baseline-site-placement');
    closeSheet();
    if (coords && Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1]))) {
      map.setView([Number(coords[0]),Number(coords[1])], Math.max(map.getZoom(), 16), {animate:false});
    }
    updateSitePlacementBar();
    toast('지도를 움직여 위치 조정');
  }

  function cancelSitePlacement() {
    sitePlacementActive = false;
    document.body.classList.remove('baseline-site-placement');
    editingSiteId = null;
    updateSitePlacementBar();
    openSites('mine');
  }

  function confirmSitePlacement() {
    if (!sitePlacementActive) return;
    const center = map.getCenter();
    sitePlacementActive = false;
    document.body.classList.remove('baseline-site-placement');
    updateSitePlacementBar();
    openSiteForm([center.lat, center.lng], editingSiteId);
  }

  function siteAddHtml() {
    const ref = S.reference();
    const temp = S.state.temp;
    return '<div class="site-add-source">' +
      '<button type="button" data-site-add-source="MAP"><strong>지도에서 직접 선택</strong><span>현재 조준점에서 시작</span></button>' +
      '<button type="button" data-site-add-source="REF" ' + (ref ? '' : 'disabled') + '><strong>현재 기준 위치</strong><span>' + (ref ? esc(ref.type + ' · ' + formatMgrs(ref)) : '없음') + '</span></button>' +
      '<button type="button" data-site-add-source="TEMP" ' + (temp ? '' : 'disabled') + '><strong>TEMP</strong><span>' + (temp ? esc(formatMgrs(temp)) : '없음') + '</span></button>' +
      '</div>' +
      '<div class="site-add-search"><input id="siteAddAddress" type="search" autocomplete="street-address" placeholder="주소 검색 (온라인)"><button id="siteAddAddressGo" type="button">검색</button></div>' +
      '<div class="site-add-results" id="siteAddAddressResults"></div>' +
      '<div class="site-add-search"><input id="siteAddCoord" type="text" placeholder="MGRS / 37.12345, 127.12345"><button id="siteAddCoordGo" type="button">이동</button></div>' +
      '<p class="sheet-note">입력한 위치는 바로 저장되지 않습니다. 지도 이동 후 조준점으로 확인하고 ‘지점 선택’을 눌러야 등록됩니다.</p>';
  }

  function openSiteAdd() {
    editingSiteId = null;
    openSheet('sites', {title:'거점 추가', html:siteAddHtml()});
    document.querySelectorAll('[data-site-add-source]').forEach(btn => btn.addEventListener('click', () => {
      const source = btn.dataset.siteAddSource;
      if (source === 'MAP') beginSitePlacement();
      if (source === 'REF') {
        const ref = S.reference();
        if (ref) beginSitePlacement([ref.lat,ref.lon]);
      }
      if (source === 'TEMP' && S.state.temp) beginSitePlacement([S.state.temp.lat,S.state.temp.lon]);
    }));
    $('siteAddCoordGo')?.addEventListener('click', () => {
      const parsed = parseDirectLocation($('siteAddCoord')?.value);
      if (!parsed) return toast('좌표 확인 필요');
      beginSitePlacement([parsed.lat,parsed.lon]);
    });
    const searchAddress = async () => {
      const input = $('siteAddAddress');
      const results = $('siteAddAddressResults');
      const query = String(input?.value || '').trim();
      if (!query) return input?.focus();
      if (!navigator.onLine) {
        results.innerHTML = '<div class="site-add-empty">OFFLINE · 주소 검색은 네트워크가 필요합니다.</div>';
        return;
      }
      const token = ++sitePlacementAddressToken;
      results.innerHTML = '<div class="site-add-empty">SEARCHING...</div>';
      try {
        const res = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=6&addressdetails=1&accept-language=ko&q=' + encodeURIComponent(query), {headers:{Accept:'application/json'}});
        if (!res.ok) throw new Error('search failed');
        const data = await res.json();
        if (token !== sitePlacementAddressToken) return;
        if (!Array.isArray(data) || !data.length) {
          results.innerHTML = '<div class="site-add-empty">검색 결과 없음</div>';
          return;
        }
        results.innerHTML = data.map((row,index) => {
          const lat = Number(row.lat), lon = Number(row.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
          const address = normalizeKoreanAddress(row,row.display_name || query);
          return '<button type="button" data-site-address-result="' + index + '"><strong>' + esc(address || query) + '</strong><span>' + lat.toFixed(5) + ', ' + lon.toFixed(5) + '</span></button>';
        }).join('');
        results.querySelectorAll('[data-site-address-result]').forEach(btn => btn.addEventListener('click', () => {
          const row = data[Number(btn.dataset.siteAddressResult)];
          const lat = Number(row?.lat), lon = Number(row?.lon);
          if (Number.isFinite(lat) && Number.isFinite(lon)) beginSitePlacement([lat,lon]);
        }));
      } catch {
        if (token === sitePlacementAddressToken) results.innerHTML = '<div class="site-add-empty">주소 검색 실패</div>';
      }
    };
    $('siteAddAddressGo')?.addEventListener('click', searchAddress);
    $('siteAddAddress')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); searchAddress(); }
    });
  }

  function openSiteForm(coords, id = null) {
    const existing = id ? Sites.find(id) : null;
    const html = '<div class="site-form">' +
      '<div class="site-form-position"><span>MGRS</span><strong>' + esc(formatMgrs({lat:coords[0],lon:coords[1]})) + '</strong><span>WGS84</span><strong>' + Number(coords[0]).toFixed(5) + ', ' + Number(coords[1]).toFixed(5) + '</strong></div>' +
      '<label><span>거점명</span><input id="siteFormName" maxlength="80" value="' + esc(existing?.name || '') + '" placeholder="거점 이름"></label>' +
      '<label><span>분류</span><input id="siteFormCat" maxlength="40" value="' + esc(existing?.cat || '사용자 거점') + '" placeholder="분류"></label>' +
      '<label><span>메모</span><textarea id="siteFormMemo" maxlength="800" placeholder="메모">' + esc(existing?.desc || '') + '</textarea></label>' +
      '<div class="site-form-actions"><button type="button" id="siteFormRelocate">위치 다시 지정</button><button class="primary" type="button" id="siteFormSave">저장</button></div>' +
      '</div>';
    openSheet('sites', {title:existing ? '거점 수정' : '거점 등록', html});
    $('siteFormRelocate')?.addEventListener('click', () => {
      editingSiteId = existing?.id || null;
      beginSitePlacement(coords);
    });
    $('siteFormSave')?.addEventListener('click', () => {
      const name = String($('siteFormName')?.value || '').trim();
      if (!name) return toast('거점명 필요');
      const patch = {
        name,
        cat:String($('siteFormCat')?.value || '사용자 거점').trim() || '사용자 거점',
        coords:[Number(coords[0]),Number(coords[1])],
        desc:String($('siteFormMemo')?.value || '').trim()
      };
      let saved = null;
      if (existing) saved = Sites.updateUserSite(existing.id, patch);
      else saved = Sites.addUserSite({
        ...patch,
        opCode:'USER-' + Date.now().toString(36).toUpperCase(),
        status:'UNEXPLORED',
        source:'USER'
      });
      editingSiteId = null;
      if (!saved) return toast('거점 저장 실패');
      toast(existing ? '거점 수정' : '거점 저장');
      openSiteDetail(saved.id);
    });
  }

  function openSiteDetail(id) {
    const site = Sites.find(id);
    if (!site) {
      toast('거점 정보 없음');
      return;
    }

    const secured = site.status === 'SECURED';
    const editable = site.source === 'USER' || site.source === 'WILD';
    const html =
      '<div class="site-detail">' +
        '<div class="site-detail-head">' +
          '<small>' + esc(site.cat) + ' · ' + esc(site.opCode || site.id) + '</small>' +
          '<strong>' + esc(site.name) + '</strong>' +
        '</div>' +
        '<div class="site-detail-grid">' +
          '<span>상태</span><strong>' + esc(siteStatusLabel(site)) + '</strong>' +
          '<span>MGRS</span><strong>' + esc(siteMgrs(site)) + '</strong>' +
          '<span>WGS84</span><strong>' + Number(site.coords[0]).toFixed(5) + ', ' + Number(site.coords[1]).toFixed(5) + '</strong>' +
        '</div>' +
        '<div class="site-copy"><b>정보</b><br>' + esc(site.desc || '정보 없음') + '</div>' +
        '<div class="site-copy"><b>참고</b><br>' + esc(site.tips || '참고 없음') + '</div>' +
        '<div class="site-actions">' +
          '<button type="button" id="siteMapGo">지도에서 보기</button>' +
          '<button class="primary" type="button" id="siteDestinationSet">목적지 설정</button>' +
          '<button type="button" id="siteSecureToggle">' + (secured ? '미개척으로' : '개척 완료') + '</button>' +
          (editable ? '<button type="button" id="siteEditBtn">수정</button><button class="danger" type="button" id="siteDeleteBtn">삭제</button>' : '') +
        '</div>' +
      '</div>';

    openSheet('sites', { title:'거점 정보', html });

    $('siteMapGo')?.addEventListener('click', () => {
      map.setView(site.coords, Math.max(map.getZoom(), 15), { animate:true });
      closeSheet();
      toast('거점으로 이동');
    });

    $('siteDestinationSet')?.addEventListener('click', () => {
      const ok = window.BaselineNavigationUI?.setDestinationFromSite?.(site);
      if (!ok) toast('목적지 설정 실패');
    });

    $('siteEditBtn')?.addEventListener('click', () => {
      editingSiteId = site.id;
      openSiteForm(site.coords, site.id);
    });

    $('siteDeleteBtn')?.addEventListener('click', () => {
      if (!confirm('이 거점을 삭제할까요?')) return;
      if (Sites.removeUserSite(site.id)) {
        toast('거점 삭제');
        openSites('mine');
      }
    });

    $('siteSecureToggle')?.addEventListener('click', () => {
      if (secured) {
        Sites.unsecure(site.id);
        toast('개척 상태 해제');
      } else {
        Sites.secure(site.id);
        toast('개척 완료');
      }
      openSiteDetail(site.id);
    });
  }

  function referenceCoords() {
    const ref = S.reference();
    return ref ? [Number(ref.lat), Number(ref.lon)] : null;
  }

  function exploreReferenceText() {
    const ref = S.reference();
    if (!ref) return '기준 위치 없음';
    return String(ref.type) + ' · ' + formatMgrs(ref);
  }

  function clearExploreCircle() {
    if (exploreCircle) {
      exploreCircle.remove();
      exploreCircle = null;
    }
  }

  function renderExploreCircle() {
    clearExploreCircle();
    if (exploreRadius === 'all') return;
    const coords = referenceCoords();
    if (!coords) return;
    exploreCircle = L.circle(coords, {
      radius:Number(exploreRadius) * 1000,
      interactive:false,
      color:'#9de3a4',
      weight:1,
      opacity:.72,
      fillColor:'#22ff66',
      fillOpacity:.025,
      dashArray:'7 7'
    }).addTo(map);
  }

  function exploreHtml() {
    const ref = S.reference();
    const refText = ref ? exploreReferenceText() : '기준 위치 없음 · 범위 탐색은 GPS/TEMP/LAST 필요';
    const rangeButtons = Explore.RADII.map(value => {
      const key = String(value);
      const label = value === 'all' ? 'ALL' : value + ' KM';
      return '<button type="button" data-explore-radius="' + key + '" class="' + (String(exploreRadius) === key ? 'active' : '') + '">' + label + '</button>';
    }).join('');

    return '<div class="explore-ref"><small>탐색 기준</small><strong id="exploreRefText">' + esc(refText) + '</strong></div>' +
      '<div class="explore-range">' + rangeButtons + '</div>' +
      '<div class="explore-actions">' +
        '<button type="button" id="exploreRegisteredBtn">등록 거점<span>아직 개척하지 않은 등록 거점 중 무작위 선택</span></button>' +
        '<button type="button" id="exploreWildBtn">미개척 좌표<span>새 탐색 좌표를 생성하고 내 거점에 저장</span></button>' +
      '</div>' +
      '<div class="explore-foot">범위 지정 시 현재 기준 위치를 중심으로 탐색합니다. ALL은 등록 전체 또는 기존 전국 산악 탐색 권역을 사용합니다.</div>';
  }

  function updateExploreReference() {
    const node = $('exploreRefText');
    if (node) {
      const ref = S.reference();
      node.textContent = ref ? exploreReferenceText() : '기준 위치 없음 · 범위 탐색은 GPS/TEMP/LAST 필요';
    }
    renderExploreCircle();
  }

  function bindExplorePanel() {
    document.querySelectorAll('[data-explore-radius]').forEach(btn => {
      btn.addEventListener('click', () => {
        const raw = btn.dataset.exploreRadius;
        exploreRadius = raw === 'all' ? 'all' : Number(raw);
        openExplore();
      });
    });

    $('exploreRegisteredBtn')?.addEventListener('click', () => {
      const ref = referenceCoords();
      if (exploreRadius !== 'all' && !ref) {
        toast('범위 탐색 기준 위치 없음');
        return;
      }

      const available = Sites.getRegistered().filter(site => site.status !== 'SECURED');
      const picked = Explore.randomRegistered(available, exploreRadius, ref);
      if (!picked) {
        toast('범위 내 미개척 등록 거점 없음');
        return;
      }
      openSiteDetail(picked.id);
    });

    $('exploreWildBtn')?.addEventListener('click', () => {
      const ref = referenceCoords();
      if (exploreRadius !== 'all' && !ref) {
        toast('범위 탐색 기준 위치 없음');
        return;
      }

      const wild = Explore.randomWild(exploreRadius, ref);
      if (!wild) {
        toast('탐색 좌표 생성 실패');
        return;
      }
      const saved = Sites.addUserSite(wild);
      if (!saved) {
        toast('미개척 좌표 저장 실패');
        return;
      }
      openSiteDetail(saved.id);
      toast('미개척 좌표 생성 · 저장');
    });
  }

  function openExplore() {
    openSheet('explore', { title:'탐색', html:exploreHtml() });
    bindExplorePanel();
    renderExploreCircle();
  }

  const panels = {
    plans: {
      title: '계획',
      html: '<div class="sheet-grid">' +
        '<button class="sheet-action" type="button" disabled><strong>새 계획</strong><span>출발 · 경유 · 도착 · 드로잉을 하나의 항법 화면에서 구성</span></button>' +
        '<button class="sheet-action" type="button" disabled><strong>저장된 계획</strong><span>계획 이름으로 저장하고 열기/공유 가능하게 재구축 예정</span></button>' +
        '</div>'
    },
    records: {
      title: '기록',
      html: '<div class="sheet-grid">' +
        '<button class="sheet-action" type="button" disabled><strong>항법 세션</strong><span>시작 · 일시정지 · LAP · 종료 로그</span></button>' +
        '<p class="sheet-note">기존 TRACK/REUSE/BACKTRACK은 BASELINE에서 제거됨.</p>' +
        '</div>'
    },
    settings: {
      title: '설정',
      html: '<p class="sheet-note">설정 로딩 중...</p>'
    }
  };

  function setActiveNav(panel) {
    document.querySelectorAll('.bottom-nav button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.panel === panel);
    });
  }

  function openSheet(panel, custom) {
    if (sitePlacementActive) {
      sitePlacementActive = false;
      document.body.classList.remove('baseline-site-placement');
      editingSiteId = null;
      updateSitePlacementBar();
    }
    if (panel !== 'explore') clearExploreCircle();
    const spec = custom || panels[panel];
    if (!spec) return;
    $('sheetTitle').textContent = spec.title;
    $('sheetBody').innerHTML = spec.html;
    $('sheet').hidden = false;
    S.setPanel(panel);
    setActiveNav(panel);
  }

  function closeSheet() {
    if (S.state.activePanel === 'explore') clearExploreCircle();
    $('sheet').hidden = true;
    S.setPanel(null);
    setActiveNav(null);
  }

  function parseDirectLocation(raw) {
    const text = String(raw || '').trim();
    const latlon = text.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (latlon) {
      const lat = Number(latlon[1]);
      const lon = Number(latlon[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon, kind: 'WGS84' };
    }

    try {
      if (window.mgrs?.toPoint) {
        const point = window.mgrs.toPoint(text.toUpperCase().replace(/\s+/g, ''));
        if (Array.isArray(point) && point.length >= 2) {
          return { lat: Number(point[1]), lon: Number(point[0]), kind: 'MGRS' };
        }
      }
    } catch {}

    return null;
  }

  function settingsHtml() {
    const lite = window.BaselineLiteMap?.status?.() || {requested:'auto',effective:'online',packStatus:'UNKNOWN',packCompleted:0,packTotal:0,packFailed:0,dataReady:false};
    const modeButton=(mode,label) => '<button type="button" data-map-mode="' + mode + '" class="' + (lite.requested===mode?'active':'') + '">' + label + '</button>';
    const packLabel = lite.packStatus === 'READY'
      ? '전국 상세 지형 준비 완료'
      : lite.packStatus === 'PREPARING'
        ? '상세 지형 준비 중 ' + lite.packCompleted + '/' + lite.packTotal
        : lite.packStatus === 'PARTIAL'
          ? '상세 지형 일부 실패 · 다시 준비'
          : lite.packStatus === 'CORE_READY'
            ? '기본 지형 준비됨 · 상세 지형 받기'
            : lite.packStatus === 'CORE_PREPARING'
              ? '기본 지형 자동 준비 중 ' + lite.packCompleted + '/' + lite.packTotal
              : lite.packStatus === 'CORE_PARTIAL'
                ? '기본 지형 일부 실패 · 다시 준비'
                : '전국 상세 지형 준비';
    return '<div class="settings-section">' +
      '<small>지도</small>' +
      '<div class="map-mode-options">' +
        modeButton('auto','자동') + modeButton('online','온라인') + modeButton('lite','경량') +
      '</div>' +
      '<div class="map-mode-readout">현재 · ' + esc(String(lite.effective).toUpperCase()) + '</div>' +
      '<button class="lite-pack-btn" id="litePackBtn" type="button" ' + (['PREPARING','CORE_PREPARING'].includes(lite.packStatus)?'disabled':'') + '>' + esc(packLabel) + '</button>' +
      '<p class="sheet-note">AUTO는 온라인 → 이미 본 지도 캐시 → 경량지도 순서로 전환합니다. 경량지도는 실제 OSM 선형 데이터와 DEM 지형을 사용합니다.</p>' +
      '<p class="sheet-note">저배율 전국 지형은 온라인 사용 중 자동 준비됩니다. 출발 전 ‘상세 지형 준비’를 완료하면 확대 시에도 더 선명한 지형을 오프라인에서 유지합니다.</p>' +
      '<p class="sheet-note">디스플레이 테마는 NVG-G로 고정. 테마 선택은 전체 배치 확정 뒤 추가.</p>' +
    '</div>';
  }

  function openSettings() {
    openSheet('settings',{title:'설정',html:settingsHtml()});
    document.querySelectorAll('[data-map-mode]').forEach(btn => btn.addEventListener('click',() => {
      window.BaselineLiteMap?.setMode?.(btn.dataset.mapMode);
      openSettings();
    }));
    $('litePackBtn')?.addEventListener('click',() => {
      if (!navigator.onLine) {
        toast('온라인 상태에서 준비 필요');
        return;
      }
      window.BaselineLiteMap?.prepareLitePack?.();
      openSettings();
    });
  }

  function openSearch() {
    openSheet('search', {
      title: '검색',
      html: '<div class="search-row">' +
        '<input id="baselineSearchInput" type="search" autocomplete="off" placeholder="MGRS / 37.12345, 127.12345">' +
        '<button id="baselineSearchGo" type="button">이동</button>' +
        '</div><p class="sheet-note">초기모델은 좌표 이동부터 제공. 주소/장소 검색은 검색 모듈에서 별도로 재구축.</p>'
    });

    const input = $('baselineSearchInput');
    const run = () => {
      const result = parseDirectLocation(input?.value);
      if (!result) {
        toast('좌표 확인 필요');
        return;
      }
      map.setView([result.lat, result.lon], 16, { animate: true });
      closeSheet();
      toast(result.kind + ' 이동');
    };
    $('baselineSearchGo')?.addEventListener('click', run);
    input?.addEventListener('keydown', event => {
      if (event.key === 'Enter') run();
    });
    setTimeout(() => input?.focus(), 0);
  }

  $('searchBtn')?.addEventListener('click', openSearch);
  $('settingsBtn')?.addEventListener('click', openSettings);
  $('gpsBtn')?.addEventListener('click', toggleGps);
  $('followBtn')?.addEventListener('click', toggleFollow);
  $('sheetClose')?.addEventListener('click', closeSheet);

  document.querySelectorAll('.bottom-nav button[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      if (!panel) return;
      if (S.state.activePanel === panel && !$('sheet').hidden) {
        closeSheet();
        return;
      }
      if (panel === 'sites') openSites();
      else if (panel === 'explore') openExplore();
      else if (panel === 'plans' && window.BaselineNavigationUI) window.BaselineNavigationUI.openPlans();
      else if (panel === 'records' && window.BaselineNavigationUI) window.BaselineNavigationUI.openRecords();
      else openSheet(panel);
    });
  });

  bindTempGesture();

  map.on('move zoom resize', () => {
    renderScale();
    if (sitePlacementActive) updateSitePlacementBar();
  });
  map.on('dragstart', () => {
    if (S.state.gps.follow) {
      S.setFollow(false);
      toast('TRACK OFF');
    }
  });

  window.addEventListener('baseline-state-change', () => {
    refresh();
    if (S.state.activePanel === 'explore' && !$('sheet').hidden) updateExploreReference();
  });
  window.addEventListener('baseline-sites-change', () => {
    renderSiteMarkers();
    if (S.state.activePanel === 'sites' && !$('sheet').hidden && $('sheetTitle')?.textContent === '거점') {
      openSites(activeSiteFilter);
    }
  });
  window.addEventListener('baseline-offline-change', () => {
    if (S.state.activePanel === 'settings' && !$('sheet').hidden) openSettings();
  });
  window.addEventListener('baseline-map-mode-change', () => {
    if (S.state.activePanel === 'settings' && !$('sheet').hidden) openSettings();
  });

  window.addEventListener('pageshow', () => {
    setTimeout(() => {
      map.invalidateSize();
      renderScale();
      refresh();
    }, 0);
  });

  window.BaselineApp = Object.freeze({
    version: 'R0.1-BASELINE',
    map,
    topoLayer,
    roadBoostLayer,
    siteLayer,
    refresh,
    setTempAtReticle,
    moveToTemp,
    centerOnReference,
    openSheet,
    closeSheet,
    openSites,
    openExplore,
    openSiteAdd,
    openSettings,
    toast,
    formatMgrs
  });

  renderSiteMarkers();
  renderScale();
  refresh();
})();
