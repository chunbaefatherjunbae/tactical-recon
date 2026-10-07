(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EpLegacyAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function validLatLon(lat,lon){
    return Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&
      Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180;
  }

  function fromCoords(coords,extra){
    if(!Array.isArray(coords)||!validLatLon(coords[0],coords[1]))return null;
    return {lat:Number(coords[0]),lon:Number(coords[1]),...(extra||{})};
  }

  function selectedFromLegacy(value,extra){
    if(!value)return null;
    const base=Array.isArray(value.coords)
      ? fromCoords(value.coords)
      : validLatLon(value.lat,value.lon)
        ? {lat:Number(value.lat),lon:Number(value.lon)}
        : null;
    if(!base)return null;
    return {
      ...base,
      id:value.id!==undefined?String(value.id):undefined,
      name:String(value.name||value.address||'선택 위치'),
      address:value.address?String(value.address):'',
      desc:String(value.desc||''),
      tips:String(value.tips||''),
      source:String(value.source||extra?.source||'LEGACY'),
      status:value.status?String(value.status):extra?.status,
      selectedAt:Number(extra?.selectedAt||Date.now())
    };
  }

  function lastFixFromStorage(raw,now=Date.now()){
    if(!raw)return null;
    const coords=Array.isArray(raw.coords)?raw.coords:[raw.lat,raw.lon];
    const p=fromCoords(coords);
    if(!p)return null;
    const timestamp=Number(raw.timestamp||raw.capturedAt||0);
    return {
      ...p,
      timestamp:Number.isFinite(timestamp)&&timestamp>0?timestamp:0,
      accuracyM:Number.isFinite(Number(raw.accuracyM))?Number(raw.accuracyM):undefined,
      ageMs:Number.isFinite(timestamp)&&timestamp>0?Math.max(0,Number(now)-timestamp):undefined
    };
  }

  function toLegacyReference(ref,now=Date.now()){
    if(!ref||!validLatLon(ref.lat,ref.lon))return null;
    const kind=String(ref.referenceKind||ref.type||'').toUpperCase();
    const type=kind==='LAST'?'LAST_FIX':kind;
    const timestamp=Number(ref.timestamp||ref.capturedAt||0);
    return {
      type,
      coords:[Number(ref.lat),Number(ref.lon)],
      capturedAt:Number.isFinite(timestamp)&&timestamp>0?timestamp:undefined,
      ageMs:type==='LAST_FIX'&&Number.isFinite(timestamp)&&timestamp>0?Math.max(0,Number(now)-timestamp):undefined,
      accuracyM:Number.isFinite(Number(ref.accuracyM))?Number(ref.accuracyM):undefined
    };
  }

  return {validLatLon,fromCoords,selectedFromLegacy,lastFixFromStorage,toLegacyReference};
});
