/* Tactical Recon V29 stabilization
 * Final ownership for field-facing PLAN/NAV/SITES/menu interactions.
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

  const text={
    ko:{
      locate:'위치',bearing:'방위각',map:'지도',data:'데이터',system:'시스템',
      siteAdd:'+ 거점 추가',positionSearch:'위치 검색',tempSet:'TEMP 지정',tempClear:'TEMP 삭제',
      homeSet:'HOME 지정',homeGo:'HOME 이동',homeClear:'HOME 삭제',gpsStatus:'GPS 상태',
      gpsPower:'GPS 전원',nearby:'주변 탐색',layers:'레이어',roads:'도로 강조',display:'표시 모드',
      reuse:'재활용/궤적',gpx:'GPX 반출',backup:'전체 백업',restore:'백업 복원',
      freeTrack:'자유 궤적 시작',freeTrackManage:'자유 궤적 관리',
      pickerSearch:'위치 검색',pickerCancel:'취소',pickerSite:'이 위치 선택',pickerObjective:'목표로 지정',
      pickerTemp:'TEMP로 지정',pickerHome:'HOME으로 지정',
      objectiveHint:'탭하여 목표 변경',navStart:'탭하여 항법 시작',positionRequired:'위치 기준 필요',
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
      pickerSearch:'POSITION SEARCH',pickerCancel:'CANCEL',pickerSite:'USE THIS LOCATION',pickerObjective:'SET OBJECTIVE',
      pickerTemp:'SET TEMP',pickerHome:'SET HOME',
      objectiveHint:'TAP TO CHANGE OBJECTIVE',navStart:'TAP TO START NAV',positionRequired:'REFERENCE REQUIRED',
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

  function installLastFix(){
    if(typeof applyGpsPosition==='function'&&!applyGpsPosition.__v29LastFix){
      const previous=applyGpsPosition;
      const wrapped=function(pos){
        const out=previous.apply(this,arguments);
        persistLastFix(pos);
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
    if(hint)hint.textContent=!objective?t('objectiveHint'):(ref?.coords?t('navStart'):t('positionRequired'));
    navArea?.classList.toggle('ready',Boolean(objective&&ref?.coords));
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
      return out;
    };
    wrapped.__v29Final=true;
    updateTargetModePanel=wrapped;
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
      if(typeof openAddressSearch==='function')openAddressSearch();
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

  function closePicker(){
    const el=document.getElementById('v29LocationPicker');
    if(el)el.hidden=true;
    document.body.classList.remove('v29-picking-location');
    pickerMode=null;
    pickerReturn=null;
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
      if(next)base.ui.openPlan(next.id);
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
      const registered=(typeof RECON_TARGETS!=='undefined'&&Array.isArray(RECON_TARGETS)?RECON_TARGETS:[])
        .map(item=>({...item,__kind:'REGISTERED'}));
      const local=typeof getLocalIntel==='function'?getLocalIntel().map(item=>({...item})):[];
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
    return ref.type==='GPS'
      ? {kind:'GPS',lat:Number(ref.coords[0]),lon:Number(ref.coords[1]),timestamp:Date.now()}
      : {kind:'TEMP',coords:[Number(ref.coords[0]),Number(ref.coords[1])],timestamp:Date.now()};
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
    ['returnToTargetPlan','stopTargetNavigation','exitTargetMode'].forEach(name=>{
      try{
        const fn=eval(name);
        if(typeof fn!=='function'||fn.__v29Recovery)return;
        const wrapped=function(){const out=fn.apply(this,arguments);clearNavRecovery();return out;};
        wrapped.__v29Recovery=true;
        eval(name+'=wrapped');
      }catch(e){}
    });
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
    const mirror=await root.v29Storage?.getAllTracks?.()||[];
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
    const btn=document.getElementById('v29FreeTrackBtn');if(!btn)return;
    const active=base.track.state!=='OFF'&&base.state.activePlanId===freePlanId();
    btn.textContent=active?t('freeTrackManage'):t('freeTrack');
    btn.classList.toggle('active',active);
  }

  /* ---------- language + lifecycle ---------- */
  function syncAllText(){
    syncMenuText();syncSiteControlsText();refreshBearingPanel();syncPlanHeader();
    const picker=document.getElementById('v29LocationPicker');
    if(picker&&!picker.hidden){
      picker.querySelector('#v29PickerSearch').textContent=t('pickerSearch');
      picker.querySelector('#v29PickerConfirm').textContent=pickerLabel(pickerMode);
      picker.querySelector('#v29PickerCancel').textContent=t('pickerCancel');
    }
  }

  function install(){
    if(installed)return;installed=true;
    document.body.classList.add('v29-stabilized');
    installLastFix();
    installUnifiedSearch();
    installSiteFilterData();
    installPlanHeader();
    wrapFinalPanelSync();
    bindObjectiveReticle();
    installSiteControls();
    installMenu();
    installStorageErrorUi();
    installSaferTrackHud();
    installNavRecoveryHooks();
    ensurePicker();

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
    document.addEventListener('visibilitychange',()=>{if(document.hidden){stopBearingSensor();persistNavRecovery();}});
    window.addEventListener('pagehide',()=>{stopBearingSensor();persistNavRecovery();});

    syncAllText();
  }

  root.v29Stabilize={
    openLocationPicker:openPicker,
    exportBackup:exportFullBackup,
    restoreBackup:restoreFullBackup,
    startBearingSensor,
    stopBearingSensor,
    getLastFix:persistentLastFix
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();