/* Tactical Recon V29 storage safety layer
 * Keeps the existing synchronous TrackV2 contract for compatibility while
 * mirroring tracks into IndexedDB and surfacing storage failures.
 */
(() => {
  'use strict';

  const root=window;
  const base=root.v28;
  if(!base?.storage)return;

  const DB_NAME='tactical_recon_v29';
  const DB_VERSION=1;
  const TRACK_STORE='tracks';
  let dbPromise=null;
  let storageErrorAt=0;

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
    if(!track?.id)return false;
    const db=await openDb();
    if(!db)return false;
    return new Promise(resolve=>{
      try{
        const tx=db.transaction(TRACK_STORE,'readwrite');
        tx.objectStore(TRACK_STORE).put(structuredClone?structuredClone(track):JSON.parse(JSON.stringify(track)));
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

  const originalSaveTrack=base.storage.saveV28Track.bind(base.storage);
  base.storage.saveV28Track=function(track){
    // Mirror first so a quota failure in localStorage does not make the newest
    // TrackV2 object disappear completely.
    mirrorTrack(track).catch(()=>{});
    let ok=false;
    try{ok=Boolean(originalSaveTrack(track));}
    catch(e){emitStorageError('TRACK',e);return false;}
    if(!ok)emitStorageError('TRACK','LOCAL STORAGE WRITE FAILED');
    return ok;
  };

  const originalSavePlan=base.storage.saveV28Plan.bind(base.storage);
  base.storage.saveV28Plan=function(plan){
    let ok=false;
    try{ok=Boolean(originalSavePlan(plan));}
    catch(e){emitStorageError('PLAN',e);return false;}
    if(!ok)emitStorageError('PLAN','LOCAL STORAGE WRITE FAILED');
    return ok;
  };

  async function mirrorExisting(){
    try{
      const tracks=base.storage.getV28Tracks();
      await Promise.all(Object.values(tracks||{}).map(mirrorTrack));
    }catch(e){}
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

  root.v29Storage={
    mirrorTrack,
    getAllTracks:getAllMirroredTracks,
    getTrack:getMirroredTrack,
    estimate,
    dbName:DB_NAME
  };

  mirrorExisting();
})();