(() => {
  'use strict';

  const S = window.BaselineState;
  if (!S || !window.L) {
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

  const map = L.map('map', {
    center: DEFAULT_CENTER,
    zoom: 12,
    zoomControl: false,
    attributionControl: true,
    preferCanvas: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

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
    follow?.setAttribute('aria-pressed', String(S.state.gps.follow));
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

  const panels = {
    sites: {
      title: '거점',
      html: '<div class="sheet-grid">' +
        '<button class="sheet-action" type="button" disabled><strong>등록 거점</strong><span>BASELINE에서 새 데이터 흐름으로 재구축 예정</span></button>' +
        '<button class="sheet-action" type="button" disabled><strong>내 거점</strong><span>직접 추가한 거점과 개척 완료 거점</span></button>' +
        '</div>'
    },
    explore: {
      title: '탐색',
      html: '<div class="sheet-grid">' +
        '<button class="sheet-action" type="button" disabled><strong>등록 거점 탐색</strong><span>범위 안에서 무작위 거점 선택</span></button>' +
        '<button class="sheet-action" type="button" disabled><strong>미개척 좌표</strong><span>새 무작위 좌표 생성</span></button>' +
        '</div>'
    },
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
    const spec = custom || panels[panel];
    if (!spec) return;
    $('sheetTitle').textContent = spec.title;
    $('sheetBody').innerHTML = spec.html;
    $('sheet').hidden = false;
    S.setPanel(panel);
    setActiveNav(panel);
  }

  function closeSheet() {
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
      if (S.state.activePanel === panel && !$('sheet').hidden) closeSheet();
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

  window.addEventListener('baseline-state-change', refresh);
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
    refresh,
    setTempAtReticle,
    moveToTemp,
    centerOnReference,
    openSheet,
    closeSheet
  });

  renderScale();
  refresh();
})();
