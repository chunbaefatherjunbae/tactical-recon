(function(root){
  'use strict';

  if(root.EpUiShell?.version)return;

  let installed=false;
  let refreshTimer=null;
  let toastTimer=null;
  let trackLongTimer=null;
  let trackLong=false;

  function el(id){return document.getElementById(id);}
  function state(){return root.EpRuntimeBridge?.state||null;}
  function surface(){return root.EpSurfaceBridge?.surface||state()?.surface||'MAP';}

  function safeBool(name){
    try{
      if(name==='gps')return typeof gpsPowerEnabled!=='undefined'&&Boolean(gpsPowerEnabled);
      if(name==='fix')return typeof hasGpsFix!=='undefined'&&Boolean(hasGpsFix);
      if(name==='follow')return typeof gpsFollowEnabled!=='undefined'&&Boolean(gpsFollowEnabled);
      if(name==='temp')return typeof tempMarkPoint!=='undefined'&&Boolean(tempMarkPoint?.coords);
    }catch(e){}
    return false;
  }

  function mgrsText(coords){
    if(!Array.isArray(coords)||coords.length<2)return '--';
    const lat=Number(coords[0]),lon=Number(coords[1]);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return '--';
    try{
      if(typeof calcMGRS==='function'){
        const value=String(calcMGRS(lat,lon)||'').trim();
        if(value)return value;
      }
    }catch(e){}
    return lat.toFixed(5)+', '+lon.toFixed(5);
  }

  function reference(){
    try{return root.EpRuntimeBridge?.getReference?.()||null;}catch(e){return null;}
  }

  function targetCoords(){
    try{
      if(typeof map!=='undefined'&&map?.getCenter){
        const c=map.getCenter();
        return [Number(c.lat),Number(c.lng)];
      }
    }catch(e){}
    const t=state()?.target;
    return t?[Number(t.lat),Number(t.lon)]:null;
  }

  function notify(message){
    const node=el('epShellToast');
    if(!node)return;
    clearTimeout(toastTimer);
    node.textContent=String(message||'');
    node.classList.add('show');
    toastTimer=setTimeout(()=>node.classList.remove('show'),1500);
  }

  async function copyText(value){
    const text=String(value||'');
    if(!text||text==='--')return;
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{
        const ta=document.createElement('textarea');
        ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
        document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
      }
      notify('좌표 복사');
    }catch(e){notify('복사 실패');}
  }

  function openSearch(){
    if(surface()==='PLAN'&&typeof root.openPlanSearch==='function')root.openPlanSearch();
    else if(typeof root.openAddressSearch==='function')root.openAddressSearch();
  }

  function openTools(){
    if(typeof root.openFieldControls==='function')root.openFieldControls('menu');
  }

  function openPoints(){
    if(typeof root.openWpDrawer==='function')root.openWpDrawer();
  }

  function runRandom(){
    root.EpOverlayBridge?.closeAllLegacy?.();
    root.EpOverlayBridge?.closeOverlay?.(null,{source:'RANDOM'});
    if(typeof root.deployRegisteredRecon==='function')root.deployRegisteredRecon();
    else if(typeof root.deployWildRecon==='function')root.deployWildRecon();
  }

  function openRecords(){
    if(root.v29?.ui?.open)root.v29.ui.open('tracks');
    else if(typeof root.openV29FieldKit==='function')root.openV29FieldKit('tracks');
    else openTools();
  }

  function toggleGps(){
    if(typeof root.toggleGpsPower==='function')root.toggleGpsPower();
  }

  function toggleFollow(){
    if(typeof root.toggleGpsFollow==='function')root.toggleGpsFollow();
    else if(typeof root.centerGpsNow==='function')root.centerGpsNow();
  }

  function setTemp(){
    if(typeof root.setTempMarkAtReticle==='function')root.setTempMarkAtReticle();
  }

  function startTrack(){
    const api=root.v28?.track;
    if(!api)return;
    if(api.state!=='OFF')return;
    if(surface()==='MAP'){
      const free=document.getElementById('v29FreeTrackMissionBtn')||document.getElementById('v29FreeTrackBtn');
      if(free){free.click();return;}
    }
    if(typeof root.startTrackRecording==='function'){
      const started=root.startTrackRecording();
      if(!started&&surface()==='MAP')openRecords();
    }else openRecords();
  }

  function shortTrackAction(){
    const api=root.v28?.track;
    if(!api)return;
    if(api.state==='OFF')startTrack();
    else if(api.state==='RECORDING')api.pause?.();
    else if(api.state==='PAUSED')api.resume?.();
    refresh();
  }

  function stopTrack(){
    const api=root.v28?.track;
    if(!api||api.state==='OFF')return;
    api.stop?.();
    notify('트랙 저장');
    refresh();
  }

  function installTrackButton(){
    const btn=el('epTrackBtn');
    if(!btn)return;
    btn.addEventListener('pointerdown',event=>{
      trackLong=false;
      clearTimeout(trackLongTimer);
      btn.setPointerCapture?.(event.pointerId);
      trackLongTimer=setTimeout(()=>{
        trackLong=true;
        stopTrack();
      },700);
    });
    btn.addEventListener('pointerup',()=>{
      clearTimeout(trackLongTimer);
      if(!trackLong)shortTrackAction();
    });
    btn.addEventListener('pointercancel',()=>clearTimeout(trackLongTimer));
  }

  function build(){
    if(el('epShell'))return;
    const shell=document.createElement('div');
    shell.id='epShell';
    shell.innerHTML=
      '<div class="ep-top-hud">'+
        '<button class="ep-coordinate" id="epPosReadout" type="button">'+
          '<span class="ep-label" id="epPosLabel">POS</span><strong id="epPosCoord">NO FIX</strong><small id="epPosMeta">GPS OFF</small>'+
        '</button>'+
        '<button class="ep-coordinate" id="epTgtReadout" type="button">'+
          '<span class="ep-label">TGT</span><strong id="epTgtCoord">--</strong><small>MAP CENTER</small>'+
        '</button>'+
      '</div>'+
      '<div class="ep-top-actions">'+
        '<button class="ep-icon-btn" id="epSearchBtn" type="button" aria-label="검색">⌕</button>'+
        '<button class="ep-icon-btn" id="epMoreBtn" type="button" aria-label="더보기">⋯</button>'+
      '</div>'+
      '<aside class="ep-global-tools">'+
        '<button class="ep-global-tool" id="epGpsBtn" type="button"><b>GPS</b><span id="epGpsState">OFF</span></button>'+
        '<button class="ep-global-tool" id="epFollowBtn" type="button"><b>◎</b><span>추적</span></button>'+
        '<button class="ep-global-tool" id="epTempBtn" type="button"><b>⌖</b><span>TEMP</span></button>'+
        '<button class="ep-global-tool" id="epTrackBtn" type="button"><b id="epTrackState">○</b><span>트랙</span></button>'+
      '</aside>'+
      '<nav class="ep-bottom-nav" aria-label="주요 기능">'+
        '<button id="epPointsBtn" type="button"><b>⌾</b><span>거점</span></button>'+
        '<button id="epRandomBtn" type="button"><b>✣</b><span>무작위</span></button>'+
        '<button id="epRecordsBtn" type="button"><b>≋</b><span>기록</span></button>'+
        '<button id="epToolsBtn" type="button"><b>⌁</b><span>도구</span></button>'+
      '</nav>'+
      '<div class="ep-shell-toast" id="epShellToast"></div>';
    document.body.appendChild(shell);

    el('epSearchBtn').addEventListener('click',openSearch);
    el('epMoreBtn').addEventListener('click',openTools);
    el('epGpsBtn').addEventListener('click',toggleGps);
    el('epFollowBtn').addEventListener('click',toggleFollow);
    el('epTempBtn').addEventListener('click',setTemp);
    el('epPointsBtn').addEventListener('click',openPoints);
    el('epRandomBtn').addEventListener('click',runRandom);
    el('epRecordsBtn').addEventListener('click',openRecords);
    el('epToolsBtn').addEventListener('click',openTools);
    el('epPosReadout').addEventListener('click',()=>copyText(el('epPosCoord').textContent));
    el('epTgtReadout').addEventListener('click',()=>copyText(el('epTgtCoord').textContent));
    installTrackButton();
  }

  function refresh(){
    if(!el('epShell'))return;

    const ref=reference();
    const coords=ref?.coords;
    const posLabel=ref?.type==='GPS'?'POS':'REF';
    el('epPosLabel').textContent=ref?posLabel:'POS';
    el('epPosCoord').textContent=coords?mgrsText(coords):'NO FIX';
    const type=ref?.type||'NONE';
    const age=Number(ref?.ageMs);
    el('epPosMeta').textContent=ref
      ? type+(Number.isFinite(age)&&age>0?' · '+Math.round(age/60000)+'M':'')
      : (safeBool('gps')?'GPS · NO FIX':'GPS OFF');

    const tgt=targetCoords();
    el('epTgtCoord').textContent=tgt?mgrsText(tgt):'--';

    const gpsOn=safeBool('gps');
    const fix=safeBool('fix');
    const follow=safeBool('follow');
    const temp=safeBool('temp');
    el('epGpsBtn').classList.toggle('active',gpsOn);
    el('epGpsState').textContent=gpsOn?(fix?'FIX':'ON'):'OFF';
    el('epFollowBtn').classList.toggle('active',follow);
    el('epTempBtn').classList.toggle('active',temp);

    const trackState=root.v28?.track?.state||'OFF';
    const trackBtn=el('epTrackBtn');
    trackBtn.classList.toggle('active',trackState!=='OFF');
    trackBtn.classList.toggle('recording',trackState==='RECORDING');
    el('epTrackState').textContent=trackState==='RECORDING'?'●':trackState==='PAUSED'?'◐':'○';

    const overlay=state()?.overlay||'NONE';
    for(const pair of [
      ['epPointsBtn','POINTS'],
      ['epRecordsBtn','RECORDS'],
      ['epToolsBtn','TOOLS']
    ]) el(pair[0]).classList.toggle('active',overlay===pair[1]);
  }

  function install(){
    if(installed)return;
    installed=true;
    build();
    document.body.classList.add('ep-shell-ready');
    root.EpOverlayBridge?.syncBody?.();
    root.EpSurfaceBridge?.syncFromLegacy?.('EP_SHELL_INSTALL');
    refresh();

    root.addEventListener?.('ep-state-change',refresh);
    root.addEventListener?.('ep-track-lifecycle',refresh);
    try{map?.on?.('moveend',refresh);}catch(e){}
    refreshTimer=setInterval(refresh,1000);
  }

  root.EpUiShell={
    version:'EP-V4-SHELL',
    install,refresh,notify,
    destroy(){
      clearInterval(refreshTimer);
      clearTimeout(toastTimer);
      clearTimeout(trackLongTimer);
      el('epShell')?.remove();
      document.body.classList.remove('ep-shell-ready');
      installed=false;
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})(typeof globalThis!=='undefined'?globalThis:this);
