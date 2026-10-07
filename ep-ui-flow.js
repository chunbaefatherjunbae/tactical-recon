(function(root){
  'use strict';

  if(root.EpUiFlow?.version)return;

  let installed=false;
  let missionListOpen=false;

  const $=id=>document.getElementById(id);
  const state=()=>root.EpRuntimeBridge?.state||null;
  const surface=()=>root.EpSurfaceBridge?.surface||state()?.surface||'MAP';

  function selected(){return state()?.selected||null;}
  function plan(){return root.EpPlanBridge?.getPlan?.()||state()?.plan||null;}
  function mission(){return root.EpMissionBridge?.getMission?.()||state()?.mission||null;}

  function coordsOf(point){
    if(!point)return null;
    const lat=Number(point.lat??point.coords?.[0]);
    const lon=Number(point.lon??point.coords?.[1]);
    return Number.isFinite(lat)&&Number.isFinite(lon)?[lat,lon]:null;
  }

  function legacyPoint(point){
    const coords=coordsOf(point);
    if(!coords)return null;
    return {
      id:point.id,
      name:point.name||'선택 위치',
      coords,
      address:point.address||'',
      source:point.source||'EP'
    };
  }

  function sourceLabel(point){
    const source=String(point?.source||'').toUpperCase();
    if(source==='REGISTERED'||source==='BUILTIN')return '등록 거점';
    if(source==='USER'||source==='USER_PLACED'||source==='SAVED')return '내 거점';
    if(source==='SEARCH'||source==='ADDRESS')return '검색 위치';
    if(source==='UNEXPLORED'||source==='WILD')return '미개척';
    if(source==='PLAN')return '계획 지점';
    return '위치';
  }

  function mgrs(point){
    const c=coordsOf(point);
    if(!c)return '--';
    try{return typeof calcMGRS==='function'?String(calcMGRS(c[0],c[1])):`${c[0].toFixed(5)}, ${c[1].toFixed(5)}`;}
    catch(e){return `${c[0].toFixed(5)}, ${c[1].toFixed(5)}`;}
  }

  function referenceCoords(){
    const ref=root.EpRuntimeBridge?.getReference?.();
    return ref?.coords||null;
  }

  function distanceBearing(point){
    const a=referenceCoords(),b=coordsOf(point);
    if(!a||!b)return '기준위치 없음';
    try{
      const km=typeof calcDistanceKmRaw==='function'?Number(calcDistanceKmRaw(a[0],a[1],b[0],b[1])):NaN;
      const brg=typeof calcBearingDegrees==='function'?Number(calcBearingDegrees(a[0],a[1],b[0],b[1])):NaN;
      const d=Number.isFinite(km)?(km<1?Math.round(km*1000)+' M':km.toFixed(2)+' KM'):'--';
      const btxt=Number.isFinite(brg)?String(Math.round(brg)).padStart(3,'0')+'°':'---°';
      return d+' · BRG '+btxt;
    }catch(e){return '기준위치 없음';}
  }

  function notify(message){root.EpUiShell?.notify?.(message);}

  function closeLocation(){
    try{
      if(typeof root.closeSitrep==='function')root.closeSitrep();
      else root.EpOverlayBridge?.closeOverlay?.('LOCATION',{source:'EP_CARD_CLOSE'});
    }catch(e){root.EpOverlayBridge?.closeOverlay?.('LOCATION',{source:'EP_CARD_CLOSE'});}
    root.EpRuntimeBridge?.clearSelected?.();
  }

  function setSelectedPoint(point,kind='PLAN'){
    const legacy=legacyPoint(point);
    if(!legacy)return;
    root.EpRuntimeBridge?.setSelected?.(legacy,{source:kind});
    root.EpOverlayBridge?.setOverlay?.('LOCATION',{source:'EP_PLAN_POINT'});
    const c=legacy.coords;
    try{map?.setView?.(c,Math.max(map.getZoom(),15),{animate:false});}catch(e){}
  }

  function assign(role){
    const point=legacyPoint(selected());
    if(!point)return;
    if(surface()!=='PLAN'){notify('PLAN에서 사용');return;}
    const ok=root.EpPlanBridge?.setRole?.(role,point);
    if(ok){closeLocation();refresh();}
  }

  function setDestination(){
    const point=legacyPoint(selected());
    if(!point)return;
    if(surface()==='MISSION'){notify('임무 중 목적 변경은 PLAN 편집에서');return;}
    if(surface()==='PLAN'){
      if(root.EpPlanBridge?.setObjective?.(point)){closeLocation();refresh();}
      return;
    }
    if(typeof root.enterTargetMode==='function'){
      closeLocation();
      root.enterTargetMode(point);
      root.EpPlanBridge?.syncFromLegacy?.(true);
      root.EpSurfaceBridge?.syncFromLegacy?.('EP_DESTINATION');
      refresh();
    }
  }

  function setTemp(){
    const point=legacyPoint(selected());
    if(!point)return;
    if(typeof root.setTempMark==='function'){
      root.setTempMark(point.coords,point.name||'TEMP');
      notify('TEMP 설정');
    }
  }

  function saveSelected(){
    const point=selected(),coords=coordsOf(point);
    if(!point||!coords||typeof root.getLocalIntel!=='function'||typeof root.saveLocalIntel!=='function')return;
    const list=root.getLocalIntel();
    const existing=list.find(item=>
      String(item.id||'')===String(point.id||'')||
      (Math.abs(Number(item.coords?.[0])-coords[0])<1e-6&&Math.abs(Number(item.coords?.[1])-coords[1])<1e-6)
    );
    if(existing){notify('이미 저장됨');return;}
    const saved={
      id:'USER-'+Date.now(),
      name:String(point.name||'저장 위치').slice(0,80),
      coords:[coords[0],coords[1]],
      address:String(point.address||'').slice(0,500),
      desc:'사용자 저장 위치',
      source:'USER_PLACED',
      status:'USER_PLACED',
      opCode:'USR'
    };
    list.push(saved);
    root.saveLocalIntel(list);
    root.EpRuntimeBridge?.setSelected?.(saved,{source:'SAVED'});
    notify('위치 저장');
    refresh();
  }

  function removeFromPlan(){
    const point=selected();
    if(!point||surface()!=='PLAN')return;
    if(root.EpPlanBridge?.removePointById?.(point.id)){
      closeLocation();refresh();
    }else notify('이 포인트는 삭제할 수 없음');
  }

  function openViaSearch(){
    if(typeof root.openRouteLocate==='function')root.openRouteLocate('VIA');
    else if(typeof root.openPlanSearch==='function')root.openPlanSearch();
  }

  function beginDraw(){
    if(typeof root.enterPlanDrawMode==='function')root.enterPlanDrawMode();
    refresh();
  }

  function importRoute(){
    if(root.v29?.ui?.open)root.v29.ui.open('tracks');
    else if(typeof root.openV29FieldKit==='function')root.openV29FieldKit('tracks');
  }

  function startMission(){
    if(typeof root.startTargetNavigation==='function')root.startTargetNavigation();
    root.EpMissionBridge?.syncFromLegacy?.(true);
    root.EpSurfaceBridge?.syncFromLegacy?.('EP_START_MISSION');
    refresh();
  }

  function drawTool(kind){
    try{
      if(typeof routeDrawKind!=='undefined')routeDrawKind=kind;
      root.updateTargetModePanel?.();
    }catch(e){}
    refresh();
  }

  function undoDraw(){
    if(root.EpPlanBridge?.undoStroke?.('ROUTE'))refresh();
    else root.undoRouteStroke?.();
  }

  function finishDraw(){
    root.exitPlanSubmode?.();
    refresh();
  }

  function missionPrev(){if(root.EpMissionBridge?.previous?.()){refresh();root.updateTargetModePanel?.();}}
  function missionNext(){if(root.EpMissionBridge?.next?.()){refresh();root.updateTargetModePanel?.();}}

  function openMissionMore(){
    if(typeof root.openNavMore==='function')root.openNavMore();
    else if(typeof root.openFieldControls==='function')root.openFieldControls('menu');
  }

  function toggleMissionList(){
    missionListOpen=!missionListOpen;
    refresh();
  }

  function build(){
    if($('epFlow'))return;
    const host=document.createElement('div');
    host.id='epFlow';
    host.className='ep-flow';
    host.innerHTML=
      '<section class="ep-location-card" id="epLocationCard" hidden>'+
        '<button class="ep-card-close" id="epLocationClose" type="button">×</button>'+
        '<span class="ep-flow-kicker" id="epLocationKind">LOCATION</span>'+
        '<h2 id="epLocationName">선택 위치</h2>'+
        '<strong class="ep-location-mgrs" id="epLocationMgrs">--</strong>'+
        '<span class="ep-location-meta" id="epLocationAddress"></span>'+
        '<span class="ep-location-meta" id="epLocationMetrics">기준위치 없음</span>'+
        '<div class="ep-location-actions">'+
          '<button id="epLocStart" type="button">출발</button>'+
          '<button id="epLocVia" type="button">경유</button>'+
          '<button id="epLocDest" class="primary" type="button">목적</button>'+
          '<button id="epLocTemp" type="button">TEMP</button>'+
          '<button id="epLocSave" type="button">저장</button>'+
          '<button id="epLocRemove" type="button">계획삭제</button>'+
        '</div>'+
      '</section>'+
      '<section class="ep-plan-shell" id="epPlanShell" hidden>'+
        '<div class="ep-plan-head"><div><span class="ep-flow-kicker">계획</span><br><strong id="epPlanName">--</strong></div><small id="epPlanCount">0 지점</small></div>'+
        '<div class="ep-plan-list" id="epPlanList"></div>'+
        '<button class="ep-plan-add" id="epPlanAdd" type="button">＋ 위치</button>'+
        '<nav class="ep-plan-actions" id="epPlanActions">'+
          '<button id="epPlanDraw" type="button">경로</button>'+
          '<button id="epPlanImport" type="button">불러오기</button>'+
          '<button id="epPlanStart" class="primary" type="button">▶ 시작</button>'+
        '</nav>'+
        '<nav class="ep-draw-actions" id="epDrawActions" hidden>'+
          '<button id="epDrawRoute" type="button">경로선</button>'+
          '<button id="epDrawMark" type="button">표시선</button>'+
          '<button id="epDrawUndo" type="button">↶</button>'+
          '<button id="epDrawDone" class="primary" type="button">완료</button>'+
        '</nav>'+
      '</section>'+
      '<section class="ep-mission-shell" id="epMissionShell" hidden>'+
        '<div class="ep-mission-next">'+
          '<span class="ep-flow-kicker">다음</span>'+
          '<strong id="epMissionName">--</strong>'+
          '<span class="ep-mission-metrics" id="epMissionMetrics">--</span>'+
          '<span class="ep-mission-ref" id="epMissionRef">REF --</span>'+
          '<span class="ep-mission-time" id="epMissionTime">MISSION 00:00:00</span>'+
        '</div>'+
        '<button class="ep-mission-more" id="epMissionMore" type="button">⋯</button>'+
        '<div class="ep-mission-list" id="epMissionList" hidden></div>'+
        '<nav class="ep-mission-stepper">'+
          '<button id="epMissionPrev" type="button">‹</button>'+
          '<button id="epMissionIndex" type="button">-- / --</button>'+
          '<button id="epMissionNext" type="button">›</button>'+
        '</nav>'+
      '</section>';
    document.body.appendChild(host);

    $('epLocationClose').onclick=closeLocation;
    $('epLocStart').onclick=()=>assign('START');
    $('epLocVia').onclick=()=>assign('VIA');
    $('epLocDest').onclick=setDestination;
    $('epLocTemp').onclick=setTemp;
    $('epLocSave').onclick=saveSelected;
    $('epLocRemove').onclick=removeFromPlan;

    $('epPlanAdd').onclick=openViaSearch;
    $('epPlanDraw').onclick=beginDraw;
    $('epPlanImport').onclick=importRoute;
    $('epPlanStart').onclick=startMission;
    $('epDrawRoute').onclick=()=>drawTool('ROUTE');
    $('epDrawMark').onclick=()=>drawTool('MARK');
    $('epDrawUndo').onclick=undoDraw;
    $('epDrawDone').onclick=finishDraw;

    $('epMissionPrev').onclick=missionPrev;
    $('epMissionNext').onclick=missionNext;
    $('epMissionIndex').onclick=toggleMissionList;
    $('epMissionMore').onclick=openMissionMore;
  }

  function renderLocation(){
    const card=$('epLocationCard'),point=selected();
    const visible=state()?.overlay==='LOCATION'&&point;
    card.hidden=!visible;
    if(!visible)return;

    $('epLocationKind').textContent=sourceLabel(point);
    $('epLocationName').textContent=point.name||'선택 위치';
    $('epLocationMgrs').textContent=mgrs(point);

    let address=String(point.address||'').trim();
    if(!address){
      const legacy=document.getElementById('sitrepAddressValue');
      if(legacy&&legacy.textContent&&!legacy.textContent.includes('조회 중'))address=legacy.textContent.trim();
    }
    $('epLocationAddress').textContent=address;
    $('epLocationMetrics').textContent=distanceBearing(point);

    const p=plan(),s=surface();
    $('epLocStart').disabled=s!=='PLAN'||!p;
    $('epLocVia').disabled=s!=='PLAN'||!p;
    $('epLocDest').disabled=s==='MISSION';

    const inPlan=p?.points?.find(item=>String(item.id)===String(point.id));
    const objectiveId=p?.compatibility?.targetId;
    $('epLocRemove').disabled=s!=='PLAN'||!inPlan||String(inPlan.id)===String(objectiveId);
  }

  function renderPlan(){
    const shell=$('epPlanShell'),p=plan();
    const visible=surface()==='PLAN'&&p;
    shell.hidden=!visible;
    if(!visible)return;

    const points=p.points||[];
    const objectiveId=p.compatibility?.targetId;
    const objective=points.find(item=>String(item.id)===String(objectiveId));
    $('epPlanName').textContent=objective?.name||points[points.length-1]?.name||'PLAN';
    $('epPlanCount').textContent=points.length+' 지점';

    const list=$('epPlanList');
    list.replaceChildren();
    points.forEach((point,index)=>{
      const row=document.createElement('button');
      row.type='button';row.className='ep-plan-row';
      const role=root.EpPlanCore?.roleAt?.(index,points.length)||'VIA';
      row.innerHTML='<span class="num">'+String(index+1).padStart(2,'0')+'</span><span><strong></strong><small></small></span><span class="role"></span>';
      row.querySelector('strong').textContent=point.name||'POINT';
      row.querySelector('small').textContent=mgrs(point);
      row.querySelector('.role').textContent=String(point.id)===String(objectiveId)?'목적':(role==='START'?'출발':role==='END'?'종료':'경유');
      row.onclick=()=>setSelectedPoint(point,'PLAN');
      list.appendChild(row);
    });

    const drawing=document.body.classList.contains('plan-draw-submode');
    $('epPlanActions').hidden=drawing;
    $('epDrawActions').hidden=!drawing;
    $('epDrawRoute').classList.toggle('primary',typeof routeDrawKind!=='undefined'&&routeDrawKind==='ROUTE');
    $('epDrawMark').classList.toggle('primary',typeof routeDrawKind!=='undefined'&&routeDrawKind==='MARK');
  }

  function formatElapsed(ms){
    const sec=Math.max(0,Math.floor(Number(ms||0)/1000));
    const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
    return [h,m,s].map(v=>String(v).padStart(2,'0')).join(':');
  }

  function renderMission(){
    const shell=$('epMissionShell'),m=mission();
    const visible=surface()==='MISSION'&&m;
    shell.hidden=!visible;
    if(!visible){missionListOpen=false;return;}

    const target=root.EpMissionCore?.currentTarget?.(m);
    $('epMissionName').textContent=target?.name||'--';
    $('epMissionMetrics').textContent=target?distanceBearing(target):'--';

    const ref=root.EpRuntimeBridge?.getReference?.();
    $('epMissionRef').textContent=ref?.coords?(String(ref.type||'REF')+' · '+mgrs({lat:ref.coords[0],lon:ref.coords[1]})):'REF --';
    $('epMissionTime').textContent='임무 '+formatElapsed(Date.now()-Number(m.startedAt||Date.now()));

    const count=m.activePlan?.points?.length||0;
    $('epMissionIndex').textContent=(Number(m.currentIndex||0)+1)+' / '+count;
    $('epMissionPrev').disabled=!root.EpMissionCore?.canStep?.(m,-1);
    $('epMissionNext').disabled=!root.EpMissionCore?.canStep?.(m,1);

    const list=$('epMissionList');
    list.hidden=!missionListOpen;
    if(missionListOpen){
      list.replaceChildren();
      (m.activePlan?.points||[]).forEach((point,index)=>{
        const row=document.createElement('div');
        row.className='ep-mission-list-row'+(index<m.currentIndex?' done':'')+(index===m.currentIndex?' current':'');
        row.innerHTML='<span>'+String(index+1).padStart(2,'0')+'</span><strong></strong><span></span>';
        row.querySelector('strong').textContent=point.name||'POINT';
        row.lastElementChild.textContent=index<m.currentIndex?'완료':index===m.currentIndex?'NEXT':'예정';
        list.appendChild(row);
      });
    }
  }

  function refresh(){
    if(!$('epFlow'))return;
    renderLocation();
    renderPlan();
    renderMission();
  }

  function install(){
    if(installed)return;
    installed=true;
    build();
    refresh();
    root.addEventListener?.('ep-state-change',refresh);
    root.addEventListener?.('ep-track-lifecycle',refresh);
    setInterval(refresh,1000);
  }

  root.EpUiFlow={version:'EP-V5-FLOW',install,refresh};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})(typeof globalThis!=='undefined'?globalThis:this);
