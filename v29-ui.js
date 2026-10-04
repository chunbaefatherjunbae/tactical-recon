/* Tactical Recon V29 browser UI */
(() => {
  'use strict';

  const root=window;
  const base=root.v28;
  const core=root.v29;
  if(!base||!core)return;

  let installed=false;
  let activeTab='reuse';
  let compareLayer=null;
  let overlayLayer=null;
  let compareA='';
  let compareB='';
  let renderTimer=null;
  let lastPlanId=null;
  let tileErrorCount=0;
  let tileErrorWindowAt=0;

  const T={
    ko:{
      fieldKit:'V29 야전도구', reuse:'재활용', tracks:'궤적', overlay:'표식', emergency:'비상항법', export:'반출',
      sourcePlan:'원본 계획', sourceTrack:'원본 궤적', tolerance:'단순화', trackRoute:'궤적→경로',
      clonePlan:'계획 복제', result:'결과', selectPlan:'계획 선택', selectTrack:'궤적 선택',
      noTracks:'저장된 궤적 없음', noPlans:'저장된 계획 없음', compareA:'비교 A', compareB:'비교 B',
      compare:'비교', mapOverlay:'지도 중첩', clearMap:'중첩 해제', measured:'실측', estimated:'추정',
      duration:'시간', avgSpeed:'평균속도', deviation:'평균 이격', maxDeviation:'최대 이격',
      backtrack:'역추적 궤적', useBacktrack:'이 궤적 사용', selected:'선택됨',
      overlaySegment:'표식선', overlayType:'유형', overlayLabel:'메모', save:'저장', remove:'해제',
      current:'현재 기준', target:'목표', autoReference:'자동 기준위치', manual:'직접 입력',
      activeObjective:'활성 계획 목표', calculate:'계산', dist:'거리', grid:'도북 방위', true:'진북 방위',
      mag:'자북 방위', conv:'도편각', decl:'자편각', model:'자기모델', offlineMap:'초경량 비상지도',
      currentInput:'현재 WGS84 / MGRS', targetInput:'목표 WGS84 / MGRS', apply:'적용',
      includeRoute:'계획 경로 포함', includeEstimated:'추정 구간을 별도 ROUTE로 포함',
      exportGpx:'GPX 내보내기', tracksToExport:'내보낼 궤적', created:'생성 완료',
      failed:'작업 실패', invalid:'좌표를 확인할 수 없음', noObjective:'목표 미지정',
      trackRouteNote:'MEASURED만 경로로 복사. 추정 구간은 제외됩니다.',
      backtrackNote:'저장 궤적을 고르면 NAV의 역추적이 해당 세션을 사용합니다.',
      emergencyNote:'GPS가 없어도 TEMP/직접좌표와 목표좌표로 거리·GRID/TRUE/MAG 방위를 계산합니다.',
      gpxNote:'ESTIMATED는 기본적으로 GPX TRACK에서 제외됩니다. 옵션 사용 시 별도 ROUTE로만 기록합니다.',
      overlayEmpty:'이 계획에는 표식선이 없습니다.', close:'닫기', openPlan:'계획 열기',
      danger:'위험', reference:'참고', blocked:'차단', observation:'관측', other:'기타'
    },
    en:{
      fieldKit:'V29 FIELD KIT', reuse:'REUSE', tracks:'TRACKS', overlay:'OVERLAY', emergency:'EMERGENCY', export:'EXPORT',
      sourcePlan:'SOURCE PLAN', sourceTrack:'SOURCE TRACK', tolerance:'SIMPLIFY', trackRoute:'TRACK→ROUTE',
      clonePlan:'CLONE PLAN', result:'RESULT', selectPlan:'SELECT PLAN', selectTrack:'SELECT TRACK',
      noTracks:'NO SAVED TRACKS', noPlans:'NO SAVED PLANS', compareA:'COMPARE A', compareB:'COMPARE B',
      compare:'COMPARE', mapOverlay:'MAP OVERLAY', clearMap:'CLEAR OVERLAY', measured:'MEASURED', estimated:'EST',
      duration:'DURATION', avgSpeed:'AVG SPEED', deviation:'MEAN OFFSET', maxDeviation:'MAX OFFSET',
      backtrack:'BACKTRACK TRACK', useBacktrack:'USE THIS TRACK', selected:'SELECTED',
      overlaySegment:'OVERLAY', overlayType:'TYPE', overlayLabel:'NOTE', save:'SAVE', remove:'CLEAR',
      current:'CURRENT REF', target:'TARGET', autoReference:'AUTO REFERENCE', manual:'MANUAL',
      activeObjective:'ACTIVE PLAN OBJECTIVE', calculate:'CALCULATE', dist:'DIST', grid:'GRID BRG', true:'TRUE BRG',
      mag:'MAG BRG', conv:'GRID CONV', decl:'MAG DECL', model:'MAG MODEL', offlineMap:'EMERGENCY MAP',
      currentInput:'CURRENT WGS84 / MGRS', targetInput:'TARGET WGS84 / MGRS', apply:'APPLY',
      includeRoute:'INCLUDE PLAN ROUTE', includeEstimated:'ESTIMATED AS SEPARATE ROUTE',
      exportGpx:'EXPORT GPX', tracksToExport:'TRACKS TO EXPORT', created:'CREATED',
      failed:'FAILED', invalid:'POSITION UNAVAILABLE', noObjective:'NO OBJECTIVE',
      trackRouteNote:'ONLY MEASURED SEGMENTS BECOME ROUTE. ESTIMATED GAPS ARE EXCLUDED.',
      backtrackNote:'SELECTED SAVED TRACK IS USED BY NAV BACKTRACK.',
      emergencyNote:'WORKS WITH TEMP/MANUAL COORDS WITHOUT LIVE GPS. SHOWS GRID/TRUE/MAG BEARINGS.',
      gpxNote:'ESTIMATED IS NEVER WRITTEN AS GPX TRACK. OPTIONAL EXPORT USES SEPARATE ROUTE ONLY.',
      overlayEmpty:'NO OVERLAY SEGMENTS IN THIS PLAN.', close:'CLOSE', openPlan:'OPEN PLAN',
      danger:'DANGER', reference:'REFERENCE', blocked:'BLOCKED', observation:'OBSERVATION', other:'OTHER'
    }
  };

  function lang(){return document.documentElement.lang==='en'?'en':'ko';}
  function t(key){return T[lang()][key]||T.en[key]||key;}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtKm(v){return Number.isFinite(Number(v))?Number(v).toFixed(Number(v)<10?2:1)+' KM':'--';}
  function fmtDeg(v){return Number.isFinite(Number(v))?core.geo.normalize360(Number(v)).toFixed(1)+'°':'---°';}
  function fmtSigned(v){if(!Number.isFinite(Number(v)))return '--';const n=Number(v);return(n>=0?'+':'')+n.toFixed(1)+'°';}
  function fmtDuration(ms){
    ms=Math.max(0,Number(ms)||0);
    const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);
    return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }

  function allPlans(){
    return Object.values(base.storage.getAllPlans?.()||{}).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  }
  function activePlan(){
    return base.state.activePlanId?base.plans.get(base.state.activePlanId):null;
  }
  function planTracks(planId){
    return planId&&base.track?.list?base.track.list(planId):[];
  }
  function planOptions(selected){
    const plans=allPlans();
    if(!plans.length)return '<option value="">'+t('noPlans')+'</option>';
    return plans.map(p=>'<option value="'+esc(p.id)+'" '+(String(p.id)===String(selected)?'selected':'')+'>'+esc(p.name)+'</option>').join('');
  }
  function trackOptions(planId,selected,placeholder){
    const tracks=planTracks(planId);
    if(!tracks.length)return '<option value="">'+t('noTracks')+'</option>';
    return (placeholder?'<option value="">'+esc(placeholder)+'</option>':'')+tracks.map(tr=>{
      const d=new Date(tr.startedAt);
      const label=d.toLocaleString(lang()==='ko'?'ko-KR':undefined)+' · '+fmtKm(tr.distance?.measuredKm||0);
      return '<option value="'+esc(tr.id)+'" '+(String(tr.id)===String(selected)?'selected':'')+'>'+esc(label)+'</option>';
    }).join('');
  }

  function closeSheet(){
    document.getElementById('v29Sheet')?.classList.remove('open');
    document.body.classList.remove('v29-sheet-open');
  }

  function ensureMapFallbackBanner(){
    let banner=document.getElementById('v29MapFallback');
    if(banner)return banner;
    banner=document.createElement('div');
    banner.id='v29MapFallback';
    banner.className='v29-map-fallback';
    banner.hidden=true;
    banner.innerHTML='<span></span><button type="button"></button>';
    banner.querySelector('button').addEventListener('click',()=>openSheet('emergency'));
    document.body.appendChild(banner);
    return banner;
  }

  function syncMapFallbackCopy(reason){
    const banner=ensureMapFallbackBanner();
    const text=reason==='OFFLINE'
      ? (lang()==='ko'?'오프라인 · 온라인 지도 사용 불가':'OFFLINE · ONLINE MAP UNAVAILABLE')
      : (lang()==='ko'?'지도 타일 수신 실패':'MAP TILE FAILURE');
    banner.querySelector('span').textContent=text;
    banner.querySelector('button').textContent=lang()==='ko'?'비상지도':'EMERGENCY MAP';
  }

  function showMapFallback(reason='TILE'){
    const banner=ensureMapFallbackBanner();
    syncMapFallbackCopy(reason);
    banner.hidden=false;
  }

  function hideMapFallback(){
    const banner=document.getElementById('v29MapFallback');
    if(banner)banner.hidden=true;
  }

  function bindTileFallback(layer){
    if(!layer?.on||layer._v29FallbackBound)return;
    const isTile=typeof layer.getTileUrl==='function'||(typeof L!=='undefined'&&L.TileLayer&&layer instanceof L.TileLayer);
    if(!isTile)return;
    layer._v29FallbackBound=true;
    layer.on('tileerror',()=>{
      const now=Date.now();
      if(now-tileErrorWindowAt>5000){tileErrorWindowAt=now;tileErrorCount=0;}
      tileErrorCount++;
      if(tileErrorCount>=3)showMapFallback('TILE');
    });
    layer.on('load',()=>{
      tileErrorCount=0;
      tileErrorWindowAt=Date.now();
      if(navigator.onLine)hideMapFallback();
    });
  }

  function installMapFallback(){
    const banner=ensureMapFallbackBanner();
    if(typeof map!=='undefined'&&map?.eachLayer){
      map.eachLayer(bindTileFallback);
      map.on?.('layeradd',e=>bindTileFallback(e.layer));
    }
    window.addEventListener('offline',()=>showMapFallback('OFFLINE'));
    window.addEventListener('online',()=>{tileErrorCount=0;hideMapFallback();});
    if(!navigator.onLine)showMapFallback('OFFLINE');
    else banner.hidden=true;
  }
  function openSheet(tab=activeTab){
    if(typeof closeFieldControls==='function')closeFieldControls();
    activeTab=tab;
    renderShell();
    document.getElementById('v29Sheet')?.classList.add('open');
    document.body.classList.add('v29-sheet-open');
  }

  function setTab(tab){
    activeTab=tab;
    renderShell();
  }

  function renderShell(){
    const sheet=document.getElementById('v29Sheet');
    if(!sheet)return;
    const labels=['reuse','tracks','overlay','emergency','export'];
    sheet.querySelectorAll('[data-v29-tab]').forEach(btn=>{
      const tab=btn.dataset.v29Tab;
      btn.textContent=t(tab);
      btn.classList.toggle('active',tab===activeTab);
    });
    const title=document.getElementById('v29Title');
    if(title)title.textContent=t('fieldKit');
    const body=document.getElementById('v29Body');
    if(!body)return;
    if(activeTab==='reuse')renderReuse(body);
    else if(activeTab==='tracks')renderTracks(body);
    else if(activeTab==='overlay')renderOverlay(body);
    else if(activeTab==='emergency')renderEmergency(body);
    else renderExport(body);
  }

  function renderReuse(body){
    const plan=activePlan()||allPlans()[0]||null;
    const planId=plan?.id||'';
    const tracks=planTracks(planId);
    const trackId=tracks[0]?.id||'';
    body.innerHTML=
      '<div class="v29-section"><div class="v29-section-title">'+t('trackRoute')+'</div>'+
      '<label>'+t('sourcePlan')+'<select id="v29ReusePlan">'+planOptions(planId)+'</select></label>'+
      '<label>'+t('sourceTrack')+'<select id="v29ReuseTrack">'+trackOptions(planId,trackId)+'</select></label>'+
      '<label>'+t('tolerance')+'<select id="v29Tolerance"><option value="5">5 M</option><option value="15" selected>15 M</option><option value="30">30 M</option><option value="60">60 M</option></select></label>'+
      '<div class="v29-note">'+t('trackRouteNote')+'</div>'+
      '<button class="osb-btn active" id="v29TrackRouteBtn" type="button">'+t('trackRoute')+'</button>'+
      '</div>'+
      '<div class="v29-section"><div class="v29-section-title">'+t('clonePlan')+'</div>'+
      '<label>'+t('sourcePlan')+'<select id="v29ClonePlan">'+planOptions(planId)+'</select></label>'+
      '<button class="osb-btn" id="v29CloneBtn" type="button">'+t('clonePlan')+'</button></div>'+
      '<div class="v29-result" id="v29ReuseResult"></div>';

    const planSel=body.querySelector('#v29ReusePlan');
    planSel?.addEventListener('change',()=>{
      const sel=body.querySelector('#v29ReuseTrack');
      if(sel)sel.innerHTML=trackOptions(planSel.value,'');
    });
    body.querySelector('#v29TrackRouteBtn')?.addEventListener('click',()=>{
      const id=body.querySelector('#v29ReuseTrack')?.value;
      const tolerance=Number(body.querySelector('#v29Tolerance')?.value)||15;
      const result=core.reuse.createTrackRoute(id,{toleranceMeters:tolerance});
      showReuseResult(result);
    });
    body.querySelector('#v29CloneBtn')?.addEventListener('click',()=>{
      const id=body.querySelector('#v29ClonePlan')?.value;
      showReuseResult(core.reuse.clonePlan(id));
    });
  }

  function showReuseResult(plan){
    const el=document.getElementById('v29ReuseResult');
    if(!el)return;
    if(!plan){el.textContent=t('failed');return;}
    el.innerHTML='<strong>'+t('created')+'</strong><span>'+esc(plan.name)+'</span><button class="osb-btn" id="v29OpenCreated" type="button">'+t('openPlan')+'</button>';
    document.getElementById('v29OpenCreated')?.addEventListener('click',()=>{
      closeSheet();
      base.ui.openPlan(plan.id);
    });
  }

  function renderTracks(body){
    const plan=activePlan()||allPlans()[0]||null;
    const planId=plan?.id||'';
    const tracks=planTracks(planId);
    compareA=tracks.some(x=>x.id===compareA)?compareA:(tracks[0]?.id||'');
    compareB=tracks.some(x=>x.id===compareB)?compareB:(tracks[1]?.id||'');
    const selectedBack=core.backtrack.get(planId)?.id||'';
    body.innerHTML=
      '<div class="v29-section"><label>'+t('selectPlan')+'<select id="v29TrackPlan">'+planOptions(planId)+'</select></label></div>'+
      '<div class="v29-section"><div class="v29-section-title">'+t('compare')+'</div>'+
      '<div class="v29-two"><label>'+t('compareA')+'<select id="v29CompareA">'+trackOptions(planId,compareA,t('selectTrack'))+'</select></label>'+
      '<label>'+t('compareB')+'<select id="v29CompareB">'+trackOptions(planId,compareB,t('selectTrack'))+'</select></label></div>'+
      '<div class="v29-action-row"><button class="osb-btn active" id="v29CompareBtn">'+t('compare')+'</button>'+
      '<button class="osb-btn" id="v29CompareMap">'+t('mapOverlay')+'</button><button class="osb-btn" id="v29CompareClear">'+t('clearMap')+'</button></div>'+
      '<div class="v29-compare-result" id="v29CompareResult"></div></div>'+
      '<div class="v29-section"><div class="v29-section-title">'+t('backtrack')+'</div>'+
      '<label>'+t('sourceTrack')+'<select id="v29BacktrackTrack">'+trackOptions(planId,selectedBack,t('selectTrack'))+'</select></label>'+
      '<div class="v29-note">'+t('backtrackNote')+'</div><button class="osb-btn" id="v29BacktrackUse">'+t('useBacktrack')+'</button>'+
      '<div class="v29-result" id="v29BacktrackResult">'+(selectedBack?t('selected'):'')+'</div></div>';

    body.querySelector('#v29TrackPlan')?.addEventListener('change',e=>{
      const id=e.target.value;
      const a=body.querySelector('#v29CompareA'),b=body.querySelector('#v29CompareB'),bt=body.querySelector('#v29BacktrackTrack');
      if(a)a.innerHTML=trackOptions(id,'',t('selectTrack'));
      if(b)b.innerHTML=trackOptions(id,'',t('selectTrack'));
      if(bt)bt.innerHTML=trackOptions(id,core.backtrack.get(id)?.id||'',t('selectTrack'));
      clearCompareLayer();
    });
    body.querySelector('#v29CompareBtn')?.addEventListener('click',()=>renderComparison(false));
    body.querySelector('#v29CompareMap')?.addEventListener('click',()=>renderComparison(true));
    body.querySelector('#v29CompareClear')?.addEventListener('click',clearCompareLayer);
    body.querySelector('#v29BacktrackUse')?.addEventListener('click',()=>{
      const pid=body.querySelector('#v29TrackPlan')?.value;
      const tid=body.querySelector('#v29BacktrackTrack')?.value;
      const ok=core.backtrack.set(pid,tid);
      const out=body.querySelector('#v29BacktrackResult');
      if(out)out.textContent=ok?t('selected'):t('failed');
    });
  }

  function renderComparison(drawMap){
    const planId=document.getElementById('v29TrackPlan')?.value;
    compareA=document.getElementById('v29CompareA')?.value||'';
    compareB=document.getElementById('v29CompareB')?.value||'';
    const a=base.track.get(compareA),b=base.track.get(compareB);
    const result=core.compare.tracks(a,b);
    const el=document.getElementById('v29CompareResult');
    if(!result){if(el)el.textContent=t('failed');return;}
    if(el)el.innerHTML=
      '<div class="v29-metric-grid">'+
      metric(t('measured'),fmtKm(result.a.measuredKm)+' → '+fmtKm(result.b.measuredKm))+
      metric(t('estimated'),fmtKm(result.a.estimatedKm)+' → '+fmtKm(result.b.estimatedKm))+
      metric(t('duration'),fmtDuration(result.a.durationMs)+' → '+fmtDuration(result.b.durationMs))+
      metric(t('avgSpeed'),result.a.averageMeasuredKph.toFixed(1)+' → '+result.b.averageMeasuredKph.toFixed(1)+' KM/H')+
      metric(t('deviation'),Number.isFinite(result.meanDeviationM)?result.meanDeviationM.toFixed(0)+' M':'--')+
      metric(t('maxDeviation'),Number.isFinite(result.maxDeviationM)?result.maxDeviationM.toFixed(0)+' M':'--')+
      '</div>';
    if(drawMap)drawCompareTracks(planId,a,b);
  }

  function metric(k,v){return '<div><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>';}

  function ensureCompareLayer(){
    if(compareLayer||typeof L==='undefined'||typeof map==='undefined')return compareLayer;
    compareLayer=L.layerGroup().addTo(map);
    return compareLayer;
  }
  function clearCompareLayer(){if(compareLayer)compareLayer.clearLayers();}
  function measuredSegments(track){
    return (track?.segments||[]).filter(s=>s?.kind==='MEASURED'&&Array.isArray(s.points)).map(s=>s.points.map(p=>[Number(p.lat),Number(p.lon)]).filter(core.geo.validCoords)).filter(s=>s.length>1);
  }
  function drawCompareTracks(planId,a,b){
    const layer=ensureCompareLayer();if(!layer)return;
    layer.clearLayers();
    const color=typeof getOpticColor==='function'?getOpticColor():'#7cff92';
    measuredSegments(a).forEach(seg=>L.polyline(seg,{color,weight:4,opacity:.9,interactive:false}).addTo(layer));
    measuredSegments(b).forEach(seg=>L.polyline(seg,{color,weight:3,opacity:.65,dashArray:'10 7',interactive:false}).addTo(layer));
    const pts=[...measuredSegments(a).flat(),...measuredSegments(b).flat()];
    if(pts.length)map.fitBounds(L.latLngBounds(pts),{padding:[28,28],animate:false});
  }

  const OVERLAY_LABEL={DANGER:'danger',REFERENCE:'reference',BLOCKED:'blocked',OBSERVATION:'observation',OTHER:'other'};
  function renderOverlay(body){
    const plan=activePlan()||allPlans()[0]||null;
    const pid=plan?.id||'';
    const segments=plan?.overlaySegments||[];
    const meta=new Map(core.overlays.list(pid).map(x=>[x.segmentIndex,x]));
    body.innerHTML='<div class="v29-section"><label>'+t('selectPlan')+'<select id="v29OverlayPlan">'+planOptions(pid)+'</select></label></div>'+
      '<div class="v29-overlay-list" id="v29OverlayList"></div>';
    const renderList=(planId)=>{
      const p=base.plans.get(planId);
      const list=body.querySelector('#v29OverlayList');
      if(!list)return;
      if(!p?.overlaySegments?.length){list.innerHTML='<div class="v29-empty">'+t('overlayEmpty')+'</div>';return;}
      const m=new Map(core.overlays.list(planId).map(x=>[x.segmentIndex,x]));
      list.innerHTML=p.overlaySegments.map((seg,i)=>{
        const item=m.get(i)||{type:'REFERENCE',label:''};
        return '<div class="v29-overlay-row" data-index="'+i+'"><div class="v29-overlay-head"><strong>'+t('overlaySegment')+' '+(i+1)+'</strong><span>'+seg.length+' PT</span></div>'+
          '<select class="v29-overlay-type">'+core.overlays.types.map(type=>'<option value="'+type+'" '+(type===item.type?'selected':'')+'>'+t(OVERLAY_LABEL[type])+'</option>').join('')+'</select>'+
          '<input class="v29-overlay-label" maxlength="80" value="'+esc(item.label)+'" placeholder="'+t('overlayLabel')+'">'+
          '<div class="v29-action-row"><button class="osb-btn active v29-overlay-save">'+t('save')+'</button><button class="osb-btn v29-overlay-clear">'+t('remove')+'</button></div></div>';
      }).join('');
      list.querySelectorAll('.v29-overlay-row').forEach(row=>{
        const idx=Number(row.dataset.index);
        row.querySelector('.v29-overlay-save')?.addEventListener('click',()=>{
          core.overlays.set(planId,idx,row.querySelector('.v29-overlay-type').value,row.querySelector('.v29-overlay-label').value);
          renderOverlayAnnotations(base.state.activePlanId);
        });
        row.querySelector('.v29-overlay-clear')?.addEventListener('click',()=>{
          core.overlays.clear(planId,idx);renderList(planId);renderOverlayAnnotations(base.state.activePlanId);
        });
      });
    };
    renderList(pid);
    body.querySelector('#v29OverlayPlan')?.addEventListener('change',e=>renderList(e.target.value));
  }

  function ensureOverlayLayer(){
    if(overlayLayer||typeof L==='undefined'||typeof map==='undefined')return overlayLayer;
    overlayLayer=L.layerGroup().addTo(map);return overlayLayer;
  }
  function overlayStyle(type,color){
    const styles={
      DANGER:{weight:4,dashArray:'2 5',opacity:.95},
      BLOCKED:{weight:4,dashArray:'1 4',opacity:.9},
      OBSERVATION:{weight:3,dashArray:'12 4',opacity:.85},
      REFERENCE:{weight:2,dashArray:'6 6',opacity:.7},
      OTHER:{weight:2,dashArray:'3 8',opacity:.65}
    };
    return {color,interactive:false,...(styles[type]||styles.OTHER)};
  }
  function renderOverlayAnnotations(planId=base.state.activePlanId){
    const layer=ensureOverlayLayer();if(!layer)return;
    layer.clearLayers();
    const plan=planId?base.plans.get(planId):null;
    if(!plan)return;
    const metas=core.overlays.list(planId);
    const color=typeof getOpticColor==='function'?getOpticColor():'#7cff92';
    metas.forEach(item=>{
      const seg=plan.overlaySegments?.[item.segmentIndex]?.filter(core.geo.validCoords)||[];
      if(seg.length<2)return;
      L.polyline(seg,overlayStyle(item.type,color)).addTo(layer);
      const c=seg[Math.floor(seg.length/2)];
      const label=(t(OVERLAY_LABEL[item.type])+(item.label?' · '+item.label:'')).slice(0,90);
      L.marker(c,{interactive:false,icon:L.divIcon({
        className:'v29-overlay-marker',
        html:'<span>'+esc(label)+'</span>',iconSize:[1,1],iconAnchor:[0,0]
      })}).addTo(layer);
    });
  }

  function parsePosition(text){
    const raw=String(text||'').trim();
    if(!raw)return null;
    if(typeof parseDirectRouteLocation==='function'){
      try{
        const r=parseDirectRouteLocation(raw);
        if(r&&core.geo.validCoords([r.lat,r.lon]))return [Number(r.lat),Number(r.lon)];
      }catch(e){}
    }
    const m=raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if(m&&core.geo.validCoords([Number(m[1]),Number(m[2])]))return [Number(m[1]),Number(m[2])];
    if(root.mgrs?.toPoint){
      try{
        const p=root.mgrs.toPoint(raw.replace(/\s+/g,''));
        if(Array.isArray(p)&&core.geo.validCoords([Number(p[1]),Number(p[0])]))return [Number(p[1]),Number(p[0])];
      }catch(e){}
    }
    return null;
  }
  function currentReference(){
    try{
      const ref=typeof getReferencePosition==='function'?getReferencePosition():null;
      return ref?.coords&&core.geo.validCoords(ref.coords)?{coords:[...ref.coords],source:ref.type||'AUTO'}:null;
    }catch(e){return null;}
  }
  function currentObjective(){
    const p=activePlan();
    return p?.objective?.coords?{coords:[...p.objective.coords],name:p.objective.name}:null;
  }

  function renderEmergency(body){
    const saved=core.emergency.getState();
    const auto=currentReference();
    const obj=currentObjective();
    const current=saved.currentSource==='MANUAL'
      ? (saved.current||auto?.coords||null)
      : (auto?.coords||saved.current||null);
    const target=saved.targetSource==='MANUAL'
      ? (saved.target||obj?.coords||null)
      : (obj?.coords||saved.target||null);
    body.innerHTML=
      '<div class="v29-note">'+t('emergencyNote')+'</div>'+
      '<div class="v29-section"><div class="v29-two"><label>'+t('current')+'<select id="v29CurrentMode"><option value="auto">'+t('autoReference')+'</option><option value="manual">'+t('manual')+'</option></select></label>'+
      '<label>'+t('target')+'<select id="v29TargetMode"><option value="objective">'+t('activeObjective')+'</option><option value="manual">'+t('manual')+'</option></select></label></div>'+
      '<label>'+t('currentInput')+'<input id="v29CurrentInput" value="'+esc(current?current[0].toFixed(6)+', '+current[1].toFixed(6):'')+'"></label>'+
      '<label>'+t('targetInput')+'<input id="v29TargetInput" value="'+esc(target?target[0].toFixed(6)+', '+target[1].toFixed(6):'')+'"></label>'+
      '<button class="osb-btn active" id="v29CalcBtn">'+t('calculate')+'</button></div>'+
      '<div class="v29-emergency-readout" id="v29EmergencyReadout"></div>'+
      '<div class="v29-section"><div class="v29-section-title">'+t('offlineMap')+'</div><div class="v29-emergency-map" id="v29EmergencyMap"></div></div>';
    const cm=body.querySelector('#v29CurrentMode'),tm=body.querySelector('#v29TargetMode');
    if(saved.currentSource==='MANUAL')cm.value='manual';
    if(saved.targetSource==='MANUAL')tm.value='manual';
    const refreshInputs=()=>{
      if(cm.value==='auto'){
        const ref=currentReference();if(ref)body.querySelector('#v29CurrentInput').value=ref.coords.map(v=>v.toFixed(6)).join(', ');
      }
      if(tm.value==='objective'){
        const o=currentObjective();if(o)body.querySelector('#v29TargetInput').value=o.coords.map(v=>v.toFixed(6)).join(', ');
      }
    };
    cm.addEventListener('change',refreshInputs);tm.addEventListener('change',refreshInputs);
    body.querySelector('#v29CalcBtn')?.addEventListener('click',calculateEmergency);
    if(current&&target)setTimeout(calculateEmergency,0);
  }

  function calculateEmergency(){
    const cm=document.getElementById('v29CurrentMode')?.value;
    const tm=document.getElementById('v29TargetMode')?.value;
    let current=cm==='auto'?currentReference()?.coords:null;
    let target=tm==='objective'?currentObjective()?.coords:null;
    if(!current)current=parsePosition(document.getElementById('v29CurrentInput')?.value);
    if(!target)target=parsePosition(document.getElementById('v29TargetInput')?.value);
    const out=document.getElementById('v29EmergencyReadout');
    if(!current||!target){
      if(out)out.textContent=t('invalid');renderEmergencyMap(null,null);return;
    }
    core.emergency.saveState({current,target,currentSource:cm==='auto'?'AUTO':'MANUAL',targetSource:tm==='objective'?'OBJECTIVE':'MANUAL'});
    const bundle=core.geo.bearingBundle(current,target,{date:new Date(),altitudeKm:0});
    if(!bundle){if(out)out.textContent=t('failed');return;}
    if(out)out.innerHTML='<div class="v29-metric-grid">'+
      metric(t('dist'),fmtKm(bundle.distanceKm))+
      metric(t('grid'),fmtDeg(bundle.gridBearing))+
      metric(t('true'),fmtDeg(bundle.trueBearing))+
      metric(t('mag'),fmtDeg(bundle.magneticBearing))+
      metric(t('conv'),fmtSigned(bundle.convergence))+
      metric(t('decl'),fmtSigned(bundle.declination))+
      metric(t('model'),bundle.model?.valid?'WMM-2025 · '+bundle.model.decimalYear.toFixed(2):'WMM OUT OF RANGE')+
      metric('UTM','ZONE '+bundle.zone)+
      '</div>';
    renderEmergencyMap(current,target);
  }

  function renderEmergencyMap(current,target){
    const box=document.getElementById('v29EmergencyMap');if(!box)return;
    if(!current||!target){box.innerHTML='<div class="v29-empty">'+t('invalid')+'</div>';return;}
    const plan=activePlan();
    const route=(plan?.routeSegments||[]).flat().filter(core.geo.validCoords);
    const pts=[current,target,...route];
    let minLat=Math.min(...pts.map(p=>p[0])),maxLat=Math.max(...pts.map(p=>p[0]));
    let minLon=Math.min(...pts.map(p=>p[1])),maxLon=Math.max(...pts.map(p=>p[1]));
    const latPad=Math.max(.01,(maxLat-minLat)*.15),lonPad=Math.max(.01,(maxLon-minLon)*.15);
    minLat-=latPad;maxLat+=latPad;minLon-=lonPad;maxLon+=lonPad;
    let contextSites=[];
    try{
      if(typeof getWaypoints==='function'){
        contextSites=(getWaypoints('ALL')||[])
          .filter(site=>core.geo.validCoords(site?.coords))
          .filter(site=>site.coords[0]>=minLat&&site.coords[0]<=maxLat&&site.coords[1]>=minLon&&site.coords[1]<=maxLon)
          .slice(0,30);
      }
    }catch(e){}
    const W=600,H=360,pad=34;
    const x=lon=>pad+(lon-minLon)/(maxLon-minLon)*(W-2*pad);
    const y=lat=>H-pad-(lat-minLat)/(maxLat-minLat)*(H-2*pad);
    let svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(t('offlineMap'))+'">';
    for(let i=0;i<=4;i++){
      const gx=pad+i*(W-2*pad)/4,gy=pad+i*(H-2*pad)/4;
      svg+='<line class="grid" x1="'+gx+'" y1="'+pad+'" x2="'+gx+'" y2="'+(H-pad)+'"/>';
      svg+='<line class="grid" x1="'+pad+'" y1="'+gy+'" x2="'+(W-pad)+'" y2="'+gy+'"/>';
    }
    (plan?.routeSegments||[]).forEach(seg=>{
      const clean=seg.filter(core.geo.validCoords);if(clean.length<2)return;
      svg+='<polyline class="route" points="'+clean.map(p=>x(p[1]).toFixed(1)+','+y(p[0]).toFixed(1)).join(' ')+'"/>';
    });
    contextSites.forEach(site=>{
      svg+='<circle class="site" cx="'+x(site.coords[1])+'" cy="'+y(site.coords[0])+'" r="2.8"/>';
    });
    svg+='<line class="direct" x1="'+x(current[1])+'" y1="'+y(current[0])+'" x2="'+x(target[1])+'" y2="'+y(target[0])+'"/>';
    svg+='<circle class="current" cx="'+x(current[1])+'" cy="'+y(current[0])+'" r="7"/>';
    const tx=x(target[1]),ty=y(target[0]);
    svg+='<path class="target" d="M '+tx+' '+(ty-9)+' L '+(tx+9)+' '+ty+' L '+tx+' '+(ty+9)+' L '+(tx-9)+' '+ty+' Z"/>';
    svg+='<text x="'+pad+'" y="18">'+minLat.toFixed(3)+'..'+maxLat.toFixed(3)+' / '+minLon.toFixed(3)+'..'+maxLon.toFixed(3)+'</text>';
    svg+='</svg>';
    box.innerHTML=svg;
  }

  function renderExport(body){
    const plan=activePlan()||allPlans()[0]||null;
    const pid=plan?.id||'';
    const renderTrackChecks=(planId)=>{
      const tracks=planTracks(planId);
      return tracks.length?tracks.map(tr=>{
        const label=new Date(tr.startedAt).toLocaleString(lang()==='ko'?'ko-KR':undefined)+' · '+fmtKm(tr.distance?.measuredKm||0);
        return '<label class="v29-check"><input type="checkbox" data-track-id="'+esc(tr.id)+'" checked><span>'+esc(label)+'</span></label>';
      }).join(''):'<div class="v29-empty">'+t('noTracks')+'</div>';
    };
    body.innerHTML='<div class="v29-note">'+t('gpxNote')+'</div><div class="v29-section">'+
      '<label>'+t('selectPlan')+'<select id="v29ExportPlan">'+planOptions(pid)+'</select></label>'+
      '<div class="v29-section-title">'+t('tracksToExport')+'</div><div id="v29ExportTracks">'+renderTrackChecks(pid)+'</div>'+
      '<label class="v29-check"><input id="v29IncludeRoute" type="checkbox" checked><span>'+t('includeRoute')+'</span></label>'+
      '<label class="v29-check"><input id="v29IncludeEstimated" type="checkbox"><span>'+t('includeEstimated')+'</span></label>'+
      '<button class="osb-btn active" id="v29ExportBtn">'+t('exportGpx')+'</button></div>';
    body.querySelector('#v29ExportPlan')?.addEventListener('change',e=>{
      const box=body.querySelector('#v29ExportTracks');if(box)box.innerHTML=renderTrackChecks(e.target.value);
    });
    body.querySelector('#v29ExportBtn')?.addEventListener('click',downloadSelectedGpx);
  }

  function downloadSelectedGpx(){
    const pid=document.getElementById('v29ExportPlan')?.value||'';
    const ids=[...document.querySelectorAll('#v29ExportTracks input[data-track-id]:checked')].map(el=>el.dataset.trackId);
    const gpx=core.gpx.buildSelected({
      planId:pid,trackIds:ids,
      includePlanRoute:Boolean(document.getElementById('v29IncludeRoute')?.checked),
      includeEstimated:Boolean(document.getElementById('v29IncludeEstimated')?.checked)
    });
    const blob=new Blob([gpx],{type:'application/gpx+xml'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    const p=base.plans.get(pid);
    a.download='TACTICAL_RECON_V29_'+String(p?.name||'EXPORT').replace(/[^a-zA-Z0-9가-힣_-]+/g,'_').slice(0,40)+'_'+new Date().toISOString().slice(0,10)+'.gpx';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function installBacktrackPreference(){
    // Keep V28 runtime semantics, including ESTIMATED boundary handling.
    // v28-runtime reads this preference through the patched selector.
  }

  function install(){
    if(installed)return;installed=true;
    document.body.classList.add('v29-integrated');

    const menu=document.querySelector('#control-menu .v26-menu-grid');
    if(menu&&!document.getElementById('v29FieldKitBtn')){
      const btn=document.createElement('button');
      btn.className='osb-btn';btn.id='v29FieldKitBtn';btn.type='button';
      btn.textContent=t('fieldKit');btn.dataset.v29TextOwner='1';
      btn.addEventListener('click',()=>openSheet('reuse'));
      menu.appendChild(btn);
    }

    const sheet=document.createElement('div');
    sheet.id='v29Sheet';sheet.className='v29-sheet';
    sheet.innerHTML='<div class="v29-shell"><div class="v29-head"><div><small>TACTICAL RECON // V29</small><strong id="v29Title"></strong></div><button class="v29-close" type="button">×</button></div>'+
      '<div class="v29-tabs">'+['reuse','tracks','overlay','emergency','export'].map(tab=>'<button type="button" data-v29-tab="'+tab+'"></button>').join('')+'</div>'+
      '<div class="v29-body" id="v29Body"></div></div>';
    document.body.appendChild(sheet);
    sheet.querySelector('.v29-close')?.addEventListener('click',closeSheet);
    sheet.addEventListener('click',e=>{if(e.target===sheet)closeSheet();});
    sheet.querySelectorAll('[data-v29-tab]').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.v29Tab)));

    installBacktrackPreference();
    installMapFallback();
    renderOverlayAnnotations();

    let previousLang=document.documentElement.lang;
    new MutationObserver(()=>{
      if(previousLang===document.documentElement.lang)return;
      previousLang=document.documentElement.lang;
      const b=document.getElementById('v29FieldKitBtn');if(b)b.textContent=t('fieldKit');
      if(sheet.classList.contains('open'))renderShell();
      if(!document.getElementById('v29MapFallback')?.hidden)syncMapFallbackCopy(navigator.onLine?'TILE':'OFFLINE');
      renderOverlayAnnotations();
    }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

    lastPlanId=base.state.activePlanId;
    renderTimer=setInterval(()=>{
      if(lastPlanId!==base.state.activePlanId){
        lastPlanId=base.state.activePlanId;
        renderOverlayAnnotations(lastPlanId);
        if(sheet.classList.contains('open')&&['reuse','tracks','overlay','emergency','export'].includes(activeTab))renderShell();
      }
    },1500);

    root.openV29FieldKit=openSheet;
  }

  core.ui={open:openSheet,close:closeSheet,renderOverlay:renderOverlayAnnotations,calculateEmergency};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
