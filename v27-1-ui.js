(() => {
  const V271 = {
    history: [],
    drawMode: false,
    searchToken: 0,
    drawSnapshot: null,
    initialized: false
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function button(label, id, handler, extraClass = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `osb-btn v271-bar-btn ${extraClass}`.trim();
    if (id) btn.id = id;
    btn.textContent = label;
    btn.addEventListener('click', handler);
    return btn;
  }

  function showToast(text) {
    let toast = $('#v271Toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'v271Toast';
      toast.className = 'v271-toast';
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 1200);
  }

  function snapshotPlan() {
    return {
      route: cloneRouteSegments(routeDraftSegments),
      overlay: cloneRouteSegments(routeMarkSegments),
      vias: cloneRouteViaPoints(routeViaPoints),
      start: cloneRouteEndpoint(routeStartPoint),
      end: cloneRouteEndpoint(routeEndPoint),
      dirty: Boolean(routeDirty)
    };
  }

  function planSnapshotKey(s) {
    return JSON.stringify([s.route, s.overlay, s.vias, s.start, s.end]);
  }

  function pushHistory(snapshot) {
    if (!snapshot) return;
    const current = snapshotPlan();
    if (planSnapshotKey(snapshot) === planSnapshotKey(current)) return;
    V271.history.push(snapshot);
    if (V271.history.length > 50) V271.history.shift();
    syncUi();
  }

  function restoreSnapshot(snapshot) {
    if (!snapshot) return;
    routeDraftSegments = cloneRouteSegments(snapshot.route);
    routeMarkSegments = cloneRouteSegments(snapshot.overlay);
    routeViaPoints = cloneRouteViaPoints(snapshot.vias);
    routeStartPoint = cloneRouteEndpoint(snapshot.start);
    routeEndPoint = cloneRouteEndpoint(snapshot.end);
    routeDirty = Boolean(snapshot.dirty);
    if (routeCurrentPolyline) cancelCurrentRouteStroke();
    renderRouteDraft();
    closePointCard();
    syncUi();
  }

  function undoPlanEdit() {
    if (!targetModeActive || targetModePhase !== 'PLAN' || !V271.history.length) return;
    restoreSnapshot(V271.history.pop());
  }

  function moveMapTo(coords, zoom = 15) {
    if (!validCoordinates(coords)) return;
    map.setView(coords, Math.max(map.getZoom(), zoom), { animate:false });
    flushReticleTelemetry();
  }

  function gotoGps() {
    if (!gpsPowerEnabled || !hasGpsFix) return;
    moveMapTo([baseLocation[0], baseLocation[1]], 13);
  }

  function buildGpsControls() {
    const wrap = document.createElement('div');
    wrap.id = 'v271GpsControls';
    wrap.className = 'v271-gps-controls';

    const power = button('GPS', 'v271GpsPower', () => toggleGpsPower(), 'v271-gps-btn');
    power.title = 'GPS ON / OFF';
    power.setAttribute('aria-label', 'GPS ON/OFF');

    const locate = button('◎', 'v271GpsLocate', gotoGps, 'v271-gps-btn v271-gps-locate');
    locate.title = 'GPS 위치로 이동';
    locate.setAttribute('aria-label', 'GPS 위치로 이동');

    wrap.append(power, locate);
    document.body.appendChild(wrap);
  }

  function buildModeBars() {
    const bottom = $('.mfd-bottom-bar');
    if (!bottom) return;

    const plan = document.createElement('div');
    plan.id = 'v271PlanBar';
    plan.className = 'v271-mode-actions';
    plan.append(
      button('SEARCH', 'v271SearchBtn', openPlanSearch),
      button('SET', 'v271SetBtn', openSetSheet),
      button('DRAW', 'v271DrawBtn', enterDrawMode),
      button('UNDO', 'v271UndoBtn', undoPlanEdit),
      button('EXIT', 'v271PlanExitBtn', () => exitTargetMode())
    );

    const draw = document.createElement('div');
    draw.id = 'v271DrawBar';
    draw.className = 'v271-mode-actions';
    draw.append(
      button('ROUTE', 'v271DrawKindBtn', toggleV271DrawKind),
      button('UNDO', 'v271DrawUndoBtn', undoPlanEdit),
      button('CLEAR', 'v271DrawClearBtn', clearCurrentDrawing),
      button('DONE', 'v271DrawDoneBtn', leaveDrawMode)
    );

    const nav = document.createElement('div');
    nav.id = 'v271NavBar';
    nav.className = 'v271-mode-actions';
    nav.append(
      button('FOLLOW', 'v271FollowBtn', () => toggleGpsFollow()),
      button('NEXT LEG', 'v271NextLegBtn', () => nextNavLeg()),
      button('TRACK', 'v271TrackBtn', () => toggleTrackRecording()),
      button('BACKTRACK', 'v271BacktrackBtn', () => toggleBacktrack()),
      button('STOP', 'v271NavStopBtn', stopNavigation, 'v271-stop-btn')
    );

    bottom.append(plan, draw, nav);
  }

  function buildPlanHint() {
    const head = $('.target-mode-head');
    if (!head || $('#v271PlanStartHint')) return;
    const hint = document.createElement('div');
    hint.id = 'v271PlanStartHint';
    hint.className = 'v271-plan-start-hint';
    hint.textContent = '탭하여 시작';
    head.insertAdjacentElement('afterend', hint);
    head.classList.add('v271-plan-entry');
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    const enter = () => {
      if (!targetModeActive || targetModePhase !== 'PLAN' || V271.drawMode) return;
      if (!getReferencePosition()?.coords) return;
      startTargetNavigation();
    };
    head.addEventListener('click', enter);
    head.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); }
    });
  }

  function buildCompactNavActions() {
    const hud = $('#navRidingHud');
    if (!hud || $('#v271CompactNavActions')) return;
    const actions = document.createElement('div');
    actions.id = 'v271CompactNavActions';
    actions.className = 'v271-nav-compact-actions';
    actions.append(
      button('NEXT LEG', 'v271CompactNextBtn', () => nextNavLeg()),
      button('STOP', 'v271CompactStopBtn', stopNavigation, 'v271-stop-btn')
    );
    hud.appendChild(actions);
  }

  function stopNavigation() {
    if (!targetModeActive || targetModePhase !== 'NAV') return;
    const total = navStartedAt ? Date.now() - navStartedAt : 0;
    const leg = navLegStartedAt ? Date.now() - navLegStartedAt : 0;
    if (navLegStartedAt) navLegTimes[navLegIndex] = leg;
    if (trackRecording || pendingTrackStart) stopTrackRecording(true, false);
    returnToTargetPlan();
    showToast(`NAV STOP · TOTAL ${formatElapsed(total)}`);
  }

  function enterDrawMode() {
    if (!targetModeActive || targetModePhase !== 'PLAN') return;
    V271.drawMode = true;
    if (!['ROUTE', 'MARK'].includes(routeDrawKind)) routeDrawKind = 'ROUTE';
    setMapRouteDrawInteraction(true);
    syncUi();
  }

  function leaveDrawMode() {
    V271.drawMode = false;
    setMapRouteDrawInteraction(false);
    syncUi();
  }

  function toggleV271DrawKind() {
    if (!V271.drawMode) return;
    routeDrawKind = routeDrawKind === 'MARK' ? 'ROUTE' : 'MARK';
    if (routeCurrentPolyline) cancelCurrentRouteStroke();
    updateTargetModePanel();
    syncUi();
  }

  function clearCurrentDrawing() {
    if (!targetModeActive || targetModePhase !== 'PLAN') return;
    const isOverlay = routeDrawKind === 'MARK';
    const bucket = isOverlay ? routeMarkSegments : routeDraftSegments;
    if (!bucket.length) return;
    const label = isOverlay ? 'OVERLAY' : 'ROUTE';
    if (!confirm(`${label} 선을 모두 지우시겠습니까?`)) return;
    const before = snapshotPlan();
    if (isOverlay) routeMarkSegments = [];
    else routeDraftSegments = [];
    routeDirty = true;
    renderRouteDraft();
    pushHistory(before);
  }

  function makeSheet(id, title) {
    let backdrop = document.getElementById(id);
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.id = id;
    backdrop.className = 'v271-sheet-backdrop';
    backdrop.innerHTML = `
      <section class="v271-sheet" role="dialog" aria-modal="true">
        <div class="v271-sheet-head">
          <strong>${title}</strong>
          <button type="button" class="v271-sheet-close" aria-label="닫기">×</button>
        </div>
        <div class="v271-sheet-body"></div>
      </section>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeSheet(backdrop); });
    $('.v271-sheet-close', backdrop).addEventListener('click', () => closeSheet(backdrop));
    return backdrop;
  }

  function openSheet(sheet) {
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
  }

  function closeSheet(sheet) {
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
  }

  function closeAllSheets() {
    $$('.v271-sheet-backdrop.open').forEach(closeSheet);
  }

  function quickMoveButton(label, coords, disabled = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'v271-quick-btn';
    btn.textContent = label;
    btn.disabled = disabled || !validCoordinates(coords);
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      moveMapTo(coords, 15);
      closeAllSheets();
    });
    return btn;
  }

  function renderSearchQuick(body) {
    const home = getHomePoint();
    const quickTitle = document.createElement('div');
    quickTitle.className = 'v271-sheet-label';
    quickTitle.textContent = 'QUICK';
    const quick = document.createElement('div');
    quick.className = 'v271-quick-grid';
    quick.append(
      quickMoveButton('HOME', home?.coords, !home?.coords),
      quickMoveButton('TEMP POS', tempMarkPoint?.coords, !tempMarkPoint?.coords)
    );

    const planTitle = document.createElement('div');
    planTitle.className = 'v271-sheet-label';
    planTitle.textContent = 'PLAN POINTS';
    const planList = document.createElement('div');
    planList.className = 'v271-plan-point-list';
    planList.append(
      quickMoveButton('START', routeStartPoint?.coords, !routeStartPoint?.coords),
      quickMoveButton('END', routeEndPoint?.coords, !routeEndPoint?.coords)
    );
    if (routeViaPoints.length) {
      routeViaPoints.forEach((via, index) => {
        planList.append(quickMoveButton(`VIA ${String(index + 1).padStart(2, '0')} · ${via.name || 'VIA'}`, via.coords));
      });
    } else {
      const empty = document.createElement('div');
      empty.className = 'v271-empty-row';
      empty.textContent = 'VIA 없음';
      planList.appendChild(empty);
    }
    body.append(quickTitle, quick, planTitle, planList);
  }

  function openPlanSearch() {
    if (!targetModeActive || targetModePhase !== 'PLAN' || V271.drawMode) return;
    const sheet = makeSheet('v271SearchSheet', 'SEARCH');
    const body = $('.v271-sheet-body', sheet);
    body.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'v271-search-row';
    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'promo-input v271-search-input';
    input.placeholder = '주소 / WGS84 / MGRS';
    input.autocomplete = 'off';
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'osb-btn active';
    go.textContent = 'SEARCH';
    row.append(input, go);

    const results = document.createElement('div');
    results.className = 'address-search-results v271-search-results';
    results.innerHTML = '<div class="address-search-empty">주소·좌표·MGRS를 입력하십시오.</div>';
    body.append(row, results);
    renderSearchQuick(body);

    const run = () => performPlanSearch(input.value, results, go);
    go.addEventListener('click', run);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
    openSheet(sheet);
    setTimeout(() => input.focus(), 60);
  }

  function appendSearchResult(results, result, title) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'address-search-item';
    const name = document.createElement('span');
    name.className = 'address-search-name';
    name.textContent = title || result.name || 'POSITION';
    const coords = document.createElement('span');
    coords.className = 'address-search-coords';
    coords.textContent = `${result.lat.toFixed(5)}, ${result.lon.toFixed(5)} · ${calcMGRS(result.lat, result.lon)}`;
    item.append(name, coords);
    item.addEventListener('click', () => {
      moveMapTo([result.lat, result.lon], 16);
      closeAllSheets();
    });
    results.appendChild(item);
  }

  async function performPlanSearch(query, results, buttonEl) {
    const q = String(query || '').trim();
    if (!q) return;
    const token = ++V271.searchToken;
    results.innerHTML = '<div class="address-search-empty">SEARCHING...</div>';
    buttonEl.disabled = true;
    try {
      const direct = parseDirectRouteLocation(q);
      if (direct) {
        results.innerHTML = '';
        appendSearchResult(results, direct, `${direct.source} COORDINATE`);
        return;
      }
      if (!navigator.onLine) {
        results.innerHTML = '<div class="address-search-empty">OFFLINE · 주소 검색은 사용할 수 없습니다. WGS84 또는 MGRS를 입력하십시오.</div>';
        return;
      }
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=6&addressdetails=1&accept-language=ko&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers:{ Accept:'application/json' } });
      if (!res.ok) throw new Error('search failed');
      const data = await res.json();
      if (token !== V271.searchToken) return;
      results.innerHTML = '';
      if (!Array.isArray(data) || !data.length) {
        results.innerHTML = '<div class="address-search-empty">검색 결과가 없습니다.</div>';
        return;
      }
      data.forEach(row => {
        const lat = Number(row.lat), lon = Number(row.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        const address = normalizeKoreanAddress(row, row.display_name || q);
        appendSearchResult(results, { lat, lon, name:address }, address);
      });
    } catch (e) {
      if (token !== V271.searchToken) return;
      results.innerHTML = '<div class="address-search-empty">검색에 실패했습니다. 네트워크 또는 좌표 형식을 확인하십시오.</div>';
    } finally {
      if (token === V271.searchToken) buttonEl.disabled = false;
    }
  }

  function openSetSheet() {
    if (!targetModeActive || targetModePhase !== 'PLAN' || V271.drawMode) return;
    const sheet = makeSheet('v271SetSheet', 'SET @ RETICLE');
    const body = $('.v271-sheet-body', sheet);
    const c = map.getCenter();
    body.innerHTML = `
      <div class="v271-set-readout">
        <div><span>WGS84</span><strong>${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}</strong></div>
        <div><span>MGRS</span><strong>${calcMGRS(c.lat, c.lng)}</strong></div>
      </div>
      <div class="v271-set-grid"></div>`;
    const grid = $('.v271-set-grid', body);
    ['START', 'VIA', 'END'].forEach(role => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'osb-btn';
      btn.textContent = role;
      btn.addEventListener('click', () => {
        const center = map.getCenter();
        const name = role === 'VIA' ? `VIA ${routeViaPoints.length + 1}` : role;
        if (assignPlanPoint(role, { name, coords:[center.lat, center.lng], source:'RETICLE' })) {
          closeSheet(sheet);
        }
      });
      grid.appendChild(btn);
    });
    openSheet(sheet);
  }

  function closePointCard() {
    const card = $('#v271PointCard');
    if (card) card.remove();
  }

  function openPointCard(role, point, index = -1) {
    if (!point?.coords || targetModePhase !== 'PLAN' || routeDrawEnabled) return;
    closePointCard();
    const card = document.createElement('div');
    card.id = 'v271PointCard';
    card.className = 'v271-point-card';
    const label = role === 'VIA' ? `VIA ${String(index + 1).padStart(2, '0')}` : role;
    card.innerHTML = `
      <div class="v271-point-card-head"><strong>${label}</strong><button type="button" class="v271-card-close">×</button></div>
      <div class="v271-point-card-name"></div>
      <div class="v271-point-card-row"><span>WGS84</span><b>${point.coords[0].toFixed(6)}, ${point.coords[1].toFixed(6)}</b></div>
      <div class="v271-point-card-row"><span>MGRS</span><b>${calcMGRS(point.coords[0], point.coords[1])}</b></div>
      <div class="v271-point-card-actions"><button type="button" class="osb-btn v271-copy-point">COPY</button><button type="button" class="osb-btn v271-delete-point">DELETE</button></div>`;
    $('.v271-point-card-name', card).textContent = point.name || label;
    $('.v271-card-close', card).addEventListener('click', closePointCard);
    $('.v271-copy-point', card).addEventListener('click', async () => {
      const text = `WGS84 ${point.coords[0].toFixed(6)}, ${point.coords[1].toFixed(6)}\nMGRS ${calcMGRS(point.coords[0], point.coords[1])}`;
      if (await writeClipboardText(text)) showToast('COPIED');
    });
    $('.v271-delete-point', card).addEventListener('click', () => {
      if (!confirm(`${label} 포인트를 삭제하시겠습니까?`)) return;
      if (role === 'START') clearRouteStart();
      else if (role === 'END') clearRouteEnd();
      else if (role === 'VIA') removeRouteViaPoint(point.id);
      closePointCard();
    });
    document.body.appendChild(card);
  }

  function wirePlanPointMarkers() {
    const baseRenderEndpoints = renderRouteEndpoints;
    renderRouteEndpoints = function() {
      baseRenderEndpoints();
      if (routeStartMarker) {
        routeStartMarker.off('click');
        routeStartMarker.on('click', e => {
          if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
          openPointCard('START', routeStartPoint);
        });
      }
      if (routeEndMarker) {
        routeEndMarker.off('click');
        routeEndMarker.on('click', e => {
          if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
          openPointCard('END', routeEndPoint);
        });
      }
    };

    renderRouteViaPoints = function() {
      if (!routeViaLayer) return;
      routeViaLayer.clearLayers();
      if (!targetModeActive) return;
      routeViaPoints.forEach((via, index) => {
        const marker = L.marker(via.coords, { icon:routeViaIcon(via), keyboard:false, riseOnHover:true }).addTo(routeViaLayer);
        marker.on('click', e => {
          if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
          openPointCard('VIA', via, index);
        });
      });
    };
  }

  function wireHistory() {
    const baseAssign = assignPlanPoint;
    assignPlanPoint = function(role, point) {
      const before = snapshotPlan();
      const ok = baseAssign(role, point);
      if (ok) pushHistory(before);
      return ok;
    };

    const baseRemoveVia = removeRouteViaPoint;
    removeRouteViaPoint = function(id) {
      if (!routeViaPoints.some(v => String(v.id) === String(id))) return;
      const before = snapshotPlan();
      baseRemoveVia(id);
      pushHistory(before);
    };

    const baseClearStart = clearRouteStart;
    clearRouteStart = function() {
      if (!routeStartPoint) return;
      const before = snapshotPlan();
      baseClearStart();
      pushHistory(before);
    };

    const baseClearEnd = clearRouteEnd;
    clearRouteEnd = function() {
      if (!routeEndPoint) return;
      const before = snapshotPlan();
      baseClearEnd();
      pushHistory(before);
    };

    routeMapContainer.addEventListener('pointerdown', event => {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !routeDrawEnabled) return;
      if (event.pointerType === 'touch' && routeActivePointers.size >= 2) {
        V271.drawSnapshot = null;
        return;
      }
      if (routePointerId === event.pointerId) V271.drawSnapshot = snapshotPlan();
    }, { passive:true });

    routeMapContainer.addEventListener('pointerup', () => {
      if (!V271.drawSnapshot) return;
      const before = V271.drawSnapshot;
      V271.drawSnapshot = null;
      pushHistory(before);
    }, { passive:true });

    routeMapContainer.addEventListener('pointercancel', () => { V271.drawSnapshot = null; }, { passive:true });
  }

  function improveDrawGesture() {
    let gestureStartZoom = 0;
    let gestureStartDistance = 0;

    const baseBeginTwoFinger = beginTwoFingerRouteGesture;
    beginTwoFingerRouteGesture = function() {
      baseBeginTwoFinger();
      gestureStartZoom = map.getZoom();
      gestureStartDistance = routeGestureLastDistance || 1;
    };

    const oldMove = handleRoutePointerMove;
    routeMapContainer.removeEventListener('pointermove', oldMove, false);
    handleRoutePointerMove = function(event) {
      if (!targetModeActive || !routeDrawEnabled || !routeActivePointers.has(event.pointerId)) return;
      const point = routeContainerPoint(event);
      routeActivePointers.set(event.pointerId, point);
      event.preventDefault();

      if (routeGestureMode) {
        const pair = routeGesturePair();
        if (!pair) return;
        const metrics = routeGestureMetrics(pair);
        if (routeGestureLastCenter) {
          const dx = metrics.center.x - routeGestureLastCenter.x;
          const dy = metrics.center.y - routeGestureLastCenter.y;
          if (Math.abs(dx) + Math.abs(dy) > 0.25) map.panBy([-dx, -dy], { animate:false, noMoveStart:true });
        }
        if (gestureStartDistance > 0 && metrics.distance > 0) {
          const ratio = metrics.distance / gestureStartDistance;
          const desired = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), gestureStartZoom + Math.log2(ratio)));
          if (Math.abs(desired - map.getZoom()) > 0.025) {
            const previousSnap = map.options.zoomSnap;
            map.options.zoomSnap = 0;
            map.setZoomAround(metrics.center, desired, { animate:false });
            map.options.zoomSnap = previousSnap;
          }
        }
        routeGestureLastCenter = metrics.center;
        routeGestureLastDistance = metrics.distance;
        return;
      }

      if (routePointerId !== event.pointerId || !routeCurrentSegment) return;
      const latlng = map.containerPointToLatLng(point);
      const next = [latlng.lat, latlng.lng];
      const prev = routeCurrentSegment[routeCurrentSegment.length - 1];
      const prevPx = map.latLngToContainerPoint(prev);
      if (prevPx.distanceTo(point) < 5) return;
      routeCurrentSegment.push(next);
      routeCurrentPolyline?.setLatLngs(routeCurrentSegment);
    };
    routeMapContainer.addEventListener('pointermove', handleRoutePointerMove, { passive:false });
  }

  function wireMapDismiss() {
    map.on('click', e => {
      const target = e.originalEvent?.target;
      if (target?.closest?.('.leaflet-marker-icon')) return;
      closePointCard();
      const sitrep = $('#sitrepPanel');
      if (sitrep && getComputedStyle(sitrep).display !== 'none') closeSitrep();
    });
  }

  function wireClipboardToast() {
    const baseCopy = copyPointCoordinate;
    copyPointCoordinate = async function(id) {
      await baseCopy(id);
      const el = document.getElementById(id);
      const feedback = el?.parentElement?.querySelector('.coord-copy-feedback');
      if (feedback?.textContent === 'COPIED') showToast('COPIED');
    };
  }

  function syncGlobalDisabled() {
    const ref = getReferencePosition?.();
    const home = getHomePoint?.();
    const gpsReady = Boolean(gpsPowerEnabled && hasGpsFix);

    const center = $('#primaryCenterBtn');
    if (center) center.disabled = !ref?.coords;

    $$('[data-radius]').forEach(btn => {
      if (btn.dataset.radius !== 'all') btn.disabled = !gpsReady;
    });

    $$('[onclick*="centerHome()"], [onclick*="clearHomePoint()"]')
      .forEach(btn => { btn.disabled = !home?.coords; });
    $$('[onclick*="clearTempMark()"]')
      .forEach(btn => { btn.disabled = !tempMarkPoint?.coords; });
    $$('[onclick*="quickOfflineMark()"]')
      .forEach(btn => { btn.disabled = !ref?.coords; });
    $$('[onclick*="copyFieldPosition()"]')
      .forEach(btn => { btn.disabled = !ref?.coords; });
  }

  function syncGpsUi() {
    const power = $('#v271GpsPower');
    const locate = $('#v271GpsLocate');
    if (power) {
      power.classList.toggle('active', gpsPowerEnabled);
      power.classList.toggle('waiting', gpsPowerEnabled && !hasGpsFix);
      power.setAttribute('aria-pressed', String(gpsPowerEnabled));
      power.title = gpsPowerEnabled ? `GPS ${gpsLockState}` : 'GPS OFF';
    }
    if (locate) {
      locate.disabled = !(gpsPowerEnabled && hasGpsFix);
      locate.classList.toggle('active', gpsPowerEnabled && hasGpsFix);
    }
  }

  function syncUi() {
    if (!V271.initialized) return;
    const active = Boolean(targetModeActive);
    const isPlan = active && targetModePhase === 'PLAN';
    const isNav = active && targetModePhase === 'NAV';
    if (!isPlan) V271.drawMode = false;
    if (V271.drawMode && !routeDrawEnabled) V271.drawMode = false;

    document.body.classList.toggle('v271-target-layout', active);
    document.body.classList.toggle('v271-draw-mode', isPlan && V271.drawMode);

    const planBar = $('#v271PlanBar');
    const drawBar = $('#v271DrawBar');
    const navBar = $('#v271NavBar');
    if (planBar) planBar.hidden = !(isPlan && !V271.drawMode);
    if (drawBar) drawBar.hidden = !(isPlan && V271.drawMode);
    if (navBar) navBar.hidden = !isNav || navPanelCollapsed;

    const hint = $('#v271PlanStartHint');
    const head = $('.target-mode-head');
    const canStart = Boolean(isPlan && targetModeTarget?.coords && getReferencePosition()?.coords);
    if (hint) hint.textContent = canStart ? '탭하여 시작' : 'GPS FIX 또는 TEMP POS 필요';
    if (head) {
      head.classList.toggle('disabled', isPlan && !canStart);
      head.setAttribute('aria-disabled', String(isPlan && !canStart));
    }

    const undoDisabled = !isPlan || !V271.history.length;
    ['v271UndoBtn', 'v271DrawUndoBtn'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = undoDisabled; });

    const kind = $('#v271DrawKindBtn');
    if (kind) {
      kind.textContent = routeDrawKind === 'MARK' ? 'OVERLAY' : 'ROUTE';
      kind.classList.toggle('active', routeDrawKind === 'MARK');
    }
    const clear = $('#v271DrawClearBtn');
    if (clear) clear.disabled = routeDrawKind === 'MARK' ? !routeMarkSegments.length : !routeDraftSegments.length;

    const gpsReady = Boolean(gpsPowerEnabled && hasGpsFix);
    const nextDisabled = !routeEndPoint || navLegIndex >= 1 || backtrackActive;
    ['v271NextLegBtn', 'v271CompactNextBtn'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = nextDisabled; });

    const follow = $('#v271FollowBtn');
    if (follow) {
      follow.disabled = !gpsReady;
      follow.textContent = gpsFollowEnabled ? 'FOLLOW ON' : 'FOLLOW';
      follow.classList.toggle('active', gpsFollowEnabled);
    }

    const track = $('#v271TrackBtn');
    if (track) {
      track.disabled = !(trackRecording || pendingTrackStart || gpsReady);
      track.textContent = pendingTrackStart ? 'TRACK WAIT' : (trackRecording ? 'TRACK STOP' : 'TRACK');
      track.classList.toggle('active', trackRecording || pendingTrackStart);
    }

    const back = $('#v271BacktrackBtn');
    if (back) {
      back.disabled = !backtrackActive && trackLogPoints.length < 2;
      back.classList.toggle('active', backtrackActive);
    }

    syncGpsUi();
    syncGlobalDisabled();
  }

  function patchCoreFunctions() {
    const baseUpdate = updateTargetModePanel;
    updateTargetModePanel = function() {
      baseUpdate();
      syncUi();
    };

    const baseRefreshGps = refreshGpsPowerUi;
    refreshGpsPowerUi = function() {
      baseRefreshGps();
      syncGpsUi();
      syncGlobalDisabled();
    };

    toggleGpsPower = function() {
      if (gpsPowerEnabled) stopGpsTracking();
      else startGpsTracking(false);
    };

    const baseSetDraw = setMapRouteDrawInteraction;
    setMapRouteDrawInteraction = function(enabled) {
      baseSetDraw(enabled);
      if (!routeDrawEnabled) V271.drawMode = false;
      syncUi();
    };

    const baseEnterTarget = enterTargetMode;
    enterTargetMode = function(target) {
      V271.history = [];
      V271.drawMode = false;
      closePointCard();
      closeAllSheets();
      return baseEnterTarget(target);
    };

    const baseExitTarget = exitTargetMode;
    exitTargetMode = function(force = false) {
      const result = baseExitTarget(force);
      if (!targetModeActive) {
        V271.history = [];
        V271.drawMode = false;
        closePointCard();
        closeAllSheets();
      }
      syncUi();
      return result;
    };
  }

  function init() {
    if (V271.initialized || typeof map === 'undefined') return;
    buildGpsControls();
    buildModeBars();
    buildPlanHint();
    buildCompactNavActions();
    patchCoreFunctions();
    wirePlanPointMarkers();
    wireHistory();
    improveDrawGesture();
    wireMapDismiss();
    wireClipboardToast();

    const oldGps = $('#gpsPowerBtn');
    if (oldGps) oldGps.setAttribute('aria-hidden', 'true');

    V271.initialized = true;
    renderRouteDraft();
    syncUi();
    updateMapScale();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
