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
    map.setView([temp.lat, temp.lon], Math.max(map.getZoom(), 15), { animate: true });
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
      '</div><div class="site-list">' + rows + '</div>';
  }

  function bindSitesPanel() {
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

  function openSiteDetail(id) {
    const site = Sites.find(id);
    if (!site) {
      toast('거점 정보 없음');
      return;
    }

    const secured = site.status === 'SECURED';
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
          '<button class="primary" type="button" id="siteSecureToggle">' + (secured ? '미개척으로' : '개척 완료') + '</button>' +
        '</div>' +
      '</div>';

    openSheet('sites', { title:'거점 정보', html });

    $('siteMapGo')?.addEventListener('click', () => {
      map.setView(site.coords, Math.max(map.getZoom(), 15), { animate:true });
      closeSheet();
      toast('거점으로 이동');
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
      html: '<p class="sheet-note">테마 기능은 배치가 확정될 때까지 중단. BASELINE에서는 지도/좌표/운용 설정만 새 구조로 추가할 예정.</p>'
    }
  };

  function setActiveNav(panel) {
    document.querySelectorAll('.bottom-nav button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.panel === panel);
    });
  }

  function openSheet(panel, custom) {
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
  $('settingsBtn')?.addEventListener('click', () => openSheet('settings'));
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
      else openSheet(panel);
    });
  });

  bindTempGesture();

  map.on('move zoom resize', renderScale);
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
    openExplore
  });

  renderSiteMarkers();
  renderScale();
  refresh();
})();
