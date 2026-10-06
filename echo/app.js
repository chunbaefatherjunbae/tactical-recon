(function(){
  'use strict';
  const Core=window.EchoCore, Loc=window.ReconLocationCore;
  if(!window.L||!Core)throw new Error('ECHOPOINT_DEPENDENCY_MISSING');

  const STORAGE={saved:'echopoint_saved_locations_v1',tracks:'echopoint_tracks_v1'};
  const state=Core.createState();
  state.savedLocations=readJson(STORAGE.saved,[]);
  let selected=null,gpsWatch=null,searchIntent='select',pendingInsertIndex=null;
  let currentMarker=null,tempMarker=null,selectedMarker=null,routeLine=null,trackLine=null,planMarkers=[];
  let toastTimer=null,missionTimer=null,longTrackTimer=null,trackLong=false;
  let drawing=false,drawPointer=null,lastDrawPoint=null;

  const $=id=>document.getElementById(id);
  const app=$('app');
  const map=L.map('map',{zoomControl:false,attributionControl:true,preferCanvas:true}).setView([37.5665,126.9780],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);

  function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtMgrs(p){
    if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))return '--';
    try{
      if(window.mgrs?.forward){
        const raw=window.mgrs.forward([p.lon,p.lat],5).replace(/\s+/g,'');
        const m=raw.match(/^(\d{1,2}[C-HJ-NP-X])([A-HJ-NP-Z]{2})(\d{5})(\d{5})$/);
        return m?`${m[1]} ${m[2]} ${m[3]} ${m[4]}`:raw;
      }
    }catch{}
    return `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;
  }
  function markerIcon(label,kind='normal'){
    return L.divIcon({className:'',html:`<div class="echo-marker ${kind}"><span>${esc(label)}</span></div>`,iconSize:[26,26],iconAnchor:[13,13]});
  }
  function toast(msg){clearTimeout(toastTimer);$('toast').textContent=msg;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,1800)}
  function closeSheets(except){['locationCard','searchSheet','listSheet','moreSheet'].forEach(id=>{if(id!==except)$(id).hidden=true;});}
  function openSheet(id){closeSheets(id);$(id).hidden=false;}

  function reference(){return Core.getReference(state);}
  function updateHud(){
    const ref=reference();
    const posLabel=ref?(ref.referenceKind==='GPS'?'POS':'REF'):'POS';
    $('posLine').querySelector('span').textContent=posLabel;
    $('posLine').querySelector('strong').textContent=ref?`${ref.referenceKind==='GPS'?'':ref.referenceKind+' · '}${fmtMgrs(ref)}`:'NO FIX';
    const c=map.getCenter();
    $('tgtLine').querySelector('strong').textContent=fmtMgrs({lat:c.lat,lon:c.lng});
    $('gpsBtn').classList.toggle('active',state.gps.enabled);
    $('gpsBtn').querySelector('small').textContent=state.gps.enabled?(state.gps.fix?'FIX':'ON'):'OFF';
    $('followBtn').classList.toggle('active',state.gps.follow);
    $('tempBtn').classList.toggle('active',!!state.temp);
    const ts=state.track.state;
    $('trackBtn').className='tool-btn '+(ts===Core.TRACK.RECORDING?'track-recording active':ts===Core.TRACK.PAUSED?'track-paused active':'track-off');
    $('trackBtn').querySelector('.track-dot').textContent=ts===Core.TRACK.OFF?'○':ts===Core.TRACK.RECORDING?'●':'◐';
    renderMissionHud();
  }

  function pointFromLatLng(latlng,name='선택 위치',source='MAP'){return {name,lat:latlng.lat,lon:latlng.lng,source,createdAt:Date.now()};}
  function updateReferenceMarkers(){
    if(currentMarker){map.removeLayer(currentMarker);currentMarker=null;}
    if(state.gps.fix){currentMarker=L.marker([state.gps.fix.lat,state.gps.fix.lon],{icon:markerIcon('●','current'),interactive:true}).addTo(map);}
    if(tempMarker){map.removeLayer(tempMarker);tempMarker=null;}
    if(state.temp){tempMarker=L.marker([state.temp.lat,state.temp.lon],{icon:markerIcon('T','temp')}).addTo(map).on('click',()=>selectLocation(state.temp,'TEMP'));}
  }
  function updateSelectedMarker(){
    if(selectedMarker){map.removeLayer(selectedMarker);selectedMarker=null;}
    if(selected)selectedMarker=L.marker([selected.lat,selected.lon],{icon:markerIcon('+','selected')}).addTo(map);
  }
  function selectLocation(p,kind='SELECTED'){
    selected=Core.point({...p,id:p.id||undefined});
    updateSelectedMarker();
    $('locationKind').textContent=kind;
    $('locationName').textContent=selected.name||'선택 위치';
    $('locationMgrs').textContent=fmtMgrs(selected);
    const ref=reference();
    if(ref){
      const km=Core.haversineKm(ref,selected),brg=Core.bearingDeg(ref,selected);
      $('locationDistance').textContent=`기준위치에서 ${km<1?(km*1000).toFixed(0)+' m':km.toFixed(2)+' km'} · BRG ${String(Math.round(brg)).padStart(3,'0')}°`;
    }else $('locationDistance').textContent='기준위치 없음';
    const saved=state.savedLocations.some(x=>Math.abs(x.lat-selected.lat)<1e-7&&Math.abs(x.lon-selected.lon)<1e-7);
    document.querySelector('[data-loc-action="save"]').textContent=saved?'저장됨':'저장';
    const inPlan=state.plan?.points?.some(x=>x.id===selected.id)||false;
    document.querySelector('[data-loc-action="remove"]').disabled=!inPlan;
    openSheet('locationCard');
  }

  function setMode(mode){
    state.mode=mode;app.dataset.mode=mode;
    $('mapBar').hidden=mode!=='MAP';
    $('planPanel').hidden=mode!=='PLAN';
    $('planBar').hidden=mode!=='PLAN';
    $('missionHud').hidden=mode!=='MISSION';
    $('missionBar').hidden=mode!=='MISSION';
    if(mode==='PLAN')renderPlan();
    if(mode==='MISSION')startMissionClock();else stopMissionClock();
    renderPlanMarkers();updateHud();
  }

  function roleAt(i,n){return i===0?'START':i===n-1?'DEST':'VIA';}
  function renderPlan(){
    const box=$('planList');box.innerHTML='';
    const plan=activePlan();
    if(!plan)return;
    plan.points.forEach((p,i)=>{
      const row=document.createElement('div');row.className='plan-row';row.dataset.index=i;
      if(state.mode==='MISSION'&&i<state.mission.nextIndex)row.classList.add('completed');
      row.innerHTML=`<span class="plan-index">${String(i+1).padStart(2,'0')}</span><button class="plan-name" type="button">${esc(p.name)}<span class="plan-role">${roleAt(i,plan.points.length)}</span></button><button class="plan-handle" type="button" aria-label="순서 변경">≡</button>`;
      row.querySelector('.plan-name').addEventListener('click',()=>{map.panTo([p.lat,p.lon]);selectLocation(p,roleAt(i,plan.points.length));});
      installDrag(row.querySelector('.plan-handle'),i);
      box.appendChild(row);
    });
  }
  function installDrag(handle,startIndex){
    let dragging=false,index=startIndex;
    handle.addEventListener('pointerdown',e=>{dragging=true;index=startIndex;handle.setPointerCapture?.(e.pointerId);e.preventDefault();});
    handle.addEventListener('pointermove',e=>{
      if(!dragging)return;
      const rows=[...document.querySelectorAll('.plan-row')];
      let target=index;
      rows.forEach((r,i)=>{const b=r.getBoundingClientRect();if(e.clientY>b.top&&e.clientY<b.bottom)target=i;});
      if(target!==index){Core.movePlanPoint(activePlan(),index,target);index=target;renderPlan();renderPlanMarkers();}
    });
    handle.addEventListener('pointerup',()=>{dragging=false;});
    handle.addEventListener('pointercancel',()=>{dragging=false;});
  }
  function activePlan(){return state.mode==='MISSION'?state.mission?.activePlan:state.plan;}
  function renderPlanMarkers(){
    planMarkers.forEach(m=>map.removeLayer(m));planMarkers=[];
    const plan=activePlan();if(!plan)return;
    plan.points.forEach((p,i)=>{
      const m=L.marker([p.lat,p.lon],{icon:markerIcon(String(i+1))}).addTo(map).on('click',()=>selectLocation(p,roleAt(i,plan.points.length)));
      planMarkers.push(m);
    });
    renderRoute();
  }
  function renderRoute(){
    if(routeLine){map.removeLayer(routeLine);routeLine=null;}
    const plan=activePlan();
    if(plan?.route?.length>1)routeLine=L.polyline(plan.route.map(p=>[p.lat,p.lon]),{color:'#d8e08f',weight:2,opacity:.82}).addTo(map);
    if(trackLine){map.removeLayer(trackLine);trackLine=null;}
    if(state.track.points.length>1)trackLine=L.polyline(state.track.points.map(p=>[p.lat,p.lon]),{color:'#d5a34b',weight:2,opacity:.75,dashArray:'4 7'}).addTo(map);
  }

  function createOrUsePlan(action){
    if(!selected)return;
    if(action==='dest'){
      if(!state.plan){state.plan=Core.createPlan(selected,reference());}
      else if(state.plan.points.length){state.plan.points[state.plan.points.length-1]=Core.point(selected);}
      setMode('PLAN');closeSheets();toast('목적지 지정');return;
    }
    if(!state.plan){
      if(action==='start'){toast('먼저 목적지를 지정해');return;}
      state.plan=Core.createPlan(selected,reference());
    }
    if(action==='via')Core.addPlanPoint(state.plan,selected,state.plan.points.length-1);
    if(action==='start'){
      const p=Core.point(selected);
      if(state.plan.points.length)state.plan.points[0]=p;else state.plan.points.push(p);
    }
    setMode('PLAN');closeSheets();renderPlan();renderPlanMarkers();
  }

  function openSearch(intent='select',insertIndex=null){searchIntent=intent;pendingInsertIndex=insertIndex;openSheet('searchSheet');$('searchInput').value='';setTimeout(()=>$('searchInput').focus(),50);}
  function parseSearch(raw){
    const w=Loc?.parseWgs84?.(raw);if(w)return {name:'WGS84',lat:w.lat,lon:w.lon,source:'SEARCH'};
    const parts=Loc?.parseFullParts?.(raw);if(parts&&Loc?.decodeFull){const d=Loc.decodeFull(raw,window.mgrs);return {name:'MGRS',lat:d.lat,lon:d.lon,source:'SEARCH'};}
    throw new Error('UNSUPPORTED_SEARCH');
  }
  function applySearchResult(p){
    map.setView([p.lat,p.lon],Math.max(map.getZoom(),16));
    if(searchIntent==='insert'&&state.plan){Core.addPlanPoint(state.plan,p,pendingInsertIndex??Math.max(0,state.plan.points.length-1));renderPlan();renderPlanMarkers();closeSheets();toast('경유지 추가');}
    else selectLocation(p,'SEARCH');
  }

  function gpsToggle(){
    state.gps.enabled=!state.gps.enabled;
    if(!state.gps.enabled){if(gpsWatch!==null)navigator.geolocation?.clearWatch(gpsWatch);gpsWatch=null;Core.clearGpsFix(state);state.gps.follow=false;updateReferenceMarkers();updateHud();toast('GPS OFF');return;}
    if(!navigator.geolocation){state.gps.enabled=false;toast('GPS 사용 불가');return;}
    gpsWatch=navigator.geolocation.watchPosition(pos=>{
      if(!state.gps.enabled)return;
      const p=Core.setGpsFix(state,{lat:pos.coords.latitude,lon:pos.coords.longitude,at:pos.timestamp,name:'현재위치'});
      Core.addTrackPoint(state,p);updateReferenceMarkers();renderRoute();if(state.gps.follow)map.panTo([p.lat,p.lon]);updateHud();
    },err=>{toast(`GPS ${err.code===1?'권한 필요':'FIX 없음'}`);updateHud();},{enableHighAccuracy:true,maximumAge:5000,timeout:12000});
    updateHud();toast('GPS ON');
  }
  function follow(){const ref=reference();if(!ref){toast('기준위치 없음');return;}state.gps.follow=true;map.setView([ref.lat,ref.lon],Math.max(map.getZoom(),16));updateHud();}
  function setTempAtTarget(){const c=map.getCenter();Core.setTemp(state,{lat:c.lat,lon:c.lng,name:'TEMP',at:Date.now()});updateReferenceMarkers();updateHud();toast('TEMP 설정');}

  function trackTap(){Core.trackTap(state);updateHud();renderRoute();}
  function trackStop(){const rec=Core.trackStop(state);if(rec){const arr=readJson(STORAGE.tracks,[]);arr.unshift(rec);writeJson(STORAGE.tracks,arr);toast('트랙 저장');}updateHud();renderRoute();}
  function bindTrackGesture(){
    const b=$('trackBtn');
    b.addEventListener('pointerdown',()=>{trackLong=false;clearTimeout(longTrackTimer);longTrackTimer=setTimeout(()=>{trackLong=true;if(state.track.state!==Core.TRACK.OFF)trackStop();},650)});
    b.addEventListener('pointerup',()=>{clearTimeout(longTrackTimer);if(!trackLong)trackTap();});
    b.addEventListener('pointercancel',()=>clearTimeout(longTrackTimer));
  }

  function startMission(){
    if(!state.plan||state.plan.points.length<2){toast('PLAN 포인트 부족');return;}
    state.mission=Core.startMission(state.plan);setMode('MISSION');closeSheets();toast('MISSION START');
  }
  function renderMissionHud(){
    if(state.mode!=='MISSION'||!state.mission)return;
    const plan=state.mission.activePlan,p=plan.points[state.mission.nextIndex];
    $('nextName').textContent=p?`${String(state.mission.nextIndex+1).padStart(2,'0')}  ${p.name}`:'--';
    const ref=reference();
    if(ref&&p){const km=Core.haversineKm(ref,p),brg=Core.bearingDeg(ref,p);$('nextMetrics').textContent=`${km<1?(km*1000).toFixed(0)+' M':km.toFixed(2)+' KM'} · BRG ${String(Math.round(brg)).padStart(3,'0')}°`;}
    else $('nextMetrics').textContent='기준위치 없음';
    $('pointIndexBtn').textContent=`${state.mission.nextIndex+1} / ${plan.points.length}`;
  }
  function startMissionClock(){stopMissionClock();const tick=()=>{if(!state.mission)return;const sec=Math.floor((Date.now()-state.mission.startedAt)/1000);const h=String(Math.floor(sec/3600)).padStart(2,'0'),m=String(Math.floor(sec%3600/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');$('missionTime').textContent=`${h}:${m}:${s}`;};tick();missionTimer=setInterval(tick,1000);}
  function stopMissionClock(){if(missionTimer){clearInterval(missionTimer);missionTimer=null;}}
  function endMission(){
    if(!state.mission)return;
    state.mission.endedAt=Date.now();
    const records=readJson('echopoint_missions_v1',[]);records.unshift(state.mission);writeJson('echopoint_missions_v1',records);
    state.mission=null;setMode('MAP');closeSheets();toast('임무 기록 저장');
  }

  function beginDraw(){
    if(!activePlan())return;drawing=true;document.body.classList.add('draw-mode');$('drawTools').hidden=false;$('planBar').hidden=true;map.dragging.disable();map.touchZoom.disable();toast('지도에 경로를 그려');
  }
  function endDraw(){drawing=false;drawPointer=null;document.body.classList.remove('draw-mode');$('drawTools').hidden=true;if(state.mode==='PLAN')$('planBar').hidden=false;map.dragging.enable();map.touchZoom.enable();renderRoute();}
  function installDraw(){
    const c=map.getContainer();
    c.addEventListener('pointerdown',e=>{if(!drawing||e.button>0)return;drawPointer=e.pointerId;lastDrawPoint={x:e.clientX,y:e.clientY};c.setPointerCapture?.(e.pointerId);appendDraw(e);e.preventDefault();});
    c.addEventListener('pointermove',e=>{if(!drawing||drawPointer!==e.pointerId)return;const dx=e.clientX-lastDrawPoint.x,dy=e.clientY-lastDrawPoint.y;if(Math.hypot(dx,dy)<5)return;lastDrawPoint={x:e.clientX,y:e.clientY};appendDraw(e);e.preventDefault();});
    c.addEventListener('pointerup',e=>{if(drawPointer===e.pointerId)drawPointer=null;});
  }
  function appendDraw(e){const plan=activePlan();if(!plan)return;const rect=map.getContainer().getBoundingClientRect();const ll=map.containerPointToLatLng([e.clientX-rect.left,e.clientY-rect.top]);plan.route.push({lat:ll.lat,lon:ll.lng});renderRoute();}

  function showSaved(){
    $('listTitle').textContent='거점';const box=$('listContent');box.innerHTML='';
    if(!state.savedLocations.length)box.innerHTML='<div class="sheet-note">저장된 위치 없음</div>';
    state.savedLocations.forEach(p=>{const b=document.createElement('button');b.className='list-item';b.innerHTML=`<strong>${esc(p.name||'저장 위치')}</strong><small>${esc(fmtMgrs(p))}</small>`;b.onclick=()=>{map.setView([p.lat,p.lon],16);selectLocation(p,'SAVED');};box.appendChild(b);});openSheet('listSheet');
  }
  function showRecords(importMode=false){
    $('listTitle').textContent=importMode?'TRACK → ROUTE':'기록';const box=$('listContent');box.innerHTML='';const arr=readJson(STORAGE.tracks,[]);
    if(!arr.length)box.innerHTML='<div class="sheet-note">저장된 TRACK 없음</div>';
    arr.forEach((r,i)=>{const b=document.createElement('button');b.className='list-item';b.innerHTML=`<strong>TRACK ${String(i+1).padStart(2,'0')}</strong><small>${new Date(r.startedAt).toLocaleString('ko-KR')} · ${r.points.length} pts</small>`;b.onclick=()=>{if(importMode&&activePlan()){Core.replaceRoute(activePlan(),r.points);renderRoute();closeSheets();toast('TRACK을 경로선으로 복사');}else if(r.points[0])map.fitBounds(L.latLngBounds(r.points.map(p=>[p.lat,p.lon])),{padding:[40,40]});};box.appendChild(b);});openSheet('listSheet');
  }
  function randomPoint(){const b=map.getBounds(),lat=b.getSouth()+Math.random()*(b.getNorth()-b.getSouth()),lon=b.getWest()+Math.random()*(b.getEast()-b.getWest());map.panTo([lat,lon]);selectLocation({name:'무작위 거점',lat,lon,source:'RANDOM'},'RANDOM');}
  function showTools(){const c=map.getCenter();$('listTitle').textContent='야전도구';$('listContent').innerHTML=`<div class="list-item"><strong>TGT</strong><small>${esc(fmtMgrs({lat:c.lat,lon:c.lng}))}</small></div><div class="list-item"><strong>REF</strong><small>${esc(reference()?fmtMgrs(reference()):'NO FIX')}</small></div>`;openSheet('listSheet');}

  map.on('move',updateHud);map.on('dragstart',()=>{state.gps.follow=false;updateHud();});map.on('click',e=>{if(!drawing&&state.mode!=='MISSION')selectLocation(pointFromLatLng(e.latlng),'MAP');});
  $('searchBtn').onclick=()=>openSearch('select');$('moreBtn').onclick=()=>openSheet('moreSheet');
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).hidden=true);
  $('searchForm').onsubmit=e=>{e.preventDefault();try{const p=parseSearch($('searchInput').value);applySearchResult(p);}catch{toast('좌표 형식을 확인해');}};
  $('gpsBtn').onclick=gpsToggle;$('followBtn').onclick=follow;$('tempBtn').onclick=setTempAtTarget;bindTrackGesture();
  $('addPointBtn').onclick=()=>openSearch('insert',Math.max(0,(state.plan?.points.length||1)-1));
  document.querySelectorAll('[data-loc-action]').forEach(b=>b.onclick=()=>{
    if(!selected)return;const a=b.dataset.locAction;
    if(a==='start'||a==='via'||a==='dest')return createOrUsePlan(a);
    if(a==='temp'){Core.setTemp(state,{...selected,name:selected.name||'TEMP',at:Date.now()});updateReferenceMarkers();updateHud();toast('TEMP 설정');return;}
    if(a==='save'){
      const idx=state.savedLocations.findIndex(x=>Math.abs(x.lat-selected.lat)<1e-7&&Math.abs(x.lon-selected.lon)<1e-7);
      if(idx>=0)state.savedLocations.splice(idx,1);else state.savedLocations.push({...selected,saved:true});writeJson(STORAGE.saved,state.savedLocations);selectLocation(selected,'SELECTED');return;
    }
    if(a==='remove'&&state.plan){Core.removePlanPoint(state.plan,selected.id);renderPlan();renderPlanMarkers();closeSheets();}
  });
  $('drawBtn').onclick=beginDraw;$('drawDoneBtn').onclick=endDraw;$('drawClearBtn').onclick=()=>{if(activePlan()){activePlan().route=[];renderRoute();}};$('drawUndoBtn').onclick=()=>{if(activePlan()?.route?.length){activePlan().route.splice(-8);renderRoute();}};installDraw();
  $('importBtn').onclick=()=>showRecords(true);$('missionStartBtn').onclick=startMission;
  $('prevPointBtn').onclick=()=>{Core.stepMission(state.mission,-1);renderMissionHud();renderPlan();};$('nextPointBtn').onclick=()=>{Core.stepMission(state.mission,1);renderMissionHud();renderPlan();};
  $('pointIndexBtn').onclick=()=>{setMode('PLAN');toast('MISSION 계획 편집');};$('nextInfoBtn').onclick=()=>{const p=state.mission?.activePlan?.points[state.mission.nextIndex];if(p)selectLocation(p,'NEXT');};
  $('missionTimeBtn').onclick=()=>openSheet('moreSheet');$('editMissionPlanBtn').onclick=()=>{if(state.mission){state.plan=state.mission.activePlan;setMode('PLAN');closeSheets();}};$('endMissionBtn').onclick=endMission;
  document.querySelectorAll('[data-main]').forEach(b=>b.onclick=()=>{const a=b.dataset.main;if(a==='points')showSaved();if(a==='random')randomPoint();if(a==='records')showRecords(false);if(a==='tools')showTools();});
  $('posLine').onclick=()=>{const ref=reference();if(ref){navigator.clipboard?.writeText(fmtMgrs(ref));toast('POS 좌표 복사');}};$('tgtLine').onclick=()=>{const c=map.getCenter();navigator.clipboard?.writeText(fmtMgrs({lat:c.lat,lon:c.lng}));toast('TGT 좌표 복사');};

  updateReferenceMarkers();updateHud();setMode('MAP');setTimeout(()=>map.invalidateSize(),50);
})();