import {createStore} from './store.mjs';
import {openDatabase} from './storage.mjs';
import {formatMgrs,validPoint} from './coordinates.mjs';
import {haversineKm,initialBearing} from './geo.mjs';
import {selectReference,referenceLabel} from './reference.mjs';
import {
  makePoint,createPlan,setStart,setDestination,insertPoint,removePoint,movePoint,roleForIndex,
  addStroke,undoStroke,clearRoute,eraseRouteNear,importTrackAsRoute,startMission,stepMission,
  moveFuturePoint,removeFuturePoint
} from './plan.mjs';
import {
  TRACK_STATE,createTrackRuntime,startTrack,recordGps,recordTemp,markGpsGap,pauseTrack,resumeTrack,
  stopTrack,recoveryPayload,recoverTrack,measuredPointCount
} from './track.mjs';
import {GpsService} from './gps.mjs';
import {searchLocations,resultSubtitle} from './search.mjs';
import {createMapAdapter} from './map-adapter.mjs';

const L=window.L;
const mgrsLib=window.mgrs;
if(!L)throw new Error('LEAFLET_UNAVAILABLE');
if(!mgrsLib)throw new Error('MGRS_UNAVAILABLE');

const $=id=>document.getElementById(id);
const db=await openDatabase();
const savedLocations=await db.getAll('locations');
const lastFixRecord=await db.get('recovery','lastFix');
const trackRecovery=await db.get('recovery','activeTrack');

const store=createStore({
  surface:'MAP',
  overlay:'NONE',
  drawTool:'NONE',
  missionEditing:false,
  planDraftSlot:null,
  gps:{enabled:false,status:'OFF',fix:null,lastFix:lastFixRecord?.point||null,follow:false},
  temp:null,
  selected:null,
  target:{lat:37.5665,lon:126.9780},
  plan:null,
  mission:null,
  track:trackRecovery?.payload?recoverTrack(trackRecovery.payload):createTrackRuntime(),
  savedLocations,
  workingGrid:null
});

let searchIntent={kind:'SELECT'};
let drawPointer=null;
let drawPoints=[];
let erasePointer=null;
let toastTimer=null;
let trackLongTimer=null;
let trackLongTriggered=false;
let missionTick=null;

const mapUi=createMapAdapter({
  element:$('map'),L,initial:{lat:37.5665,lon:126.9780,zoom:14},
  onMove:center=>store.mutate(s=>{s.target=center;}),
  onDragStart:()=>store.mutate(s=>{s.gps.follow=false;}),
  onMapTap:point=>{
    const s=store.getState();
    if(s.drawTool!=='NONE')return;
    selectLocation({...point,name:'지도 선택',source:'MAP'});
  },
  onPlanTap:(point,index)=>{
    mapUi.setCenter(point);
    selectLocation(point,roleForIndex(index,activePlan()?.points.length||0));
  },
  onTempTap:point=>selectLocation(point,'TEMP'),
  onSelectedTap:point=>selectLocation(point,'SELECTED')
});

const gpsService=new GpsService({
  onFix:fix=>{
    store.mutate(s=>{
      if(!s.gps.enabled)return;
      s.gps.status='FIX';
      s.gps.fix=fix;
      s.gps.lastFix={...fix};
      const accepted=recordGps(s.track,fix);
      if(accepted)persistActiveTrack(s.track);
      if(s.gps.follow)mapUi.setFollowCenter(fix);
    });
    void db.put('recovery',{id:'lastFix',point:{...fix}});
  },
  onGap:()=>store.mutate(s=>{markGpsGap(s.track);}),
  onError:error=>store.mutate(s=>{
    if(error?.code===1){s.gps.enabled=false;s.gps.status='OFF';gpsService.stop();}
    else if(s.gps.enabled)s.gps.status='NO_FIX';
  })
});

function activePlan(){
  const s=store.getState();
  return s.mission?s.mission.activePlan:s.plan;
}

function reference(){
  const s=store.getState();
  return selectReference({gps:s.gps,temp:s.temp,lastFix:s.gps.lastFix});
}

function fmt(point){return formatMgrs(point,mgrsLib,5);}
function distanceLabel(km){return km<1?`${Math.round(km*1000)} M`:`${km.toFixed(2)} KM`;}
function timeLabel(ts){return ts?new Date(ts).toTimeString().slice(0,5):'--:--';}
function escapeText(value){return String(value??'');}

function toast(message){
  clearTimeout(toastTimer);
  $('toast').textContent=message;$('toast').hidden=false;
  toastTimer=setTimeout(()=>$('toast').hidden=true,1700);
}

function openOverlay(name){
  store.mutate(s=>{s.overlay=name;});
}
function closeOverlay(){
  store.mutate(s=>{s.overlay='NONE';});
}

function selectLocation(input,kind='SELECTED'){
  const point=makePoint(input);
  store.mutate(s=>{s.selected=point;s.overlay='LOCATION';});
  $('locationKind').textContent=kind;
}

async function persistPlan(){
  const p=store.getState().plan;
  if(p)await db.put('plans',p);
}

async function persistActiveTrack(runtime){
  if(runtime.activeTrack){
    await db.put('tracks',runtime.activeTrack);
    const payload=recoveryPayload(runtime);
    if(payload)await db.put('recovery',{id:'activeTrack',payload});
  }
}

function seedForTrack(){
  const s=store.getState();
  if(s.gps.enabled&&validPoint(s.gps.fix))return {kind:'GPS',...s.gps.fix};
  if(validPoint(s.temp))return {kind:'TEMP',...s.temp};
  return null;
}

function addMissionTrackLink(trackId){
  const s=store.getState();
  if(!s.mission)return;
  if(s.mission.trackLinks.some(link=>link.trackId===trackId))return;
  s.mission.trackLinks.push({trackId,fromPointIndex:0,toPointIndex:null,startedAt:Date.now()});
}

function closeMissionTrackLink(track){
  const s=store.getState();
  if(!s.mission||!track)return;
  const link=s.mission.trackLinks.find(x=>x.trackId===track.id);
  if(link){link.toPointIndex=Math.max(0,measuredPointCount(track)-1);link.endedAt=Date.now();}
}

function toggleGps(){
  const s=store.getState();
  if(!s.gps.enabled){
    store.mutate(x=>{x.gps.enabled=true;x.gps.status='ACQUIRING';});
    if(!gpsService.start()){
      store.mutate(x=>{x.gps.enabled=false;x.gps.status='OFF';});
      toast('GPS 사용 불가');
    }
  }else{
    gpsService.stop();
    store.mutate(x=>{x.gps.enabled=false;x.gps.status='OFF';x.gps.fix=null;x.gps.follow=false;});
    toast('GPS OFF');
  }
}

function followReference(){
  const ref=reference();
  if(!ref){toast('기준위치 없음');return;}
  store.mutate(s=>{s.gps.follow=true;});
  mapUi.setCenter(ref,Math.max(mapUi.map.getZoom(),16));
}

function setTemp(point){
  const temp=makePoint({...point,id:'temp_'+Date.now().toString(36),name:point.name||'TEMP',source:'TEMP'});
  temp.timestamp=Date.now();
  store.mutate(s=>{
    s.temp=temp;
    if(s.track.state===TRACK_STATE.RECORDING){
      if(recordTemp(s.track,temp))void persistActiveTrack(s.track);
    }
  });
  toast('TEMP 설정');
}

async function handleTrackTap(){
  const s=store.getState();
  if(s.track.state===TRACK_STATE.OFF){
    const track=startTrack(s.track,{missionId:s.mission?.id||null,seed:seedForTrack()});
    if(s.mission&&track?.originMissionId===s.mission.id)addMissionTrackLink(track.id);
    await persistActiveTrack(s.track);
  }else if(s.track.state===TRACK_STATE.RECORDING){
    pauseTrack(s.track);await persistActiveTrack(s.track);
  }else{
    resumeTrack(s.track,seedForTrack());await persistActiveTrack(s.track);
  }
  store.setState(s);
}

async function handleTrackStop(){
  const s=store.getState();
  if(s.track.state===TRACK_STATE.OFF)return;
  const active=s.track.activeTrack;
  if(s.mission&&active?.originMissionId===s.mission.id)closeMissionTrackLink(active);
  const finished=stopTrack(s.track);
  if(finished)await db.put('tracks',finished);
  await db.delete('recovery','activeTrack');
  store.setState(s);toast('트랙 저장');
}

function bindTrackLongPress(){
  const btn=$('trackBtn');
  btn.addEventListener('pointerdown',e=>{
    trackLongTriggered=false;
    clearTimeout(trackLongTimer);
    btn.setPointerCapture?.(e.pointerId);
    trackLongTimer=setTimeout(async()=>{
      trackLongTriggered=true;
      await handleTrackStop();
    },700);
  });
  btn.addEventListener('pointerup',async()=>{
    clearTimeout(trackLongTimer);
    if(!trackLongTriggered)await handleTrackTap();
  });
  btn.addEventListener('pointercancel',()=>clearTimeout(trackLongTimer));
}

function createDestinationFromSelected(){
  const s=store.getState();
  if(!s.selected)return;
  if(s.mission){
    setDestination(s.mission.activePlan,s.selected);
    s.overlay='NONE';store.setState(s);return;
  }
  if(!s.plan)s.plan=createPlan(s.selected,reference());
  else setDestination(s.plan,s.selected);
  s.surface='PLAN';s.overlay='NONE';s.planDraftSlot=null;
  store.setState(s);void persistPlan();
}

function setStartFromSelected(){
  const s=store.getState();
  if(!s.selected)return;
  if(s.mission){toast('임무 중 출발지는 기록으로 고정');return;}
  if(!s.plan){toast('먼저 목적지를 지정해');return;}
  setStart(s.plan,s.selected);
  s.surface='PLAN';s.overlay='NONE';store.setState(s);void persistPlan();
}

function addViaFromSelected(){
  const s=store.getState();
  if(!s.selected){return;}
  if(s.mission){
    const p=s.mission.activePlan;
    insertPoint(p,s.selected,Math.max(s.mission.nextIndex,p.points.length-1));
    s.overlay='NONE';store.setState(s);return;
  }
  if(!s.plan){toast('먼저 목적지를 지정해');return;}
  insertPoint(s.plan,s.selected,Math.max(0,s.plan.points.length-1));
  s.surface='PLAN';s.overlay='NONE';store.setState(s);void persistPlan();
}

function removeSelectedFromPlan(){
  const s=store.getState();
  if(!s.selected)return;
  const plan=activePlan();
  if(!plan)return;
  if(s.mission){
    if(!removeFuturePoint(s.mission,s.selected.id)){toast('완료 포인트는 변경 불가');return;}
  }else removePoint(plan,s.selected.id);
  s.overlay='NONE';store.setState(s);if(!s.mission)void persistPlan();
}

async function toggleSavedSelected(){
  const s=store.getState();if(!s.selected)return;
  const idx=s.savedLocations.findIndex(p=>p.id===s.selected.id||(Math.abs(p.lat-s.selected.lat)<1e-7&&Math.abs(p.lon-s.selected.lon)<1e-7));
  if(idx>=0){
    const removed=s.savedLocations.splice(idx,1)[0];
    await db.delete('locations',removed.id);
    toast('저장 해제');
  }else{
    const saved={...s.selected,id:'loc_'+Date.now().toString(36),source:s.selected.source||'USER',saved:true};
    s.savedLocations.push(saved);await db.put('locations',saved);s.selected=saved;toast('저장');
  }
  store.setState(s);
}

function addBlankPoint(){
  const s=store.getState();const plan=activePlan();
  if(!plan)return;
  s.planDraftSlot=Math.max(s.mission?s.mission.nextIndex:0,plan.points.length-1);
  store.setState(s);
}

async function searchSubmit(event){
  event.preventDefault();
  const q=$('searchInput').value.trim();if(!q)return;
  $('searchResults').replaceChildren();
  $('searchStatus').textContent='SEARCHING';
  try{
    const s=store.getState();
    const results=await searchLocations(q,{mgrsLib,workingGrid:s.workingGrid,savedLocations:s.savedLocations});
    $('searchStatus').textContent=results.length?'':'검색 결과 없음';
    for(const result of results){
      const btn=document.createElement('button');btn.type='button';btn.className='search-result';
      const name=document.createElement('strong');name.textContent=result.name||result.address||'위치';
      const sub=document.createElement('small');sub.textContent=resultSubtitle(result,mgrsLib);
      btn.append(name,sub);
      btn.addEventListener('click',()=>{
        mapUi.setCenter(result,Math.max(mapUi.map.getZoom(),16));
        const st=store.getState();
        if(searchIntent.kind==='INSERT'&&activePlan()){
          if(st.mission)insertPoint(st.mission.activePlan,result,searchIntent.index);
          else insertPoint(st.plan,result,searchIntent.index);
          st.planDraftSlot=null;st.overlay='NONE';store.setState(st);if(!st.mission)void persistPlan();
        }else selectLocation(result,'SEARCH');
      });
      $('searchResults').append(btn);
    }
  }catch(error){
    $('searchStatus').textContent=error?.code==='GRID_PREFIX_REQUIRED'?'작업격자 PREFIX 필요':'검색 실패';
  }
}

function openSearch(intent={kind:'SELECT'}){
  searchIntent=intent;$('searchInput').value='';$('searchResults').replaceChildren();$('searchStatus').textContent='';
  openOverlay('SEARCH');setTimeout(()=>$('searchInput').focus(),50);
}

function beginMission(){
  const s=store.getState();
  if(!s.plan||s.plan.points.length<2){toast('출발/목적지 필요');return;}
  s.mission=startMission(s.plan);s.surface='MISSION';s.overlay='NONE';s.missionEditing=false;s.planDraftSlot=null;
  store.setState(s);toast('MISSION START');
}

async function endMission(){
  const s=store.getState();if(!s.mission)return;
  const activeTrack=s.track.activeTrack;
  if(activeTrack?.originMissionId===s.mission.id)closeMissionTrackLink(activeTrack);
  s.mission.endedAt=Date.now();
  s.mission.finalPlan=structuredClone(s.mission.activePlan);
  await db.put('missions',s.mission);
  s.mission=null;s.surface='MAP';s.overlay='NONE';s.missionEditing=false;s.planDraftSlot=null;
  store.setState(s);toast('임무 기록 저장');
}

function changeMissionStep(delta){
  const s=store.getState();if(!s.mission)return;
  stepMission(s.mission,delta);store.setState(s);
}

function enterMissionEdit(){
  const s=store.getState();if(!s.mission)return;
  s.missionEditing=true;s.overlay='NONE';store.setState(s);
}
function exitMissionEdit(){
  const s=store.getState();s.missionEditing=false;s.planDraftSlot=null;store.setState(s);
}

function activeEditablePlan(){
  const s=store.getState();return s.mission?s.mission.activePlan:s.plan;
}

function beginDraw(){
  const s=store.getState();if(!activeEditablePlan())return;
  s.drawTool='PEN';s.overlay='NONE';store.setState(s);mapUi.setDrawInteraction('PEN');
}
function setDrawTool(tool){
  store.mutate(s=>{s.drawTool=tool;});mapUi.setDrawInteraction(tool);
}
function endDraw(){
  store.mutate(s=>{s.drawTool='NONE';});mapUi.setDrawInteraction('NONE');
  if(!store.getState().mission)void persistPlan();
}

function installDrawEvents(){
  const el=mapUi.map.getContainer();
  el.addEventListener('pointerdown',e=>{
    const s=store.getState();
    if(s.drawTool==='PEN'){
      drawPointer=e.pointerId;drawPoints=[mapUi.clientToGeo(e.clientX,e.clientY)];el.setPointerCapture?.(e.pointerId);e.preventDefault();
    }else if(s.drawTool==='ERASE'){
      erasePointer=e.pointerId;el.setPointerCapture?.(e.pointerId);eraseAt(e);e.preventDefault();
    }
  });
  el.addEventListener('pointermove',e=>{
    const s=store.getState();
    if(s.drawTool==='PEN'&&drawPointer===e.pointerId){
      const p=mapUi.clientToGeo(e.clientX,e.clientY);
      const last=drawPoints[drawPoints.length-1];
      if(!last||haversineKm(last,p)*1000>2)drawPoints.push(p);
      e.preventDefault();
    }else if(s.drawTool==='ERASE'&&erasePointer===e.pointerId){
      eraseAt(e);e.preventDefault();
    }
  });
  const finish=e=>{
    const s=store.getState();
    if(drawPointer===e.pointerId){
      if(drawPoints.length>=2)addStroke(activeEditablePlan(),drawPoints);
      drawPointer=null;drawPoints=[];store.setState(s);if(!s.mission)void persistPlan();
    }
    if(erasePointer===e.pointerId)erasePointer=null;
  };
  el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);
}
function eraseAt(e){
  const plan=activeEditablePlan();if(!plan)return;
  const center=mapUi.clientToGeo(e.clientX,e.clientY);
  const radius=mapUi.pixelRadiusMeters(e.clientX,e.clientY,20);
  if(eraseRouteNear(plan,center,radius))store.setState(store.getState());
}

function planPathLabel(plan){
  const names=(plan?.points||[]).map(p=>p.name).filter(Boolean);
  return names.length?names.join(' → '):'포인트 정보 없음';
}

function trackEndpoints(track){
  const points=(track?.segments||[]).filter(s=>s.kind==='MEASURED').flatMap(s=>s.points||[]);
  return points.length?{start:points[0],end:points[points.length-1]}:null;
}

async function openTrackImport(){
  const tracks=(await db.getAll('tracks')).filter(t=>t?.segments?.length);
  const missions=await db.getAll('missions');
  const missionById=new Map(missions.map(m=>[m.id,m]));
  const container=$('listContent');container.replaceChildren();$('listTitle').textContent='TRACK → ROUTE';
  if(!tracks.length){container.textContent='저장된 TRACK 없음';openOverlay('LIST');return;}
  tracks.sort((a,b)=>Number(b.startedAt||0)-Number(a.startedAt||0));
  for(const track of tracks){
    const mission=track.originMissionId?missionById.get(track.originMissionId):null;
    const btn=document.createElement('button');btn.className='list-row';btn.type='button';
    const title=document.createElement('strong');title.textContent=mission?'MISSION TRACK · '+new Date(track.startedAt).toLocaleString('ko-KR'):new Date(track.startedAt).toLocaleString('ko-KR');
    const sub=document.createElement('small');
    const route=mission?planPathLabel(mission.finalPlan||mission.activePlan||mission.initialPlan):'독립 TRACK';
    sub.textContent=`${route} · ${measuredPointCount(track)} pts · ${(Number(track.distance?.measuredKm||0)+Number(track.distance?.estimatedKm||0)).toFixed(2)} km`;
    btn.append(title,sub);
    btn.onclick=()=>{
      const plan=activeEditablePlan();if(!plan)return;
      importTrackAsRoute(plan,track);closeOverlay();store.setState(store.getState());if(!store.getState().mission)void persistPlan();
      toast('TRACK을 경로선으로 복사');
    };
    container.append(btn);
  }
  openOverlay('LIST');
}

async function openRecords(){
  const missions=await db.getAll('missions');
  const tracks=await db.getAll('tracks');
  const missionIds=new Set(missions.map(m=>m.id));
  const trackById=new Map(tracks.map(t=>[t.id,t]));
  const container=$('listContent');container.replaceChildren();$('listTitle').textContent='기록';
  const rows=[];
  for(const m of missions)rows.push({type:'MISSION',at:m.startedAt,data:m});
  for(const t of tracks.filter(t=>t.endedAt&&(!t.originMissionId||!missionIds.has(t.originMissionId))))rows.push({type:'TRACK',at:t.startedAt,data:t});
  rows.sort((a,b)=>Number(b.at||0)-Number(a.at||0));
  if(!rows.length){container.textContent='기록 없음';openOverlay('LIST');return;}
  for(const row of rows){
    const btn=document.createElement('button');btn.className='list-row';btn.type='button';
    const title=document.createElement('strong');
    const sub=document.createElement('small');
    if(row.type==='MISSION'){
      const mission=row.data;
      const linked=(mission.trackLinks||[]).map(l=>trackById.get(l.trackId)).filter(Boolean);
      const distance=linked.reduce((sum,t)=>sum+Number(t.distance?.measuredKm||0)+Number(t.distance?.estimatedKm||0),0);
      title.textContent=new Date(mission.startedAt).toLocaleString('ko-KR')+' · MISSION';
      sub.textContent=`${planPathLabel(mission.finalPlan||mission.activePlan||mission.initialPlan)} · ${linked.length?'TRACK 있음':'TRACK 없음'}${linked.length?' · '+distance.toFixed(2)+' km':''}`;
    }else{
      const endpoints=trackEndpoints(row.data);
      title.textContent=new Date(row.data.startedAt).toLocaleString('ko-KR')+' · TRACK';
      sub.textContent=endpoints?`${fmt(endpoints.start)} → ${fmt(endpoints.end)} · ${Number(row.data.distance?.measuredKm||0).toFixed(2)} km`:`${measuredPointCount(row.data)} pts`;
    }
    btn.append(title,sub);container.append(btn);
  }
  openOverlay('LIST');
}

function renderPlanList(s){
  const panel=$('planPanel'),plan=activePlan();
  const visible=s.surface==='PLAN'||s.missionEditing;
  panel.hidden=!visible;if(!visible||!plan)return;
  const list=$('planList');list.replaceChildren();
  const draftIndex=s.planDraftSlot;
  plan.points.forEach((point,index)=>{
    if(draftIndex===index)list.append(makeDraftRow(index));
    const row=document.createElement('div');row.className='plan-row';row.dataset.pointIndex=String(index);
    const locked=!!s.mission&&index<s.mission.nextIndex;
    if(locked)row.classList.add('locked');
    const num=document.createElement('span');num.className='plan-index';num.textContent=String(index+1).padStart(2,'0');
    const name=document.createElement('button');name.type='button';name.className='plan-name';name.textContent=point.name;
    const role=document.createElement('small');role.textContent=roleForIndex(index,plan.points.length);name.append(role);
    name.onclick=()=>{mapUi.setCenter(point);selectLocation(point,roleForIndex(index,plan.points.length));};
    const handle=document.createElement('button');handle.type='button';handle.className='plan-handle';handle.textContent=locked?'·':'≡';handle.disabled=locked;
    if(!locked)installPlanDrag(handle,index);
    row.append(num,name,handle);list.append(row);
  });
  if(draftIndex===plan.points.length)list.append(makeDraftRow(draftIndex));
}

function makeDraftRow(index){
  const row=document.createElement('button');row.type='button';row.className='plan-row plan-row--draft';
  row.innerHTML=`<span class="plan-index">＋</span><span class="plan-draft-label">위치 입력</span><span></span>`;
  row.onclick=()=>openSearch({kind:'INSERT',index});
  return row;
}

function installPlanDrag(handle,startIndex){
  let current=startIndex,dragging=false;
  handle.addEventListener('pointerdown',e=>{dragging=true;current=startIndex;handle.setPointerCapture?.(e.pointerId);e.preventDefault();});
  handle.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const s=store.getState(),plan=activePlan();
    const rows=[...document.querySelectorAll('.plan-row[data-point-index]')];
    let target=current;
    for(const row of rows){
      const b=row.getBoundingClientRect();
      if(e.clientY>=b.top&&e.clientY<=b.bottom){target=Number(row.dataset.pointIndex);break;}
    }
    if(target===current)return;
    const moved=s.mission?moveFuturePoint(s.mission,current,target):movePoint(plan,current,target);
    if(moved){current=target;store.setState(s);if(!s.mission)void persistPlan();}
  });
  const stop=()=>{dragging=false;};handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);
}

function render(s){
  const ref=selectReference({gps:s.gps,temp:s.temp,lastFix:s.gps.lastFix});
  const refMeta=referenceLabel(ref);
  $('posLabel').textContent=refMeta.label;
  $('posCoord').textContent=ref?fmt(ref):'NO FIX';
  $('posMeta').textContent=refMeta.detail;
  $('tgtCoord').textContent=fmt(s.target);

  $('gpsBtn').classList.toggle('active',s.gps.enabled);
  $('gpsState').textContent=s.gps.enabled?(s.gps.status==='FIX'?'FIX':'ON'):'OFF';
  $('followBtn').classList.toggle('active',s.gps.follow);
  $('tempBtn').classList.toggle('active',!!s.temp);
  $('trackBtn').classList.toggle('active',s.track.state!==TRACK_STATE.OFF);
  $('trackBtn').classList.toggle('recording',s.track.state===TRACK_STATE.RECORDING);
  $('trackState').textContent=s.track.state===TRACK_STATE.OFF?'○':s.track.state===TRACK_STATE.RECORDING?'●':'◐';

  mapUi.renderReferences({gpsFix:s.gps.fix,temp:s.temp});
  mapUi.renderSelected(s.selected);
  const plan=activePlan();
  mapUi.renderPlan(plan?.points||[],{nextIndex:s.surface==='MISSION'?s.mission?.nextIndex:null,completedBefore:s.mission?.nextIndex||0});
  mapUi.renderRoute(plan?.routeStrokes||[]);
  mapUi.renderTrack(s.track.activeTrack);

  renderPlanList(s);
  $('mapBar').hidden=s.surface!=='MAP';
  $('planBar').hidden=!(s.surface==='PLAN'||s.missionEditing)||s.drawTool!=='NONE';
  $('missionBar').hidden=s.surface!=='MISSION'||s.missionEditing||s.drawTool!=='NONE';
  $('missionHud').hidden=s.surface!=='MISSION';
  $('drawBar').hidden=s.drawTool==='NONE';

  $('planStartBtn').textContent=s.missionEditing?'닫기':'▶ 시작';

  if(s.surface==='MISSION'&&s.mission){
    const target=s.mission.activePlan.points[s.mission.nextIndex];
    $('nextName').textContent=target?`${String(s.mission.nextIndex+1).padStart(2,'0')}  ${target.name}`:'--';
    if(ref&&target){
      const d=haversineKm(ref,target),b=initialBearing(ref,target);
      $('nextMetrics').textContent=`${distanceLabel(d)} · BRG ${String(Math.round(b)).padStart(3,'0')}°`;
    }else $('nextMetrics').textContent='기준위치 없음';
    $('missionRef').textContent=ref?`${refMeta.label} ${fmt(ref)}`:'REF --';
    $('pointIndexBtn').textContent=`${s.mission.nextIndex+1} / ${s.mission.activePlan.points.length}`;
  }

  const overlay=s.overlay;
  $('locationCard').hidden=overlay!=='LOCATION';
  $('searchSheet').hidden=overlay!=='SEARCH';
  $('listSheet').hidden=overlay!=='LIST';
  $('moreSheet').hidden=overlay!=='MORE';

  if(overlay==='LOCATION'&&s.selected){
    $('locationName').textContent=s.selected.name;
    $('locationMgrs').textContent=fmt(s.selected);
    $('locationAddress').textContent=s.selected.address||'';
    if(ref){
      $('locationMetrics').textContent=`${ref.referenceKind} 기준 · ${distanceLabel(haversineKm(ref,s.selected))} · BRG ${String(Math.round(initialBearing(ref,s.selected))).padStart(3,'0')}°`;
    }else $('locationMetrics').textContent='기준위치 없음';
    const saved=s.savedLocations.some(p=>p.id===s.selected.id||(Math.abs(p.lat-s.selected.lat)<1e-7&&Math.abs(p.lon-s.selected.lon)<1e-7));
    $('saveAction').textContent=saved?'저장됨':'저장';
    const inPlan=!!plan?.points?.some(p=>p.id===s.selected.id);
    $('removeAction').disabled=!inPlan;
  }
}

store.subscribe(render);

function startMissionClock(){
  clearInterval(missionTick);
  missionTick=setInterval(()=>{
    const s=store.getState();
    if(!s.mission){$('missionTime').textContent='00:00:00';return;}
    const seconds=Math.max(0,Math.floor((Date.now()-s.mission.startedAt)/1000));
    $('missionTime').textContent=[
      Math.floor(seconds/3600),
      Math.floor((seconds%3600)/60),
      seconds%60
    ].map(v=>String(v).padStart(2,'0')).join(':');
  },1000);
}
startMissionClock();

$('gpsBtn').onclick=toggleGps;
$('followBtn').onclick=followReference;
$('tempBtn').onclick=()=>setTemp({...store.getState().target,name:'TEMP',source:'TEMP'});
bindTrackLongPress();
$('searchBtn').onclick=()=>openSearch();
$('moreBtn').onclick=()=>openOverlay('MORE');
$('tgtReadout').onclick=()=>selectLocation({...store.getState().target,name:'TGT',source:'TGT'},'TGT');
$('posReadout').onclick=async()=>{const ref=reference();if(ref){await navigator.clipboard?.writeText(fmt(ref));toast('좌표 복사');}};

document.querySelectorAll('[data-close-overlay]').forEach(btn=>btn.onclick=closeOverlay);
$('searchForm').addEventListener('submit',searchSubmit);
$('startAction').onclick=setStartFromSelected;
$('viaAction').onclick=addViaFromSelected;
$('destAction').onclick=createDestinationFromSelected;
$('tempAction').onclick=()=>{const s=store.getState();if(s.selected)setTemp(s.selected);};
$('saveAction').onclick=()=>void toggleSavedSelected();
$('removeAction').onclick=removeSelectedFromPlan;
$('addPointBtn').onclick=addBlankPoint;

$('routeBtn').onclick=beginDraw;
$('importBtn').onclick=()=>void openTrackImport();
$('planStartBtn').onclick=()=>store.getState().missionEditing?exitMissionEdit():beginMission();

$('prevPointBtn').onclick=()=>changeMissionStep(-1);
$('nextPointBtn').onclick=()=>changeMissionStep(1);
$('pointIndexBtn').onclick=()=>enterMissionEdit();

$('drawPenBtn').onclick=()=>setDrawTool('PEN');
$('drawEraseBtn').onclick=()=>setDrawTool('ERASE');
$('drawHandBtn').onclick=()=>setDrawTool('HAND');
$('drawUndoBtn').onclick=()=>{const plan=activeEditablePlan();if(plan){undoStroke(plan);store.setState(store.getState());if(!store.getState().mission)void persistPlan();}};
$('drawClearBtn').onclick=()=>{const plan=activeEditablePlan();if(plan){clearRoute(plan);store.setState(store.getState());if(!store.getState().mission)void persistPlan();}};
$('drawDoneBtn').onclick=endDraw;
installDrawEvents();

document.querySelector('[data-main="records"]').onclick=()=>void openRecords();
document.querySelector('[data-main="points"]').onclick=()=>{toast('거점 데이터 이식 단계에서 연결');};
document.querySelector('[data-main="random"]').onclick=()=>{toast('무작위 거점 알고리즘 이식 전');};
document.querySelector('[data-main="tools"]').onclick=()=>{toast('야전도구 이식 전');};

$('editMissionBtn').onclick=()=>{if(store.getState().mission)enterMissionEdit();else toast('진행 중 임무 없음');};
$('endMissionBtn').onclick=()=>void endMission();

render(store.getState());
mapUi.invalidate();
