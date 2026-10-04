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
