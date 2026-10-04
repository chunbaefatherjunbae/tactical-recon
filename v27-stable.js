/* Tactical Recon V27 stable overlay bundle.
   Execution order is intentionally identical to the former separate overlays:
   V27.2 -> V27.2.1 -> V27.3.x. Do not reorder sections without regression testing. */

/* ===== V27.2 ===== */
/* Tactical Recon V27.2 stabilization overlay */
(() => {
  'use strict';
  document.title = 'TACTICAL RECON // FIELD TERMINAL V27.2';
  document.body?.classList.add('v272');

  const CENTER_TOLERANCE_PX = 18;
  const NEXT_LEG_HOLD_MS = 700;
  let lastGpsReference = null;
  let tempReferenceOverride = false;
  let lastGpsMarkerV272 = null;
  let centerSyncFrame = 0;
  let navPaused = false;
  let navPauseStartedAt = 0;
  let navTotalPausedMs = 0;
  let navLegPausedMs = 0;
  let navPausedTotalElapsed = 0;
  let navPausedLegElapsed = 0;
  let navPausedHud = null;
  let navLegRevertState = null;

  const valid = c => Array.isArray(c) && c.length >= 2 && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])) && Math.abs(Number(c[0])) <= 90 && Math.abs(Number(c[1])) <= 180;
  const refLabel = t => t === 'TEMP' ? 'TEMP POS' : t === 'LAST_GPS' ? 'LAST GPS' : (t || 'NONE');

  function rememberGps(pos) {
    const lat = Number(pos?.coords?.latitude), lon = Number(pos?.coords?.longitude);
    if (valid([lat, lon])) lastGpsReference = { type:'LAST_GPS', coords:[lat, lon], capturedAt:Number(pos?.timestamp) || Date.now() };
  }

  function lastGpsIcon() {
    return L.divIcon({
      className:'last-gps-hitbox', iconSize:[42,42], iconAnchor:[21,21],
      html:`<div class="last-gps-visual">${gpsMarkerSvg()}<span>LAST GPS</span></div>`
    });
  }

  function syncLastGpsMarker() {
    const show = Boolean(lastGpsReference?.coords && !(gpsPowerEnabled && hasGpsFix));
    if (!show) {
      if (lastGpsMarkerV272 && map.hasLayer(lastGpsMarkerV272)) map.removeLayer(lastGpsMarkerV272);
      return;
    }
    if (!lastGpsMarkerV272) lastGpsMarkerV272 = L.marker(lastGpsReference.coords,{icon:lastGpsIcon(),keyboard:false,interactive:false,zIndexOffset:82});
    else lastGpsMarkerV272.setLatLng(lastGpsReference.coords);
    if (!map.hasLayer(lastGpsMarkerV272)) lastGpsMarkerV272.addTo(map);
  }

  const baseApplyGpsPosition = applyGpsPosition;
  applyGpsPosition = function(pos, shouldRecenter=false, session=gpsSessionId) {
    const out = baseApplyGpsPosition(pos, shouldRecenter, session);
    if (gpsPowerEnabled && hasGpsFix) { rememberGps(pos); tempReferenceOverride = false; }
    syncLastGpsMarker();
    scheduleCenterSync();
    return out;
  };

  const baseStopGpsTracking = stopGpsTracking;
  stopGpsTracking = function() {
    if (hasGpsFix && valid(baseLocation)) lastGpsReference = {type:'LAST_GPS',coords:[...baseLocation],capturedAt:Date.now()};
    else if (latestGpsPosition) rememberGps(latestGpsPosition);
    tempReferenceOverride = false;
    const out = baseStopGpsTracking();
    syncLastGpsMarker();
    scheduleCenterSync();
    return out;
  };

  const baseSetTempMark = setTempMark;
  setTempMark = function(coords, name='TEMP POS') {
    const out = baseSetTempMark(coords, name);
    if (!gpsPowerEnabled || !hasGpsFix) {
      tempReferenceOverride = true;
      refreshPositionState();
    }
    syncTempButton();
    scheduleCenterSync();
    return out;
  };

  const baseClearTempMark = clearTempMark;
  clearTempMark = function() {
    tempReferenceOverride = false;
    const out = baseClearTempMark();
    syncTempButton();
    scheduleCenterSync();
    return out;
  };

  referenceLabel = refLabel;
  getReferencePosition = function() {
    if (gpsPowerEnabled && hasGpsFix && valid(baseLocation)) return {type:'GPS',coords:[baseLocation[0],baseLocation[1]]};
    if (targetModeActive && targetModePhase === 'NAV') {
      if (tempReferenceOverride && tempMarkPoint?.coords) return {type:'TEMP',coords:[...tempMarkPoint.coords]};
      if (lastGpsReference?.coords) return {type:'LAST_GPS',coords:[...lastGpsReference.coords]};
    }
    if (tempMarkPoint?.coords) return {type:'TEMP',coords:[...tempMarkPoint.coords]};
    return null;
  };
  const centerReference = () => getReferencePosition() || (lastGpsReference?.coords ? {type:'LAST_GPS',coords:[...lastGpsReference.coords]} : null);

  const baseRefreshPositionState = refreshPositionState;
  refreshPositionState = function() {
    const out = baseRefreshPositionState();
    syncLastGpsMarker();
    scheduleCenterSync();
    return out;
  };

  function ensureTempButton() {
    const controls = document.getElementById('globalGpsControls');
    if (!controls) return null;
    let btn = document.getElementById('tempQuickBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id='tempQuickBtn'; btn.type='button'; btn.className='global-gps-button global-temp-button'; btn.textContent='TEMP';
      btn.title='현재 조준점에 TEMP POS 지정/갱신'; btn.setAttribute('aria-label','현재 조준점에 TEMP POS 지정');
      btn.addEventListener('click',()=>{ const c=map.getCenter(); setTempMark([c.lat,c.lng]); showV271Toast?.('TEMP SET'); });
      controls.appendChild(btn);
    }
    return btn;
  }
  function syncTempButton() {
    const btn=ensureTempButton(); if(!btn)return;
    btn.disabled=false; btn.classList.toggle('active',Boolean(tempMarkPoint?.coords)); btn.setAttribute('aria-pressed',String(Boolean(tempMarkPoint?.coords)));
  }
  function removeLegacyTempMenuButton() {
    document.getElementById('control-menu')?.querySelectorAll('button').forEach(btn=>{
      if(String(btn.getAttribute('onclick')||'').includes('setTempMarkAtReticle')) btn.remove();
    });
  }

  function centered(ref=centerReference()) {
    if(!ref?.coords)return false;
    try { const p=map.latLngToContainerPoint(ref.coords), s=map.getSize(), c=L.point(s.x/2,s.y/2); return p.distanceTo(c)<=CENTER_TOLERANCE_PX; }
    catch(e){ return false; }
  }
  function centerIcon(following) {
    return following
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4"/><circle cx="12" cy="12" r="2.5" class="gps-center-core"/><path d="M12 7v2M12 15v2M7 12h2M15 12h2"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5" class="gps-center-core"/></svg>';
  }
  function syncCenterControl() {
    const btn=document.getElementById('gpsCenterBtn'); if(!btn)return;
    const ref=centerReference(), gpsReady=Boolean(gpsPowerEnabled&&hasGpsFix&&ref?.type==='GPS'), isCentered=Boolean(ref?.coords&&centered(ref)), following=Boolean(gpsFollowEnabled&&gpsReady);
    btn.disabled=!ref?.coords; btn.classList.toggle('active',following||isCentered); btn.classList.toggle('following',following); btn.setAttribute('aria-pressed',String(following)); btn.innerHTML=centerIcon(following);
    if(following){btn.title='FOLLOW ON · 탭하여 FOLLOW 해제';btn.setAttribute('aria-label','GPS FOLLOW 해제');}
    else if(gpsReady&&isCentered){btn.title='CENTERED · 다시 탭하여 FOLLOW 시작';btn.setAttribute('aria-label','GPS FOLLOW 시작');}
    else{btn.title=`RECENTER${ref?.type?` · ${refLabel(ref.type)}`:''}`;btn.setAttribute('aria-label','현재 기준 위치로 리센터');}
  }
  function scheduleCenterSync(){cancelAnimationFrame(centerSyncFrame);centerSyncFrame=requestAnimationFrame(syncCenterControl);}

  centerGpsNow = function() {
    const ref=centerReference(); if(!ref?.coords)return;
    if(gpsFollowEnabled){setGpsFollow(false,false);scheduleCenterSync();return;}
    if(ref.type==='GPS'&&gpsPowerEnabled&&hasGpsFix&&centered(ref)){setGpsFollow(true,false);scheduleCenterSync();return;}
    map.setView(ref.coords,Math.max(map.getZoom(),ref.type==='GPS'?13:14),{animate:false}); flushReticleTelemetry(); scheduleCenterSync();
  };
  const baseSetGpsFollow=setGpsFollow;
  setGpsFollow=function(enabled,recenter=false){const out=baseSetGpsFollow(enabled,recenter);scheduleCenterSync();return out;};
  const breakFollow=()=>{if(gpsFollowEnabled)setGpsFollow(false,false);};
  map.on('moveend zoomend',scheduleCenterSync);
  map.on('dragstart',()=>{breakFollow();scheduleCenterSync();});

  function pointHitIcon(kind,label){
    const cls=kind==='START'?'route-start-marker':'route-end-marker';
    return L.divIcon({className:'route-point-hitbox',iconSize:[46,46],iconAnchor:[23,23],html:`<div class="route-point-visual ${cls}"><span class="v26-map-label">${label}</span></div>`});
  }
  routeViaIcon=function(via){
    const safe=String(via?.name||'VIA').replace(/[<>&"']/g,'');
    return L.divIcon({className:'route-point-hitbox route-via-hitbox',iconSize:[46,46],iconAnchor:[23,23],html:`<div class="route-via-visual"><div class="route-via-icon" aria-label="${safe}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 L20 18 H4 Z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg><span class="route-via-label">${safe}</span></div></div>`});
  };
  renderRouteEndpoints=function(){
    if(routeStartMarker&&map.hasLayer(routeStartMarker))map.removeLayer(routeStartMarker); if(routeEndMarker&&map.hasLayer(routeEndMarker))map.removeLayer(routeEndMarker); routeStartMarker=routeEndMarker=null; if(!targetModeActive)return;
    if(routeStartPoint){routeStartMarker=L.marker(routeStartPoint.coords,{icon:pointHitIcon('START','START'),keyboard:false,zIndexOffset:48}).addTo(map);routeStartMarker.on('click',e=>openPlanPointInfo('START',null,e));}
    if(routeEndPoint){routeEndMarker=L.marker(routeEndPoint.coords,{icon:pointHitIcon('END','END'),keyboard:false,zIndexOffset:48}).addTo(map);routeEndMarker.on('click',e=>openPlanPointInfo('END',null,e));}
  };

  const searchable=()=>Boolean(targetModeActive&&(targetModePhase==='PLAN'||targetModePhase==='NAV'));
  openPlanSearch=function(){
    if(!searchable())return; if(targetModePhase==='PLAN'){setMapRouteDrawInteraction(false);planUiSubmode='MAIN';}
    closePlanPointInfo();closeNavMore();planSearchToken++;planSearchOpen=true;
    const input=document.getElementById('planSearchInput'),results=document.getElementById('planSearchResults'),button=document.getElementById('planSearchGoBtn');
    if(input)input.value='';if(results)results.innerHTML='<div class="address-search-empty">주소·좌표·MGRS를 입력하십시오.</div>';if(button)button.disabled=false;
    renderPlanSearchPoints();setV271Sheet('planSearchSheet',true);updateTargetModePanel();setTimeout(()=>input?.focus(),80);
  };
  movePlanMapTo=function(coords,zoom=15){if(!valid(coords))return;if(targetModePhase==='NAV')breakFollow();closePlanSearch();map.setView(coords,Math.max(map.getZoom(),zoom),{animate:false});flushReticleTelemetry();scheduleCenterSync();};
  searchPlanLocation=async function(){
    if(!searchable())return;
    const input=document.getElementById('planSearchInput'),results=document.getElementById('planSearchResults'),button=document.getElementById('planSearchGoBtn'),query=input?.value.trim();
    if(!query||!results){input?.focus();return;} const token=++planSearchToken;results.innerHTML='<div class="address-search-empty">SEARCHING...</div>';if(button)button.disabled=true;
    try{
      const direct=parseDirectRouteLocation(query);if(direct){if(token!==planSearchToken)return;results.textContent='';appendPlanSearchResult(direct,`${direct.source} COORDINATE`,`${direct.lat.toFixed(6)}, ${direct.lon.toFixed(6)} · ${calcMGRS(direct.lat,direct.lon)}`);return;}
      if(!navigator.onLine){results.innerHTML='<div class="address-search-empty">OFFLINE · 주소 검색은 사용할 수 없습니다. WGS84 또는 MGRS를 입력하십시오.</div>';return;}
      const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=6&addressdetails=1&accept-language=ko&q=${encodeURIComponent(query)}`,res=await fetch(url,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error('search failed');
      const data=await res.json();if(token!==planSearchToken)return;results.textContent='';if(!Array.isArray(data)||!data.length){results.innerHTML='<div class="address-search-empty">검색 결과가 없습니다.</div>';return;}
      data.forEach(row=>{const lat=Number(row.lat),lon=Number(row.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;const address=normalizeKoreanAddress(row,row.display_name||query);appendPlanSearchResult({lat,lon},address||row.display_name||query,`${lat.toFixed(5)}, ${lon.toFixed(5)} · ${calcMGRS(lat,lon)}`);});
    }catch(e){if(token===planSearchToken)results.innerHTML='<div class="address-search-empty">위치 검색에 실패했습니다.</div>';}finally{if(button&&token===planSearchToken)button.disabled=false;}
  };

  const captureHud=()=>({distance:document.getElementById('navHudDistance')?.textContent||'--.-',unit:document.getElementById('navHudUnit')?.textContent||'KM',bearing:document.getElementById('navHudBearing')?.textContent||'BRG ---°',ref:document.getElementById('navHudRef')?.textContent||'REF --',target:document.getElementById('navHudTarget')?.textContent||'NO TARGET',leg:document.getElementById('navHudLeg')?.textContent||'',label:document.getElementById('navHudDistanceLabel')?.textContent||''});
  function applyPausedHud(){if(!navPaused||!navPausedHud)return;for(const [id,key] of [['navHudDistance','distance'],['navHudUnit','unit'],['navHudBearing','bearing'],['navHudRef','ref'],['navHudTarget','target'],['navHudLeg','leg'],['navHudDistanceLabel','label']]){const el=document.getElementById(id);if(el)el.textContent=navPausedHud[key];}}
  function elapsed(now=Date.now()){if(!navStartedAt)return{total:0,leg:0};if(navPaused)return{total:navPausedTotalElapsed,leg:navPausedLegElapsed};return{total:Math.max(0,now-navStartedAt-navTotalPausedMs),leg:Math.max(0,now-navLegStartedAt-navLegPausedMs)};}
  function syncPauseButton(){const b=document.getElementById('navPauseBtn');if(!b)return;const key=navPaused?'resume':'pause';b.textContent=window.reconT?.(key)||(navPaused?'RESUME':'PAUSE');b.classList.toggle('active',navPaused);b.setAttribute('aria-pressed',String(navPaused));}
  function resetPause(){navPaused=false;navPauseStartedAt=navTotalPausedMs=navLegPausedMs=navPausedTotalElapsed=navPausedLegElapsed=0;navPausedHud=null;syncPauseButton();}
  function toggleNavPause(){if(!targetModeActive||targetModePhase!=='NAV')return;const now=Date.now();if(!navPaused){const e=elapsed(now);navPaused=true;navPauseStartedAt=now;navPausedTotalElapsed=e.total;navPausedLegElapsed=e.leg;navPausedHud=null;}else{const d=Math.max(0,now-navPauseStartedAt);navTotalPausedMs+=d;navLegPausedMs+=d;navPaused=false;navPauseStartedAt=0;navPausedHud=null;}syncPauseButton();updateTargetModePanel();}
  window.toggleNavPause=toggleNavPause;

  function syncRevert(){const b=document.getElementById('navRevertLegBtn');if(b)b.disabled=!navLegRevertState;}
  function commitNextLeg(){if(!targetModeActive||targetModePhase!=='NAV'||!hasNextNavLeg()||backtrackActive||navPaused)return;const e=elapsed();navLegRevertState={legIndex:navLegIndex,previousLegElapsedMs:e.leg,navLegTimes:[...(navLegTimes||[])]};navLegTimes[navLegIndex]=e.leg;navLegIndex++;navLegStartedAt=Date.now();navLegPausedMs=navPausedLegElapsed=0;updateTargetModePanel();syncRevert();}
  nextNavLeg=function(){commitNextLeg();};
  function revertLastLeg(){if(!targetModeActive||targetModePhase!=='NAV'||!navLegRevertState)return;const s=navLegRevertState;navLegIndex=s.legIndex;navLegTimes=[...s.navLegTimes];navLegStartedAt=Date.now()-Math.max(0,s.previousLegElapsedMs);navLegPausedMs=0;navPausedLegElapsed=s.previousLegElapsedMs;navLegRevertState=null;updateTargetModePanel();syncRevert();}
  window.revertLastLeg=revertLastLeg;

  function bindHold(btn){
    if(!btn||btn.dataset.v272HoldBound==='1')return;btn.dataset.v272HoldBound='1';btn.removeAttribute('onclick');let timer=0,fired=false;
    const cancel=()=>{clearTimeout(timer);timer=0;btn.classList.remove('hold-arming');};
    btn.addEventListener('pointerdown',e=>{if(btn.disabled)return;e.preventDefault();fired=false;cancel();btn.classList.add('hold-arming');try{btn.setPointerCapture(e.pointerId);}catch(_){}timer=setTimeout(()=>{fired=true;btn.classList.remove('hold-arming');commitNextLeg();if(navigator.vibrate)try{navigator.vibrate(18);}catch(_){}},NEXT_LEG_HOLD_MS);});
    ['pointerup','pointercancel','pointerleave'].forEach(t=>btn.addEventListener(t,e=>{if(!fired)cancel();else btn.classList.remove('hold-arming');try{btn.releasePointerCapture(e.pointerId);}catch(_){}}));
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
  }

  function configureNavToolbar(){
    const bar=document.getElementById('targetModeToolbar');if(!bar)return;const b=[...bar.querySelectorAll('.nav-only')];if(b.length<5)return;
    b[0].id='navSearchBtn';b[0].textContent=window.reconT?.('search')||'SEARCH';b[0].removeAttribute('onclick');b[0].onclick=()=>openPlanSearch();b[0].disabled=false;
    b[1].id='navPauseBtn';b[1].classList.remove('gps-follow-toggle');b[1].removeAttribute('onclick');b[1].onclick=toggleNavPause;b[1].disabled=false;
    b[2].id='targetNextLegBtn';b[2].textContent=window.reconT?.('nextLeg')||'NEXT LEG';b[2].classList.add('nav-next-hold');bindHold(b[2]);
    b[3].id='targetNavStopBtn';b[3].textContent=window.reconT?.('stopNav')||'STOP';b[4].id='navMoreBtn';b[4].textContent=window.reconT?.('more')||'MORE';
    const compact=document.getElementById('navCollapsedNextLegBtn');if(compact){compact.textContent=window.reconT?.('nextLeg')||'NEXT LEG';compact.classList.add('nav-next-hold');bindHold(compact);}
    const grid=document.querySelector('#navMoreSheet .v271-more-grid');if(grid&&!document.getElementById('navRevertLegBtn')){const r=document.createElement('button');r.className='osb-btn';r.id='navRevertLegBtn';r.type='button';r.textContent=window.reconT?.('revertLeg')||'REVERT LEG';r.onclick=revertLastLeg;grid.insertBefore(r,grid.querySelector('.v271-delete-button')||null);}syncPauseButton();syncRevert();
  }

  const baseStartNavElapsed=startNavElapsed;
  startNavElapsed=function(){resetPause();navLegRevertState=null;const out=baseStartNavElapsed();syncRevert();return out;};
  const baseReturnToTargetPlan=returnToTargetPlan;
  returnToTargetPlan=function(){const out=baseReturnToTargetPlan();resetPause();navLegRevertState=null;syncRevert();return out;};
  const baseExitTargetMode=exitTargetMode;
  exitTargetMode=function(force=false){const out=baseExitTargetMode(force);if(!targetModeActive){resetPause();navLegRevertState=null;syncRevert();}return out;};

  const baseUpdateTargetModePanel=updateTargetModePanel;
  updateTargetModePanel=function(){
    baseUpdateTargetModePanel();configureNavToolbar();
    if(targetModeActive&&targetModePhase==='NAV'){const e=elapsed(),el=document.getElementById('navHudElapsed');if(el)el.textContent=window.reconFormatNavElapsed?.(e.total,e.leg,navPaused)||`TOTAL ${formatElapsed(e.total)} · LEG ${formatElapsed(e.leg)}${navPaused?' · PAUSED':''}`;}
    syncPauseButton();syncRevert();syncTempButton();scheduleCenterSync();
  };
  const baseSyncKnown=syncKnownActionAvailability;
  syncKnownActionAvailability=function(){baseSyncKnown();const c=document.getElementById('gpsCenterBtn');if(c)c.disabled=!centerReference()?.coords;const search=document.getElementById('navSearchBtn'),pause=document.getElementById('navPauseBtn');if(targetModeActive&&targetModePhase==='NAV'){if(search)search.disabled=false;if(pause)pause.disabled=false;}const off=navPaused||!hasNextNavLeg(),n=document.getElementById('targetNextLegBtn'),k=document.getElementById('navCollapsedNextLegBtn');if(n)n.disabled=off;if(k)k.disabled=off;syncRevert();syncTempButton();};
  const baseRefreshGpsPowerUi=refreshGpsPowerUi;
  refreshGpsPowerUi=function(){baseRefreshGpsPowerUi();syncTempButton();scheduleCenterSync();};

  document.getElementById('planSearchSheet')?.addEventListener('click',e=>e.stopPropagation());
  removeLegacyTempMenuButton();ensureTempButton();configureNavToolbar();syncTempButton();syncLastGpsMarker();scheduleCenterSync();updateTargetModePanel();
})();

/* ===== V27.2.1 ===== */
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

/* ===== V27.3.x ===== */
/* Tactical Recon V27.3 language / display persistence / NAV draw */
(() => {
  'use strict';

  document.title = 'TACTICAL RECON // FIELD TERMINAL V27.3.4';
  document.body?.classList.add('v273','v2731');

  const LANG_KEY = 'tactical_recon_language_v1';
  const THEME_KEY = 'tactical_recon_optic_theme_v1';
  const ROAD_KEY = 'tactical_recon_road_boost_v1';
  const LAYERS_KEY = 'tactical_recon_marker_layers_v1';

  const I18N = {
    ko: {
      language:'언어', languageTitle:'언어 / LANGUAGE', korean:'한국어', english:'ENGLISH',
      fieldControls:'운용메뉴', fieldMenu:'운용메뉴', nearby:'탐색범위', layers:'지도표시', display:'화면모드', points:'거점',
      gpsStatus:'GPS 상태', followOn:'자동추적 켬', followOff:'자동추적 끔', roadBoost:'도로강조',
      tempAtReticle:'임시위치 지정', savePoint:'거점저장', setHome:'복귀점 지정', centerHome:'복귀점 이동',
      clearHome:'복귀점 삭제', clearTemp:'임시위치 삭제', registeredRange:'탐색범위',
      mapLayers:'지도표시', reconTask:'정찰 작업', displayMode:'화면모드',
      target:'목표', plan:'경로', menu:'메뉴', search:'탐색', set:'지정', draw:'작도',
      undo:'실행취소', exit:'종료', start:'출발점', via:'경유점', end:'도착점', done:'완료',
      route:'경로선', overlay:'표식선', clear:'지우기', pause:'일시정지', resume:'재개',
      nextLeg:'다음구간', stopNav:'항법종료', more:'더보기', trackRec:'궤적기록', backtrack:'역추적',
      share:'공유', revertLeg:'이전구간', exitTarget:'목표종료', navControls:'항법 제어',
      planPoints:'경로지점', quick:'빠른이동', point:'지점', pointInfo:'거점정보',
      deletePoint:'지점삭제', deleteHome:'복귀점 삭제',
      reference:'기준위치', home:'복귀점', temp:'임시위치', lastGps:'최종수신점',
      registered:'등록', unexplored:'미확인', secured:'확인완료', user:'사용자',
      reticle:'조준점', locationSearch:'위치탐색', targetSearch:'거점탐색', wildRecon:'미확인탐색',
      setPoint:'거점지정', copy:'복사', close:'닫기', cancel:'취소',
      noTarget:'목표 없음', notSet:'미지정', none:'없음', positionRequired:'기준위치 필요',
      gpsNoFix:'GPS 미수신', trackOff:'기록 꺼짐', refShort:'기준 --', hide:'접기',
      paused:'일시정지', stale:'이전수신', referenceTag:'기준위치', address:'주소',
      move:'이동', save:'저장', find:'탐색', northUp:'NORTH UP',
      currentPosition:'현위치', nav:'항법', targetModeTitle:'목표 // 경로계획',
      reticleTelemetry:'조준점 제원', followLabel:'자동추적', all:'전체',
      gpsFieldPosition:'GPS 상태 / 기준위치', loadRoute:'경로 불러오기', exportGpx:'GPX 내보내기',
      mapMove:'지도이동', secure:'확인완료',
      routeDash:'경로선 · 점선', overlaySolid:'표식선 · 실선',
      trackWait:'궤적 대기', trackSaved:'궤적 저장', trackStop:'궤적 종료', siteEmpty:'저장된 거점이 없습니다.',
      deleteSite:'삭제', clearAllSites:'거점 전체삭제', addVia:'경유점 추가',
      startPoint:'출발점', viaPoint:'경유점', endPoint:'도착점', homePoint:'복귀점',
      targetSet:'목표 지정', reconComplete:'확인완료', show:'펼치기',
      setSiteHere:'현재 위치에 거점 지정', verifySite:'현장 확인',
      tapToStart:'탭하여 항법 시작', objectiveRequired:'목표 필요',
      routeStatus:'경로', nextPoint:'다음', noRoute:'경로 없음'
    },
    en: {
      language:'LANGUAGE', languageTitle:'LANGUAGE', korean:'한국어', english:'ENGLISH',
      fieldControls:'FIELD CONTROLS', fieldMenu:'FIELD MENU', nearby:'SEARCH RANGE', layers:'LAYERS', display:'DISPLAY', points:'SITES',
      gpsStatus:'GPS STATUS', followOn:'FOLLOW ON', followOff:'FOLLOW OFF', roadBoost:'ROAD BOOST',
      tempAtReticle:'TEMP POS @ RETICLE', savePoint:'SAVE SITE', setHome:'SET RETURN PT', centerHome:'GO RETURN PT',
      clearHome:'CLEAR RETURN PT', clearTemp:'CLEAR TEMP POS', registeredRange:'SEARCH RANGE',
      mapLayers:'MAP LAYERS', reconTask:'RECON TASK', displayMode:'DISPLAY',
      target:'OBJECTIVE', plan:'ROUTE', menu:'MENU', search:'SEARCH', set:'SET', draw:'PLOT',
      undo:'UNDO', exit:'EXIT', start:'START', via:'VIA', end:'END', done:'DONE',
      route:'ROUTE', overlay:'OVERLAY', clear:'CLEAR', pause:'PAUSE', resume:'RESUME',
      nextLeg:'NEXT LEG', stopNav:'STOP NAV', more:'MORE', trackRec:'TRACK REC', backtrack:'BACKTRACK',
      share:'SHARE', revertLeg:'PREV LEG', exitTarget:'EXIT OBJECTIVE', navControls:'NAV CONTROLS',
      planPoints:'ROUTE POINTS', quick:'QUICK', point:'POINT', pointInfo:'SITE INFO',
      deletePoint:'DELETE POINT', deleteHome:'DELETE RETURN PT',
      reference:'REF POS', home:'RETURN PT', temp:'TEMP POS', lastGps:'LAST FIX',
      registered:'REGISTERED', unexplored:'UNVERIFIED', secured:'VERIFIED', user:'USER',
      reticle:'RETICLE', locationSearch:'POSITION SEARCH', targetSearch:'SEARCH SITES', wildRecon:'UNVERIFIED RECON',
      setPoint:'SET SITE', copy:'COPY', close:'CLOSE', cancel:'CANCEL',
      noTarget:'NO OBJECTIVE', notSet:'NOT SET', none:'NONE', positionRequired:'REF POS REQUIRED',
      gpsNoFix:'GPS NO FIX', trackOff:'TRACK OFF', refShort:'REF --', hide:'HIDE',
      paused:'PAUSED', stale:'STALE', referenceTag:'REF POS', address:'ADDRESS',
      move:'MOVE', save:'SAVE', find:'SEARCH', northUp:'NORTH UP',
      currentPosition:'CURRENT POSITION', nav:'NAV', targetModeTitle:'OBJECTIVE // ROUTE PLAN',
      reticleTelemetry:'RETICLE TELEMETRY', followLabel:'FOLLOW', all:'ALL',
      gpsFieldPosition:'GPS STATUS / REF POS', loadRoute:'LOAD ROUTE', exportGpx:'EXPORT GPX',
      mapMove:'MOVE MAP', secure:'VERIFIED',
      routeDash:'ROUTE · DASH', overlaySolid:'OVERLAY · SOLID',
      trackWait:'TRACK WAIT', trackSaved:'TRACK SAVED', trackStop:'TRACK STOP', siteEmpty:'NO SAVED SITES.',
      deleteSite:'DELETE', clearAllSites:'DELETE ALL SITES', addVia:'ADD VIA',
      startPoint:'START PT', viaPoint:'VIA PT', endPoint:'END PT', homePoint:'RETURN PT',
      targetSet:'SET OBJECTIVE', reconComplete:'VERIFY SITE', show:'SHOW',
      setSiteHere:'SET SITE AT RETICLE', verifySite:'FIELD VERIFICATION',
      tapToStart:'TAP TO START', objectiveRequired:'OBJECTIVE REQUIRED',
      routeStatus:'ROUTE', nextPoint:'NEXT', noRoute:'NO ROUTE'
    }
  };

  let currentLanguage = (() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      return saved === 'en' || saved === 'ko' ? saved : 'ko';
    } catch (e) { return 'ko'; }
  })();

  window.reconT = key => I18N[currentLanguage]?.[key] ?? I18N.en[key] ?? key;
  window.reconFormatNavElapsed = (total, leg, paused) => {
    const t = typeof formatElapsed === 'function' ? formatElapsed(total) : '00:00:00';
    const l = typeof formatElapsed === 'function' ? formatElapsed(leg) : '00:00:00';
    return currentLanguage === 'ko'
      ? `전체 ${t} · 구간 ${l}${paused ? ' · 일시정지' : ''}`
      : `TOTAL ${t} · LEG ${l}${paused ? ' · PAUSED' : ''}`;
  };

  const SOURCE_KEYS = new Map(Object.entries({
    'FIELD CONTROLS':'fieldControls',
    'FIELD MENU':'fieldMenu',
    'NEARBY':'nearby',
    'LAYERS':'layers',
    'DISPLAY':'display',
    'POINTS':'points',
    'GPS STATUS':'gpsStatus',
    'FOLLOW OFF':'followOff',
    'FOLLOW ON':'followOn',
    'ROAD BOOST':'roadBoost',
    'TEMP POS @ RETICLE':'tempAtReticle',
    'SAVE POINT':'savePoint',
    'SET HOME':'setHome',
    'RECENTER HOME':'centerHome',
    'CLEAR HOME':'clearHome',
    'CLEAR TEMP POS':'clearTemp',
    'REGISTERED RANGE':'registeredRange',
    'MAP MARKER LAYERS':'mapLayers',
    'RECON TASK':'reconTask',
    'DISPLAY MODE':'displayMode',
    'TARGET':'target',
    'PLAN':'plan',
    'MENU':'menu',
    'SEARCH':'search',
    'SET':'set',
    'DRAW':'draw',
    'UNDO':'undo',
    'EXIT':'exit',
    'START':'start',
    'VIA':'via',
    'END':'end',
    'DONE':'done',
    'ROUTE':'route',
    'OVERLAY':'overlay',
    'CLEAR':'clear',
    'PAUSE':'pause',
    'RESUME':'resume',
    'NEXT LEG':'nextLeg',
    'STOP':'stopNav',
    'MORE':'more',
    'TRACK REC':'trackRec',
    'BACKTRACK':'backtrack',
    'SHARE':'share',
    'REVERT LEG':'revertLeg',
    'EXIT TARGET':'exitTarget',
    'NAV CONTROLS':'navControls',
    'PLAN POINTS':'planPoints',
    'QUICK':'quick',
    'POINT':'point',
    'POINT INFO':'pointInfo',
    'DELETE POINT':'deletePoint',
    'DELETE HOME':'deleteHome',
    'REFERENCE':'reference',
    'HOME':'home',
    'HOME / EXIT':'home',
    'TEMP POS':'temp',
    'LAST GPS':'lastGps',
    'HOME POINT':'homePoint',
    'START POINT':'startPoint',
    'VIA POINT':'viaPoint',
    'END POINT':'endPoint',
    'TRACK ACQUIRING':'trackWait',
    'TRACK SAVED':'trackSaved',
    'DRAW ON':'draw',
    'REGISTERED':'registered',
    'UNEXPLORED':'unexplored',
    'SECURED':'secured',
    'USER':'user',
    'LOCATION SEARCH':'locationSearch',
    'NO TARGET':'noTarget',
    'NOT SET':'notSet',
    'NONE':'none',
    'POSITION REQUIRED':'positionRequired',
    'GPS NO FIX':'gpsNoFix',
    'TRACK OFF':'trackOff',
    'REF --':'refShort',
    'HIDE':'hide',
    'COPY':'copy',
    'CLOSE':'close',
    'ADDRESS':'address',
    'NORTH UP':'northUp',
    'TARGET MODE // ROUTE PLAN':'targetModeTitle',
    'RETICLE TELEMETRY':'reticleTelemetry',
    'FOLLOW':'followLabel',
    'ALL':'all',
    'GPS STATUS / FIELD POSITION':'gpsFieldPosition',
    'ROUTE 불러오기':'loadRoute',
    'GPX 내보내기':'exportGpx',
    '지도에서 보기':'mapMove',
    '거점 저장':'savePoint',
    '검색':'search',
    '기록 전체 삭제':'clearAllSites',
    'VIA 추가':'addVia',
    '이 위치에 거점 지정':'setSiteHere',
    '현장 확인 및 개척 등록':'verifySite',
    '개척 완료':'secure',
    '[ TARGET SET // 목표 설정 ]':'targetSet',
    '[ RECON COMPLETED // 개척 완료 ]':'reconComplete',
    '거점 탐색':'targetSearch',
    '미개척 정찰':'wildRecon',
    '거점 지정':'setPoint',
    '위치 검색':'locationSearch',
    '좌표 복사':'copy',
    '닫기':'close',
    '취소':'cancel',
    '찾기':'find',
    '삭제':'deletePoint'
  }));

  const UI_ROOTS = [
    '.mfd-bottom-bar', '#fieldControlTray', '#targetModePanel', '#planSearchSheet',
    '#planPointSheet', '#navMoreSheet', '#gpsDetailBackdrop', '#navOpticBackdrop',
    '#pointPlacementBackdrop', '#addressSearchBackdrop', '.telemetry-osd', '#gpsStatusOsd',
    '#wpDrawer', '.sitrep-panel'
  ];

  function bindKnownTexts(root = document) {
    const roots = root === document
      ? UI_ROOTS.map(sel => document.querySelector(sel)).filter(Boolean)
      : [root];
    roots.forEach(scope => {
      scope.querySelectorAll('button,span,strong,div').forEach(el => {
        if (el.dataset.reconI18n || el.childElementCount) return;
        const raw = String(el.textContent || '').trim();
        const key = SOURCE_KEYS.get(raw);
        if (key) el.dataset.reconI18n = key;
      });
    });
  }

  function applyBoundTexts(root = document) {
    root.querySelectorAll('[data-recon-i18n]').forEach(el => {
      const key = el.dataset.reconI18n;
      if (key) el.textContent = window.reconT(key);
    });
  }

  function syncLanguageButtons() {
    document.querySelectorAll('[data-recon-language]').forEach(btn => {
      const active = btn.dataset.reconLanguage === currentLanguage;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function syncDynamicLanguage() {
    const search = document.getElementById('navSearchBtn');
    if (search) search.textContent = window.reconT('search');
    const pause = document.getElementById('navPauseBtn');
    if (pause) pause.textContent = window.reconT(pause.getAttribute('aria-pressed') === 'true' ? 'resume' : 'pause');
    const next = document.getElementById('targetNextLegBtn');
    if (next) next.textContent = window.reconT('nextLeg');
    const nextCompact = document.getElementById('navCollapsedNextLegBtn');
    if (nextCompact) nextCompact.textContent = window.reconT('nextLeg');
    const stop = document.getElementById('targetNavStopBtn');
    if (stop) stop.textContent = window.reconT('stopNav');
    const more = document.getElementById('navMoreBtn');
    if (more) more.textContent = window.reconT('more');
    const revert = document.getElementById('navRevertLegBtn');
    if (revert) revert.textContent = window.reconT('revertLeg');
    const temp = document.getElementById('tempQuickBtn');
    if (temp) temp.textContent = currentLanguage === 'ko' ? '임시' : 'TEMP';

    const centerControl = document.getElementById('gpsCenterBtn');
    if (centerControl) {
      if (gpsFollowEnabled) {
        centerControl.title = currentLanguage === 'ko' ? '자동추적 켬 · 탭하여 해제' : 'FOLLOW ON · TAP TO DISENGAGE';
        centerControl.setAttribute('aria-label', currentLanguage === 'ko' ? '자동추적 해제' : 'DISENGAGE FOLLOW');
      } else if (gpsPowerEnabled && hasGpsFix && centerControl.classList.contains('active')) {
        centerControl.title = currentLanguage === 'ko' ? '현위치 중앙 · 다시 탭하면 자동추적' : 'POSITION CENTERED · TAP AGAIN FOR FOLLOW';
        centerControl.setAttribute('aria-label', currentLanguage === 'ko' ? '자동추적 시작' : 'ENGAGE FOLLOW');
      } else {
        centerControl.title = currentLanguage === 'ko' ? '기준위치로 복귀' : 'RECENTER TO REFERENCE POSITION';
        centerControl.setAttribute('aria-label', currentLanguage === 'ko' ? '기준위치로 복귀' : 'RECENTER');
      }
    }
    const kind = document.getElementById('targetDrawKindBtn');
    if (kind) kind.textContent = window.reconT(routeDrawKind === 'MARK' ? 'overlay' : 'route');

    document.querySelectorAll('.gps-follow-toggle').forEach(el => {
      if (el.id === 'navPauseBtn') return;
      el.textContent = window.reconT(gpsFollowEnabled ? 'followOn' : 'followOff');
    });

    const navDistanceLabel = document.getElementById('navHudDistanceLabel');
    if (navDistanceLabel) {
      const raw = String(navDistanceLabel.textContent || '').trim();
      const m = raw.match(/^DIRECT TO\s+(.+)$/) || raw.match(/^직행\s*·\s*(.+)$/);
      if (m) {
        const token = m[1].trim();
        const role =
          ['TARGET','OBJECTIVE','목표'].includes(token) ? 'target' :
          ['VIA','경유점'].includes(token) ? 'via' :
          ['END','도착점'].includes(token) ? 'end' :
          ['START','출발점'].includes(token) ? 'start' : null;
        if (role) navDistanceLabel.textContent = currentLanguage === 'ko'
          ? `직행 · ${window.reconT(role)}`
          : `DIRECT TO ${window.reconT(role)}`;
      }
    }
    const navLeg = document.getElementById('navHudLeg');
    if (navLeg) {
      const raw = String(navLeg.textContent || '').trim();
      const m = raw.match(/^LEG\s+([^·]+)·\s*(.+)$/) || raw.match(/^구간\s+([^·]+)·\s*(.+)$/);
      if (m) {
        const token = m[2].trim();
        const role =
          ['TARGET','OBJECTIVE','목표'].includes(token) ? 'target' :
          ['VIA','경유점'].includes(token) ? 'via' :
          ['END','도착점'].includes(token) ? 'end' :
          ['START','출발점'].includes(token) ? 'start' : null;
        navLeg.textContent = currentLanguage === 'ko'
          ? `구간 ${m[1].trim()} · ${role ? window.reconT(role) : token}`
          : `LEG ${m[1].trim()} · ${role ? window.reconT(role) : token}`;
      }
    }
    const navRef = document.getElementById('navHudRef');
    if (navRef) {
      const raw = String(navRef.textContent || '').replace(/^(REF|기준)\s+/, '').trim();
      const key =
        ['TEMP POS','임시위치'].includes(raw) ? 'temp' :
        ['LAST GPS','LAST FIX','최근수신점','최종수신점'].includes(raw) ? 'lastGps' : null;
      const value = key ? window.reconT(key) : raw;
      if (value) navRef.textContent = currentLanguage === 'ko' ? `기준 ${value}` : `REF ${value}`;
    }

    const gpsDetailRef = document.getElementById('gpsDetailRef');
    if (gpsDetailRef) {
      const raw = String(gpsDetailRef.textContent || '').trim();
      const key =
        ['TEMP POS','임시위치'].includes(raw) ? 'temp' :
        ['LAST GPS','LAST FIX','최근수신점','최종수신점'].includes(raw) ? 'lastGps' :
        ['NONE','없음'].includes(raw) ? 'none' : null;
      if (key) gpsDetailRef.textContent = window.reconT(key);
    }

    const navDrawKind = document.getElementById('navDrawKindBtn');
    if (navDrawKind) navDrawKind.textContent = window.reconT(routeDrawKind === 'MARK' ? 'overlay' : 'route');
    const navDrawUndo = document.getElementById('navDrawUndoBtn');
    if (navDrawUndo) navDrawUndo.textContent = window.reconT('undo');
    const navDrawClear = document.getElementById('navDrawClearBtn');
    if (navDrawClear) navDrawClear.textContent = window.reconT('clear');
    const navDrawDone = document.getElementById('navDrawDoneBtn');
    if (navDrawDone) navDrawDone.textContent = window.reconT('done');

    document.querySelectorAll('.v2721-reference-head .wp-group-name').forEach(el => el.textContent = window.reconT('reference'));
    document.querySelectorAll('.v2721-reference-item').forEach(item => {
      const status = item.querySelector('.wp-item-status');
      const name = item.querySelector('.wp-item-name');
      const rawName = String(name?.textContent || '').trim();
      if (name) {
        if (['HOME / EXIT','HOME','RETURN PT','복귀점'].includes(rawName)) name.textContent = window.reconT('home');
        else if (['TEMP POS','임시위치'].includes(rawName)) name.textContent = window.reconT('temp');
        else if (['LAST GPS','LAST FIX','최근수신점','최종수신점'].includes(rawName)) name.textContent = window.reconT('lastGps');
      }
      if (status) {
        const isStale = /STALE|이전수신/.test(status.textContent);
        const type = rawName.includes('LAST') || ['최근수신점','최종수신점'].includes(rawName) ? 'lastGps'
          : rawName.includes('TEMP') || rawName === '임시위치' ? 'temp' : 'home';
        status.textContent = `[${window.reconT(isStale ? 'stale' : 'referenceTag')}] ${window.reconT(type)}`;
      }
    });

    const targetSet = document.getElementById('btnTargetSet');
    if (targetSet) targetSet.textContent = `[ ${window.reconT('targetSet')} ]`;
    const reconComplete = document.getElementById('btnPromote');
    if (reconComplete) reconComplete.textContent = `[ ${window.reconT('reconComplete')} ]`;

    const sitrepStatus = document.getElementById('sitrepStatus');
    if (sitrepStatus) {
      const raw = String(sitrepStatus.textContent || '').trim();
      if (['REGISTERED','등록'].includes(raw)) sitrepStatus.textContent = window.reconT('registered');
      else if (['UNEXPLORED','UNVERIFIED','미확인'].includes(raw)) sitrepStatus.textContent = window.reconT('unexplored');
      else if (['SECURED','VERIFIED','확인완료'].includes(raw)) sitrepStatus.textContent = window.reconT('secured');
      else if (['USER','사용자'].includes(raw)) sitrepStatus.textContent = window.reconT('user');
    }

    const stats = document.getElementById('targetModeStats');
    if (stats && targetModeActive) {
      stats.innerHTML = currentLanguage === 'ko'
        ? `경로선 ${routeLengthKm().toFixed(1)} KM<br>${routeDraftSegments.length} 선분 · ${routeViaPoints.length} 경유점 · ${routeMarkSegments.length} 표식선`
        : `ROUTE ${routeLengthKm().toFixed(1)} KM<br>${routeDraftSegments.length} SEG · ${routeViaPoints.length} VIA · ${routeMarkSegments.length} OVERLAY`;
    }

    const navGps = document.getElementById('navHudGps');
    if (navGps && currentLanguage === 'ko') navGps.textContent = String(navGps.textContent || '').replace(/FOLLOW/g, '자동추적');

    const trackButton = document.getElementById('targetTrackRecBtn');
    if (trackButton) {
      const raw = String(trackButton.textContent || '').trim();
      if (/TRACK WAIT|궤적 대기/.test(raw)) trackButton.textContent = window.reconT('trackWait');
      else if (/TRACK STOP|궤적 종료/.test(raw)) trackButton.textContent = window.reconT('trackStop');
      else trackButton.textContent = window.reconT('trackRec');
    }

    const collapseButton = document.getElementById('targetPanelCollapseBtn');
    if (collapseButton) {
      const expanded = /SHOW|펼치기/.test(String(collapseButton.textContent || ''));
      collapseButton.textContent = window.reconT(expanded ? 'show' : 'hide');
    }

    const drawButton = document.getElementById('targetDrawBtn');
    if (drawButton) drawButton.textContent = window.reconT('draw');

    const drawKindButton = document.getElementById('targetDrawKindBtn');
    if (drawKindButton) drawKindButton.textContent = window.reconT(routeDrawKind === 'MARK' ? 'overlaySolid' : 'routeDash');

    const navTrack = document.getElementById('navHudTrack');
    if (navTrack) {
      const raw = String(navTrack.textContent || '').trim();
      const km = raw.match(/·\s*([\d.]+\s*KM)$/)?.[1] || '';
      if (/TRACK ACQUIRING|궤적 대기/.test(raw)) navTrack.textContent = window.reconT('trackWait');
      else if (/TRACK REC|궤적기록/.test(raw)) navTrack.textContent = `${window.reconT('trackRec')}${km ? ` · ${km}` : ''}`;
      else if (/TRACK SAVED|궤적 저장/.test(raw)) navTrack.textContent = `${window.reconT('trackSaved')}${km ? ` · ${km}` : ''}`;
      else if (/TRACK OFF|기록 꺼짐/.test(raw)) navTrack.textContent = window.reconT('trackOff');
    }

    const pointType = document.getElementById('planPointType');
    if (pointType) {
      const raw = String(pointType.textContent || '').trim();
      const key = /HOME|복귀/.test(raw) ? 'homePoint'
        : /START|출발/.test(raw) ? 'startPoint'
        : /VIA|경유/.test(raw) ? 'viaPoint'
        : /END|도착/.test(raw) ? 'endPoint' : null;
      if (key) pointType.textContent = window.reconT(key);
    }

    document.querySelectorAll('#wpDrawer .wp-group:not(.v2721-reference-group)').forEach(section => {
      const groupName = section.querySelector('.wp-group-name');
      const rawGroup = String(groupName?.textContent || '').trim();
      const groupKey =
        ['REGISTERED','등록'].includes(rawGroup) ? 'registered' :
        ['UNEXPLORED','UNVERIFIED','미확인'].includes(rawGroup) ? 'unexplored' :
        ['SECURED','VERIFIED','확인완료'].includes(rawGroup) ? 'secured' :
        ['USER','사용자'].includes(rawGroup) ? 'user' : null;
      if (groupName && groupKey) groupName.textContent = window.reconT(groupKey);

      section.querySelectorAll('.wp-item-status').forEach(status => {
        const raw = String(status.textContent || '');
        const match = raw.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (!match) return;
        const translated = match[1].split('·').map(part => {
          const token = part.trim();
          if (token === 'REGISTERED' || token === '등록') return window.reconT('registered');
          if (token === 'UNEXPLORED' || token === 'UNVERIFIED' || token === '미확인') return window.reconT('unexplored');
          if (token === 'SECURED' || token === 'VERIFIED' || token === '확인완료') return window.reconT('secured');
          if (token === 'USER' || token === '사용자') return window.reconT('user');
          return token;
        }).join(' · ');
        status.textContent = `[${translated}] ${match[2]}`;
      });

      section.querySelectorAll('.wp-item-delete').forEach(btn => btn.textContent = window.reconT('deleteSite'));
    });

    const empty = document.querySelector('#wpListContainer > div');
    if (empty && /저장된 POINTS가 없습니다|NO SAVED SITES/.test(empty.textContent || '')) {
      empty.textContent = window.reconT('siteEmpty');
    }

    syncSiteCounter();
    syncLanguageButtons();
  }

  function applyLanguage() {
    document.documentElement.lang = currentLanguage;
    bindKnownTexts();
    applyBoundTexts();
    syncDynamicLanguage();
    try { updateTargetModePanel(); } catch (e) {}
    try { renderWpDrawerList(); } catch (e) {}
  }

  function setLanguage(lang) {
    if (lang !== 'ko' && lang !== 'en') return;
    currentLanguage = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyLanguage();
    const title = document.getElementById('fieldControlTitle');
    if (document.getElementById('control-language')?.classList.contains('active') && title) {
      title.textContent = window.reconT('languageTitle');
    }
  }
  window.setReconLanguage = setLanguage;

  function ensureLanguagePanel() {
    const tray = document.getElementById('fieldControlTray');
    const menuGrid = document.querySelector('#control-menu .v26-menu-grid');
    if (!tray || !menuGrid) return;

    if (!document.getElementById('languageSettingsBtn')) {
      const btn = document.createElement('button');
      btn.className = 'osb-btn';
      btn.id = 'languageSettingsBtn';
      btn.type = 'button';
      btn.dataset.reconI18n = 'language';
      btn.onclick = () => {
        openFieldControls('language');
        const title = document.getElementById('fieldControlTitle');
        if (title) title.textContent = window.reconT('languageTitle');
      };
      const displayBtn = [...menuGrid.querySelectorAll('button')].find(el => String(el.getAttribute('onclick') || '').includes("openFieldControls('optic')"));
      if (displayBtn) displayBtn.insertAdjacentElement('afterend', btn);
      else menuGrid.appendChild(btn);
    }

    if (!document.getElementById('control-language')) {
      const section = document.createElement('div');
      section.className = 'field-control-section';
      section.id = 'control-language';
      section.innerHTML = `
        <div style="font-size:9px;color:var(--field-dim);margin-bottom:6px;" data-recon-i18n="languageTitle">LANGUAGE</div>
        <div class="language-option-grid">
          <button class="osb-btn" type="button" data-recon-language="ko">한국어</button>
          <button class="osb-btn" type="button" data-recon-language="en">ENGLISH</button>
        </div>
      `;
      section.querySelector('[data-recon-language="ko"]').onclick = () => setLanguage('ko');
      section.querySelector('[data-recon-language="en"]').onclick = () => setLanguage('en');
      tray.appendChild(section);
    }
    syncLanguageButtons();
  }

  // The global adaptive position control owns RECENTER/CENTERED/FOLLOW.
  // Main navigation stays focused on OBJECTIVE / SITES / MENU.
  document.getElementById('primaryCenterBtn')?.remove();

  function removeMainRouteButton() {
    const cluster = document.querySelector('.v26-main-cluster');
    if (!cluster) return;
    [...cluster.querySelectorAll('button')].forEach(btn => {
      if (String(btn.getAttribute('onclick') || '').includes('openPlanShortcut()')) btn.remove();
    });
  }

  function ensureMainSitesButton() {
    const cluster = document.querySelector('.v26-main-cluster');
    const sites = document.getElementById('btnWpCount');
    if (!cluster || !sites) return;
    const menuButton = [...cluster.querySelectorAll('button')].find(el => String(el.getAttribute('onclick') || '').includes("openFieldControls('menu')"));
    sites.classList.add('v26-primary');
    sites.onclick = () => { try { closeFieldControls(); } catch (e) {} openWpDrawer(); };
    sites.dataset.reconI18n = 'points';
    if (sites.parentElement !== cluster || (menuButton && sites.nextElementSibling !== menuButton)) {
      cluster.insertBefore(sites, menuButton || null);
    }
  }

  function syncSiteCounter() {
    const counter = document.getElementById('btnWpCount');
    if (!counter) return;
    counter.textContent = window.reconT('points');
  }

  const baseUpdateWpCounterV2731 = updateWpCounter;
  updateWpCounter = function() {
    try { baseUpdateWpCounterV2731(); } catch (e) {}
    syncSiteCounter();
  };

  // Persist DISPLAY theme, road emphasis and marker-layer visibility only.
  const baseSetOpticThemeV273 = setOpticTheme;
  setOpticTheme = function(themeName, btn) {
    const out = baseSetOpticThemeV273(themeName, btn);
    try { localStorage.setItem(THEME_KEY, themeName); } catch (e) {}
    return out;
  };

  const baseToggleRoadBoostV273 = toggleRoadBoost;
  toggleRoadBoost = function(btn) {
    const out = baseToggleRoadBoostV273(btn);
    try { localStorage.setItem(ROAD_KEY, roadBoostEnabled ? '1' : '0'); } catch (e) {}
    return out;
  };

  const baseToggleMapLayerV273 = toggleMapLayer;
  toggleMapLayer = function(layerKey, btn) {
    const out = baseToggleMapLayerV273(layerKey, btn);
    try { localStorage.setItem(LAYERS_KEY, JSON.stringify(markerLayerVisibility)); } catch (e) {}
    return out;
  };

  function restoreDisplayPreferences() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      if (['stealth','nvg-green','nvg-white','flir'].includes(theme)) setOpticTheme(theme, null);

      const savedLayers = JSON.parse(localStorage.getItem(LAYERS_KEY) || 'null');
      if (savedLayers && typeof savedLayers === 'object') {
        Object.keys(markerLayerVisibility).forEach(key => {
          if (typeof savedLayers[key] === 'boolean') markerLayerVisibility[key] = savedLayers[key];
        });
        document.querySelectorAll('[data-layer]').forEach(btn => {
          const key = btn.dataset.layer;
          if (!(key in markerLayerVisibility)) return;
          btn.classList.toggle('active', markerLayerVisibility[key]);
          btn.setAttribute('aria-pressed', String(markerLayerVisibility[key]));
        });
        syncMarkerVisibility();
      }

      if (localStorage.getItem(ROAD_KEY) === '1' && !roadBoostEnabled) {
        roadBoostEnabled = true;
        if (!map.hasLayer(roadBoostLayer)) roadBoostLayer.addTo(map);
        document.getElementById('roadBoostBtn')?.classList.add('active');
      }
    } catch (e) {}
  }

  // Allow DRAW while NAV remains active. NAV phase/timers/reference are untouched.
  let navDrawMode = false;
  let drawZoomSnapBefore = null;

  const baseSetMapRouteDrawInteractionV273 = setMapRouteDrawInteraction;
  setMapRouteDrawInteraction = function(enabled) {
    const allowed = targetModeActive && (targetModePhase === 'PLAN' || (targetModePhase === 'NAV' && navDrawMode));
    if (targetModePhase !== 'NAV') {
      if (enabled && drawZoomSnapBefore === null) drawZoomSnapBefore = map.options.zoomSnap;
      const out = baseSetMapRouteDrawInteractionV273(Boolean(enabled && allowed));
      if (routeDrawEnabled) map.options.zoomSnap = 0;
      else if (drawZoomSnapBefore !== null) {
        const z = map.getZoom();
        map.options.zoomSnap = drawZoomSnapBefore;
        drawZoomSnapBefore = null;
        map.setZoom(Math.round(z * 4) / 4, { animate:false });
      }
      return out;
    }

    const container = map.getContainer();
    routeDrawEnabled = Boolean(enabled && allowed);
    container.classList.toggle('route-draw-active', routeDrawEnabled);
    resetRouteGestureState(true);

    if (routeDrawEnabled) {
      if (drawZoomSnapBefore === null) drawZoomSnapBefore = map.options.zoomSnap;
      map.options.zoomSnap = 0;
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.enable();
      if (map.boxZoom) map.boxZoom.disable();
      if (gpsFollowEnabled) setGpsFollow(false, false);
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      if (map.boxZoom) map.boxZoom.enable();
      if (drawZoomSnapBefore !== null) {
        const z = map.getZoom();
        map.options.zoomSnap = drawZoomSnapBefore;
        drawZoomSnapBefore = null;
        map.setZoom(Math.round(z * 4) / 4, { animate:false });
      }
    }
    updateTargetModePanel();
  };

  // Replace the threshold-based 0.25-step pinch with continuous fractional zoom.
  const legacyRoutePointerMoveV273 = handleRoutePointerMove;
  try { routeMapContainer.removeEventListener('pointermove', legacyRoutePointerMoveV273); } catch (e) {}

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

      if (routeGestureLastDistance > 0 && metrics.distance > 0) {
        const ratio = metrics.distance / routeGestureLastDistance;
        const zoomDelta = Math.log2(ratio);
        if (Math.abs(zoomDelta) > 0.0025) {
          const nextZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + zoomDelta));
          map.setZoomAround(metrics.center, nextZoom, { animate:false });
          routeGestureLastDistance = metrics.distance;
        }
      }
      routeGestureLastCenter = metrics.center;
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

  function ensureNavDrawControls() {
    const toolbar = document.getElementById('targetModeToolbar');
    if (toolbar && !document.getElementById('navDrawKindBtn')) {
      const specs = [
        ['navDrawKindBtn','route', () => {
          if (!navDrawMode || targetModePhase !== 'NAV') return;
          routeDrawKind = routeDrawKind === 'MARK' ? 'ROUTE' : 'MARK';
          if (routeCurrentPolyline) cancelCurrentRouteStroke();
          updateTargetModePanel();
        }],
        ['navDrawUndoBtn','undo', () => {
          if (!navDrawMode || targetModePhase !== 'NAV') return;
          undoRouteStroke();
          updateTargetModePanel();
        }],
        ['navDrawClearBtn','clear', () => {
          if (!navDrawMode || targetModePhase !== 'NAV') return;
          clearRouteDraft();
          updateTargetModePanel();
        }],
        ['navDrawDoneBtn','done', () => exitNavDrawMode(true)]
      ];
      specs.forEach(([id,key,handler]) => {
        const b = document.createElement('button');
        b.className = 'osb-btn nav-draw-only';
        b.id = id;
        b.type = 'button';
        b.textContent = window.reconT(key);
        b.onclick = handler;
        toolbar.appendChild(b);
      });
    }

    const grid = document.querySelector('#navMoreSheet .v271-more-grid');
    if (grid && !document.getElementById('navDrawBtn')) {
      const b = document.createElement('button');
      b.className = 'osb-btn';
      b.id = 'navDrawBtn';
      b.type = 'button';
      b.dataset.reconI18n = 'draw';
      b.textContent = window.reconT('draw');
      b.onclick = enterNavDrawMode;
      grid.insertBefore(b, grid.firstChild);
    }
  }

  function enterNavDrawMode() {
    if (!targetModeActive || targetModePhase !== 'NAV') return;
    closeNavMore();
    closePlanSearch();
    closePlanPointInfo();
    navDrawMode = true;
    document.body.classList.add('nav-draw-submode');
    setMapRouteDrawInteraction(true);
    updateTargetModePanel();
  }
  window.enterNavDrawMode = enterNavDrawMode;

  function exitNavDrawMode(save = true) {
    if (!navDrawMode) return;
    setMapRouteDrawInteraction(false);
    navDrawMode = false;
    document.body.classList.remove('nav-draw-submode');
    if (save && routeDirty) {
      try { saveTargetRoute(); } catch (e) {}
    }
    updateTargetModePanel();
  }
  window.exitNavDrawMode = exitNavDrawMode;

  const baseExitPlanSubmodeV2731 = exitPlanSubmode;
  exitPlanSubmode = function() {
    const needsSave = Boolean(targetModeActive && targetModePhase === 'PLAN' &&
      (routeDirty || (routeCurrentSegment && routeCurrentSegment.length >= 2)));
    if (needsSave && !saveTargetRoute()) return;
    return baseExitPlanSubmodeV2731();
  };

  const baseReturnToTargetPlanV273 = returnToTargetPlan;
  returnToTargetPlan = function() {
    if (navDrawMode) exitNavDrawMode(true);
    return baseReturnToTargetPlanV273();
  };

  const baseExitTargetModeV273 = exitTargetMode;
  exitTargetMode = function(force = false) {
    if (navDrawMode) exitNavDrawMode(true);
    return baseExitTargetModeV273(force);
  };

  const baseOpenFieldControlsV273 = openFieldControls;
  openFieldControls = function(section) {
    const out = baseOpenFieldControlsV273(section);
    const title = document.getElementById('fieldControlTitle');
    const keyMap = {
      menu:'fieldMenu', radar:'nearby', layers:'layers', target:'reconTask', optic:'displayMode', language:'languageTitle'
    };
    if (title && keyMap[section]) title.textContent = window.reconT(keyMap[section]);
    bindKnownTexts(document.getElementById('fieldControlTray'));
    applyBoundTexts(document.getElementById('fieldControlTray'));
    syncDynamicLanguage();
    return out;
  };

  const baseOpenSitrepV2731 = openSitrep;
  openSitrep = function(...args) {
    const out = baseOpenSitrepV2731(...args);
    syncDynamicLanguage();
    return out;
  };

  const baseUpdateGpsDetailV2731 = updateGpsDetail;
  updateGpsDetail = function(...args) {
    const out = baseUpdateGpsDetailV2731(...args);
    syncDynamicLanguage();
    return out;
  };

  const baseOpenPlanPointInfoV2731 = openPlanPointInfo;
  openPlanPointInfo = function(...args) {
    const out = baseOpenPlanPointInfoV2731(...args);
    syncDynamicLanguage();
    return out;
  };

  const baseSetV271SheetV2731 = setV271Sheet;
  setV271Sheet = function(id, open) {
    const out = baseSetV271SheetV2731(id, open);
    if (open) setTimeout(syncDynamicLanguage, 0);
    return out;
  };

  const baseRefreshGpsPowerUiV273 = refreshGpsPowerUi;
  refreshGpsPowerUi = function() {
    const out = baseRefreshGpsPowerUiV273();
    syncDynamicLanguage();
    return out;
  };

  const baseRenderWpDrawerListV273 = renderWpDrawerList;
  renderWpDrawerList = function() {
    const out = baseRenderWpDrawerListV273();
    bindKnownTexts(document.getElementById('wpDrawer'));
    applyBoundTexts(document.getElementById('wpDrawer'));
    syncDynamicLanguage();
    return out;
  };

  const baseUpdateTargetModePanelV273 = updateTargetModePanel;
  updateTargetModePanel = function() {
    const out = baseUpdateTargetModePanelV273();
    document.body.classList.toggle('nav-draw-submode', Boolean(navDrawMode && targetModeActive && targetModePhase === 'NAV'));
    ensureNavDrawControls();
    bindKnownTexts(document.getElementById('targetModePanel'));
    applyBoundTexts(document.getElementById('targetModePanel'));
    syncDynamicLanguage();

    const undo = document.getElementById('navDrawUndoBtn');
    const clear = document.getElementById('navDrawClearBtn');
    const bucket = routeDrawKind === 'MARK' ? routeMarkSegments : routeDraftSegments;
    if (undo) undo.disabled = !bucket.length;
    if (clear) clear.disabled = !bucket.length;
    return out;
  };

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navDrawMode) {
      event.preventDefault();
      event.stopImmediatePropagation();
      exitNavDrawMode(true);
    }
  }, true);

  removeMainRouteButton();
  ensureMainSitesButton();
  ensureLanguagePanel();
  ensureNavDrawControls();
  restoreDisplayPreferences();
  applyLanguage();
  syncSiteCounter();
})();


/* ===== V27.4.1 // TEMP reference + dynamic route status ===== */
(() => {
  'use strict';

  document.title = 'TACTICAL RECON // FIELD TERMINAL V27.4.1';
  document.body?.classList.add('v2741');

  const validRefCoordsV2741 = coords =>
    Array.isArray(coords) && coords.length >= 2 &&
    Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1])) &&
    Math.abs(Number(coords[0])) <= 90 && Math.abs(Number(coords[1])) <= 180;

  const baseGetReferencePositionV2741 = getReferencePosition;
  getReferencePosition = function() {
    // Explicit GPS OFF is a valid field-operating state. If TEMP exists, it is
    // the active reference rather than stale LAST FIX.
    if (!gpsPowerEnabled && validRefCoordsV2741(tempMarkPoint?.coords)) {
      return { type:'TEMP', coords:[Number(tempMarkPoint.coords[0]), Number(tempMarkPoint.coords[1])] };
    }

    const ref = baseGetReferencePositionV2741();
    if (validRefCoordsV2741(ref?.coords)) return ref;

    // Defensive fallback: a valid TEMP must never degrade to "position required".
    if (validRefCoordsV2741(tempMarkPoint?.coords)) {
      return { type:'TEMP', coords:[Number(tempMarkPoint.coords[0]), Number(tempMarkPoint.coords[1])] };
    }
    return null;
  };

  function textV2741(key, fallback) {
    try {
      const value = window.reconT?.(key);
      return value && value !== key ? value : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function currentLangV2741() {
    return document.documentElement.lang === 'en' ? 'en' : 'ko';
  }

  function routeSequenceV2741() {
    const seq = [];
    (routeViaPoints || []).forEach(v => {
      if (validRefCoordsV2741(v?.coords)) seq.push({ ...v, __navRole:'VIA' });
    });
    if (validRefCoordsV2741(targetModeTarget?.coords)) seq.push({ ...targetModeTarget, __navRole:'TARGET' });
    if (validRefCoordsV2741(routeEndPoint?.coords)) seq.push({ ...routeEndPoint, __navRole:'END' });
    return seq;
  }

  function roleTextV2741(role) {
    if (role === 'VIA') return textV2741('via', currentLangV2741() === 'ko' ? '경유점' : 'VIA');
    if (role === 'END') return textV2741('end', currentLangV2741() === 'ko' ? '도착점' : 'END');
    return textV2741('target', currentLangV2741() === 'ko' ? '목표' : 'OBJECTIVE');
  }

  function refTextV2741(ref) {
    if (!ref?.type) return textV2741('refShort', 'REF --');
    if (ref.type === 'TEMP') return textV2741('temp', currentLangV2741() === 'ko' ? '임시위치' : 'TEMP POS');
    if (ref.type === 'LAST_GPS') return textV2741('lastGps', currentLangV2741() === 'ko' ? '최종수신점' : 'LAST FIX');
    return 'GPS';
  }

  function clearDynamicI18nBindingsV2741() {
    ['planNavHint','targetModeName','navHudTarget'].forEach(id => {
      document.getElementById(id)?.removeAttribute('data-recon-i18n');
    });
  }

  function syncRouteAndReferenceStatusV2741() {
    clearDynamicI18nBindingsV2741();

    const ref = getReferencePosition();
    const seq = routeSequenceV2741();
    const planNext = seq[0] || null;
    const navDest = targetModeActive && targetModePhase === 'NAV'
      ? (getCurrentNavDestination?.() || seq[Math.min(navLegIndex || 0, Math.max(0, seq.length - 1))] || null)
      : null;

    const modeName = document.getElementById('targetModeName');
    if (modeName) {
      if (targetModeTarget?.name) {
        modeName.textContent = String(targetModeTarget.name);
      } else if (planNext) {
        const nextName = String(planNext.name || roleTextV2741(planNext.__navRole)).trim();
        modeName.textContent = `${textV2741('routeStatus', 'ROUTE')} · ${textV2741('nextPoint', 'NEXT')} ${nextName}`;
      } else {
        modeName.textContent = textV2741('noRoute', currentLangV2741() === 'ko' ? '경로 없음' : 'NO ROUTE');
      }
    }

    const navTarget = document.getElementById('navHudTarget');
    if (navTarget) {
      if (navDest) navTarget.textContent = String(navDest.name || roleTextV2741(navDest.__navRole));
      else if (planNext) navTarget.textContent = String(planNext.name || roleTextV2741(planNext.__navRole));
      else navTarget.textContent = textV2741('noRoute', currentLangV2741() === 'ko' ? '경로 없음' : 'NO ROUTE');
    }

    const navRef = document.getElementById('navHudRef');
    if (navRef) {
      navRef.textContent = ref?.coords
        ? (currentLangV2741() === 'ko' ? `기준 ${refTextV2741(ref)}` : `REF ${refTextV2741(ref)}`)
        : textV2741('refShort', 'REF --');
    }

    const hint = document.getElementById('planNavHint');
    const planHead = document.getElementById('planInfoTrigger');
    const hasObjective = validRefCoordsV2741(targetModeTarget?.coords);
    const navReady = Boolean(targetModeActive && targetModePhase === 'PLAN' && ref?.coords && hasObjective);

    if (hint) {
      hint.textContent = navReady
        ? textV2741('tapToStart', currentLangV2741() === 'ko' ? '탭하여 항법 시작' : 'TAP TO START')
        : (!ref?.coords
            ? textV2741('positionRequired', currentLangV2741() === 'ko' ? '기준위치 필요' : 'REF POS REQUIRED')
            : textV2741('objectiveRequired', currentLangV2741() === 'ko' ? '목표 필요' : 'OBJECTIVE REQUIRED'));
    }

    if (planHead) {
      planHead.classList.toggle('nav-unavailable', !navReady);
      planHead.setAttribute('aria-disabled', String(!navReady));
      planHead.tabIndex = navReady ? 0 : -1;
    }
  }

  const baseSyncKnownActionAvailabilityV2741 = syncKnownActionAvailability;
  syncKnownActionAvailability = function() {
    const out = baseSyncKnownActionAvailabilityV2741();
    syncRouteAndReferenceStatusV2741();
    return out;
  };

  const baseUpdateTargetModePanelV2741 = updateTargetModePanel;
  updateTargetModePanel = function() {
    const out = baseUpdateTargetModePanelV2741();
    syncRouteAndReferenceStatusV2741();
    return out;
  };

  const baseRefreshPositionStateV2741 = refreshPositionState;
  refreshPositionState = function() {
    const out = baseRefreshPositionStateV2741();
    syncRouteAndReferenceStatusV2741();
    return out;
  };

  clearDynamicI18nBindingsV2741();
  syncRouteAndReferenceStatusV2741();
})();
