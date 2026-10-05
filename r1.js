/* Tactical Recon R1.1
 * Map-first field UI polish and persistent reference rendering.
 * Keeps PlanV1/TrackV2 schemas compatible with V28.
 */
(() => {
  'use strict';

  const root=window;
  const base=root.v28;
  const core=root.v29;
  if(!base||!core)return;

  const LAST_FIX_KEY='tactical_recon_last_fix_v1';
  const NAV_RECOVERY_KEY='tactical_recon_nav_recovery_v1';
  const BACKUP_FORMAT='TACTICAL_RECON_BACKUP';
  const BACKUP_VERSION=1;
  const FREE_PLAN_KEY='tactical_recon_free_track_plan_v1';

  let installed=false;
  let pickerMode=null;
  let pickerReturn=null;
  let bearingSensorOn=false;
  let bearingHeading=null;
  let bearingLastEventAt=0;
  let lastBearingBundle=null;
  let siteStatusFilter='ALL';
  let siteSourceFilter='ALL';
  let navRecoveryInstalled=false;
  let r11LastFixMarker=null;

  const text={
    ko:{
      locate:'위치',bearing:'방위각',map:'지도',data:'데이터',system:'시스템',
      siteAdd:'+ 거점 추가',positionSearch:'위치 검색',tempSet:'TEMP 지정',tempClear:'TEMP 삭제',
      homeSet:'HOME 지정',homeGo:'HOME 이동',homeClear:'HOME 삭제',gpsStatus:'GPS 상태',
      gpsPower:'GPS 전원',nearby:'주변 탐색',layers:'레이어',roads:'도로 강조',display:'표시 모드',
      reuse:'재활용/궤적',gpx:'GPX 반출',backup:'전체 백업',restore:'백업 복원',
      freeTrack:'자유 궤적 시작',freeTrackManage:'자유 궤적 관리',
      recon:'탐색',records:'기록',lightMap:'경량 지도',standardMap:'일반 지도',language:'언어',
      reconRecorded:'기록 거점 탐색',reconWild:'미개척 탐색',reconRange:'탐색 반경',
      objectiveInfo:'목표 정보',objectiveChange:'목표 변경',planAction:'계획',navAction:'항법',bearingAction:'방위각',mapFit:'지도 맞춤',
      drawRoute:'ROUTE',drawDanger:'위험',drawBlocked:'차단',drawObservation:'관측',drawReference:'참고',drawOther:'기타',
      pickerSearch:'위치 검색',pickerCancel:'취소',pickerSite:'이 위치 선택',pickerObjective:'목표로 지정',
      pickerTemp:'TEMP로 지정',pickerHome:'HOME으로 지정',
      objectiveHint:'탭하여 목표 변경',objectiveRequired:'목표 지정 필요',navStart:'탭하여 항법 시작',positionRequired:'위치 기준 필요',
      noObjective:'목표 미지정',sensorOff:'센서 OFF',sensorOn:'센서 ON',sensorUse:'센서 나침반 사용',
      sensorStop:'센서 끄기',sensorUnavailable:'이 기기/브라우저에서 절대방위 센서를 사용할 수 없습니다.',
      sensorDenied:'센서 권한이 허용되지 않았습니다.',sensorNote:'기본은 계산형 방위각입니다. 센서는 필요할 때만 직접 켜며 이 화면을 벗어나면 자동으로 꺼집니다.',
      grid:'GRID',true:'TRUE',mag:'MAG',device:'기기 자북',targetDelta:'목표까지 회전',
      backupDone:'백업 파일을 만들었습니다.',restoreDone:'백업을 복원했습니다. 앱을 다시 엽니다.',
      invalidBackup:'올바른 TACTICAL RECON 백업 파일이 아닙니다.',
      storageFail:'저장 실패 · 기록을 확인하세요',storageFailBody:'브라우저 저장공간 쓰기에 실패했습니다. TRACK은 IndexedDB 안전 미러를 시도했지만, 계속 이동하기 전에 백업/저장 상태를 확인하세요.',
      navRecovery:'이전 항법 세션',restoreNav:'복원',discardNav:'종료',
      restoredNav:'항법 세션을 복원했습니다. GPS/센서는 자동으로 켜지지 않았습니다.',
      lastFix:'LAST FIX',statusAll:'전체',statusUnverified:'미확인',statusVerified:'확인완료',
      sourceAll:'전체 출처',sourceBuiltin:'기본 DB',sourceLocal:'내 기록',
      freePlan:'자유 궤적',freeStarted:'자유 궤적 기록을 시작했습니다.',trackPaused:'궤적 일시정지',trackResumed:'궤적 기록 재개',
      saveBeforeDelete:'삭제 전 전체 백업을 권장합니다.'
    },
    en:{
      locate:'POSITION',bearing:'BEARING',map:'MAP',data:'DATA',system:'SYSTEM',
      siteAdd:'+ ADD SITE',positionSearch:'POSITION SEARCH',tempSet:'SET TEMP',tempClear:'CLEAR TEMP',
      homeSet:'SET HOME',homeGo:'GO HOME',homeClear:'CLEAR HOME',gpsStatus:'GPS STATUS',
      gpsPower:'GPS POWER',nearby:'NEARBY',layers:'LAYERS',roads:'ROAD BOOST',display:'DISPLAY',
      reuse:'REUSE / TRACKS',gpx:'GPX EXPORT',backup:'FULL BACKUP',restore:'RESTORE BACKUP',
      freeTrack:'START FREE TRACK',freeTrackManage:'MANAGE FREE TRACK',
      recon:'RECON',records:'RECORDS',lightMap:'LIGHT MAP',standardMap:'STANDARD MAP',language:'LANGUAGE',
      reconRecorded:'RECORDED SITE',reconWild:'UNEXPLORED',reconRange:'RECON RANGE',
      objectiveInfo:'OBJECTIVE INFO',objectiveChange:'CHANGE OBJ',planAction:'PLAN',navAction:'NAV',bearingAction:'BEARING',mapFit:'FIT MAP',
      drawRoute:'ROUTE',drawDanger:'DANGER',drawBlocked:'BLOCKED',drawObservation:'OBS',drawReference:'REFERENCE',drawOther:'OTHER',
      pickerSearch:'POSITION SEARCH',pickerCancel:'CANCEL',pickerSite:'USE THIS LOCATION',pickerObjective:'SET OBJECTIVE',
      pickerTemp:'SET TEMP',pickerHome:'SET HOME',
      objectiveHint:'TAP TO CHANGE OBJECTIVE',objectiveRequired:'OBJECTIVE REQUIRED',navStart:'TAP TO START NAV',positionRequired:'REFERENCE REQUIRED',
      noObjective:'OBJECTIVE NOT SET',sensorOff:'SENSOR OFF',sensorOn:'SENSOR ON',sensorUse:'USE COMPASS SENSOR',
      sensorStop:'STOP SENSOR',sensorUnavailable:'ABSOLUTE ORIENTATION SENSOR IS NOT AVAILABLE.',sensorDenied:'SENSOR PERMISSION WAS NOT GRANTED.',
      sensorNote:'BEARING CALCULATION WORKS WITH THE SENSOR OFF. THE COMPASS SENSOR STARTS ONLY ON REQUEST AND STOPS WHEN YOU LEAVE THIS SCREEN.',
      grid:'GRID',true:'TRUE',mag:'MAG',device:'DEVICE MAG',targetDelta:'TURN TO TARGET',
      backupDone:'BACKUP CREATED.',restoreDone:'BACKUP RESTORED. RELOADING.',invalidBackup:'NOT A VALID TACTICAL RECON BACKUP.',
      storageFail:'SAVE FAILED · CHECK RECORDING',storageFailBody:'BROWSER STORAGE WRITE FAILED. AN INDEXEDDB SAFETY MIRROR WAS ATTEMPTED. VERIFY STORAGE/BACKUP BEFORE CONTINUING.',
      navRecovery:'PREVIOUS NAV SESSION',restoreNav:'RESTORE',discardNav:'DISCARD',
      restoredNav:'NAV SESSION RESTORED. GPS/SENSORS WERE NOT STARTED AUTOMATICALLY.',
      lastFix:'LAST FIX',statusAll:'ALL',statusUnverified:'UNVERIFIED',statusVerified:'VERIFIED',
      sourceAll:'ALL SOURCES',sourceBuiltin:'BUILT-IN DB',sourceLocal:'MY RECORDS',
      freePlan:'FREE TRACK',freeStarted:'FREE TRACK RECORDING STARTED.',trackPaused:'TRACK PAUSED',trackResumed:'TRACK RESUMED',
      saveBeforeDelete:'A FULL BACKUP IS RECOMMENDED BEFORE DELETION.'
    }
  };

  function lang(){return document.documentElement.lang==='en'?'en':'ko';}
  function t(key){return text[lang()][key]||text.en[key]||key;}
  function validCoords(c){return Array.isArray(c)&&c.length>=2&&Number.isFinite(Number(c[0]))&&Number.isFinite(Number(c[1]))&&Math.abs(Number(c[0]))<=90&&Math.abs(Number(c[1]))<=180;}
  function normalize360(v){return ((Number(v)%360)+360)%360;}
  function signed180(v){const n=normalize360(v);return n>180?n-360:n;}
  function readJson(key,fallback=null){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}

  function notify(message,kind='info',timeout=2600){
    let box=document.getElementById('v29Toast');
    if(!box){
      box=document.createElement('div');
      box.id='v29Toast';
      box.className='v29-toast';
      document.body.appendChild(box);
    }
    box.dataset.kind=kind;
    box.textContent=String(message||'');
    box.classList.add('show');
    clearTimeout(box._timer);
    box._timer=setTimeout(()=>box.classList.remove('show'),timeout);
  }

  function currentReference(){
    try{
      const ref=typeof getReferencePosition==='function'?getReferencePosition():null;
      return ref?.coords&&validCoords(ref.coords)?ref:null;
    }catch(e){return null;}
  }

  function activePlan(){
    return base.state.activePlanId?base.plans.get(base.state.activePlanId):null;
  }

  function activeObjective(){
    const plan=activePlan();
    return plan?.objective?.coords&&validCoords(plan.objective.coords)?plan.objective:null;
  }

  /* ---------- unified location service ---------- */
  const locationTokens={address:0,route:0,plan:0};

  function parseLocation(query){
    const raw=String(query||'').trim();
    if(!raw)return null;
    try{
      if(typeof parseDirectRouteLocation==='function'){
        const direct=parseDirectRouteLocation(raw);
        if(direct&&validCoords([Number(direct.lat),Number(direct.lon)])){
          return {lat:Number(direct.lat),lon:Number(direct.lon),name:(direct.source||'COORDINATE')+' POSITION',address:'',source:String(direct.source||'INPUT')};
        }
      }
    }catch(e){}
    const m=raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if(m&&validCoords([Number(m[1]),Number(m[2])])){
      return {lat:Number(m[1]),lon:Number(m[2]),name:'WGS84 POSITION',address:'',source:'WGS84'};
    }
    try{
      if(root.mgrs?.toPoint){
        const p=root.mgrs.toPoint(raw.replace(/\s+/g,''));
        const coords=[Number(p?.[1]),Number(p?.[0])];
        if(validCoords(coords))return {lat:coords[0],lon:coords[1],name:'MGRS POSITION',address:'',source:'MGRS'};
      }
    }catch(e){}
    return null;
  }

  async function searchLocations(query){
    const direct=parseLocation(query);
    if(direct)return [direct];
    if(!navigator.onLine){
      const error=new Error('OFFLINE_ADDRESS_UNAVAILABLE');
      error.code='OFFLINE';
      throw error;
    }
    const url='https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=6&addressdetails=1&accept-language=ko&q='+encodeURIComponent(String(query||'').trim());
    const response=await fetch(url,{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('LOCATION_SEARCH_FAILED');
    const rows=await response.json();
    if(!Array.isArray(rows))return [];
    return rows.map(row=>{
      const lat=Number(row.lat),lon=Number(row.lon);
      if(!validCoords([lat,lon]))return null;
      let address=String(row.display_name||query||'').trim();
      try{
        if(typeof normalizeKoreanAddress==='function')address=normalizeKoreanAddress(row,address)||address;
      }catch(e){}
      return {lat,lon,name:String(row.name||address||query||'POSITION'),address,source:'ADDRESS',raw:row};
    }).filter(Boolean);
  }

  function coordsSubtitle(item,digits=5){
    const mgrsText=typeof calcMGRS==='function'?calcMGRS(item.lat,item.lon):'';
    return item.lat.toFixed(digits)+', '+item.lon.toFixed(digits)+(mgrsText?' · '+mgrsText:'');
  }

  function installUnifiedSearch(){
    root.v29Location={parse:parseLocation,search:searchLocations};

    if(typeof searchKoreanAddress==='function'&&!searchKoreanAddress.__v29Unified){
      const wrapped=async function(){
        const input=document.getElementById('addressSearchInput');
        const results=document.getElementById('addressSearchResults');
        const button=document.getElementById('addressSearchButton');
        const query=input?.value.trim();
        if(!query||!results){input?.focus();return;}
        const token=++locationTokens.address;
        selectedAddressResult=null;
        if(typeof setAddressSearchActionsEnabled==='function')setAddressSearchActionsEnabled(false);
        results.innerHTML='<div class="address-search-empty">SEARCHING...</div>';
        if(button)button.disabled=true;
        try{
          const found=await searchLocations(query);
          if(token!==locationTokens.address)return;
          results.textContent='';
          if(!found.length){results.innerHTML='<div class="address-search-empty">'+(lang()==='ko'?'검색 결과가 없습니다.':'NO RESULTS')+'</div>';return;}
          found.forEach((item,index)=>{
            const row=document.createElement('button');row.type='button';row.className='address-search-item';
            const title=document.createElement('span');title.className='address-search-name';title.textContent=item.address||item.name;
            const sub=document.createElement('span');sub.className='address-search-coords';sub.textContent=coordsSubtitle(item,item.source==='ADDRESS'?5:6);
            row.append(title,sub);
            row.onclick=()=>selectAddressResult(item,row);
            results.appendChild(row);
            if(found.length===1&&item.source!=='ADDRESS')selectAddressResult(item,row);
          });
        }catch(e){
          if(token!==locationTokens.address)return;
          results.innerHTML='<div class="address-search-empty">'+(e?.code==='OFFLINE'
            ? (lang()==='ko'?'OFFLINE · 주소 검색은 사용할 수 없습니다. WGS84 또는 MGRS를 입력하세요.':'OFFLINE · ADDRESS SEARCH UNAVAILABLE. ENTER WGS84 OR MGRS.')
            : (lang()==='ko'?'위치 검색에 실패했습니다.':'LOCATION SEARCH FAILED.'))+'</div>';
        }finally{if(button&&token===locationTokens.address)button.disabled=false;}
      };
      wrapped.__v29Unified=true;
      searchKoreanAddress=wrapped;
    }

    if(typeof searchRouteLocate==='function'&&!searchRouteLocate.__v29Unified){
      const wrapped=async function(){
        if(!targetModeActive||targetModePhase!=='PLAN')return;
        const input=document.getElementById('routeLocateInput');
        const results=document.getElementById('routeLocateResults');
        const button=document.getElementById('routeLocateSearchBtn');
        const query=input?.value.trim();
        if(!query||!results){input?.focus();return;}
        const token=++locationTokens.route;
        routeLocateSelected=null;
        if(typeof setRouteLocateActionsEnabled==='function')setRouteLocateActionsEnabled(false);
        if(typeof updateRouteLocateReadout==='function')updateRouteLocateReadout(null);
        results.innerHTML='<div class="address-search-empty">SEARCHING...</div>';
        if(button)button.disabled=true;
        try{
          const found=await searchLocations(query);
          if(token!==locationTokens.route)return;
          results.textContent='';
          if(!found.length){results.innerHTML='<div class="address-search-empty">'+(lang()==='ko'?'검색 결과가 없습니다.':'NO RESULTS')+'</div>';return;}
          found.forEach(item=>{
            const row=document.createElement('button');row.type='button';row.className='address-search-item';
            const title=document.createElement('span');title.className='address-search-name';title.textContent=item.address||item.name;
            const sub=document.createElement('span');sub.className='address-search-coords';sub.textContent=coordsSubtitle(item,item.source==='ADDRESS'?5:6);
            row.append(title,sub);
            row.onclick=()=>selectRouteLocateResult(item,row);
            results.appendChild(row);
            if(found.length===1&&item.source!=='ADDRESS'){
              selectRouteLocateResult(item,row);
              try{resolveRouteLocateAddress(item,routeLocateSearchToken);}catch(e){}
            }
          });
        }catch(e){
          if(token!==locationTokens.route)return;
          results.innerHTML='<div class="address-search-empty">'+(e?.code==='OFFLINE'
            ? (lang()==='ko'?'OFFLINE · WGS84 또는 MGRS를 입력하세요.':'OFFLINE · ENTER WGS84 OR MGRS.')
            : (lang()==='ko'?'위치 검색에 실패했습니다.':'LOCATION SEARCH FAILED.'))+'</div>';
        }finally{if(button&&token===locationTokens.route)button.disabled=false;}
      };
      wrapped.__v29Unified=true;
      searchRouteLocate=wrapped;
    }

    if(typeof searchPlanLocation==='function'&&!searchPlanLocation.__v29Unified){
      const wrapped=async function(){
        if(!targetModeActive||!['PLAN','NAV'].includes(targetModePhase))return;
        const input=document.getElementById('planSearchInput');
        const results=document.getElementById('planSearchResults');
        const button=document.getElementById('planSearchGoBtn');
        const query=input?.value.trim();
        if(!query||!results){input?.focus();return;}
        const token=++locationTokens.plan;
        results.innerHTML='<div class="address-search-empty">SEARCHING...</div>';
        if(button)button.disabled=true;
        try{
          const found=await searchLocations(query);
          if(token!==locationTokens.plan)return;
          results.textContent='';
          if(!found.length){results.innerHTML='<div class="address-search-empty">'+(lang()==='ko'?'검색 결과가 없습니다.':'NO RESULTS')+'</div>';return;}
          found.forEach(item=>{
            if(typeof appendPlanSearchResult==='function'){
              appendPlanSearchResult(item,item.address||item.name,coordsSubtitle(item,item.source==='ADDRESS'?5:6));
            }
          });
        }catch(e){
          if(token!==locationTokens.plan)return;
          results.innerHTML='<div class="address-search-empty">'+(e?.code==='OFFLINE'
            ? (lang()==='ko'?'OFFLINE · WGS84 또는 MGRS를 입력하세요.':'OFFLINE · ENTER WGS84 OR MGRS.')
            : (lang()==='ko'?'위치 검색에 실패했습니다.':'LOCATION SEARCH FAILED.'))+'</div>';
        }finally{if(button&&token===locationTokens.plan)button.disabled=false;}
      };
      wrapped.__v29Unified=true;
      searchPlanLocation=wrapped;
    }
  }

  /* ---------- persistent LAST FIX ---------- */
  function persistLastFix(pos){
    const lat=Number(pos?.coords?.latitude),lon=Number(pos?.coords?.longitude);
    if(!validCoords([lat,lon]))return;
    writeJson(LAST_FIX_KEY,{
      coords:[lat,lon],
      timestamp:Number(pos?.timestamp)||Date.now(),
      accuracyM:Number.isFinite(Number(pos?.coords?.accuracy))?Number(pos.coords.accuracy):undefined
    });
  }

  function persistentLastFix(){
    const raw=readJson(LAST_FIX_KEY,null);
    if(!raw||!validCoords(raw.coords))return null;
    const timestamp=Number(raw.timestamp)||0;
    return {
      type:'LAST_FIX',
      coords:[Number(raw.coords[0]),Number(raw.coords[1])],
      capturedAt:timestamp,
      ageMs:timestamp?Math.max(0,Date.now()-timestamp):undefined,
      accuracyM:Number.isFinite(Number(raw.accuracyM))?Number(raw.accuracyM):undefined
    };
  }


  function r11LastFixIcon(){
    const svg=typeof gpsMarkerSvg==='function'
      ? gpsMarkerSvg()
      : '<svg class="marker-symbol marker-gps" viewBox="0 0 24 24" aria-hidden="true"><circle class="marker-frame" cx="12" cy="12" r="7"></circle><path class="marker-detail" d="M12 3V6M12 18V21M3 12H6M18 12H21"></path><circle class="marker-core" cx="12" cy="12" r="2"></circle></svg>';
    return L.divIcon({
      className:'r11-last-fix-hitbox',
      iconSize:[48,48],
      iconAnchor:[24,24],
      html:'<div class="r11-last-fix-visual">'+svg+'<span>'+t('lastFix')+'</span></div>'
    });
  }

  function syncPersistentLastFixMarker(){
    if(typeof map==='undefined'||typeof L==='undefined')return;
    const ref=persistentLastFix();
    const liveGps=Boolean(
      typeof gpsPowerEnabled!=='undefined'&&
      typeof hasGpsFix!=='undefined'&&
      gpsPowerEnabled&&hasGpsFix
    );
    const legacyVisible=Boolean(document.querySelector('.last-gps-hitbox'));
    const shouldShow=Boolean(ref?.coords&&!liveGps&&!legacyVisible);

    if(!shouldShow){
      if(r11LastFixMarker&&map.hasLayer(r11LastFixMarker))map.removeLayer(r11LastFixMarker);
      return;
    }

    if(!r11LastFixMarker){
      r11LastFixMarker=L.marker(ref.coords,{
        icon:r11LastFixIcon(),
        keyboard:false,
        interactive:false,
        zIndexOffset:81
      });
    }else{
      r11LastFixMarker.setLatLng(ref.coords);
      r11LastFixMarker.setIcon(r11LastFixIcon());
    }
    if(!map.hasLayer(r11LastFixMarker))r11LastFixMarker.addTo(map);
  }

  function formatReferenceAge(ms){
    if(!Number.isFinite(Number(ms)))return '';
    const total=Math.max(0,Number(ms));
    const min=Math.round(total/60000);
    if(min<1)return lang()==='ko'?'방금':'NOW';
    if(min<60)return min+(lang()==='ko'?'분 전':' MIN AGO');
    const hour=Math.round(min/60);
    return hour+(lang()==='ko'?'시간 전':' H AGO');
  }

  function syncPersistentReferenceUi(){
    const ref=currentReference();
    if(ref?.type!=='LAST_FIX')return;
    const age=ref.ageMs!==undefined?ref.ageMs:(Number(ref.capturedAt)?Date.now()-Number(ref.capturedAt):undefined);
    const label=t('lastFix')+(Number.isFinite(Number(age))?' · '+formatReferenceAge(age):'');
    const accuracy=Number(ref.accuracyM);
    const full=label+(Number.isFinite(accuracy)?' · ±'+Math.round(accuracy)+' M':'');
    const detailRef=document.getElementById('gpsDetailRef');
    const detailAcc=document.getElementById('gpsDetailAcc');
    const navRef=document.getElementById('navHudRef');
    if(detailRef)detailRef.textContent=full;
    if(detailAcc&&Number.isFinite(accuracy))detailAcc.textContent='±'+Math.round(accuracy)+' M';
    if(navRef)navRef.textContent='REF '+full;
  }

  function installLastFix(){
    if(typeof applyGpsPosition==='function'&&!applyGpsPosition.__v29LastFix){
      const previous=applyGpsPosition;
      const wrapped=function(pos){
        const out=previous.apply(this,arguments);
        persistLastFix(pos);
        syncPersistentLastFixMarker();
        if(missionMapMode)syncMissionMapModeUi();
        return out;
      };
      wrapped.__v29LastFix=true;
      applyGpsPosition=wrapped;
    }
    if(typeof getReferencePosition==='function'&&!getReferencePosition.__v29LastFix){
      const previous=getReferencePosition;
      const wrapped=function(){
        const ref=previous.apply(this,arguments);
        if(ref?.coords&&validCoords(ref.coords))return ref;
        return persistentLastFix();
      };
      wrapped.__v29LastFix=true;
      getReferencePosition=wrapped;
    }
    if(typeof updateGpsDetail==='function'&&!updateGpsDetail.__v29LastFix){
      const previous=updateGpsDetail;
      const wrapped=function(){
        const out=previous.apply(this,arguments);
        syncPersistentReferenceUi();
        syncPersistentLastFixMarker();
        return out;
      };
      wrapped.__v29LastFix=true;
      updateGpsDetail=wrapped;
    }
    if(typeof refreshPositionState==='function'&&!refreshPositionState.__r11LastFixMarker){
      const previous=refreshPositionState;
      const wrapped=function(){
        const out=previous.apply(this,arguments);
        syncPersistentLastFixMarker();
        return out;
      };
      wrapped.__r11LastFixMarker=true;
      refreshPositionState=wrapped;
    }
    setTimeout(syncPersistentLastFixMarker,0);
  }

  /* ---------- PLAN header: objective on top, NAV on lower row ---------- */
  function installPlanHeader(){
    const head=document.getElementById('planInfoTrigger');
    if(!head||head.dataset.v29Split==='1')return;
    head.dataset.v29Split='1';
    head.dataset.v29TextOwner='1';
    head.removeAttribute('role');
    head.removeAttribute('tabindex');
    head.removeAttribute('aria-disabled');

    const copy=head.querySelector('.target-mode-copy');
    const stats=document.getElementById('targetModeStats');
    const hintWrap=head.querySelector('.plan-nav-hint');
    if(copy){
      copy.classList.add('v29-objective-area');
      copy.setAttribute('role','button');
      copy.setAttribute('tabindex','0');
      copy.addEventListener('click',event=>{event.stopPropagation();base.ui.openObjective();});
      copy.addEventListener('keydown',event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        event.preventDefault();event.stopPropagation();base.ui.openObjective();
      });
    }

    let navArea=head.querySelector('.v29-plan-nav-area');
    if(!navArea){
      navArea=document.createElement('div');
      navArea.className='v29-plan-nav-area';
      navArea.setAttribute('role','button');
      navArea.setAttribute('tabindex','0');
      if(stats)navArea.appendChild(stats);
      if(hintWrap)navArea.appendChild(hintWrap);
      head.appendChild(navArea);
      navArea.addEventListener('click',event=>{
        if(event.target.closest('#targetShareBtn'))return;
        event.stopPropagation();
        if(typeof startTargetNavigation==='function')startTargetNavigation();
      });
      navArea.addEventListener('keydown',event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        event.preventDefault();event.stopPropagation();
        if(typeof startTargetNavigation==='function')startTargetNavigation();
      });
    }

    document.getElementById('v28PlanNavBtn')?.remove();
    syncPlanHeader();
  }

  function syncPlanHeader(){
    const plan=activePlan();
    if(!plan||typeof targetModeActive==='undefined'||!targetModeActive||typeof targetModePhase==='undefined'||targetModePhase!=='PLAN')return;
    const kicker=document.querySelector('#planInfoTrigger .target-mode-kicker');
    const name=document.getElementById('targetModeName');
    const hint=document.getElementById('planNavHint');
    const navArea=document.querySelector('#planInfoTrigger .v29-plan-nav-area');
    const objective=plan.objective;
    const ref=currentReference();
    if(kicker)kicker.textContent=(lang()==='ko'?'계획 · ':'PLAN · ')+plan.name;
    if(name)name.textContent=objective?.name||t('noObjective');
    if(hint){
      if(!objective)hint.textContent=t('objectiveRequired');
      else if(ref?.type==='LAST_FIX')hint.textContent=t('lastFix')+' · '+formatReferenceAge(ref.ageMs);
      else hint.textContent=ref?.coords?t('navStart'):t('positionRequired');
    }
    navArea?.classList.toggle('ready',Boolean(objective&&ref?.coords));
  }

  function installNavReferenceGuard(){
    if(typeof startTargetNavigation!=='function'||startTargetNavigation.__v29ReferenceGuard)return;
    const previous=startTargetNavigation;
    const wrapped=function(){
      const ref=currentReference();
      if(ref?.type==='LAST_FIX'){
        const age=formatReferenceAge(ref.ageMs);
        const acc=Number(ref.accuracyM);
        const detail=t('lastFix')+(age?' · '+age:'')+(Number.isFinite(acc)?' · ±'+Math.round(acc)+' M':'');
        const message=lang()==='ko'
          ? detail+'를 현재 위치 기준으로 사용해 항법을 시작할까요?\nGPS/TEMP보다 오래된 위치일 수 있습니다.'
          : 'START NAV USING '+detail+' AS THE CURRENT REFERENCE?\nTHIS POSITION MAY BE STALE.';
        if(!confirm(message))return;
      }
      return previous.apply(this,arguments);
    };
    wrapped.__v29ReferenceGuard=true;
    startTargetNavigation=wrapped;
  }

  function wrapFinalPanelSync(){
    if(typeof updateTargetModePanel!=='function'||updateTargetModePanel.__v29Final)return;
    const previous=updateTargetModePanel;
    const wrapped=function(){
      const out=previous.apply(this,arguments);
      installPlanHeader();
      syncPlanHeader();
      persistNavRecovery();
      refreshBearingPanel();
      syncPersistentReferenceUi();
      return out;
    };
    wrapped.__v29Final=true;
    updateTargetModePanel=wrapped;
  }


  function blurSearchFocus(scope){
    try{
      const active=document.activeElement;
      if(active&&(!scope||scope.contains(active))&&typeof active.blur==='function')active.blur();
    }catch(e){}
  }

  function bindReliableClose(selector,handler,flag){
    const btn=document.querySelector(selector);
    if(!btn||btn.dataset[flag]==='1')return;
    btn.dataset[flag]='1';
    btn.removeAttribute('onclick');
    btn.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      handler();
    });
  }

  function installSearchCloseReliability(){
    if(typeof closePlanSearch==='function'&&!closePlanSearch.__v29ReliableClose){
      const previous=closePlanSearch;
      const wrapped=function(){
        locationTokens.plan++;
        const sheet=document.getElementById('planSearchSheet');
        blurSearchFocus(sheet);
        const out=previous.apply(this,arguments);
        sheet?.classList.remove('open');
        sheet?.setAttribute('aria-hidden','true');
        return out;
      };
      wrapped.__v29ReliableClose=true;
      closePlanSearch=wrapped;
    }

    if(typeof closeAddressSearch==='function'&&!closeAddressSearch.__v29ReliableClose){
      const previous=closeAddressSearch;
      const wrapped=function(){
        locationTokens.address++;
        const backdrop=document.getElementById('addressSearchBackdrop');
        blurSearchFocus(backdrop);
        const out=previous.apply(this,arguments);
        if(backdrop)backdrop.style.display='none';
        return out;
      };
      wrapped.__v29ReliableClose=true;
      closeAddressSearch=wrapped;
    }

    if(typeof closeRouteLocate==='function'&&!closeRouteLocate.__v29ReliableClose){
      const previous=closeRouteLocate;
      const wrapped=function(){
        locationTokens.route++;
        const backdrop=document.getElementById('routeLocateBackdrop');
        blurSearchFocus(backdrop);
        const out=previous.apply(this,arguments);
        if(backdrop)backdrop.style.display='none';
        return out;
      };
      wrapped.__v29ReliableClose=true;
      closeRouteLocate=wrapped;
    }

    bindReliableClose('#planSearchSheet .v271-sheet-close',()=>closePlanSearch(),'v29ReliableClose');
    bindReliableClose('#addressSearchBackdrop .promo-actions button[onclick*="closeAddressSearch"]',()=>closeAddressSearch(),'v29ReliableClose');
    bindReliableClose('#routeLocateBackdrop .promo-actions button[onclick*="closeRouteLocate"]',()=>closeRouteLocate(),'v29ReliableClose');

    if(!document.documentElement.dataset.v29SearchEscape){
      document.documentElement.dataset.v29SearchEscape='1';
      document.addEventListener('keydown',event=>{
        if(event.key!=='Escape')return;
        const plan=document.getElementById('planSearchSheet');
        const address=document.getElementById('addressSearchBackdrop');
        const route=document.getElementById('routeLocateBackdrop');
        const planOpen=Boolean(plan?.classList.contains('open'));
        const addressOpen=Boolean(address&&getComputedStyle(address).display!=='none');
        const routeOpen=Boolean(route&&getComputedStyle(route).display!=='none');
        if(!planOpen&&!addressOpen&&!routeOpen)return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if(planOpen)closePlanSearch();
        if(addressOpen)closeAddressSearch();
        if(routeOpen)closeRouteLocate();
      },true);
    }
  }

  /* ---------- shared map location picker ---------- */
  function pickerLabel(mode){
    if(mode==='SITE')return t('pickerSite');
    if(mode==='OBJECTIVE')return t('pickerObjective');
    if(mode==='TEMP')return t('pickerTemp');
    if(mode==='HOME')return t('pickerHome');
    return t('pickerSite');
  }

  function ensurePicker(){
    let el=document.getElementById('v29LocationPicker');
    if(el)return el;
    el=document.createElement('div');
    el.id='v29LocationPicker';
    el.className='v29-location-picker';
    el.hidden=true;
    el.innerHTML=
      '<div class="v29-picker-readout"><span id="v29PickerMode"></span><strong id="v29PickerCoords">--</strong></div>'+
      '<div class="v29-picker-actions">'+
        '<button class="osb-btn" id="v29PickerSearch" type="button"></button>'+
        '<button class="osb-btn active" id="v29PickerConfirm" type="button"></button>'+
        '<button class="osb-btn" id="v29PickerCancel" type="button"></button>'+
      '</div>';
    document.body.appendChild(el);
    el.querySelector('#v29PickerSearch').addEventListener('click',()=>{
      if(typeof openAddressSearch==='function'){
        openAddressSearch();
        syncAddressSearchPickerMode();
      }
    });
    el.querySelector('#v29PickerConfirm').addEventListener('click',confirmPicker);
    el.querySelector('#v29PickerCancel').addEventListener('click',closePicker);
    const update=()=>{
      if(el.hidden||typeof map==='undefined'||!map?.getCenter)return;
      const c=map.getCenter();
      const mgrsText=typeof calcMGRS==='function'?calcMGRS(c.lat,c.lng):'';
      el.querySelector('#v29PickerCoords').textContent=c.lat.toFixed(5)+', '+c.lng.toFixed(5)+(mgrsText?' · '+mgrsText:'');
    };
    if(typeof map!=='undefined'&&map?.on)map.on('moveend zoomend',update);
    el._update=update;
    return el;
  }

  function openPicker(mode,returnContext=null){
    const el=ensurePicker();
    pickerMode=mode;
    pickerReturn=returnContext;
    document.querySelectorAll('.v28-sheet.open,.v29-sheet.open').forEach(sheet=>sheet.classList.remove('open'));
    document.body.classList.remove('v28-sheet-open','v29-sheet-open');
    if(typeof closeFieldControls==='function')closeFieldControls();
    if(typeof closeWpDrawer==='function')closeWpDrawer();
    if(typeof closeSitrep==='function')closeSitrep();
    document.body.classList.add('v29-picking-location');
    el.hidden=false;
    el.querySelector('#v29PickerMode').textContent=
      mode==='OBJECTIVE'?(lang()==='ko'?'목표 위치 선택':'SELECT OBJECTIVE'):
      mode==='SITE'?(lang()==='ko'?'거점 위치 선택':'SELECT SITE'):
      mode==='TEMP'?'TEMP POS':
      'HOME';
    el.querySelector('#v29PickerSearch').textContent=t('pickerSearch');
    el.querySelector('#v29PickerConfirm').textContent=pickerLabel(mode);
    el.querySelector('#v29PickerCancel').textContent=t('pickerCancel');
    el._update?.();
  }

  function syncAddressSearchPickerMode(){
    const save=document.getElementById('addressSaveButton');
    const temp=document.getElementById('addressTempButton');
    const move=document.getElementById('addressMoveButton');
    const active=Boolean(pickerMode);
    if(save)save.hidden=active;
    if(temp)temp.hidden=active;
    if(move){
      move.hidden=false;
      move.textContent=active?(lang()==='ko'?'이 위치로 이동':'MOVE MAP HERE'):(lang()==='ko'?'지도에서 보기':'SHOW ON MAP');
    }
  }

  function closePicker(){
    const el=document.getElementById('v29LocationPicker');
    if(el)el.hidden=true;
    document.body.classList.remove('v29-picking-location');
    pickerMode=null;
    pickerReturn=null;
    const save=document.getElementById('addressSaveButton');
    const temp=document.getElementById('addressTempButton');
    if(save)save.hidden=false;
    if(temp)temp.hidden=false;
  }

  function confirmPicker(){
    if(typeof map==='undefined'||!map?.getCenter)return;
    const c=map.getCenter();
    const coords=[Number(c.lat),Number(c.lng)];
    if(!validCoords(coords))return;
    const mode=pickerMode;
    closePicker();
    if(mode==='OBJECTIVE'){
      const plan=activePlan();
      if(!plan){base.ui.openRoutes();return;}
      const next=base.plans.setObjective(plan.id,{
        id:'RETICLE-'+Date.now(),name:lang()==='ko'?'조준점 목표':'RETICLE OBJECTIVE',coords,source:'RETICLE'
      });
      if(next){
        base.ui.openPlan(next.id);
        setTimeout(()=>{installMissionHeader();returnToMissionMap({frame:true});},0);
      }
      return;
    }
    if(mode==='SITE'){
      if(typeof openPointPlacement==='function')openPointPlacement();
      return;
    }
    if(mode==='TEMP'){
      if(typeof setTempMark==='function')setTempMark(coords,'TEMP POS');
      return;
    }
    if(mode==='HOME'){
      if(typeof setHomeAtReticle==='function')setHomeAtReticle();
    }
  }

  function bindObjectiveReticle(){
    const old=document.getElementById('v28ObjectiveReticleBtn');
    if(!old||old.dataset.v29Picker==='1')return;
    const clone=old.cloneNode(true);
    clone.dataset.v29Picker='1';
    old.replaceWith(clone);
    clone.addEventListener('click',()=>openPicker('OBJECTIVE','PLAN'));
  }

  /* ---------- SITES filters + add ---------- */
  function installSiteControls(){
    const drawer=document.getElementById('wpDrawer');
    if(!drawer)return;
    const filterBar=drawer.querySelector('.wp-filter-bar');
    if(filterBar&&filterBar.dataset.v29Filters!=='1'){
      filterBar.dataset.v29Filters='1';
      filterBar.classList.add('v29-site-filter-shell');
      filterBar.innerHTML=
        '<div class="v29-status-filters">'+
          '<button class="wp-filter-btn active" data-v29-status="ALL" type="button"></button>'+
          '<button class="wp-filter-btn" data-v29-status="UNEXPLORED" type="button"></button>'+
          '<button class="wp-filter-btn" data-v29-status="SECURED" type="button"></button>'+
        '</div>'+
        '<div class="v29-source-filters">'+
          '<button class="wp-filter-btn active" data-v29-source="ALL" type="button"></button>'+
          '<button class="wp-filter-btn" data-v29-source="BUILTIN" type="button"></button>'+
          '<button class="wp-filter-btn" data-v29-source="LOCAL" type="button"></button>'+
        '</div>';
      filterBar.querySelectorAll('[data-v29-status]').forEach(btn=>btn.addEventListener('click',()=>{
        siteStatusFilter=btn.dataset.v29Status;
        filterBar.querySelectorAll('[data-v29-status]').forEach(x=>x.classList.toggle('active',x===btn));
        if(typeof waypointGroupsCollapsed!=='undefined'){
          waypointGroupsCollapsed.UNEXPLORED=false;waypointGroupsCollapsed.SECURED=false;waypointGroupsCollapsed.REGISTERED=false;
        }
        renderWpDrawerList();
      }));
      filterBar.querySelectorAll('[data-v29-source]').forEach(btn=>btn.addEventListener('click',()=>{
        siteSourceFilter=btn.dataset.v29Source;
        filterBar.querySelectorAll('[data-v29-source]').forEach(x=>x.classList.toggle('active',x===btn));
        renderWpDrawerList();
      }));
    }

    if(!document.getElementById('v29SiteAddBar')){
      const bar=document.createElement('div');
      bar.id='v29SiteAddBar';
      bar.className='v29-site-add-bar';
      bar.innerHTML='<button class="osb-btn active" id="v29SiteAddBtn" type="button"></button>';
      drawer.querySelector('.drawer-head')?.after(bar);
      bar.querySelector('button').addEventListener('click',()=>openPicker('SITE','SITES'));
    }
    const footer=drawer.lastElementChild;
    if(footer&&!document.getElementById('v29SiteBackupBtn')){
      const backup=document.createElement('button');
      backup.className='osb-btn';
      backup.id='v29SiteBackupBtn';
      backup.type='button';
      backup.addEventListener('click',exportFullBackup);
      const destructive=Array.from(footer.querySelectorAll('button')).find(btn=>String(btn.getAttribute('onclick')||'').includes('clearAllWP'));
      footer.insertBefore(backup,destructive||null);
      const note=footer.querySelector('div');
      if(note)note.dataset.v29BackupNote='1';
    }
    syncSiteControlsText();
  }

  function syncSiteControlsText(){
    const bar=document.querySelector('#wpDrawer .wp-filter-bar');
    if(bar){
      const map={
        '[data-v29-status="ALL"]':t('statusAll'),
        '[data-v29-status="UNEXPLORED"]':t('statusUnverified'),
        '[data-v29-status="SECURED"]':t('statusVerified'),
        '[data-v29-source="ALL"]':t('sourceAll'),
        '[data-v29-source="BUILTIN"]':t('sourceBuiltin'),
        '[data-v29-source="LOCAL"]':t('sourceLocal')
      };
      Object.entries(map).forEach(([sel,label])=>{const el=bar.querySelector(sel);if(el)el.textContent=label;});
    }
    const add=document.getElementById('v29SiteAddBtn');if(add)add.textContent=t('siteAdd');
    const backup=document.getElementById('v29SiteBackupBtn');if(backup)backup.textContent=t('backup');
    const note=document.querySelector('#wpDrawer [data-v29-backup-note="1"]');
    if(note)note.textContent=(lang()==='ko'
      ? 'REGISTERED 기본 DB는 삭제되지 않습니다. 로컬 거점 전체 삭제 전에는 전체 백업을 권장합니다.'
      : 'BUILT-IN REGISTERED SITES ARE KEPT. A FULL BACKUP IS RECOMMENDED BEFORE DELETING LOCAL SITES.');
  }

  function installSiteFilterData(){
    if(typeof getWaypointEntries!=='function'||getWaypointEntries.__v29Separated)return;
    const wrapped=function(){
      const local=typeof getLocalIntel==='function'?getLocalIntel().map(item=>({...item})):[];
      const localIds=new Set(local.filter(item=>item?.source==='REGISTERED_VERIFICATION').map(item=>String(item.id)));
      const registered=(typeof RECON_TARGETS!=='undefined'&&Array.isArray(RECON_TARGETS)?RECON_TARGETS:[])
        .filter(item=>!localIds.has(String(item.id)))
        .map(item=>({...item,__kind:'REGISTERED'}));
      const statusFiltered=local.filter(item=>
        siteStatusFilter==='ALL'||String(item.status||'UNEXPLORED')===siteStatusFilter
      );
      return {
        REGISTERED:(siteSourceFilter!=='LOCAL'&&siteStatusFilter==='ALL')?registered:[],
        UNEXPLORED:siteSourceFilter!=='BUILTIN'?statusFiltered.filter(item=>item.status!=='SECURED'):[],
        SECURED:siteSourceFilter!=='BUILTIN'?statusFiltered.filter(item=>item.status==='SECURED'):[],
        USER_PLACED:[]
      };
    };
    wrapped.__v29Separated=true;
    getWaypointEntries=wrapped;
  }

  /* ---------- reorganized menu ---------- */
  function makeSection(id,title,html){
    let section=document.getElementById(id);
    if(section)return section;
    section=document.createElement('div');
    section.className='field-control-section v29-control-section';
    section.id=id;
    section.innerHTML='<div class="v29-control-label">'+title+'</div>'+html;
    document.getElementById('fieldControlTray')?.appendChild(section);
    return section;
  }

  function installMenu(){
    const menu=document.querySelector('#control-menu .v26-menu-grid');
    if(!menu)return;
    menu.innerHTML=
      '<button class="osb-btn" data-v29-menu="position" type="button"></button>'+
      '<button class="osb-btn" data-v29-menu="bearing" type="button"></button>'+
      '<button class="osb-btn" data-v29-menu="maptools" type="button"></button>'+
      '<button class="osb-btn" data-v29-menu="data" type="button"></button>'+
      '<button class="osb-btn" data-v29-menu="system" type="button"></button>';
    menu.querySelectorAll('[data-v29-menu]').forEach(btn=>btn.addEventListener('click',()=>openFieldControls(btn.dataset.v29Menu)));
    const note=document.querySelector('#control-menu .v26-menu-note');
    if(note)note.textContent=lang()==='ko'?'기능을 사용 목적별로 분리했습니다. GPS와 센서는 필요한 경우에만 직접 켜집니다.':'CONTROLS ARE GROUPED BY TASK. GPS AND SENSORS START ONLY WHEN REQUESTED.';

    const position=makeSection('control-position','POSITION',
      '<div class="field-control-grid v29-two-col">'+
      '<button class="osb-btn" id="v29GpsStatusBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29PositionSearchBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29TempSetBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29TempClearBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29HomeSetBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29HomeGoBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29HomeClearBtn" type="button"></button>'+
      '<button class="osb-btn active" id="v29PositionSiteAddBtn" type="button"></button>'+
      '</div>');

    const mapSection=makeSection('control-maptools','MAP',
      '<div class="field-control-grid v29-two-col">'+
      '<button class="osb-btn" id="v29NearbyBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29LayersBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29RoadBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29DisplayBtn" type="button"></button>'+
      '</div>');

    const data=makeSection('control-data','DATA',
      '<div class="field-control-grid v29-two-col">'+
      '<button class="osb-btn" id="v29ReuseBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29GpxBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29BackupBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29RestoreBtn" type="button"></button>'+
      '<button class="osb-btn active" id="v29FreeTrackBtn" type="button"></button>'+
      '</div><input type="file" id="v29BackupInput" accept="application/json,.json" hidden>'+
      '<div class="v29-storage-meter" id="v29StorageMeter"></div>');

    const system=makeSection('control-system','SYSTEM',
      '<div class="field-control-grid v29-two-col">'+
      '<button class="osb-btn" id="v29SystemGpsBtn" type="button"></button>'+
      '<button class="osb-btn" id="v29SystemDisplayBtn" type="button"></button>'+
      '</div>');

    installBearingSection();
    syncMenuText();

    position.querySelector('#v29GpsStatusBtn')?.addEventListener('click',()=>{closeFieldControls();openGpsDetail();});
    position.querySelector('#v29PositionSearchBtn')?.addEventListener('click',()=>{closeFieldControls();openAddressSearch();});
    position.querySelector('#v29TempSetBtn')?.addEventListener('click',()=>openPicker('TEMP'));
    position.querySelector('#v29TempClearBtn')?.addEventListener('click',()=>{clearTempMark();closeFieldControls();});
    position.querySelector('#v29HomeSetBtn')?.addEventListener('click',()=>openPicker('HOME'));
    position.querySelector('#v29HomeGoBtn')?.addEventListener('click',()=>{centerHome();closeFieldControls();});
    position.querySelector('#v29HomeClearBtn')?.addEventListener('click',()=>clearHomePoint());
    position.querySelector('#v29PositionSiteAddBtn')?.addEventListener('click',()=>openPicker('SITE'));

    mapSection.querySelector('#v29NearbyBtn')?.addEventListener('click',()=>openFieldControls('radar'));
    mapSection.querySelector('#v29LayersBtn')?.addEventListener('click',()=>openFieldControls('layers'));
    mapSection.querySelector('#v29RoadBtn')?.addEventListener('click',function(){toggleRoadBoost(this);});
    mapSection.querySelector('#v29DisplayBtn')?.addEventListener('click',()=>openFieldControls('optic'));

    data.querySelector('#v29ReuseBtn')?.addEventListener('click',()=>{closeFieldControls();root.openV29FieldKit?.('reuse');});
    data.querySelector('#v29GpxBtn')?.addEventListener('click',()=>{closeFieldControls();root.openV29FieldKit?.('export');});
    data.querySelector('#v29BackupBtn')?.addEventListener('click',exportFullBackup);
    data.querySelector('#v29RestoreBtn')?.addEventListener('click',()=>data.querySelector('#v29BackupInput')?.click());
    data.querySelector('#v29BackupInput')?.addEventListener('change',event=>restoreFullBackup(event.target.files?.[0]));
    data.querySelector('#v29FreeTrackBtn')?.addEventListener('click',toggleFreeTrack);
    updateStorageMeter();

    system.querySelector('#v29SystemGpsBtn')?.addEventListener('click',()=>toggleGpsPower());
    system.querySelector('#v29SystemDisplayBtn')?.addEventListener('click',()=>openFieldControls('optic'));

    if(typeof openFieldControls==='function'&&!openFieldControls.__v29Menu){
      const previous=openFieldControls;
      const wrapped=function(section){
        if(section!=='bearing')stopBearingSensor();
        const out=previous.apply(this,arguments);
        const title=document.getElementById('fieldControlTitle');
        const names={position:t('locate'),bearing:t('bearing'),maptools:t('map'),data:t('data'),system:t('system')};
        if(title&&names[section])title.textContent=names[section];
        if(section==='bearing')refreshBearingPanel();
        if(section==='data')updateStorageMeter();
        return out;
      };
      wrapped.__v29Menu=true;
      openFieldControls=wrapped;
    }
    if(typeof closeFieldControls==='function'&&!closeFieldControls.__v29Sensor){
      const previous=closeFieldControls;
      const wrapped=function(){stopBearingSensor();return previous.apply(this,arguments);};
      wrapped.__v29Sensor=true;
      closeFieldControls=wrapped;
    }
  }

  function syncMenuText(){
    const labels={
      '[data-v29-menu="position"]':t('locate'),'[data-v29-menu="bearing"]':t('bearing'),
      '[data-v29-menu="maptools"]':t('map'),'[data-v29-menu="data"]':t('data'),'[data-v29-menu="system"]':t('system'),
      '#v29GpsStatusBtn':t('gpsStatus'),'#v29PositionSearchBtn':t('positionSearch'),'#v29TempSetBtn':t('tempSet'),
      '#v29TempClearBtn':t('tempClear'),'#v29HomeSetBtn':t('homeSet'),'#v29HomeGoBtn':t('homeGo'),
      '#v29HomeClearBtn':t('homeClear'),'#v29PositionSiteAddBtn':t('siteAdd'),'#v29NearbyBtn':t('nearby'),
      '#v29LayersBtn':t('layers'),'#v29RoadBtn':t('roads'),'#v29DisplayBtn':t('display'),'#v29ReuseBtn':t('reuse'),
      '#v29GpxBtn':t('gpx'),'#v29BackupBtn':t('backup'),'#v29RestoreBtn':t('restore'),'#v29SystemGpsBtn':t('gpsPower'),
      '#v29SystemDisplayBtn':t('display')
    };
    Object.entries(labels).forEach(([sel,label])=>{const el=document.querySelector(sel);if(el)el.textContent=label;});
    syncFreeTrackButton();
  }

  /* ---------- bearing calculator + optional compass sensor ---------- */
  function installBearingSection(){
    if(document.getElementById('control-bearing'))return;
    const section=makeSection('control-bearing','BEARING',
      '<div class="v29-bearing-primary">'+
        '<div><span>'+t('grid')+'</span><strong id="v29BearingGrid">---°</strong></div>'+
        '<div><span>'+t('true')+'</span><strong id="v29BearingTrue">---°</strong></div>'+
        '<div><span>'+t('mag')+'</span><strong id="v29BearingMag">---°</strong></div>'+
      '</div>'+
      '<div class="v29-bearing-meta">'+
        '<div><span>DECL</span><strong id="v29BearingDecl">--</strong></div>'+
        '<div><span>CONV</span><strong id="v29BearingConv">--</strong></div>'+
        '<div><span>REF</span><strong id="v29BearingRef">--</strong></div>'+
      '</div>'+
      '<div class="v29-bearing-sensor">'+
        '<div><span id="v29SensorState"></span><strong id="v29DeviceHeading">---°</strong><small id="v29BearingTurn">--</small></div>'+
        '<button class="osb-btn" id="v29SensorBtn" type="button"></button>'+
      '</div>'+
      '<div class="v29-note" id="v29SensorNote"></div>');
    section.querySelector('#v29SensorBtn')?.addEventListener('click',()=>bearingSensorOn?stopBearingSensor():startBearingSensor());
    refreshBearingPanel();
  }

  function formatDeg(v){return Number.isFinite(Number(v))?normalize360(v).toFixed(1)+'°':'---°';}
  function formatSigned(v){if(!Number.isFinite(Number(v)))return '--';const n=Number(v);return(n>=0?'+':'')+n.toFixed(1)+'°';}

  function refreshBearingPanel(){
    const section=document.getElementById('control-bearing');if(!section)return;
    const ref=currentReference(),obj=activeObjective();
    lastBearingBundle=ref?.coords&&obj?.coords?core.geo.bearingBundle(ref.coords,obj.coords,{date:new Date()}):null;
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    set('v29BearingGrid',formatDeg(lastBearingBundle?.gridBearing));
    set('v29BearingTrue',formatDeg(lastBearingBundle?.trueBearing));
    set('v29BearingMag',formatDeg(lastBearingBundle?.magneticBearing));
    set('v29BearingDecl',formatSigned(lastBearingBundle?.declination));
    set('v29BearingConv',formatSigned(lastBearingBundle?.convergence));
    let refText=ref?.type||'--';
    if(ref?.ageMs!==undefined)refText+=' · '+Math.round(ref.ageMs/60000)+'m';
    set('v29BearingRef',refText);
    set('v29SensorState',bearingSensorOn?t('sensorOn'):t('sensorOff'));
    set('v29DeviceHeading',bearingHeading===null?'---°':formatDeg(bearingHeading));
    const turn=bearingHeading!==null&&Number.isFinite(lastBearingBundle?.magneticBearing)
      ? signed180(lastBearingBundle.magneticBearing-bearingHeading):NaN;
    set('v29BearingTurn',Number.isFinite(turn)?t('targetDelta')+' '+(turn>=0?'+':'')+turn.toFixed(0)+'°':'--');
    const btn=document.getElementById('v29SensorBtn');if(btn)btn.textContent=bearingSensorOn?t('sensorStop'):t('sensorUse');
    const note=document.getElementById('v29SensorNote');if(note)note.textContent=t('sensorNote');
  }

  function orientationHeading(event){
    if(Number.isFinite(Number(event?.webkitCompassHeading)))return normalize360(Number(event.webkitCompassHeading));
    if(event?.absolute&&Number.isFinite(Number(event.alpha)))return normalize360(360-Number(event.alpha));
    return null;
  }

  function onOrientation(event){
    const now=Date.now();if(now-bearingLastEventAt<250)return;
    bearingLastEventAt=now;
    const heading=orientationHeading(event);
    if(heading===null)return;
    bearingHeading=heading;
    refreshBearingPanel();
  }

  async function startBearingSensor(){
    if(bearingSensorOn)return;
    try{
      if(typeof DeviceOrientationEvent==='undefined'){notify(t('sensorUnavailable'),'warn');return;}
      if(typeof DeviceOrientationEvent.requestPermission==='function'){
        let permission;
        try{permission=await DeviceOrientationEvent.requestPermission(true);}
        catch(e){permission=await DeviceOrientationEvent.requestPermission();}
        if(permission!=='granted'){notify(t('sensorDenied'),'warn');return;}
      }
      bearingSensorOn=true;bearingHeading=null;
      window.addEventListener('deviceorientationabsolute',onOrientation,true);
      window.addEventListener('deviceorientation',onOrientation,true);
      refreshBearingPanel();
    }catch(e){bearingSensorOn=false;notify(t('sensorUnavailable'),'warn');refreshBearingPanel();}
  }

  function stopBearingSensor(){
    if(!bearingSensorOn&&bearingHeading===null)return;
    window.removeEventListener('deviceorientationabsolute',onOrientation,true);
    window.removeEventListener('deviceorientation',onOrientation,true);
    bearingSensorOn=false;bearingHeading=null;refreshBearingPanel();
  }

  /* ---------- Track HUD: START / PAUSE / RESUME, STOP only in management ---------- */
  function trackSeed(){
    const ref=currentReference();
    if(!ref?.coords)return undefined;
    if(ref.type==='GPS'){
      return {kind:'GPS',lat:Number(ref.coords[0]),lon:Number(ref.coords[1]),timestamp:Date.now()};
    }
    if(ref.type==='TEMP'){
      return {kind:'TEMP',coords:[Number(ref.coords[0]),Number(ref.coords[1])],timestamp:Date.now()};
    }
    return undefined;
  }

  function installSaferTrackHud(){
    const old=document.getElementById('navHudTrack');
    if(!old||old.dataset.v29SafeTrack==='1')return;
    const clone=old.cloneNode(true);
    clone.dataset.v29SafeTrack='1';
    clone.dataset.v28TextOwner='1';
    old.replaceWith(clone);
    const act=()=>{
      if(base.track.state==='OFF'){
        if(!base.state.activePlanId)return;
        base.track.start(base.state.activePlanId,trackSeed());
      }else if(base.track.state==='RECORDING'){
        base.track.pause();notify(t('trackPaused'));
      }else{
        base.track.resume(trackSeed());notify(t('trackResumed'));
      }
      base.track.render();
      if(typeof updateTargetModePanel==='function')updateTargetModePanel();
    };
    clone.addEventListener('click',event=>{event.stopPropagation();act();});
    clone.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      event.preventDefault();event.stopPropagation();act();
    });
  }

  /* ---------- NAV recovery, no automatic GPS/sensor restart ---------- */
  function navRecoveryPayload(){
    if(typeof targetModeActive==='undefined'||!targetModeActive||typeof targetModePhase==='undefined'||targetModePhase!=='NAV'||!base.state.activePlanId)return null;
    return {
      version:1,planId:String(base.state.activePlanId),phase:'NAV',legIndex:Number(typeof navLegIndex!=='undefined'?navLegIndex:0)||0,
      navStartedAt:Number(typeof navStartedAt!=='undefined'?navStartedAt:0)||Date.now(),
      navLegStartedAt:Number(typeof navLegStartedAt!=='undefined'?navLegStartedAt:0)||Date.now(),
      paused:document.getElementById('navPauseBtn')?.getAttribute('aria-pressed')==='true',
      savedAt:Date.now()
    };
  }

  function persistNavRecovery(){
    const data=navRecoveryPayload();
    if(data)writeJson(NAV_RECOVERY_KEY,data);
  }

  function clearNavRecovery(){localStorage.removeItem(NAV_RECOVERY_KEY);}

  function installNavRecoveryHooks(){
    if(navRecoveryInstalled)return;
    navRecoveryInstalled=true;
    if(typeof returnToTargetPlan==='function'&&!returnToTargetPlan.__v29Recovery){
      const previous=returnToTargetPlan;
      const wrapped=function(){const out=previous.apply(this,arguments);clearNavRecovery();return out;};
      wrapped.__v29Recovery=true;
      returnToTargetPlan=wrapped;
    }
    if(typeof stopTargetNavigation==='function'&&!stopTargetNavigation.__v29Recovery){
      const previous=stopTargetNavigation;
      const wrapped=function(){const out=previous.apply(this,arguments);clearNavRecovery();return out;};
      wrapped.__v29Recovery=true;
      stopTargetNavigation=wrapped;
    }
    if(typeof exitTargetMode==='function'&&!exitTargetMode.__v29Recovery){
      const previous=exitTargetMode;
      const wrapped=function(){
        const out=previous.apply(this,arguments);
        if(typeof targetModeActive==='undefined'||!targetModeActive)clearNavRecovery();
        return out;
      };
      wrapped.__v29Recovery=true;
      exitTargetMode=wrapped;
    }
    const saved=readJson(NAV_RECOVERY_KEY,null);
    if(saved&&saved.phase==='NAV'&&Date.now()-Number(saved.savedAt||0)<24*3600000&&base.plans.get(saved.planId)){
      showNavRecovery(saved);
    }else if(saved){clearNavRecovery();}
  }

  function showNavRecovery(saved){
    if(document.getElementById('v29NavRecovery'))return;
    const plan=base.plans.get(saved.planId);if(!plan)return;
    const bar=document.createElement('div');
    bar.id='v29NavRecovery';bar.className='v29-recovery-banner';
    bar.innerHTML='<div><strong>'+t('navRecovery')+'</strong><span></span></div><button class="osb-btn active" data-action="restore"></button><button class="osb-btn" data-action="discard"></button>';
    bar.querySelector('span').textContent=plan.name+' · LEG '+(Number(saved.legIndex||0)+1);
    bar.querySelector('[data-action="restore"]').textContent=t('restoreNav');
    bar.querySelector('[data-action="discard"]').textContent=t('discardNav');
    document.body.appendChild(bar);
    bar.querySelector('[data-action="discard"]').addEventListener('click',()=>{clearNavRecovery();bar.remove();});
    bar.querySelector('[data-action="restore"]').addEventListener('click',()=>{
      base.ui.openPlan(saved.planId);
      try{
        targetModePhase='NAV';
        navLegIndex=Math.max(0,Number(saved.legIndex)||0);
        if(typeof startNavElapsed==='function')startNavElapsed();
        navStartedAt=Number(saved.navStartedAt)||Date.now();
        navLegStartedAt=Number(saved.navLegStartedAt)||navStartedAt;
        navMapOrientation='NORTH';
        gpsFollowEnabled=false;
        pendingNavStart=false;
        backtrackActive=false;
        if(saved.paused&&typeof root.toggleNavPause==='function')root.toggleNavPause();
        updateTargetModePanel();
        notify(t('restoredNav'));
        bar.remove();
      }catch(e){base.ui.openPlan(saved.planId);}
    });
  }

  /* ---------- backup / restore ---------- */
  function appStorageSnapshot(){
    const out={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key&&key.startsWith('tactical_recon_'))out[key]=localStorage.getItem(key);
    }
    return out;
  }

  async function exportFullBackup(){
    const mirrored=await root.v29Storage?.getAllTracks?.()||[];
    const primaryIds=new Set(Object.keys(base.storage.getV28Tracks?.()||{}));
    const activeId=String(base.track?.activeTrackId||'');
    const mirror=mirrored.filter(track=>track?.id&&(primaryIds.has(String(track.id))||String(track.id)===activeId));
    const payload={
      format:BACKUP_FORMAT,version:BACKUP_VERSION,exportedAt:new Date().toISOString(),
      localStorage:appStorageSnapshot(),trackMirror:mirror
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='TACTICAL_RECON_BACKUP_'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    notify(t('backupDone'));
  }

  async function restoreFullBackup(file){
    if(!file)return;
    try{
      const raw=JSON.parse(await file.text());
      if(raw?.format!==BACKUP_FORMAT||Number(raw.version)!==BACKUP_VERSION||!raw.localStorage||typeof raw.localStorage!=='object')throw new Error('invalid');
      if(!confirm(lang()==='ko'?'현재 TACTICAL RECON 데이터를 백업 파일의 내용으로 복원할까요?':'RESTORE THIS BACKUP OVER CURRENT TACTICAL RECON DATA?'))return;
      const keys=[];
      for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith('tactical_recon_'))keys.push(key);}
      keys.forEach(key=>localStorage.removeItem(key));
      Object.entries(raw.localStorage).forEach(([key,value])=>{if(key.startsWith('tactical_recon_')&&typeof value==='string')localStorage.setItem(key,value);});
      if(root.v29Storage?.clearTracks)await root.v29Storage.clearTracks();
      if(Array.isArray(raw.trackMirror)&&root.v29Storage?.mirrorTrack){
        await Promise.all(raw.trackMirror.map(track=>root.v29Storage.mirrorTrack(track)));
      }
      notify(t('restoreDone'));setTimeout(()=>location.reload(),400);
    }catch(e){alert(t('invalidBackup'));}
  }

  async function updateStorageMeter(){
    const el=document.getElementById('v29StorageMeter');if(!el)return;
    const info=await root.v29Storage?.estimate?.();
    if(!info?.quota){el.textContent='';return;}
    const mb=v=>(v/1048576).toFixed(1);
    const pct=Math.min(100,(info.usage/info.quota)*100);
    el.textContent=(lang()==='ko'?'브라우저 저장공간 ':'STORAGE ')+mb(info.usage)+' / '+mb(info.quota)+' MB · '+pct.toFixed(0)+'%';
    el.classList.toggle('warn',pct>=80);
  }

  function installStorageErrorUi(){
    window.addEventListener('recon-storage-error',event=>{
      notify(t('storageFail'),'danger',6000);
      let bar=document.getElementById('v29StorageError');
      if(!bar){
        bar=document.createElement('div');bar.id='v29StorageError';bar.className='v29-storage-error';
        bar.innerHTML='<strong></strong><span></span><button class="osb-btn" type="button"></button>';
        document.body.appendChild(bar);
        bar.querySelector('button').addEventListener('click',exportFullBackup);
      }
      bar.querySelector('strong').textContent=t('storageFail');
      bar.querySelector('span').textContent=t('storageFailBody');
      bar.querySelector('button').textContent=t('backup');
      bar.hidden=false;
    });
  }


  /* ---------- mission-first RECON / OBJECTIVE / MAP UX ---------- */
  let missionLayer=null;
  let missionMapMode=false;
  let lightMapOpen=false;
  let activeOverlayType='REFERENCE';
  let overlaySeenCount=0;
  let overlaySeenPlanId='';
  let lastReconMode=null;

  const OVERLAY_COPY={
    DANGER:'drawDanger',
    BLOCKED:'drawBlocked',
    OBSERVATION:'drawObservation',
    REFERENCE:'drawReference',
    OTHER:'drawOther'
  };

  function overlayLabel(type){
    return t(OVERLAY_COPY[String(type||'REFERENCE').toUpperCase()]||'drawReference');
  }

  function missionObjectiveStatus(obj=activeObjective()){
    if(!obj)return '';
    const id=String(obj.siteId||obj.id||'');
    try{
      const local=typeof getLocalIntel==='function'?getLocalIntel().find(item=>String(item?.id||'')===id):null;
      if(local?.status)return String(local.status).toUpperCase();
      const registered=typeof RECON_TARGETS!=='undefined'&&Array.isArray(RECON_TARGETS)
        ? RECON_TARGETS.find(item=>String(item?.id||'')===id):null;
      if(registered)return 'REGISTERED';
    }catch(e){}
    return 'OBJECTIVE';
  }

  function missionMetrics(){
    const ref=currentReference();
    const obj=activeObjective();
    const bundle=ref?.coords&&obj?.coords?core.geo.bearingBundle(ref.coords,obj.coords,{date:new Date()}):null;
    return {ref,obj,bundle};
  }

  function missionDistance(km){
    const n=Number(km);
    if(!Number.isFinite(n))return '--';
    return n<1?Math.max(0,Math.round(n*1000))+' M':n.toFixed(n>=100?0:1)+' KM';
  }

  function missionReferenceLabel(ref=currentReference()){
    if(!ref)return '--';
    let label=String(ref.type||'REF');
    if(ref.type==='LAST_FIX'){
      if(ref.ageMs!==undefined)label+=' · '+formatReferenceAge(ref.ageMs);
      const accuracy=Number(ref.accuracyM);
      if(Number.isFinite(accuracy))label+=' · ±'+Math.round(accuracy)+' M';
    }else if(ref.type==='GPS'){
      const accuracy=Number(typeof latestGpsPosition!=='undefined'?latestGpsPosition?.coords?.accuracy:NaN);
      if(Number.isFinite(accuracy))label+=' · ±'+Math.round(accuracy)+' M';
    }
    return label;
  }

  function ensureMissionLayer(){
    if(missionLayer||typeof L==='undefined'||typeof map==='undefined')return missionLayer;
    missionLayer=L.layerGroup().addTo(map);
    return missionLayer;
  }

  function syncMissionMapContext(){
    const layer=ensureMissionLayer();
    if(!layer)return;
    layer.clearLayers();
    const planVisible=typeof targetModeActive!=='undefined'&&targetModeActive&&typeof targetModePhase!=='undefined'&&targetModePhase==='PLAN';
    const {ref,obj}=missionMetrics();
    if(!obj?.coords||(!missionMapMode&&!planVisible))return;
    const color=typeof getOpticColor==='function'?getOpticColor():'#93d7a0';
    if(missionMapMode){
      const plan=activePlan();
      (plan?.routeSegments||[]).forEach(seg=>{
        const clean=Array.isArray(seg)?seg.filter(validCoords):[];
        if(clean.length>=2)L.polyline(clean,{interactive:false,color,weight:2,opacity:.78,dashArray:'7 6'}).addTo(layer);
      });
      (plan?.overlaySegments||[]).forEach(seg=>{
        const clean=Array.isArray(seg)?seg.filter(validCoords):[];
        if(clean.length>=2)L.polyline(clean,{interactive:false,color,weight:2,opacity:.72}).addTo(layer);
      });
    }
    L.circleMarker(obj.coords,{interactive:false,radius:7,color,weight:2,fill:false,opacity:1}).addTo(layer);
    if(ref?.coords){
      const type=String(ref.type||'REF');
      const dash=type==='LAST_FIX'?'2 8':(type==='TEMP'?'10 5':'6 5');
      L.polyline([ref.coords,obj.coords],{interactive:false,color,weight:2,opacity:.78,dashArray:dash}).addTo(layer);
      L.circleMarker(ref.coords,{interactive:false,radius:5,color,weight:2,fill:false,opacity:.9}).addTo(layer);
    }
  }

  function frameObjectiveContext(){
    if(typeof map==='undefined'||!map?.fitBounds||typeof L==='undefined')return;
    const {ref,obj}=missionMetrics();
    if(!obj?.coords)return;
    try{
      if(ref?.coords){
        if(typeof targetModeShowGps!=='undefined'&&ref.type==='GPS')targetModeShowGps=true;
        if(typeof syncGpsMarkerVisibility==='function')syncGpsMarkerVisibility();
        map.fitBounds(L.latLngBounds([ref.coords,obj.coords]),{padding:[44,44],maxZoom:15,animate:false});
      }else{
        map.setView(obj.coords,Math.max(map.getZoom(),14),{animate:false});
      }
      if(typeof flushReticleTelemetry==='function')flushReticleTelemetry();
    }catch(e){}
    syncMissionMapContext();
  }


  function ensureMissionMapHud(){
    let hud=document.getElementById('v29MissionMapHud');
    if(hud)return hud;
    hud=document.createElement('section');
    hud.id='v29MissionMapHud';
    hud.className='v29-mission-map-hud';
    hud.hidden=true;
    hud.innerHTML=
      '<button class="v29-mission-map-copy" id="v29MissionMapInfo" type="button">'+
        '<span id="v29MissionMapStatus"></span><strong id="v29MissionMapName"></strong>'+
        '<small id="v29MissionMapMetrics"></small><small id="v29MissionMapRef"></small>'+
      '</button>'+
      '<button class="v29-mission-map-close" id="v29MissionMapClose" type="button" aria-label="Close mission context">×</button>'+
      '<div class="v29-mission-map-actions">'+
        '<button class="osb-btn active" id="v29MissionMapNav" type="button"></button>'+
        '<button class="osb-btn" id="v29MissionMapPlan" type="button"></button>'+
        '<button class="osb-btn" id="v29MissionMapFit" type="button"></button>'+
      '</div>';
    document.body.appendChild(hud);
    hud.querySelector('#v29MissionMapInfo')?.addEventListener('click',openMissionObjectiveSheet);
    hud.querySelector('#v29MissionMapClose')?.addEventListener('click',dismissMissionContext);
    hud.querySelector('#v29MissionMapNav')?.addEventListener('click',startMissionNavigation);
    hud.querySelector('#v29MissionMapPlan')?.addEventListener('click',enterMissionPlan);
    hud.querySelector('#v29MissionMapFit')?.addEventListener('click',frameObjectiveContext);
    return hud;
  }

  function renderMissionMapHud(){
    const hud=ensureMissionMapHud();
    const {ref,obj,bundle}=missionMetrics();
    if(!missionMapMode||!obj){hud.hidden=true;return;}
    const status=hud.querySelector('#v29MissionMapStatus');
    const name=hud.querySelector('#v29MissionMapName');
    const metrics=hud.querySelector('#v29MissionMapMetrics');
    const refLine=hud.querySelector('#v29MissionMapRef');
    if(status)status.textContent='OBJ · '+missionObjectiveStatus(obj);
    if(name)name.textContent=obj.name||t('objectiveInfo');
    if(metrics)metrics.textContent=bundle
      ? 'DIST '+missionDistance(bundle.distanceKm)+' · GRID '+formatDeg(bundle.gridBearing)+' · TRUE '+formatDeg(bundle.trueBearing)+' · MAG '+formatDeg(bundle.magneticBearing)
      : t('positionRequired');
    if(refLine)refLine.textContent='REF '+missionReferenceLabel(ref);
    const close=hud.querySelector('#v29MissionMapClose');if(close)close.setAttribute('aria-label',lang()==='ko'?'계획 선택 해제':'CLEAR PLAN SELECTION');
    const nav=hud.querySelector('#v29MissionMapNav');if(nav)nav.textContent=t('navAction');
    const plan=hud.querySelector('#v29MissionMapPlan');if(plan)plan.textContent=t('planAction');
    const fit=hud.querySelector('#v29MissionMapFit');if(fit)fit.textContent=t('mapFit');
    hud.hidden=false;
  }

  function syncMissionMapModeUi(){
    const obj=activeObjective();
    if(!obj)missionMapMode=false;
    if(typeof targetModePhase!=='undefined'&&targetModePhase==='NAV')missionMapMode=false;
    document.body.classList.toggle('v29-mission-map',missionMapMode);
    const panel=document.getElementById('targetModePanel');
    if(missionMapMode){
      panel?.classList.remove('active');
      document.body.classList.remove('target-mode','route-drawing','route-marking','nav-panel-collapsed');
    }
    renderMissionMapHud();
    syncMissionMapContext();
    if(lightMapOpen)renderLightMap();
  }

  function setMissionMapMode(enabled,options={}){
    missionMapMode=Boolean(enabled&&activeObjective());
    syncMissionMapModeUi();
    if(missionMapMode&&options.frame!==false)frameObjectiveContext();
  }

  function dismissMissionContext(){
    closeMissionObjectiveSheet();
    setMissionMapMode(false,{frame:false});
    if(base.track?.state==='OFF')base.state.activePlanId=null;
    syncMissionMapModeUi();
    base.track?.render?.();
  }

  function returnToMissionMap(options={}){
    if(typeof targetModeActive!=='undefined'&&targetModeActive&&typeof targetModePhase!=='undefined'&&targetModePhase==='PLAN'&&typeof exitTargetMode==='function'){
      exitTargetMode(false);
    }
    setMissionMapMode(true,options);
  }

  function enterMissionPlan(){
    closeMissionObjectiveSheet();
    const plan=activePlan();
    if(!plan)return;
    setMissionMapMode(false,{frame:false});
    base.ui.openPlan(plan.id);
  }

  function openMissionPlans(){
    closeMissionObjectiveSheet();
    setMissionMapMode(false,{frame:false});
    base.ui.openRoutes();
  }

  function startMissionNavigation(){
    closeMissionObjectiveSheet();
    const plan=activePlan();
    if(!plan?.objective){base.ui.openObjective();return;}
    setMissionMapMode(false,{frame:false});
    if(!base.ui.openPlan(plan.id))return;
    if(typeof startTargetNavigation==='function')startTargetNavigation();
  }

  function ensureMissionObjectiveSheet(){
    let sheet=document.getElementById('v29ObjectiveInfoSheet');
    if(sheet)return sheet;
    sheet=document.createElement('section');
    sheet.id='v29ObjectiveInfoSheet';
    sheet.className='v29-mission-sheet';
    sheet.hidden=true;
    sheet.innerHTML=
      '<div class="v29-mission-sheet-head"><strong id="v29ObjInfoTitle"></strong><button class="v29-sheet-x" type="button">×</button></div>'+
      '<div id="v29ObjInfoStatus" class="v29-mission-status"></div>'+
      '<div class="v29-mission-metrics">'+
        '<div><span>DIST</span><strong id="v29ObjDist">--</strong></div>'+
        '<div><span>GRID</span><strong id="v29ObjGrid">---°</strong></div>'+
        '<div><span>TRUE</span><strong id="v29ObjTrue">---°</strong></div>'+
        '<div><span>MAG</span><strong id="v29ObjMag">---°</strong></div>'+
        '<div class="v29-mission-ref"><span>REF</span><strong id="v29ObjRef">--</strong></div>'+
      '</div>'+
      '<button class="v29-mission-coords" id="v29ObjCoords" type="button">--</button>'+
      '<div class="v29-mission-actions">'+
        '<button class="osb-btn" id="v29ObjBearing" type="button"></button>'+
        '<button class="osb-btn" id="v29ObjPlan" type="button"></button>'+
        '<button class="osb-btn active" id="v29ObjNav" type="button"></button>'+
        '<button class="osb-btn" id="v29ObjChange" type="button"></button>'+
        '<button class="osb-btn" id="v29ObjFit" type="button"></button>'+
      '</div>';
    document.body.appendChild(sheet);
    sheet.querySelector('.v29-sheet-x')?.addEventListener('click',closeMissionObjectiveSheet);
    sheet.querySelector('#v29ObjBearing')?.addEventListener('click',openMissionBearing);
    sheet.querySelector('#v29ObjPlan')?.addEventListener('click',enterMissionPlan);
    sheet.querySelector('#v29ObjNav')?.addEventListener('click',startMissionNavigation);
    sheet.querySelector('#v29ObjChange')?.addEventListener('click',()=>{
      closeMissionObjectiveSheet();
      base.ui.openObjective();
    });
    sheet.querySelector('#v29ObjFit')?.addEventListener('click',()=>{
      closeMissionObjectiveSheet();
      frameObjectiveContext();
    });
    sheet.querySelector('#v29ObjCoords')?.addEventListener('click',async()=>{
      const obj=activeObjective();if(!obj?.coords)return;
      const mgrsText=typeof calcMGRS==='function'?calcMGRS(obj.coords[0],obj.coords[1]):'';
      const value=mgrsText||obj.coords.map(v=>Number(v).toFixed(6)).join(', ');
      try{await navigator.clipboard.writeText(value);notify(lang()==='ko'?'좌표를 복사했습니다.':'COORDINATES COPIED.');}catch(e){}
    });
    return sheet;
  }

  function closeMissionObjectiveSheet(){
    const sheet=document.getElementById('v29ObjectiveInfoSheet');
    if(sheet)sheet.hidden=true;
  }

  function renderMissionObjectiveSheet(){
    const sheet=ensureMissionObjectiveSheet();
    const {ref,obj,bundle}=missionMetrics();
    if(!obj){sheet.hidden=true;return;}
    const set=(id,value)=>{const el=sheet.querySelector('#'+id);if(el)el.textContent=value;};
    set('v29ObjInfoTitle',obj.name||t('objectiveInfo'));
    set('v29ObjInfoStatus','OBJ · '+missionObjectiveStatus(obj));
    set('v29ObjDist',missionDistance(bundle?.distanceKm));
    set('v29ObjGrid',formatDeg(bundle?.gridBearing));
    set('v29ObjTrue',formatDeg(bundle?.trueBearing));
    set('v29ObjMag',formatDeg(bundle?.magneticBearing));
    set('v29ObjRef',missionReferenceLabel(ref));
    const mgrsText=typeof calcMGRS==='function'?calcMGRS(obj.coords[0],obj.coords[1]):'';
    set('v29ObjCoords',(mgrsText?mgrsText+' · ':'')+obj.coords.map(v=>Number(v).toFixed(5)).join(', '));
    set('v29ObjBearing',t('bearingAction'));
    set('v29ObjPlan',t('planAction'));
    set('v29ObjNav',t('navAction'));
    set('v29ObjChange',t('objectiveChange'));
    set('v29ObjFit',t('mapFit'));
  }

  function openMissionObjectiveSheet(){
    const obj=activeObjective();
    if(!obj){base.ui.openObjective();return;}
    renderMissionObjectiveSheet();
    ensureMissionObjectiveSheet().hidden=false;
  }

  function openMissionBearing(){
    closeMissionObjectiveSheet();
    document.body.classList.add('v29-bearing-open');
    if(typeof openFieldControls==='function')openFieldControls('bearing');
  }

  function syncMissionHeader(){
    if(missionMapMode){
      syncMissionMapModeUi();
      if(!document.getElementById('v29ObjectiveInfoSheet')?.hidden)renderMissionObjectiveSheet();
      return;
    }
    if(typeof targetModeActive==='undefined'||!targetModeActive||typeof targetModePhase==='undefined'||targetModePhase!=='PLAN'){
      syncMissionMapContext();
      closeMissionObjectiveSheet();
      return;
    }
    const plan=activePlan();
    const {ref,obj,bundle}=missionMetrics();
    const kicker=document.querySelector('#planInfoTrigger .target-mode-kicker');
    const name=document.getElementById('targetModeName');
    const stats=document.getElementById('targetModeStats');
    const hint=document.getElementById('planNavHint');
    if(document.body.classList.contains('plan-draw-submode')){
      if(kicker)kicker.textContent=typeof routeDrawKind!=='undefined'&&routeDrawKind==='MARK'
        ? 'OVERLAY MODE · '+overlayLabel(activeOverlayType)
        : 'ROUTE MODE';
    }else if(kicker){
      kicker.textContent=obj?'OBJ · '+missionObjectiveStatus(obj):(lang()==='ko'?'계획 · ':'PLAN · ')+(plan?.name||'');
    }
    if(name)name.textContent=obj?.name||t('noObjective');
    if(stats){
      stats.textContent=bundle
        ? 'DIST '+missionDistance(bundle.distanceKm)+' · GRID '+formatDeg(bundle.gridBearing)+' · MAG '+formatDeg(bundle.magneticBearing)+' · REF '+String(ref?.type||'--')
        : (obj?(lang()==='ko'?'기준위치가 필요합니다.':'REFERENCE POSITION REQUIRED.'):'');
    }
    if(hint){
      if(!obj)hint.textContent=t('objectiveRequired');
      else if(ref?.type==='LAST_FIX')hint.textContent=t('lastFix')+' · '+formatReferenceAge(ref.ageMs)+' · '+t('navStart');
      else hint.textContent=ref?.coords?t('navStart'):t('positionRequired');
    }
    syncMissionMapContext();
    syncDrawControls();
    if(!document.getElementById('v29ObjectiveInfoSheet')?.hidden)renderMissionObjectiveSheet();
    if(lightMapOpen)renderLightMap();
  }

  function installMissionHeader(){
    const copy=document.querySelector('#planInfoTrigger .v29-objective-area');
    if(copy&&copy.dataset.v29MissionInfo!=='1'){
      const clone=copy.cloneNode(true);
      clone.dataset.v29MissionInfo='1';
      copy.replaceWith(clone);
      clone.addEventListener('click',event=>{event.stopPropagation();openMissionObjectiveSheet();});
      clone.addEventListener('keydown',event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        event.preventDefault();event.stopPropagation();openMissionObjectiveSheet();
      });
    }
    if(typeof updateTargetModePanel==='function'&&!updateTargetModePanel.__v29MissionUx){
      const previous=updateTargetModePanel;
      const wrapped=function(){
        const out=previous.apply(this,arguments);
        syncMissionHeader();
        return out;
      };
      wrapped.__v29MissionUx=true;
      updateTargetModePanel=wrapped;
    }
    if(typeof enterTargetMode==='function'&&!enterTargetMode.__v29MissionFrame){
      const previous=enterTargetMode;
      const wrapped=function(){
        const out=previous.apply(this,arguments);
        setTimeout(()=>{installMissionHeader();returnToMissionMap({frame:true});},0);
        return out;
      };
      wrapped.__v29MissionFrame=true;
      enterTargetMode=wrapped;
    }
  }

  function setR1HomeActive(id){
    document.querySelectorAll('.v26-main-cluster [data-r1-tab]').forEach(btn=>{
      const active=btn.dataset.r1Tab===id;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-current',active?'page':'false');
    });
  }

  function installMissionHomebar(){
    const cluster=document.querySelector('.v26-main-cluster');
    if(!cluster)return;
    cluster.innerHTML=
      '<button class="osb-btn v26-primary" id="r1MainRecon" data-r1-tab="recon" type="button"></button>'+
      '<button class="osb-btn v26-primary" id="btnWpCount" data-r1-tab="sites" type="button"></button>'+
      '<button class="osb-btn v26-primary" id="r1MainRecords" data-r1-tab="records" type="button"></button>'+
      '<button class="osb-btn v26-primary" id="r1MainMenu" data-r1-tab="menu" type="button"></button>';
    cluster.querySelector('#r1MainRecon')?.addEventListener('click',()=>{setR1HomeActive('recon');closeR1Records();openFieldControls('recon');});
    cluster.querySelector('#btnWpCount')?.addEventListener('click',()=>{setR1HomeActive('sites');closeR1Records();closeFieldControls();openWpDrawer();});
    cluster.querySelector('#r1MainRecords')?.addEventListener('click',()=>{setR1HomeActive('records');openR1Records();});
    cluster.querySelector('#r1MainMenu')?.addEventListener('click',()=>{setR1HomeActive('menu');closeR1Records();openFieldControls('menu');});
    syncMissionHomebarText();
  }

  function syncMissionHomebarText(){
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    set('r1MainRecon',t('recon'));
    set('btnWpCount',lang()==='ko'?'거점':'SITES');
    set('r1MainRecords',lang()==='ko'?'기록':'RECORDS');
    set('r1MainMenu',lang()==='ko'?'메뉴':'MENU');
  }

  function runRecordedRecon(){
    try{
      if(typeof selectedRadius!=='undefined'&&selectedRadius!=='all'&&typeof hasGpsFix!=='undefined'&&!hasGpsFix){
        alert(lang()==='ko'?'거리 기반 기록 거점 탐색은 GPS FIX 이후 사용할 수 있습니다.':'RANGE-BASED RECORDED SITE RECON REQUIRES GPS FIX.');
        return;
      }
      const claimed=new Set((typeof getLocalIntel==='function'?getLocalIntel():[])
        .filter(item=>item?.source==='REGISTERED_VERIFICATION')
        .map(item=>String(item.id)));
      const pool=(typeof RECON_TARGETS!=='undefined'&&Array.isArray(RECON_TARGETS)?RECON_TARGETS:[]).filter(site=>{
        if(claimed.has(String(site.id)))return false;
        if(typeof selectedRadius==='undefined'||selectedRadius==='all')return true;
        if(typeof baseLocation==='undefined'||typeof calcDistanceKmRaw!=='function')return false;
        return calcDistanceKmRaw(baseLocation[0],baseLocation[1],site.coords[0],site.coords[1])<=Number(selectedRadius);
      });
      if(!pool.length){
        alert(lang()==='ko'?'선택 반경에 아직 확인하지 않은 기록 거점이 없습니다.':'NO UNVERIFIED RECORDED SITES IN THIS RANGE.');
        return;
      }
      lastReconMode='RECORDED';
      const pick=pool[Math.floor(Math.random()*pool.length)];
      openSitrep(pick,'REGISTERED');
      closeFieldControls();
    }catch(e){
      if(typeof deployRegisteredRecon==='function')deployRegisteredRecon();
    }
  }

  function installReconPanel(){
    const section=makeSection('control-recon','RECON',
      '<div class="v29-recon-note"></div>'+
      '<div class="v29-control-label" id="v29ReconRangeLabel"></div>'+
      '<div class="field-control-grid v29-recon-range">'+
        '<button class="osb-btn" data-v29-range="30" type="button">30 KM</button>'+
        '<button class="osb-btn" data-v29-range="80" type="button">80 KM</button>'+
        '<button class="osb-btn" data-v29-range="150" type="button">150 KM</button>'+
        '<button class="osb-btn" data-v29-range="all" type="button">ALL</button>'+
      '</div>'+
      '<div class="v29-recon-actions">'+
        '<button class="osb-btn active" id="v29RecordedRecon" type="button"></button>'+
        '<button class="osb-btn active" id="v29WildRecon" type="button"></button>'+
      '</div>');
    section.querySelectorAll('[data-v29-range]').forEach(btn=>btn.addEventListener('click',()=>{
      if(typeof setRadar==='function')setRadar(btn.dataset.v29Range,btn);
      syncReconPanel();
    }));
    section.querySelector('#v29RecordedRecon')?.addEventListener('click',runRecordedRecon);
    section.querySelector('#v29WildRecon')?.addEventListener('click',()=>{
      lastReconMode='WILD';
      if(typeof deployWildRecon==='function')deployWildRecon();
    });
    syncReconPanel();
  }

  function syncReconPanel(){
    const section=document.getElementById('control-recon');if(!section)return;
    const note=section.querySelector('.v29-recon-note');
    if(note)note.textContent=lang()==='ko'
      ? '기록 거점은 현대 지도에서 잊힌 장소를 다시 찾고, 미개척 탐색은 무작위 좌표를 직접 개척합니다.'
      : 'RECORDED SITES REDISCOVER FORGOTTEN PLACES. UNEXPLORED RECON GENERATES A NEW RANDOM COORDINATE.';
    const label=document.getElementById('v29ReconRangeLabel');if(label)label.textContent=t('reconRange');
    const current=typeof selectedRadius!=='undefined'?String(selectedRadius):'all';
    section.querySelectorAll('[data-v29-range]').forEach(btn=>btn.classList.toggle('active',String(btn.dataset.v29Range)===current));
    const recorded=document.getElementById('v29RecordedRecon');if(recorded)recorded.textContent=t('reconRecorded');
    const wild=document.getElementById('v29WildRecon');if(wild)wild.textContent=t('reconWild');
  }

  function installMissionMenu(){
    const menu=document.querySelector('#control-menu .v26-menu-grid');
    if(!menu)return;
    menu.innerHTML=
      '<button class="osb-btn" data-v29-mission-menu="position" type="button"></button>'+
      '<button class="osb-btn" data-v29-mission-menu="maptools" type="button"></button>'+
      '<button class="osb-btn" data-v29-mission-menu="records" type="button"></button>'+
      '<button class="osb-btn" data-v29-mission-menu="data" type="button"></button>'+
      '<button class="osb-btn" data-v29-mission-menu="system" type="button"></button>';
    menu.querySelectorAll('[data-v29-mission-menu]').forEach(btn=>btn.addEventListener('click',()=>openFieldControls(btn.dataset.v29MissionMenu)));

    const records=makeSection('control-records','RECORDS',
      '<div class="field-control-grid v29-two-col">'+
        '<button class="osb-btn" id="v29RecordsManage" type="button"></button>'+
        '<button class="osb-btn active" id="v29FreeTrackMissionBtn" type="button"></button>'+
      '</div>');
    records.querySelector('#v29RecordsManage')?.addEventListener('click',()=>{closeFieldControls();root.openV29FieldKit?.('tracks');});
    records.querySelector('#v29FreeTrackMissionBtn')?.addEventListener('click',toggleFreeTrack);

    const oldFree=document.getElementById('v29FreeTrackBtn');if(oldFree)oldFree.remove();

    const mapSection=document.getElementById('control-maptools');
    const mapGrid=mapSection?.querySelector('.field-control-grid');
    if(mapGrid){
      let standard=document.getElementById('v29StandardMapBtn');
      if(!standard){
        standard=document.createElement('button');
        standard.className='osb-btn';
        standard.id='v29StandardMapBtn';
        standard.type='button';
        standard.addEventListener('click',()=>{closeFieldControls();closeLightMap();});
        mapGrid.prepend(standard);
      }
      let light=document.getElementById('v29LightMapBtn');
      if(!light){
        light=document.createElement('button');
        light.className='osb-btn';
        light.id='v29LightMapBtn';
        light.type='button';
        light.addEventListener('click',()=>{closeFieldControls();openLightMap();});
        standard.insertAdjacentElement('afterend',light);
      }
    }

    const system=document.getElementById('control-system');
    const systemGrid=system?.querySelector('.field-control-grid');
    if(systemGrid){
      systemGrid.innerHTML='<button class="osb-btn" id="v29LanguageBtn" type="button"></button>';
      systemGrid.querySelector('#v29LanguageBtn')?.addEventListener('click',()=>openFieldControls('language'));
    }
    syncMissionMenuText();
  }

  function syncMissionMenuText(){
    const labels={
      '[data-v29-mission-menu="position"]':t('locate'),
      '[data-v29-mission-menu="maptools"]':t('map'),
      '[data-v29-mission-menu="records"]':t('records'),
      '[data-v29-mission-menu="data"]':t('data'),
      '[data-v29-mission-menu="system"]':t('system'),
      '#v29RecordsManage':t('reuse'),
      '#v29FreeTrackMissionBtn':(base.track.state!=='OFF'&&base.state.activePlanId===freePlanId())?t('freeTrackManage'):t('freeTrack'),
      '#v29StandardMapBtn':t('standardMap'),
      '#v29LightMapBtn':t('lightMap'),
      '#v29LanguageBtn':t('language')
    };
    Object.entries(labels).forEach(([sel,label])=>{const el=document.querySelector(sel);if(el)el.textContent=label;});
    syncMapModeButtons();
  }

  function syncMapModeButtons(){
    document.getElementById('v29StandardMapBtn')?.classList.toggle('active',!lightMapOpen);
    document.getElementById('v29LightMapBtn')?.classList.toggle('active',lightMapOpen);
  }

  function lightMapSites(){
    const out=[];
    try{
      if(typeof RECON_TARGETS!=='undefined'&&Array.isArray(RECON_TARGETS))out.push(...RECON_TARGETS);
      if(typeof getLocalIntel==='function')out.push(...getLocalIntel());
    }catch(e){}
    return out.filter(item=>validCoords(item?.coords));
  }

  function ensureLightMap(){
    let el=document.getElementById('v29LightMap');
    if(el)return el;
    el=document.createElement('section');
    el.id='v29LightMap';
    el.className='v29-light-map';
    el.hidden=true;
    el.innerHTML=
      '<div class="v29-light-map-head"><div><small>TACTICAL RECON // LOW DATA</small><strong id="v29LightMapTitle"></strong></div>'+
      '<button class="osb-btn" id="v29LightMapClose" type="button"></button></div>'+
      '<div class="v29-light-map-canvas" id="v29LightMapCanvas"></div>'+
      '<div class="v29-light-map-readout" id="v29LightMapReadout"></div>';
    document.body.appendChild(el);
    el.querySelector('#v29LightMapClose')?.addEventListener('click',closeLightMap);
    return el;
  }

  function renderLightMap(){
    const el=ensureLightMap();
    if(!lightMapOpen)return;
    const canvas=el.querySelector('#v29LightMapCanvas');
    const readout=el.querySelector('#v29LightMapReadout');
    const title=el.querySelector('#v29LightMapTitle');
    const close=el.querySelector('#v29LightMapClose');
    if(title)title.textContent=t('lightMap');
    if(close)close.textContent=t('standardMap');

    const {ref,obj,bundle}=missionMetrics();
    const plan=activePlan();
    const route=(plan?.routeSegments||[]).flat().filter(validCoords);
    let pts=[...route];
    if(ref?.coords)pts.push(ref.coords);
    if(obj?.coords)pts.push(obj.coords);
    if(!pts.length&&typeof map!=='undefined'&&map?.getCenter){
      const c=map.getCenter();pts.push([c.lat,c.lng]);
    }
    if(!pts.length){canvas.innerHTML='';if(readout)readout.textContent='NO POSITION';return;}

    let minLat=Math.min(...pts.map(p=>Number(p[0]))),maxLat=Math.max(...pts.map(p=>Number(p[0])));
    let minLon=Math.min(...pts.map(p=>Number(p[1]))),maxLon=Math.max(...pts.map(p=>Number(p[1])));
    const latPad=Math.max(.012,(maxLat-minLat)*.2),lonPad=Math.max(.012,(maxLon-minLon)*.2);
    minLat-=latPad;maxLat+=latPad;minLon-=lonPad;maxLon+=lonPad;
    const W=600,H=420,pad=38;
    const x=lon=>pad+(lon-minLon)/(maxLon-minLon)*(W-2*pad);
    const y=lat=>H-pad-(lat-minLat)/(maxLat-minLat)*(H-2*pad);
    let svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="LIGHT MAP">';
    svg+='<text class="north" x="'+(W/2)+'" y="22">N</text>';
    for(let i=0;i<=5;i++){
      const gx=pad+i*(W-2*pad)/5,gy=pad+i*(H-2*pad)/5;
      svg+='<line class="grid" x1="'+gx+'" y1="'+pad+'" x2="'+gx+'" y2="'+(H-pad)+'"/>';
      svg+='<line class="grid" x1="'+pad+'" y1="'+gy+'" x2="'+(W-pad)+'" y2="'+gy+'"/>';
    }
    (plan?.routeSegments||[]).forEach(seg=>{
      const clean=(seg||[]).filter(validCoords);if(clean.length<2)return;
      svg+='<polyline class="route" points="'+clean.map(p=>x(p[1]).toFixed(1)+','+y(p[0]).toFixed(1)).join(' ')+'"/>';
    });
    lightMapSites()
      .filter(site=>site.coords[0]>=minLat&&site.coords[0]<=maxLat&&site.coords[1]>=minLon&&site.coords[1]<=maxLon)
      .slice(0,40)
      .forEach(site=>{svg+='<circle class="site" cx="'+x(site.coords[1])+'" cy="'+y(site.coords[0])+'" r="2.6"/>';});
    if(ref?.coords&&obj?.coords)svg+='<line class="direct" x1="'+x(ref.coords[1])+'" y1="'+y(ref.coords[0])+'" x2="'+x(obj.coords[1])+'" y2="'+y(obj.coords[0])+'"/>';
    if(ref?.coords){
      svg+='<circle class="current" cx="'+x(ref.coords[1])+'" cy="'+y(ref.coords[0])+'" r="7"/>';
      svg+='<text class="tag" x="'+(x(ref.coords[1])+10)+'" y="'+(y(ref.coords[0])-8)+'">'+String(ref.type||'REF')+'</text>';
    }
    if(obj?.coords){
      const tx=x(obj.coords[1]),ty=y(obj.coords[0]);
      svg+='<path class="target" d="M '+tx+' '+(ty-10)+' L '+(tx+10)+' '+ty+' L '+tx+' '+(ty+10)+' L '+(tx-10)+' '+ty+' Z"/>';
      svg+='<text class="tag" x="'+(tx+12)+'" y="'+(ty-9)+'">OBJ</text>';
    }
    svg+='<text class="bounds" x="'+pad+'" y="'+(H-10)+'">'+minLat.toFixed(3)+'..'+maxLat.toFixed(3)+' / '+minLon.toFixed(3)+'..'+maxLon.toFixed(3)+'</text>';
    svg+='</svg>';
    canvas.innerHTML=svg;
    if(readout){
      readout.textContent=bundle
        ? 'DIST '+missionDistance(bundle.distanceKm)+' · GRID '+formatDeg(bundle.gridBearing)+' · TRUE '+formatDeg(bundle.trueBearing)+' · MAG '+formatDeg(bundle.magneticBearing)+' · REF '+missionReferenceLabel(ref)
        : 'REF '+missionReferenceLabel(ref)+(obj?' · OBJ SET':' · NO OBJ');
    }
  }

  function openLightMap(){
    lightMapOpen=true;
    const el=ensureLightMap();
    el.hidden=false;
    document.body.classList.add('v29-light-map-open');
    syncMapModeButtons();
    renderLightMap();
  }

  function closeLightMap(){
    lightMapOpen=false;
    const el=document.getElementById('v29LightMap');if(el)el.hidden=true;
    document.body.classList.remove('v29-light-map-open');
    syncMapModeButtons();
  }

  function installLightMapFallback(){
    const btn=document.querySelector('#v29MapFallback button');
    if(btn&&btn.dataset.v29LightMap!=='1'){
      const clone=btn.cloneNode(true);
      clone.dataset.v29LightMap='1';
      btn.replaceWith(clone);
      clone.addEventListener('click',openLightMap);
    }
  }

  function ensureDrawTypePicker(){
    let el=document.getElementById('v29DrawTypePicker');
    if(el)return el;
    el=document.createElement('div');
    el.id='v29DrawTypePicker';
    el.className='v29-draw-type-picker';
    el.hidden=true;
    const types=[
      ['ROUTE','drawRoute'],
      ['DANGER','drawDanger'],
      ['BLOCKED','drawBlocked'],
      ['OBSERVATION','drawObservation'],
      ['REFERENCE','drawReference'],
      ['OTHER','drawOther']
    ];
    el.innerHTML='<div class="v29-draw-type-title">PLOT TYPE</div><div class="v29-draw-type-grid">'+
      types.map(([value,key])=>'<button class="osb-btn" data-v29-draw-type="'+value+'" type="button">'+t(key)+'</button>').join('')+
      '</div>';
    document.body.appendChild(el);
    el.querySelectorAll('[data-v29-draw-type]').forEach(btn=>btn.addEventListener('click',()=>{
      selectDrawType(btn.dataset.v29DrawType);
      el.hidden=true;
    }));
    return el;
  }

  function selectDrawType(type){
    const value=String(type||'ROUTE').toUpperCase();
    if(typeof cancelCurrentRouteStroke==='function'&&typeof routeCurrentPolyline!=='undefined'&&routeCurrentPolyline)cancelCurrentRouteStroke();
    if(value==='ROUTE'){
      routeDrawKind='ROUTE';
    }else{
      routeDrawKind='MARK';
      activeOverlayType=core.overlays.types.includes(value)?value:'REFERENCE';
    }
    overlaySeenCount=Array.isArray(routeMarkSegments)?routeMarkSegments.length:0;
    overlaySeenPlanId=String(base.state.activePlanId||'');
    if(typeof updateTargetModePanel==='function')updateTargetModePanel();
    syncDrawControls();
  }

  function openDrawTypePicker(){
    const el=ensureDrawTypePicker();
    el.hidden=false;
    el.querySelectorAll('[data-v29-draw-type]').forEach(btn=>{
      const selected=routeDrawKind==='ROUTE'
        ? btn.dataset.v29DrawType==='ROUTE'
        : btn.dataset.v29DrawType===activeOverlayType;
      btn.classList.toggle('active',selected);
    });
  }

  function syncDrawControls(){
    const btn=document.getElementById('targetDrawKindBtn');
    if(btn)btn.textContent=typeof routeDrawKind!=='undefined'&&routeDrawKind==='MARK'
      ? 'OVL · '+overlayLabel(activeOverlayType)
      : t('drawRoute');
    const clear=document.getElementById('drawClearBtn');
    if(clear&&typeof routeDrawKind!=='undefined'){
      const bucket=routeDrawKind==='MARK'?routeMarkSegments:routeDraftSegments;
      const current=typeof routeCurrentSegment!=='undefined'&&Array.isArray(routeCurrentSegment)&&routeCurrentSegment.length>0;
      clear.disabled=!(Array.isArray(bucket)&&bucket.length>0)&&!current;
    }
  }

  function installDrawUx(){
    const old=document.getElementById('targetDrawKindBtn');
    if(old&&old.dataset.v29TypePicker!=='1'){
      const clone=old.cloneNode(true);
      clone.dataset.v29TypePicker='1';
      clone.removeAttribute('onclick');
      old.replaceWith(clone);
      clone.addEventListener('click',openDrawTypePicker);
    }

    if(typeof clearRouteDraft==='function'&&!clearRouteDraft.__v29Reliable){
      const wrapped=function(){
        if(typeof targetModeActive==='undefined'||!targetModeActive||typeof targetModePhase==='undefined'||targetModePhase!=='PLAN')return;
        const overlay=routeDrawKind==='MARK';
        const bucket=overlay?routeMarkSegments:routeDraftSegments;
        const hasCurrent=typeof routeCurrentSegment!=='undefined'&&Array.isArray(routeCurrentSegment)&&routeCurrentSegment.length>0;
        if((!Array.isArray(bucket)||!bucket.length)&&!hasCurrent)return;
        const label=overlay?'OVERLAY':'ROUTE';
        if(!confirm((lang()==='ko'?label+' 선을 모두 지우시겠습니까?':'CLEAR ALL '+label+' LINES?')))return;
        const meta=overlay&&base.state.activePlanId?core.overlays.list(base.state.activePlanId):[];
        const snapshot=typeof capturePlanEditState==='function'?capturePlanEditState():null;
        if(typeof cancelCurrentRouteStroke==='function')cancelCurrentRouteStroke();
        if(overlay)routeMarkSegments=[];else routeDraftSegments=[];
        if(snapshot&&typeof recordPlanUndo==='function')recordPlanUndo(snapshot);
        routeDirty=true;
        if(typeof renderRouteDraft==='function')renderRouteDraft();
        if(base.ui.saveActive?.()){
          if(overlay)meta.forEach(item=>core.overlays.clear(base.state.activePlanId,item.segmentIndex));
          core.ui.renderOverlay?.(base.state.activePlanId);
        }
        overlaySeenCount=overlay?0:(Array.isArray(routeMarkSegments)?routeMarkSegments.length:0);
        if(typeof updateTargetModePanel==='function')updateTargetModePanel();
        syncDrawControls();
      };
      wrapped.__v29Reliable=true;
      clearRouteDraft=wrapped;
    }

    const container=typeof map!=='undefined'&&map?.getContainer?map.getContainer():null;
    if(container&&!container.dataset.v29OverlayCapture){
      container.dataset.v29OverlayCapture='1';
      container.addEventListener('pointerup',()=>{
        setTimeout(()=>{
          if(typeof targetModeActive==='undefined'||!targetModeActive||typeof targetModePhase==='undefined'||targetModePhase!=='PLAN')return;
          const planId=String(base.state.activePlanId||'');
          const count=Array.isArray(routeMarkSegments)?routeMarkSegments.length:0;
          if(planId!==overlaySeenPlanId){
            overlaySeenPlanId=planId;
            overlaySeenCount=count;
            return;
          }
          if(typeof routeDrawKind!=='undefined'&&routeDrawKind==='MARK'&&count>overlaySeenCount){
            const start=overlaySeenCount;
            if(base.ui.saveActive?.()){
              for(let i=start;i<count;i++)core.overlays.set(planId,i,activeOverlayType,'');
              core.ui.renderOverlay?.(planId);
            }
          }
          overlaySeenCount=count;
          syncDrawControls();
        },0);
      },{passive:true});
    }
    syncDrawControls();
  }

  function installRegisteredVerification(){
    if(typeof openSitrep==='function'&&!openSitrep.__v29RegisteredVerify){
      const previous=openSitrep;
      const wrapped=function(target,statusType){
        const out=previous.apply(this,arguments);
        const promote=document.getElementById('btnPromote');
        if(promote&&statusType==='REGISTERED'){
          promote.style.display='flex';
          promote.textContent=lang()==='ko'?'[ FIELD VERIFIED // 개척 완료 ]':'[ FIELD VERIFIED // SECURE SITE ]';
        }
        return out;
      };
      wrapped.__v29RegisteredVerify=true;
      openSitrep=wrapped;
    }
    if(typeof confirmPromotion==='function'&&!confirmPromotion.__v29RegisteredVerify){
      const previous=confirmPromotion;
      const wrapped=function(){
        const target=typeof currentActiveTarget!=='undefined'?currentActiveTarget:null;
        if(!target)return previous.apply(this,arguments);
        const list=typeof getLocalIntel==='function'?getLocalIntel():[];
        if(list.some(item=>String(item?.id||'')===String(target.id||'')))return previous.apply(this,arguments);
        const registered=typeof RECON_TARGETS!=='undefined'&&Array.isArray(RECON_TARGETS)
          ? RECON_TARGETS.find(item=>String(item?.id||'')===String(target.id||'')):null;
        if(!registered)return previous.apply(this,arguments);
        const name=document.getElementById('promoNameInput')?.value.trim()||registered.name;
        const memo=document.getElementById('promoMemoInput')?.value.trim()||'현장 답사 완료. 접근 및 위치 확인.';
        const copy={
          ...registered,
          name,
          desc:memo,
          status:'SECURED',
          source:'REGISTERED_VERIFICATION',
          registeredSourceId:String(registered.id),
          preSecureStatus:'REGISTERED',
          preSecureOpCode:registered.opCode,
          securedAt:new Date().toISOString().substring(0,16).replace('T',' ')
        };
        try{
          list.unshift(copy);
          saveLocalIntel(list);
          if(typeof syncPlanObjectiveSnapshotsForSite==='function')syncPlanObjectiveSnapshotsForSite(copy);
          if(typeof targetModeActive!=='undefined'&&targetModeActive&&typeof targetModeTarget!=='undefined'&&targetModeTarget&&String(targetModeTarget.id)===String(copy.id)){
            targetModeTarget=copy;
            if(typeof updateTargetModePanel==='function')updateTargetModePanel();
          }
          openSitrep(copy,'SECURED');
          closePromotionModal();
          notify(lang()==='ko'?'기록 거점을 현장 확인 완료로 등록했습니다.':'RECORDED SITE VERIFIED.');
          return true;
        }catch(e){
          alert(lang()==='ko'?'개척 상태 저장에 실패했습니다.':'FAILED TO SAVE VERIFIED SITE.');
          return false;
        }
      };
      wrapped.__v29RegisteredVerify=true;
      confirmPromotion=wrapped;
    }
  }

  function installTrackStateSync(){
    if(base.track?.stop&&!base.track.stop.__v29MenuSync){
      const previous=base.track.stop;
      const wrapped=function(){
        const out=previous.apply(this,arguments);
        setTimeout(()=>{syncFreeTrackButton();syncMissionMenuText();},0);
        return out;
      };
      wrapped.__v29MenuSync=true;
      base.track.stop=wrapped;
    }
  }

  function installMissionFieldControlHooks(){
    if(typeof openFieldControls==='function'&&!openFieldControls.__v29MissionUx){
      const previous=openFieldControls;
      const wrapped=function(section){
        const out=previous.apply(this,arguments);
        const title=document.getElementById('fieldControlTitle');
        const names={recon:t('recon'),records:t('records')};
        if(title&&names[section])title.textContent=names[section];
        if(section==='recon')syncReconPanel();
        if(section==='records')syncMissionMenuText();
        return out;
      };
      wrapped.__v29MissionUx=true;
      openFieldControls=wrapped;
    }
    if(typeof closeFieldControls==='function'&&!closeFieldControls.__v29MissionUx){
      const previous=closeFieldControls;
      const wrapped=function(){
        document.body.classList.remove('v29-bearing-open');
        return previous.apply(this,arguments);
      };
      wrapped.__v29MissionUx=true;
      closeFieldControls=wrapped;
    }
  }


  function installMissionModeNavigationHooks(){
    if(base.ui.openRoutes&&!base.ui.openRoutes.__v29MissionMode){
      const previous=base.ui.openRoutes;
      const wrapped=function(){
        setMissionMapMode(false,{frame:false});
        return previous.apply(this,arguments);
      };
      wrapped.__v29MissionMode=true;
      base.ui.openRoutes=wrapped;
    }
    if(base.ui.openPlan&&!base.ui.openPlan.__v29MissionMode){
      const previous=base.ui.openPlan;
      const wrapped=function(){
        setMissionMapMode(false,{frame:false});
        return previous.apply(this,arguments);
      };
      wrapped.__v29MissionMode=true;
      base.ui.openPlan=wrapped;
    }
    if(typeof exitTargetMode==='function'&&!exitTargetMode.__v29MissionReturn){
      const previous=exitTargetMode;
      const wrapped=function(force=false){
        const keepMission=!force&&Boolean(activeObjective());
        const out=previous.apply(this,arguments);
        setMissionMapMode(keepMission&&Boolean(activeObjective()),{frame:false});
        return out;
      };
      wrapped.__v29MissionReturn=true;
      exitTargetMode=wrapped;
    }
  }

  function installMissionUx(){
    installMissionModeNavigationHooks();
    installMissionHomebar();
    installReconPanel();
    installMissionMenu();
    installMissionHeader();
    installDrawUx();
    installRegisteredVerification();
    installTrackStateSync();
    installMissionFieldControlHooks();
    installLightMapFallback();
    ensureMissionObjectiveSheet();
    ensureMissionMapHud();
    ensureLightMap();
    syncMissionHomebarText();
    syncMissionMenuText();
    syncReconPanel();
    syncMissionHeader();
  }


  /* ---------- FREE TRACK ---------- */
  function freePlanId(){return localStorage.getItem(FREE_PLAN_KEY)||'';}
  function ensureFreePlan(){
    let plan=freePlanId()?base.plans.get(freePlanId()):null;
    if(plan)return plan;
    const stamp=new Date().toLocaleString(lang()==='ko'?'ko-KR':undefined,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
    plan=base.plans.create({name:t('freePlan')+' · '+stamp});
    if(plan)localStorage.setItem(FREE_PLAN_KEY,plan.id);
    return plan;
  }

  function toggleFreeTrack(){
    if(base.track.state!=='OFF'){
      closeFieldControls();
      if(typeof toggleTrackRecording==='function')toggleTrackRecording();
      else root.openV29FieldKit?.('tracks');
      return;
    }
    const plan=ensureFreePlan();if(!plan)return;
    base.state.activePlanId=plan.id;
    const started=base.track.start(plan.id,trackSeed());
    if(started){notify(t('freeStarted'));syncFreeTrackButton();closeFieldControls();}
  }

  function syncFreeTrackButton(){
    const active=base.track.state!=='OFF'&&base.state.activePlanId===freePlanId();
    const btn=document.getElementById('v29FreeTrackBtn');
    if(btn){btn.textContent=active?t('freeTrackManage'):t('freeTrack');btn.classList.toggle('active',active);}
    const missionBtn=document.getElementById('v29FreeTrackMissionBtn');
    if(missionBtn){missionBtn.textContent=active?t('freeTrackManage'):t('freeTrack');missionBtn.classList.toggle('active',active);}
  }


  /* ---------- R1 map shell / location card / records ---------- */
  let r1LocationTarget=null;
  let r1LocationStatus='LOCATION';
  let r1LocationMoreOpen=false;

  function r1Text(ko,en){return lang()==='ko'?ko:en;}

  function ensureR1MapSearch(){
    let btn=document.getElementById('r1MapSearch');
    if(btn)return btn;
    btn=document.createElement('button');
    btn.id='r1MapSearch';
    btn.className='r1-map-search';
    btn.type='button';
    btn.innerHTML='<span aria-hidden="true">⌕</span><strong></strong>';
    btn.addEventListener('click',()=>{
      closeR1Records();
      closeR1LocationCard(false);
      if(typeof openAddressSearch==='function')openAddressSearch();
    });
    document.body.appendChild(btn);
    syncR1MapSearch();
    return btn;
  }

  function syncR1MapSearch(){
    const btn=document.getElementById('r1MapSearch');
    const label=btn?.querySelector('strong');
    if(label)label.textContent=r1Text('위치 검색 · MGRS','SEARCH · MGRS');
  }

  function ensureR1Records(){
    let sheet=document.getElementById('r1RecordsSheet');
    if(sheet)return sheet;
    sheet=document.createElement('section');
    sheet.id='r1RecordsSheet';
    sheet.className='r1-records-sheet';
    sheet.hidden=true;
    sheet.innerHTML=
      '<div class="r1-sheet-head"><div><small>TACTICAL RECON // R1</small><strong id="r1RecordsTitle"></strong></div><button class="r1-sheet-close" type="button" aria-label="Close">×</button></div>'+
      '<div class="r1-records-grid">'+
        '<button class="osb-btn" id="r1RecordsTracks" type="button"></button>'+
        '<button class="osb-btn" id="r1RecordsRoutes" type="button"></button>'+
      '</div>'+
      '<button class="osb-btn active r1-track-quick" id="r1TrackQuick" type="button"></button>'+
      '<div class="r1-records-note" id="r1RecordsNote"></div>';
    document.body.appendChild(sheet);
    sheet.querySelector('.r1-sheet-close')?.addEventListener('click',closeR1Records);
    sheet.querySelector('#r1RecordsTracks')?.addEventListener('click',()=>{
      closeR1Records();
      root.openV29FieldKit?.('tracks');
    });
    sheet.querySelector('#r1RecordsRoutes')?.addEventListener('click',()=>{
      closeR1Records();
      base.ui.openRoutes();
    });
    sheet.querySelector('#r1TrackQuick')?.addEventListener('click',()=>{
      if(base.track.state==='OFF')toggleFreeTrack();
      else if(base.track.state==='RECORDING')base.track.pause();
      else base.track.resume(trackSeed());
      renderR1Records();
    });
    return sheet;
  }

  function renderR1Records(){
    const sheet=ensureR1Records();
    const set=(id,value)=>{const el=sheet.querySelector('#'+id);if(el)el.textContent=value;};
    set('r1RecordsTitle',r1Text('기록','RECORDS'));
    set('r1RecordsTracks',r1Text('TRACK 기록','TRACKS'));
    set('r1RecordsRoutes',r1Text('저장 경로','ROUTES'));
    set('r1RecordsNote',r1Text(
      '장소 데이터는 거점, 계획 이동은 경로, 실제 이동은 TRACK으로 분리합니다.',
      'SITES ARE PLACES. ROUTES ARE PLANS. TRACKS ARE ACTUAL MOVEMENT.'
    ));
    const quick=sheet.querySelector('#r1TrackQuick');
    if(quick){
      if(base.track.state==='RECORDING')quick.textContent=r1Text('TRACK 일시정지','PAUSE TRACK');
      else if(base.track.state==='PAUSED')quick.textContent=r1Text('TRACK 재개','RESUME TRACK');
      else quick.textContent=r1Text('TRACK 기록 시작','START TRACK');
    }
  }

  function openR1Records(){
    setR1HomeActive('records');
    if(typeof closeFieldControls==='function')closeFieldControls();
    if(typeof closeWpDrawer==='function')closeWpDrawer();
    closeR1LocationCard(false);
    const sheet=ensureR1Records();
    renderR1Records();
    sheet.hidden=false;
  }

  function closeR1Records(){
    const sheet=document.getElementById('r1RecordsSheet');
    if(sheet)sheet.hidden=true;
  }

  function r1LocationKnownSite(target){
    const id=String(target?.id||target?.siteId||'');
    if(!id)return false;
    try{
      if(typeof RECON_TARGETS!=='undefined'&&Array.isArray(RECON_TARGETS)&&RECON_TARGETS.some(item=>String(item?.id||'')===id))return true;
      if(typeof getLocalIntel==='function'&&getLocalIntel().some(item=>String(item?.id||'')===id))return true;
    }catch(e){}
    return false;
  }

  function ensureR1LocationCard(){
    let card=document.getElementById('r1LocationCard');
    if(card)return card;
    card=document.createElement('section');
    card.id='r1LocationCard';
    card.className='r1-location-card';
    card.hidden=true;
    card.innerHTML=
      '<button class="r1-location-close" type="button" aria-label="Close">×</button>'+
      '<div class="r1-location-head"><span id="r1LocationStatus"></span><strong id="r1LocationName"></strong></div>'+
      '<button class="r1-location-coords" id="r1LocationCoords" type="button"></button>'+
      '<div class="r1-location-meta" id="r1LocationMeta"></div>'+
      '<div class="r1-location-actions">'+
        '<button class="osb-btn active" id="r1LocationObjective" type="button"></button>'+
        '<button class="osb-btn" id="r1LocationSave" type="button"></button>'+
        '<button class="osb-btn" id="r1LocationMore" type="button">•••</button>'+
      '</div>'+
      '<div class="r1-location-more" id="r1LocationMorePanel" hidden>'+
        '<button class="osb-btn" data-r1-location-action="TEMP" type="button">TEMP</button>'+
        '<button class="osb-btn" data-r1-location-action="VIA" type="button">VIA</button>'+
        '<button class="osb-btn" data-r1-location-action="START" type="button">START</button>'+
        '<button class="osb-btn" data-r1-location-action="END" type="button">END</button>'+
        '<button class="osb-btn" data-r1-location-action="HOME" type="button">HOME</button>'+
        '<button class="osb-btn" data-r1-location-action="COPY" type="button"></button>'+
      '</div>';
    document.body.appendChild(card);
    card.querySelector('.r1-location-close')?.addEventListener('click',()=>closeR1LocationCard(true));
    card.querySelector('#r1LocationObjective')?.addEventListener('click',setR1Objective);
    card.querySelector('#r1LocationSave')?.addEventListener('click',saveR1Location);
    card.querySelector('#r1LocationMore')?.addEventListener('click',()=>{
      r1LocationMoreOpen=!r1LocationMoreOpen;
      const p=card.querySelector('#r1LocationMorePanel');
      if(p)p.hidden=!r1LocationMoreOpen;
    });
    card.querySelector('#r1LocationCoords')?.addEventListener('click',copyR1Location);
    card.querySelectorAll('[data-r1-location-action]').forEach(btn=>btn.addEventListener('click',()=>{
      const action=btn.dataset.r1LocationAction;
      if(action==='COPY')copyR1Location();
      else if(action==='TEMP'&&r1LocationTarget?.coords){
        if(typeof setTempMark==='function')setTempMark(r1LocationTarget.coords,'TEMP POS');
        notify(r1Text('TEMP 위치로 지정했습니다.','TEMP POSITION SET.'));
      }else if(action==='HOME'&&r1LocationTarget?.coords){
        try{map.setView(r1LocationTarget.coords,map.getZoom(),{animate:false});if(typeof setHomeAtReticle==='function')setHomeAtReticle();}catch(e){}
      }else if(['START','VIA','END'].includes(action)){
        assignR1PlanPoint(action);
      }
    }));
    return card;
  }

  function showR1LocationCard(target,statusType='LOCATION'){
    if(!target?.coords||!validCoords(target.coords))return;
    closeR1Records();
    r1LocationTarget={...target,coords:[Number(target.coords[0]),Number(target.coords[1])]};
    r1LocationStatus=String(statusType||target.status||'LOCATION').toUpperCase();
    r1LocationMoreOpen=false;
    currentActiveTarget=target;
    const card=ensureR1LocationCard();
    const mgrsText=typeof calcMGRS==='function'?calcMGRS(target.coords[0],target.coords[1]):'';
    const ref=currentReference();
    const bundle=ref?.coords?core.geo.bearingBundle(ref.coords,target.coords,{date:new Date()}):null;
    const set=(id,value)=>{const el=card.querySelector('#'+id);if(el)el.textContent=value;};
    set('r1LocationStatus',r1LocationStatus);
    set('r1LocationName',target.name||r1Text('선택 위치','SELECTED LOCATION'));
    set('r1LocationCoords',mgrsText||target.coords.map(v=>Number(v).toFixed(6)).join(', '));
    set('r1LocationMeta',bundle
      ? 'DIST '+missionDistance(bundle.distanceKm)+' · MAG '+formatDeg(bundle.magneticBearing)
      : target.coords.map(v=>Number(v).toFixed(5)).join(', '));
    set('r1LocationObjective',r1Text('목표 지정','SET OBJECTIVE'));
    const save=card.querySelector('#r1LocationSave');
    if(save){
      const known=r1LocationKnownSite(target);
      save.hidden=known;
      save.textContent=r1Text('거점 저장','SAVE SITE');
    }
    const copy=card.querySelector('[data-r1-location-action="COPY"]');
    if(copy)copy.textContent=r1Text('복사','COPY');
    const more=card.querySelector('#r1LocationMorePanel');
    if(more)more.hidden=true;
    card.hidden=false;
    document.body.classList.add('r1-location-open');
    const legacy=document.getElementById('sitrepPanel');
    if(legacy)legacy.style.display='none';
  }

  function closeR1LocationCard(clearTarget=false){
    const card=document.getElementById('r1LocationCard');
    if(card)card.hidden=true;
    document.body.classList.remove('r1-location-open');
    r1LocationMoreOpen=false;
    r1LocationTarget=null;
    if(clearTarget)currentActiveTarget=null;
  }

  async function copyR1Location(){
    if(!r1LocationTarget?.coords)return;
    const value=typeof calcMGRS==='function'
      ? calcMGRS(r1LocationTarget.coords[0],r1LocationTarget.coords[1])
      : r1LocationTarget.coords.map(v=>Number(v).toFixed(6)).join(', ');
    try{
      if(typeof writeClipboardText==='function')await writeClipboardText(value);
      else await navigator.clipboard.writeText(value);
      notify(r1Text('좌표를 복사했습니다.','COORDINATES COPIED.'));
    }catch(e){}
  }

  function r1PlanPoint(role,target=r1LocationTarget){
    if(!target?.coords)return null;
    const known=r1LocationKnownSite(target);
    return {
      id:String(target.id||target.siteId||('R1-'+role+'-'+Date.now())),
      role,
      name:String(target.name||role).slice(0,80),
      coords:[Number(target.coords[0]),Number(target.coords[1])],
      source:known?'SITE':'INPUT',
      siteId:known?String(target.siteId||target.id||''):undefined,
      address:target.address?String(target.address).slice(0,240):undefined
    };
  }

  function ensureR1Plan(){
    let plan=activePlan();
    if(plan)return plan;
    return base.plans.create({name:r1Text('새 경로','NEW ROUTE')});
  }

  function assignR1PlanPoint(role){
    const plan=ensureR1Plan();
    const point=r1PlanPoint(role);
    if(!plan||!point)return;
    const next={...plan,updatedAt:Date.now()};
    if(role==='START')next.startPoint=point;
    else if(role==='END')next.endPoint=point;
    else if(role==='VIA')next.viaPoints=[...(plan.viaPoints||[]),{...point,id:'R1-VIA-'+Date.now()}];
    if(base.storage.saveV28Plan(next)){
      base.state.activePlanId=plan.id;
      notify(r1Text(role+' 지점에 추가했습니다.',role+' ADDED TO ROUTE.'));
    }
  }

  function setR1Objective(){
    if(!r1LocationTarget?.coords)return;
    let plan=activePlan();
    if(plan)plan=base.plans.setObjective(plan.id,r1LocationTarget);
    else plan=base.plans.create({name:r1LocationTarget.name||r1Text('새 경로','NEW ROUTE'),objective:r1LocationTarget});
    if(!plan)return;
    base.state.activePlanId=plan.id;
    closeR1LocationCard(false);
    if(typeof setMissionMapMode==='function')setMissionMapMode(true,{frame:true});
    else if(typeof updateTargetModePanel==='function')updateTargetModePanel();
  }

  function saveR1Location(){
    if(!r1LocationTarget?.coords||r1LocationKnownSite(r1LocationTarget))return;
    if(typeof getLocalIntel!=='function'||typeof saveLocalIntel!=='function')return;
    const now=Date.now();
    const point={
      id:'WP-'+now,
      opCode:'OP-USER-'+String(now).slice(-6),
      name:r1LocationTarget.name||r1Text('저장 위치','SAVED LOCATION'),
      coords:[...r1LocationTarget.coords],
      address:r1LocationTarget.address||'',
      desc:r1Text('R1 위치 카드에서 저장한 거점.','SITE SAVED FROM R1 LOCATION CARD.'),
      tips:'',
      status:'UNEXPLORED',
      createdAt:new Date(now).toISOString(),
      source:'USER_PLACED'
    };
    try{
      const list=getLocalIntel();
      list.unshift(point);
      saveLocalIntel(list);
      r1LocationTarget=point;
      currentActiveTarget=point;
      showR1LocationCard(point,'UNEXPLORED');
      if(typeof renderAllMarkers==='function')renderAllMarkers();
      notify(r1Text('거점으로 저장했습니다.','SITE SAVED.'));
    }catch(e){
      notify(r1Text('거점 저장에 실패했습니다.','SITE SAVE FAILED.'),'danger');
    }
  }

  function installR1LocationOwnership(){
    ensureR1LocationCard();
    if(typeof openSitrep==='function'&&!openSitrep.__r1Location){
      const previous=openSitrep;
      const wrapped=function(target,statusType){
        const out=previous.apply(this,arguments);
        showR1LocationCard(target,statusType||target?.status||'LOCATION');
        return out;
      };
      wrapped.__r1Location=true;
      openSitrep=wrapped;
    }
    if(typeof closeSitrep==='function'&&!closeSitrep.__r1Location){
      const previous=closeSitrep;
      const wrapped=function(){
        const out=previous.apply(this,arguments);
        closeR1LocationCard(true);
        return out;
      };
      wrapped.__r1Location=true;
      closeSitrep=wrapped;
    }
    if(typeof moveToSelectedAddress==='function'&&!moveToSelectedAddress.__r1Location){
      const previous=moveToSelectedAddress;
      const wrapped=function(){
        const picked=selectedAddressResult?{...selectedAddressResult}:null;
        const out=previous.apply(this,arguments);
        if(picked&&Number.isFinite(Number(picked.lat))&&Number.isFinite(Number(picked.lon))){
          showR1LocationCard({
            id:'R1-SEARCH-'+Date.now(),
            name:picked.name||picked.address||r1Text('검색 위치','SEARCH RESULT'),
            address:picked.address||'',
            coords:[Number(picked.lat),Number(picked.lon)],
            source:picked.source||'INPUT'
          },'LOCATION');
        }
        return out;
      };
      wrapped.__r1Location=true;
      moveToSelectedAddress=wrapped;
    }
  }

  function installR1ObjectiveCard(){
    if(typeof renderMissionMapHud==='function'&&!renderMissionMapHud.__r1Card){
      const previous=renderMissionMapHud;
      const wrapped=function(){
        const out=previous.apply(this,arguments);
        const hud=document.getElementById('v29MissionMapHud');
        const obj=activeObjective();
        if(hud&&!hud.hidden&&obj?.coords){
          const ref=currentReference();
          const bundle=ref?.coords?core.geo.bearingBundle(ref.coords,obj.coords,{date:new Date()}):null;
          const mgrsText=typeof calcMGRS==='function'?calcMGRS(obj.coords[0],obj.coords[1]):'';
          const metrics=hud.querySelector('#v29MissionMapMetrics');
          const refLine=hud.querySelector('#v29MissionMapRef');
          if(metrics)metrics.textContent=mgrsText||obj.coords.map(v=>Number(v).toFixed(5)).join(', ');
          if(refLine)refLine.textContent=bundle
            ? 'DIST '+missionDistance(bundle.distanceKm)+' · MAG '+formatDeg(bundle.magneticBearing)+' · REF '+missionReferenceLabel(ref)
            : 'REF '+missionReferenceLabel(ref);
          const plan=hud.querySelector('#v29MissionMapPlan');
          if(plan)plan.textContent=r1Text('경로 계획','PLAN ROUTE');
          const fit=hud.querySelector('#v29MissionMapFit');
          if(fit)fit.textContent='⌖';
        }
        return out;
      };
      wrapped.__r1Card=true;
      renderMissionMapHud=wrapped;
    }
  }

  function installR1Shell(){
    ensureR1MapSearch();
    ensureR1Records();
    installR1LocationOwnership();
    installR1ObjectiveCard();
    syncR1MapSearch();
    renderR1Records();
  }


  /* ---------- language + lifecycle ---------- */
  function syncAllText(){
    syncMenuText();syncSiteControlsText();refreshBearingPanel();syncPlanHeader();syncMissionHomebarText();syncMissionMenuText();syncReconPanel();syncMissionHeader();syncMissionMapModeUi();syncR1MapSearch();renderR1Records();
    const picker=document.getElementById('v29LocationPicker');
    if(picker&&!picker.hidden){
      picker.querySelector('#v29PickerSearch').textContent=t('pickerSearch');
      picker.querySelector('#v29PickerConfirm').textContent=pickerLabel(pickerMode);
      picker.querySelector('#v29PickerCancel').textContent=t('pickerCancel');
    }
  }

  function install(){
    if(installed)return;installed=true;
    document.title='TACTICAL RECON // R1.1 FIELD TERMINAL';
    document.body.classList.add('v29-stabilized','r1-runtime','r11-ui');
    installLastFix();
    installUnifiedSearch();
    installSearchCloseReliability();
    if(typeof openAddressSearch==='function'&&!openAddressSearch.__v29PickerAware){
      const previous=openAddressSearch;
      const wrapped=function(){
        const out=previous.apply(this,arguments);
        const save=document.getElementById('addressSaveButton');
        const temp=document.getElementById('addressTempButton');
        if(save)save.hidden=false;
        if(temp)temp.hidden=false;
        syncAddressSearchPickerMode();
        return out;
      };
      wrapped.__v29PickerAware=true;
      openAddressSearch=wrapped;
    }
    installSiteFilterData();
    installPlanHeader();
    installNavReferenceGuard();
    wrapFinalPanelSync();
    bindObjectiveReticle();
    installSiteControls();
    installMenu();
    installStorageErrorUi();
    installSaferTrackHud();
    installNavRecoveryHooks();
    ensurePicker();
    installMissionUx();
    installR1Shell();

    const previousRender=typeof renderWpDrawerList==='function'?renderWpDrawerList:null;
    if(previousRender&&!previousRender.__v29Sites){
      const wrapped=function(){const out=previousRender.apply(this,arguments);installSiteControls();syncSiteControlsText();return out;};
      wrapped.__v29Sites=true;renderWpDrawerList=wrapped;
    }

    const previousObjective=base.ui.openObjective;
    if(previousObjective&&!previousObjective.__v29PickerBind){
      const wrapped=function(){const out=previousObjective.apply(this,arguments);setTimeout(bindObjectiveReticle,0);return out;};
      wrapped.__v29PickerBind=true;base.ui.openObjective=wrapped;
    }

    new MutationObserver(()=>syncAllText()).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){stopBearingSensor();persistNavRecovery();}
      else syncPersistentLastFixMarker();
    });
    window.addEventListener('pageshow',()=>syncPersistentLastFixMarker());
    window.addEventListener('pagehide',()=>{stopBearingSensor();persistNavRecovery();});

    syncAllText();
  }

  root.v29Stabilize={
    openLocationPicker:openPicker,
    exportBackup:exportFullBackup,
    restoreBackup:restoreFullBackup,
    startBearingSensor,
    stopBearingSensor,
    getLastFix:persistentLastFix,
    openLightMap,
    closeLightMap,
    frameObjectiveContext,
    openMissionMap:()=>setMissionMapMode(true,{frame:true}),
    dismissMissionContext,
    openObjectiveInfo:openMissionObjectiveSheet
  };

  root.r1={openRecords:openR1Records,openLocation:showR1LocationCard,closeLocation:closeR1LocationCard,setObjective:setR1Objective};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();