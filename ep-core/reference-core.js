(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EpReferenceCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function validPoint(p){
    return !!p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon))&&
      Number(p.lat)>=-90&&Number(p.lat)<=90&&Number(p.lon)>=-180&&Number(p.lon)<=180;
  }

  function stamp(p){
    const value=Number(p?.timestamp??p?.at??p?.capturedAt??p?.createdAt??0);
    return Number.isFinite(value)&&value>0?value:0;
  }

  function normalized(p,kind){
    return {...p,lat:Number(p.lat),lon:Number(p.lon),referenceKind:kind,timestamp:stamp(p)};
  }

  function selectReference({gpsEnabled=false,gpsFix=null,temp=null,lastFix=null}={}){
    if(gpsEnabled&&validPoint(gpsFix))return normalized(gpsFix,'GPS');
    const fallback=[];
    if(validPoint(temp))fallback.push(normalized(temp,'TEMP'));
    if(validPoint(lastFix))fallback.push(normalized(lastFix,'LAST'));
    fallback.sort((a,b)=>b.timestamp-a.timestamp);
    return fallback[0]||null;
  }

  return {validPoint,selectReference};
});
