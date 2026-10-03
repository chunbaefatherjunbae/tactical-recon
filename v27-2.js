/* Tactical Recon V27.2 stabilization overlay
   Keeps V27.1 storage formats intact. */
(() => {
  'use strict';

  document.title = 'TACTICAL RECON // FIELD TERMINAL V27.2';
  document.body?.classList.add('v272');

  const CENTER_TOLERANCE_PX = 18;
  const NEXT_LEG_HOLD_MS = 700;

  let lastGpsReference = null;
  let tempReferenceOverride = false;
  let navPaused = false;
  let navPauseStartedAt = 0;
  let navTotalPausedMs = 0;
  let navLegPausedMs = 0;
  let navPausedTotalElapsed = 0;
  let navPausedLegElapsed = 0;
  let navPausedHud = null;
  let navLegRevertState = null;
  let centerSyncFrame = 0;
  let lastGpsMarkerV272 = null;

  function validPoint(coords) {
    return Array.isArray(coords) && coords.length >= 2 &&
      Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1])) &&
      Math.abs(Number(coords[0])) <= 90 && Math.abs(Number(coords[1])) <= 180;
  }

  function clonePoint(coords) {
    return validPoint(coords) ? [Number(coords[0]), Number(coords[1])] : null;
  }

  function lastGpsSnapshotFromPosition(pos) {
    const lat = Number(pos?.coords?.latitude);
    const lon = Number(pos?.coords?.longitude);
    if (!validPoint([lat, lon])) return;
    lastGpsReference = {
      type: 'LAST_GPS',
      coords: [lat, lon],
      capturedAt: Number(pos?.timestamp) || Date.now()
    };
  }

  function lastGpsMarkerIcon() {
    return L.divIcon({
      className:'last-gps-hitbox',
      iconSize:[42,42],
      iconAnchor:[21,21],
      html:`<div class="last-gps-visual">${gpsMarkerSvg()}<span>LAST GPS</span></div>`
    });
  }

  function syncLastGpsMarker() {
    const shouldShow = Boolean(lastGpsReference?.coords && !(gpsPowerEnabled && hasGpsFix));
    if (!shouldShow) {
      if (lastGpsMarkerV272 && map.hasLayer(lastGpsMarkerV272)) map.removeLayer(lastGpsMarkerV272);
      return;
    }
    if (!lastGpsMarkerV272) {
      lastGpsMarkerV272 = L.marker(lastGpsReference.coords, {
        icon:lastGpsMarkerIcon(), keyboard:false, interactive:false, zIndexOffset:82
      });
    } else {
      lastGpsMarkerV272.setLatLng(lastGpsReference.coords);
    }
    if (!map.hasLayer(lastGpsMarkerV272)) lastGpsMarkerV272.addTo(map);
  }

  const v272BaseApplyGpsPosition = applyGpsPosition;
  applyGpsPosition = function(pos, shouldRecenter = false, session = gpsSessionId) {
    const result = v272BaseApplyGpsPosition(pos, shouldRecenter, session);
    if (gpsPowerEnabled && hasGpsFix) {
      lastGpsSnapshotFromPosition(pos);
      tempReferenceOverride = false;
    }
    syncLastGpsMarker();
    scheduleCenterControlSync();
    return result;
  };

  const v272BaseStopGpsTracking = stopGpsTracking;
  stopGpsTracking = function() {
    if (hasGpsFix && validPoint(baseLocation)) {
      lastGpsReference = { type:'LAST_GPS', coords:[...baseLocation], capturedAt:Date.now() };
    } else if (latestGpsPosition) {
      lastGpsSnapshotFromPosition(latestGpsPosition);
    }
    tempReferenceOverride = false;
    const result = v272BaseStopGpsTracking();
    scheduleCenterControlSync();
    return result;
  };

  const v272BaseSetTempMark = setTempMark;
  setTempMark = function(coords, name = 'TEMP POS') {
    const result = v272BaseSetTempMark(coords, name);
    if (!gpsPowerEnabled || !hasGpsFix) {
      tempReferenceOverride = true;
      // Base setTempMark refreshes once before this V27.2 override flag is applied.
      // Refresh again so NAV distance/BRG immediately switch from LAST GPS to TEMP.
      refreshPositionState();
    }
    syncTempButtonState();
    scheduleCenterControlSync();
    return result;
  };

  const v272BaseClearTempMark = clearTempMark;
  clearTempMark = function() {
    tempReferenceOverride = false;
    const result = v272BaseClearTempMark();
    syncTempButtonState();
    scheduleCenterControlSync();
    return result;
  };

  referenceLabel = function(type) {
    if (type === 'TEMP') return 'TEMP POS';
    if (type === 'LAST_GPS') return 'LAST GPS';
    return type || 'NONE';
  };

  getReferencePosition = function() {
    if (gpsPowerEnabled && hasGpsFix && validPoint(baseLocation)) {
      return { type:'GPS', coords:[baseLocation[0], baseLocation[1]] };
    }
    if (tempReferenceOverride && tempMarkPoint?.coords) {
      return { type:'TEMP', coords:[...tempMarkPoint.coords] };
    }
    if (lastGpsReference?.coords) {
      return { type:'LAST_GPS', coords:[...lastGpsReference.coords] };
    }
    if (tempMarkPoint?.coords) {
      return { type:'TEMP', coords:[...tempMarkPoint.coords] };
    }
    return null;
  };

  const v272BaseRefreshPositionState = refreshPositionState;
  refreshPositionState = function() {
    const result = v272BaseRefreshPositionState();
    syncLastGpsMarker();
    scheduleCenterControlSync();
    return result;
  };

  function ensureGlobalTempButton() {
    const controls = document.getElementById('globalGpsControls');
    if (!controls) return null;
    let btn = document.getElementById('tempQuickBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'global-gps-button global-temp-button';
      btn.id = 'tempQuickBtn';
      btn.type = 'button';
      btn.textContent = 'TEMP';
      btn.title = '현재 조준점에 TEMP POS 지정/갱신';
      btn.setAttribute('aria-label', '현재 조준점에 TEMP POS 지정');
      btn.addEventListener('click', () => {
        const c = map.getCenter();
        setTempMark([c.lat, c.lng]);
        showV271Toast?.('TEMP SET');
        syncTempButtonState();
        scheduleCenterControlSync();
      });
      controls.appendChild(btn);
    }
    return btn;
  }

  function syncTempButtonState() {
    const btn = ensureGlobalTempButton();
    if (!btn) return;
    btn.disabled = false;
    btn.classList.toggle('active', Boolean(tempMarkPoint?.coords));
    btn.setAttribute('aria-pressed', String(Boolean(tempMarkPoint?.coords)));
  }

  function removeLegacyTempMenuButton() {
    const menu = document.getElementById('control-menu');
    if (!menu) return;
    menu.querySelectorAll('button').forEach(btn => {
      if (String(btn.getAttribute('onclick') || '').includes('setTempMarkAtReticle')) btn.remove();
    });
  }

  function referenceIsCentered(ref = getReferencePosition()) {
    if (!ref?.coords || !map) return false;
    try {
      const p = map.latLngToContainerPoint(ref.coords);
      const size = map.getSize();
      const center = L.point(size.x / 2, size.y / 2);
      return p.distanceTo(center) <= CENTER_TOLERANCE_PX;
    } catch (e) {
      return false;
    }
  }

  function centerIconMarkup(following) {
    if (following) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" class="gps-center-core"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><path d="M7 7c1.4-1.4 3-2 5-2 3.9 0 7 3.1 7 7"/><path d="M17 5v4h-4"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5" class="gps-center-core"/></svg>';
  }

  function syncCenterControl() {
    const btn = document.getElementById('gpsCenterBtn');
    if (!btn) return;
    const ref = getReferencePosition();
    const gpsReady = Boolean(gpsPowerEnabled && hasGpsFix && ref?.type === 'GPS');
    const centered = Boolean(ref?.coords && referenceIsCentered(ref));
    const following = Boolean(gpsFollowEnabled && gpsReady);

    btn.disabled = !ref?.coords;
    btn.classList.toggle('active', following || centered);
    btn.classList.toggle('following', following);
    btn.setAttribute('aria-pressed', String(following));
    btn.innerHTML = centerIconMarkup(following);

    if (following) {
      btn.title = 'FOLLOW ON · 탭하여 FOLLOW 해제';
      btn.setAttribute('aria-label', 'GPS FOLLOW 해제');
    } else if (gpsReady && centered) {
      btn.title = 'CENTERED · 다시 탭하여 FOLLOW 시작';
      btn.setAttribute('aria-label', 'GPS FOLLOW 시작');
    } else {
      btn.title = `RECENTER${ref?.type ? ` · ${referenceLabel(ref.type)}` : ''}`;
      btn.setAttribute('aria-label', '현재 기준 위치로 리센터');
    }
  }

  function scheduleCenterControlSync() {
    cancelAnimationFrame(centerSyncFrame);
    centerSyncFrame = requestAnimationFrame(syncCenterControl);
  }

  centerGpsNow = function() {
    const ref = getReferencePosition();
    if (!ref?.coords) return;

    if (gpsFollowEnabled) {
      setGpsFollow(false, false);
      scheduleCenterControlSync();
      return;
    }

    const centered = referenceIsCentered(ref);
    if (ref.type === 'GPS' && gpsPowerEnabled && hasGpsFix && centered) {
      setGpsFollow(true, false);
      scheduleCenterControlSync();
      return;
    }

    if (gpsFollowEnabled) setGpsFollow(false, false);
    map.setView(ref.coords, Math.max(map.getZoom(), ref.type === 'GPS' ? 13 : 14), { animate:false });
    flushReticleTelemetry();
    scheduleCenterControlSync();
  };

  const v272BaseSetGpsFollow = setGpsFollow;
  setGpsFollow = function(enabled, recenter = false) {
    const result = v272BaseSetGpsFollow(enabled, recenter);
    scheduleCenterControlSync();
    return result;
  };

  function breakFollowForManualMapMove() {
    if (!gpsFollowEnabled) return;
    setGpsFollow(false, false);
  }

  map.on('moveend zoomend', scheduleCenterControlSync);
  map.on('dragstart', () => {
    breakFollowForManualMapMove();
    scheduleCenterControlSync();
  });

  function routePointHitIcon(kind, label) {
    const cls = kind === 'START' ? 'route-start-marker' : 'route-end-marker';
    return L.divIcon({
      className:'route-point-hitbox',
      iconSize:[46,46],
      iconAnchor:[23,23],
      html:`<div class="route-point-visual ${cls}"><span class="v26-map-label">${label}</span></div>`
    });
  }

  routeViaIcon = function(via) {
    const safeName = String(via?.name || 'VIA').replace(/[<>&"']/g, '');
    return L.divIcon({
      className:'route-point-hitbox route-via-hitbox',
      iconSize:[46,46],
      iconAnchor:[23,23],
      html:`<div class="route-via-visual"><div class="route-via-icon" aria-label="${safeName}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 L20 18 H4 Z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg><span class="route-via-label">${safeName}</span></div></div>`
    });
  };

  renderRouteEndpoints = function() {
    if (routeStartMarker && map.hasLayer(routeStartMarker)) map.removeLayer(routeStartMarker);
    if (routeEndMarker && map.hasLayer(routeEndMarker)) map.removeLayer(routeEndMarker);
    routeStartMarker = routeEndMarker = null;
    if (!targetModeActive) return;
    if (routeStartPoint) {
      routeStartMarker = L.marker(routeStartPoint.coords,{icon:routePointHitIcon('START','START'),keyboard:false,zIndexOffset:48}).addTo(map);
      routeStartMarker.on('click', e => openPlanPointInfo('START', null, e));
    }
    if (routeEndPoint) {
      routeEndMarker = L.marker(routeEndPoint.coords,{icon:routePointHitIcon('END','END'),keyboard:false,zIndexOffset:48}).addTo(map);
      routeEndMarker.on('click', e => openPlanPointInfo('END', null, e));
    }
  };

  renderRouteViaPoints = function() {
    if (!routeViaLayer) return;
    routeViaLayer.clearLayers();
    if (!targetModeActive) return;
    routeViaPoints.forEach(via => {
      const marker = L.marker(via.coords,{icon:routeViaIcon(via),keyboard:false,riseOnHover:true}).addTo(routeViaLayer);
      marker.on('click', e => openPlanPointInfo('VIA', via.id, e));
    });
  };

  function allowSearchInCurrentMode() {
    return Boolean(targetModeActive && (targetModePhase === 'PLAN' || targetModePhase === 'NAV'));
  }

  openPlanSearch = function() {
    if (!allowSearchInCurrentMode()) return;
    if (targetModePhase === 'PLAN') {
      setMapRouteDrawInteraction(false);
      planUiSubmode = 'MAIN';
    }
    closePlanPointInfo();
    closeNavMore();
    planSearchToken++;
    planSearchOpen = true;
    const input = document.getElementById('planSearchInput');
    const results = document.getElementById('planSearchResults');
    const button = document.getElementById('planSearchGoBtn');
    if (input) input.value = '';
    if (results) results.innerHTML = '<div class="address-search-empty">주소·좌표·MGRS를 입력하십시오.</div>';
    if (button) button.disabled = false;
    renderPlanSearchPoints();
    setV271Sheet('planSearchSheet', true);
    updateTargetModePanel();
    setTimeout(() => input?.focus(), 80);
  };

  movePlanMapTo = function(coords, zoom = 15) {
    if (!validPoint(coords)) return;
    if (targetModePhase === 'NAV') breakFollowForManualMapMove();
    closePlanSearch();
    map.setView(coords, Math.max(map.getZoom(), zoom), {animate:false});
    flushReticleTelemetry();
    scheduleCenterControlSync();
  };

  searchPlanLocation = async function() {
    if (!allowSearchInCurrentMode()) return;
    const input = document.getElementById('planSearchInput');
    const results = document.getElementById('planSearchResults');
    const button = document.getElementById('planSearchGoBtn');
    const query = input?.value.trim();
    if (!query || !results) { input?.focus(); return; }
    const token = ++planSearchToken;
    results.innerHTML = '<div class="address-search-empty">SEARCHING...</div>';
    if (button) button.disabled = true;
    try {
      const direct = parseDirectRouteLocation(query);
      if (direct) {
        if (token !== planSearchToken) return;
        results.textContent = '';
        appendPlanSearchResult(direct, `${direct.source} COORDINATE`, `${direct.lat.toFixed(6)}, ${direct.lon.toFixed(6)} · ${calcMGRS(direct.lat,direct.lon)}`);
        return;
      }
      if (!navigator.onLine) {
        results.innerHTML = '<div class="address-search-empty">OFFLINE · 주소 검색은 사용할 수 없습니다. WGS84 또는 MGRS를 입력하십시오.</div>';
        return;
      }
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=6&addressdetails=1&accept-language=ko&q=${encodeURIComponent(query)}`;
      const res = await fetch(url,{headers:{Accept:'application/json'}});
      if (!res.ok) throw new Error('search failed');
      const data = await res.json();
      if (token !== planSearchToken) return;
      results.textContent = '';
      if (!Array.isArray(data) || !data.length) {
        results.innerHTML = '<div class="address-search-empty">검색 결과가 없습니다.</div>';
        return;
      }
      data.forEach(row => {
        const lat=Number(row.lat), lon=Number(row.lon);
        if (!Number.isFinite(lat)||!Number.isFinite(lon)) return;
        const address=normalizeKoreanAddress(row,row.display_name||query);
        appendPlanSearchResult({lat,lon}, address || row.display_name || query, `${lat.toFixed(5)}, ${lon.toFixed(5)} · ${calcMGRS(lat,lon)}`);
      });
    } catch (e) {
      if (token !== planSearchToken) return;
      results.innerHTML = '<div class="address-search-empty">위치 검색에 실패했습니다.</div>';
    } finally {
      if (button && token === planSearchToken) button.disabled = false;
    }
  };

  function captureNavHud() {
    return {
      distance:document.getElementById('navHudDistance')?.textContent || '--.-',
      unit:document.getElementById('navHudUnit')?.textContent || 'KM',
      bearing:document.getElementById('navHudBearing')?.textContent || 'BRG ---°',
      ref:document.getElementById('navHudRef')?.textContent || 'REF --',
      target:document.getElementById('navHudTarget')?.textContent || 'NO TARGET',
      leg:document.getElementById('navHudLeg')?.textContent || '',
      distanceLabel:document.getElementById('navHudDistanceLabel')?.textContent || ''
    };
  }

  function applyPausedHud() {
    if (!navPaused || !navPausedHud) return;
    const put=(id,value)=>{ const el=document.getElementById(id); if(el) el.textContent=value; };
    put('navHudDistance',navPausedHud.distance);
    put('navHudUnit',navPausedHud.unit);
    put('navHudBearing',navPausedHud.bearing);
    put('navHudRef',navPausedHud.ref);
    put('navHudTarget',navPausedHud.target);
    put('navHudLeg',navPausedHud.leg);
    put('navHudDistanceLabel',navPausedHud.distanceLabel);
  }

  function navElapsedValues(now = Date.now()) {
    if (!navStartedAt) return { total:0, leg:0 };
    if (navPaused) return { total:navPausedTotalElapsed, leg:navPausedLegElapsed };
    return {
      total:Math.max(0, now - navStartedAt - navTotalPausedMs),
      leg:Math.max(0, now - navLegStartedAt - navLegPausedMs)
    };
  }

  function syncPauseButton() {
    const btn = document.getElementById('navPauseBtn');
    if (!btn) return;
    btn.textContent = navPaused ? 'RESUME' : 'PAUSE';
    btn.classList.toggle('active', navPaused);
    btn.setAttribute('aria-pressed', String(navPaused));
  }

  function resetNavPauseState() {
    navPaused = false;
    navPauseStartedAt = 0;
    navTotalPausedMs = 0;
    navLegPausedMs = 0;
    navPausedTotalElapsed = 0;
    navPausedLegElapsed = 0;
    navPausedHud = null;
    syncPauseButton();
  }

  function toggleNavPause() {
    if (!targetModeActive || targetModePhase !== 'NAV') return;
    const now = Date.now();
    if (!navPaused) {
      const elapsed = navElapsedValues(now);
      navPaused = true;
      navPauseStartedAt = now;
      navPausedTotalElapsed = elapsed.total;
      navPausedLegElapsed = elapsed.leg;
      navPausedHud = captureNavHud();
    } else {
      const pausedFor = Math.max(0, now - navPauseStartedAt);
      navTotalPausedMs += pausedFor;
      navLegPausedMs += pausedFor;
      navPaused = false;
      navPauseStartedAt = 0;
      navPausedHud = null;
    }
    syncPauseButton();
    updateTargetModePanel();
  }
  window.toggleNavPause = toggleNavPause;

  function snapshotRevertState() {
    const elapsed = navElapsedValues();
    return {
      legIndex:navLegIndex,
      previousLegElapsedMs:elapsed.leg,
      navLegTimes:Array.isArray(navLegTimes) ? [...navLegTimes] : [],
      capturedAt:Date.now()
    };
  }

  function commitNextLeg() {
    if (!targetModeActive || targetModePhase !== 'NAV' || !hasNextNavLeg() || backtrackActive || navPaused) return;
    navLegRevertState = snapshotRevertState();
    const now = Date.now();
    navLegTimes[navLegIndex] = navLegRevertState.previousLegElapsedMs;
    navLegIndex += 1;
    navLegStartedAt = now;
    navLegPausedMs = 0;
    navPausedLegElapsed = 0;
    if (navPaused) {
      navPauseStartedAt = now;
      navPausedLegElapsed = 0;
      navPausedHud = null;
    }
    updateTargetModePanel();
    syncRevertAvailability();
  }

  nextNavLeg = function() { commitNextLeg(); };

  function revertLastLeg() {
    if (!targetModeActive || targetModePhase !== 'NAV' || !navLegRevertState) return;
    const state = navLegRevertState;
    navLegIndex = state.legIndex;
    navLegTimes = [...state.navLegTimes];
    const now = Date.now();
    navLegStartedAt = now - Math.max(0,state.previousLegElapsedMs);
    navLegPausedMs = 0;
    navPausedLegElapsed = state.previousLegElapsedMs;
    if (navPaused) {
      navPauseStartedAt = now;
      navPausedHud = null;
    }
    navLegRevertState = null;
    updateTargetModePanel();
    syncRevertAvailability();
  }
  window.revertLastLeg = revertLastLeg;

  function syncRevertAvailability() {
    const btn = document.getElementById('navRevertLegBtn');
    if (btn) btn.disabled = !navLegRevertState;
  }

  function bindHoldButton(btn) {
    if (!btn || btn.dataset.v272HoldBound === '1') return;
    btn.dataset.v272HoldBound = '1';
    btn.removeAttribute('onclick');
    let timer = 0;
    let fired = false;
    const cancel = () => {
      clearTimeout(timer);
      timer = 0;
      btn.classList.remove('hold-arming');
    };
    btn.addEventListener('pointerdown', event => {
      if (btn.disabled) return;
      event.preventDefault();
      fired = false;
      cancel();
      btn.classList.add('hold-arming');
      try { btn.setPointerCapture(event.pointerId); } catch (e) {}
      timer = setTimeout(() => {
        fired = true;
        btn.classList.remove('hold-arming');
        commitNextLeg();
        if (navigator.vibrate) { try { navigator.vibrate(18); } catch (e) {} }
      }, NEXT_LEG_HOLD_MS);
    });
    ['pointerup','pointercancel','pointerleave'].forEach(type => btn.addEventListener(type, event => {
      if (!fired) cancel(); else btn.classList.remove('hold-arming');
      try { btn.releasePointerCapture(event.pointerId); } catch (e) {}
    }));
    btn.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
  }

  function configureNavToolbar() {
    const toolbar = document.getElementById('targetModeToolbar');
    if (!toolbar) return;
    const navButtons = [...toolbar.querySelectorAll('.nav-only')];
    if (navButtons.length < 5) return;

    const search = navButtons[0];
    search.id = 'navSearchBtn';
    search.textContent = 'SEARCH';
    search.removeAttribute('onclick');
    search.onclick = () => openPlanSearch();

    const pause = navButtons[1];
    pause.id = 'navPauseBtn';
    pause.classList.remove('gps-follow-toggle');
    pause.removeAttribute('onclick');
    pause.onclick = () => toggleNavPause();

    const next = navButtons[2];
    next.id = 'targetNextLegBtn';
    next.textContent = 'NEXT LEG';
    next.classList.add('nav-next-hold');
    bindHoldButton(next);

    const stop = navButtons[3];
    stop.id = 'targetNavStopBtn';
    stop.textContent = 'STOP';

    const more = navButtons[4];
    more.id = 'navMoreBtn';
    more.textContent = 'MORE';

    const compactNext = document.getElementById('navCollapsedNextLegBtn');
    compactNext?.classList.add('nav-next-hold');
    bindHoldButton(compactNext);

    const moreGrid = document.querySelector('#navMoreSheet .v271-more-grid');
    if (moreGrid && !document.getElementById('navRevertLegBtn')) {
      const revert = document.createElement('button');
      revert.className = 'osb-btn';
      revert.id = 'navRevertLegBtn';
      revert.type = 'button';
      revert.textContent = 'REVERT LEG';
      revert.onclick = revertLastLeg;
      const exit = moreGrid.querySelector('.v271-delete-button');
      moreGrid.insertBefore(revert, exit || null);
    }
    syncPauseButton();
    syncRevertAvailability();
  }

  const v272BaseStartNavElapsed = startNavElapsed;
  startNavElapsed = function() {
    resetNavPauseState();
    navLegRevertState = null;
    const result = v272BaseStartNavElapsed();
    syncRevertAvailability();
    return result;
  };

  const v272BaseStopTargetNavigation = stopTargetNavigation;
  stopTargetNavigation = function() {
    const result = v272BaseStopTargetNavigation();
    resetNavPauseState();
    navLegRevertState = null;
    syncRevertAvailability();
    return result;
  };

  const v272BaseReturnToTargetPlan = returnToTargetPlan;
  returnToTargetPlan = function() {
    const result = v272BaseReturnToTargetPlan();
    resetNavPauseState();
    navLegRevertState = null;
    syncRevertAvailability();
    return result;
  };

  const v272BaseExitTargetMode = exitTargetMode;
  exitTargetMode = function(force = false) {
    const result = v272BaseExitTargetMode(force);
    if (!targetModeActive) {
      resetNavPauseState();
      navLegRevertState = null;
      syncRevertAvailability();
    }
    return result;
  };

  const v272BaseUpdateTargetModePanel = updateTargetModePanel;
  updateTargetModePanel = function() {
    v272BaseUpdateTargetModePanel();
    configureNavToolbar();

    if (targetModeActive && targetModePhase === 'NAV') {
      const elapsed = navElapsedValues();
      const el = document.getElementById('navHudElapsed');
      if (el) el.textContent = `TOTAL ${formatElapsed(elapsed.total)} · LEG ${formatElapsed(elapsed.leg)}${navPaused ? ' · PAUSED' : ''}`;
      if (navPaused) applyPausedHud();
    }

    syncPauseButton();
    syncRevertAvailability();
    syncTempButtonState();
    scheduleCenterControlSync();
  };

  const v272BaseSyncKnownActionAvailability = syncKnownActionAvailability;
  syncKnownActionAvailability = function() {
    v272BaseSyncKnownActionAvailability();
    const center = document.getElementById('gpsCenterBtn');
    if (center) center.disabled = !getReferencePosition()?.coords;
    const nextDisabled = navPaused || !hasNextNavLeg();
    const next = document.getElementById('targetNextLegBtn');
    const compact = document.getElementById('navCollapsedNextLegBtn');
    if (next) next.disabled = nextDisabled;
    if (compact) compact.disabled = nextDisabled;
    syncRevertAvailability();
    syncTempButtonState();
  };

  const v272BaseRefreshGpsPowerUi = refreshGpsPowerUi;
  refreshGpsPowerUi = function() {
    v272BaseRefreshGpsPowerUi();
    syncTempButtonState();
    scheduleCenterControlSync();
  };

  // SEARCH moved to NAV toolbar, so opening it must not be dismissed by the first toolbar click bubbling to the map.
  document.getElementById('planSearchSheet')?.addEventListener('click', event => event.stopPropagation());

  removeLegacyTempMenuButton();
  ensureGlobalTempButton();
  configureNavToolbar();
  syncTempButtonState();
  syncLastGpsMarker();
  scheduleCenterControlSync();
  updateTargetModePanel();
})();
