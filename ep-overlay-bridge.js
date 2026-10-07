(function(root){
  'use strict';

  if(root.EpOverlayBridge?.version)return;
  const Overlay=root.EpOverlayCore;
  const Runtime=root.EpRuntimeBridge;
  if(!Overlay||!Runtime){
    console.warn('[EP] overlay bridge unavailable');
    return;
  }

  const state=Runtime.state;
  let muting=false;
  let v29SheetObserver=null;
  const raw={};

  function emit(reason){
    try{
      root.dispatchEvent(new CustomEvent('ep-state-change',{
        detail:{slice:'overlay',reason,state:Runtime.snapshot()}
      }));
    }catch(e){}
  }

  function remember(name){
    if(!raw[name]&&typeof root[name]==='function')raw[name]=root[name];
    return raw[name]||null;
  }

  function closeV29SheetRaw(){
    try{root.v29?.ui?.close?.();}catch(e){}
  }

  function closeAllLegacy(except){
    if(muting)return;
    muting=true;
    try{
      if(except!=='LOCATION')remember('closeSitrep')?.();
      if(except!=='SEARCH'){
        remember('closeAddressSearch')?.();
        remember('closePlanSearch')?.();
      }
      if(except!=='POINTS')remember('closeWpDrawer')?.();
      if(except!=='TOOLS'){
        remember('closeFieldControls')?.();
        remember('closeGpsDetail')?.();
        remember('closeNavMore')?.();
      }
      if(except!=='RECORDS')closeV29SheetRaw();
    }catch(e){}finally{muting=false;}
  }

  function setOverlay(kind,{source='',detail=null,closeOthers=true}={}){
    const next=String(kind||'NONE').toUpperCase();
    if(closeOthers&&next!=='NONE')closeAllLegacy(next);
    const changed=Overlay.set(state,next,{source,detail});
    if(changed)emit(source||'SET');
    syncBody();
    return state.overlay;
  }

  function closeOverlay(kind,{source='CLOSE'}={}){
    const changed=Overlay.close(state,kind,{source});
    if(changed)emit(source);
    syncBody();
    return state.overlay;
  }

  function syncBody(){
    try{
      document.body.dataset.epOverlay=state.overlay;
      for(const kind of Object.values(Overlay.OVERLAY)){
        const cls='ep-overlay-'+kind.toLowerCase();
        document.body.classList.toggle(cls,state.overlay===kind);
      }
    }catch(e){}
  }

  function wrapOpen(name,kind,detailFromArgs){
    const fn=remember(name);
    if(!fn||fn.__epOverlayOwner)return;
    const wrapped=function(){
      if(!muting)setOverlay(kind,{
        source:name,
        detail:typeof detailFromArgs==='function'?detailFromArgs(arguments):null
      });
      return fn.apply(this,arguments);
    };
    wrapped.__epOverlayOwner=true;
    wrapped.__epLegacy=fn;
    root[name]=wrapped;
  }

  function wrapClose(name,kind){
    const fn=remember(name);
    if(!fn||fn.__epOverlayOwner)return;
    const wrapped=function(){
      const out=fn.apply(this,arguments);
      if(!muting)closeOverlay(kind,{source:name});
      return out;
    };
    wrapped.__epOverlayOwner=true;
    wrapped.__epLegacy=fn;
    root[name]=wrapped;
  }

  function wrapWpToggle(){
    const fn=remember('toggleWpDrawer');
    if(!fn||fn.__epOverlayOwner)return;
    const wrapped=function(){
      const out=fn.apply(this,arguments);
      if(!muting){
        const drawer=document.getElementById('wpDrawer');
        const open=drawer?.classList.contains('open')||drawer?.getAttribute('aria-hidden')==='false';
        if(open)setOverlay('POINTS',{source:'toggleWpDrawer'});
        else closeOverlay('POINTS',{source:'toggleWpDrawer'});
      }
      return out;
    };
    wrapped.__epOverlayOwner=true;
    wrapped.__epLegacy=fn;
    root.toggleWpDrawer=wrapped;
  }

  function syncRecordsOverlayFromSheet(source='V29_SHEET'){
    const sheet=document.getElementById('v29Sheet');
    if(!sheet)return false;
    const open=sheet.classList.contains('open');
    if(open){
      if(state.overlay!=='RECORDS')setOverlay('RECORDS',{source,closeOthers:true});
    }else if(state.overlay==='RECORDS'){
      closeOverlay('RECORDS',{source});
    }
    return open;
  }

  function installV29SheetObserver(){
    const attach=()=>{
      const sheet=document.getElementById('v29Sheet');
      if(!sheet||sheet.__epOverlayObserved)return false;
      sheet.__epOverlayObserved=true;
      v29SheetObserver=new MutationObserver(()=>syncRecordsOverlayFromSheet('V29_SHEET_CLASS'));
      v29SheetObserver.observe(sheet,{attributes:true,attributeFilter:['class']});
      syncRecordsOverlayFromSheet('V29_SHEET_INSTALL');
      return true;
    };
    if(!attach())root.addEventListener?.('DOMContentLoaded',attach,{once:true});
  }

  function wrapV29Records(){
    const ui=root.v29?.ui;
    if(!ui||ui.__epOverlayOwner)return;
    const open=ui.open?.bind(ui),close=ui.close?.bind(ui);
    if(open){
      ui.open=function(tab){
        if(!muting)setOverlay('RECORDS',{source:'v29.ui.open',detail:{tab:String(tab||'')}});
        return open(tab);
      };
    }
    if(close){
      ui.close=function(){
        const out=close();
        if(!muting)closeOverlay('RECORDS',{source:'v29.ui.close'});
        return out;
      };
    }
    ui.__epOverlayOwner=true;
    if(typeof root.openV29FieldKit==='function'&&!root.openV29FieldKit.__epOverlayOwner){
      const previous=root.openV29FieldKit;
      const wrapped=function(tab){
        if(!muting)setOverlay('RECORDS',{source:'openV29FieldKit',detail:{tab:String(tab||'')}});
        return previous.apply(this,arguments);
      };
      wrapped.__epOverlayOwner=true;root.openV29FieldKit=wrapped;
    }
  }

  function install(){
    wrapOpen('openSitrep','LOCATION',args=>({status:args?.[1]||null}));
    wrapClose('closeSitrep','LOCATION');

    wrapOpen('openAddressSearch','SEARCH');
    wrapClose('closeAddressSearch','SEARCH');
    wrapOpen('openPlanSearch','SEARCH');
    wrapClose('closePlanSearch','SEARCH');

    wrapOpen('openWpDrawer','POINTS');
    wrapClose('closeWpDrawer','POINTS');
    wrapWpToggle();

    wrapOpen('openFieldControls','TOOLS',args=>({section:args?.[0]||'menu'}));
    wrapClose('closeFieldControls','TOOLS');
    wrapOpen('openGpsDetail','TOOLS',{});
    wrapClose('closeGpsDetail','TOOLS');
    wrapOpen('openNavMore','TOOLS');
    wrapClose('closeNavMore','TOOLS');

    wrapV29Records();
    installV29SheetObserver();
    root.addEventListener?.('DOMContentLoaded',()=>{
      wrapV29Records();
      installV29SheetObserver();
    },{once:true});
    syncBody();
  }

  root.EpOverlayBridge={
    version:'EP-V4-OVERLAY',
    get overlay(){return state.overlay;},
    setOverlay,closeOverlay,closeAllLegacy,syncBody,install
  };

  install();
})(typeof globalThis!=='undefined'?globalThis:this);
