/* Tactical Recon V29 storage safety layer
 * Existing PlanV1/TrackV2 schemas remain unchanged.
 * TrackV2 uses an in-memory cache + IndexedDB safety mirror and batches
 * localStorage checkpoints to avoid rewriting the full track store per GPS point.
 */
(() => {
  'use strict';

  const root=window;
  const base=root.v28;
  if(!base?.storage||!base?.schemas)return;

  const DB_NAME='tactical_recon_v29';
  const DB_VERSION=1;
  const TRACK_STORE='tracks';
  const TRACK_KEY='tactical_recon_track_logs_v2';
  const FLUSH_DELAY_MS=2500;
  const MAX_DIRTY_BEFORE_FLUSH=12;

  let dbPromise=null;
  let storageErrorAt=0;
  let flushTimer=0;
  let dirtyCount=0;
  let trackCache={};

  const originalGetTracks=base.storage.getV28Tracks.bind(base.storage);
  const originalSaveTrack=base.storage.saveV28Track.bind(base.storage);
  try{trackCache=originalGetTracks()||{};}catch(e){trackCache={};}

  function cloneTrack(track){
    if(!track)return null;
    try{return typeof structuredClone==='function'?structuredClone(track):JSON.parse(JSON.stringify(track));}
    catch(e){try{return JSON.parse(JSON.stringify(track));}catch(_){return null;}}
  }

  function openDb(){
    if(!('indexedDB' in root))return Promise.resolve(null);
    if(dbPromise)return dbPromise;
    dbPromise=new Promise(resolve=>{
      try{
        const req=indexedDB.open(DB_NAME,DB_VERSION);
        req.onupgradeneeded=()=>{
          const db=req.result;
          if(!db.objectStoreNames.contains(TRACK_STORE))db.createObjectStore(TRACK_STORE,{keyPath:'id'});
        };
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>resolve(null);
        req.onblocked=()=>resolve(null);
      }catch(e){resolve(null);}
    });
    return dbPromise;
  }

  async function mirrorTrack(track){
    const safe=cloneTrack(track);
    if(!safe?.id)return false;
    const db=await openDb();
    if(!db)return false;
    return new Promise(resolve=>{
      try{
        const tx=db.transaction(TRACK_STORE,'readwrite');
        tx.objectStore(TRACK_STORE).put(safe);
        tx.oncomplete=()=>resolve(true);
        tx.onerror=()=>resolve(false);
        tx.onabort=()=>resolve(false);
      }catch(e){resolve(false);}
    });
  }

  async function deleteMirroredTrack(id){
    const db=await openDb();
    if(!db||!id)return false;
    return new Promise(resolve=>{
      try{
        const tx=db.transaction(TRACK_STORE,'readwrite');
        tx.objectStore(TRACK_STORE).delete(String(id));
        tx.oncomplete=()=>resolve(true);
        tx.onerror=()=>resolve(false);
        tx.onabort=()=>resolve(false);
      }catch(e){resolve(false);}
    });
  }

  async function getAllMirroredTracks(){
    const db=await openDb();
    if(!db)return [];
    return new Promise(resolve=>{
      try{
        const tx=db.transaction(TRACK_STORE,'readonly');
        const req=tx.objectStore(TRACK_STORE).getAll();
        req.onsuccess=()=>resolve(Array.isArray(req.result)?req.result:[]);
        req.onerror=()=>resolve([]);
      }catch(e){resolve([]);}
    });
  }

  async function getMirroredTrack(id){
    const db=await openDb();
    if(!db||!id)return null;
    return new Promise(resolve=>{
      try{
        const tx=db.transaction(TRACK_STORE,'readonly');
        const req=tx.objectStore(TRACK_STORE).get(String(id));
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>resolve(null);
      }catch(e){resolve(null);}
    });
  }

  function emitStorageError(kind,error){
    const now=Date.now();
    if(now-storageErrorAt<1500)return;
    storageErrorAt=now;
    root.dispatchEvent(new CustomEvent('recon-storage-error',{detail:{kind,error:String(error?.message||error||'SAVE FAILED')}}));
  }

  function flushLocalTracks(reason='BATCH'){
    clearTimeout(flushTimer);flushTimer=0;
    if(!dirtyCount&&reason!=='FORCE')return true;
    try{
      localStorage.setItem(TRACK_KEY,JSON.stringify(trackCache));
      dirtyCount=0;
      root.dispatchEvent(new CustomEvent('recon-track-checkpoint',{detail:{reason,at:Date.now()}}));
      return true;
    }catch(e){
      emitStorageError('TRACK',e);
      return false;
    }
  }

  function scheduleFlush(){
    clearTimeout(flushTimer);
    if(dirtyCount>=MAX_DIRTY_BEFORE_FLUSH){flushLocalTracks('COUNT');return;}
    flushTimer=setTimeout(()=>flushLocalTracks('TIMER'),FLUSH_DELAY_MS);
  }

  base.storage.getV28Tracks=function(){
    return {...trackCache};
  };

  base.storage.saveV28Track=function(track){
    const sanitized=base.schemas.sanitizeTrackV2(track);
    if(!sanitized||!base.schemas.validateTrackV2(sanitized))return false;

    const isNew=!trackCache[sanitized.id];
    trackCache[sanitized.id]=sanitized;
    dirtyCount++;
    mirrorTrack(sanitized).catch(()=>{});

    // A new track must exist synchronously for crash recovery. Finalized tracks
    // are also checkpointed immediately. GPS samples between those boundaries
    // are batched.
    if(isNew||sanitized.endedAt){
      if(!flushLocalTracks(isNew?'NEW':'FINAL'))return false;
    }else{
      scheduleFlush();
    }
    return true;
  };

  function deleteTrack(id){
    id=String(id||'');
    if(!id)return false;
    delete trackCache[id];
    dirtyCount++;
    deleteMirroredTrack(id).catch(()=>{});
    return flushLocalTracks('DELETE');
  }

  async function mergeMirrorIntoCache(){
    const mirrored=await getAllMirroredTracks();
    if(!mirrored.length)return;
    let changed=false;
    mirrored.forEach(track=>{
      const sanitized=base.schemas.sanitizeTrackV2(track);
      if(!sanitized||!base.schemas.validateTrackV2(sanitized))return;
      const local=trackCache[sanitized.id];
      const localStamp=Math.max(Number(local?.endedAt)||0,Number(local?.startedAt)||0);
      const mirrorStamp=Math.max(Number(sanitized.endedAt)||0,Number(sanitized.startedAt)||0);
      const localPoints=Array.isArray(local?.segments)?JSON.stringify(local.segments).length:0;
      const mirrorPoints=Array.isArray(sanitized.segments)?JSON.stringify(sanitized.segments).length:0;
      if(!local||mirrorStamp>localStamp||mirrorPoints>localPoints){
        trackCache[sanitized.id]=sanitized;
        changed=true;
      }
    });
    if(changed){
      dirtyCount++;
      flushLocalTracks('MIRROR_RECOVERY');
      root.dispatchEvent(new CustomEvent('recon-track-mirror-restored'));
    }
  }

  async function mirrorExisting(){
    try{await Promise.all(Object.values(trackCache).map(mirrorTrack));}catch(e){}
    await mergeMirrorIntoCache();
  }

  async function estimate(){
    try{
      if(navigator.storage?.estimate){
        const e=await navigator.storage.estimate();
        return {usage:Number(e.usage)||0,quota:Number(e.quota)||0};
      }
    }catch(e){}
    return {usage:0,quota:0};
  }

  root.addEventListener('pagehide',()=>flushLocalTracks('FORCE'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flushLocalTracks('FORCE');});

  root.v29Storage={
    mirrorTrack,
    getAllTracks:getAllMirroredTracks,
    getTrack:getMirroredTrack,
    deleteTrack,
    flush:()=>flushLocalTracks('FORCE'),
    estimate,
    dbName:DB_NAME
  };

  mirrorExisting();
})();