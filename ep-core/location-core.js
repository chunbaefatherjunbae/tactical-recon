(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EpLocationCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const BAND='C-HJ-NP-X';
  const GRID='A-HJ-NP-Z';
  const FULL_RE=new RegExp('^(\\d{1,2}['+BAND+'])(['+GRID+']{2})(\\d{2,10})$');
  const GRID_ONLY_RE=new RegExp('^(['+GRID+']{2})(\\d{2,10})$');

  function compact(value){
    return String(value||'').trim().toUpperCase().replace(/[\s-]+/g,'');
  }

  function validLatLon(lat,lon){
    return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180;
  }

  function validPoint(point){
    return !!point&&validLatLon(Number(point.lat),Number(point.lon));
  }

  function parseWgs84(value){
    const raw=String(value||'').trim();
    const m=raw.match(/^\s*([+-]?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*([+-]?\d{1,3}(?:\.\d+)?)\s*$/);
    if(!m)return null;
    const lat=Number(m[1]),lon=Number(m[2]);
    if(!validLatLon(lat,lon)){
      const error=new Error('INVALID_WGS84');error.code='INVALID_WGS84';throw error;
    }
    return {lat,lon,source:'WGS84'};
  }

  function precisionDigits(value){
    return /^\d{2,10}$/.test(value)&&value.length%2===0;
  }

  function parsePrefix(value){
    const c=compact(value);
    const m=c.match(new RegExp('^(\\d{1,2}['+BAND+'])(['+GRID+']{2})$'));
    if(!m)return null;
    const zone=Number(m[1].match(/^\d{1,2}/)?.[0]);
    if(!(zone>=1&&zone<=60))return null;
    return {zoneBand:m[1],grid:m[2],compactPrefix:m[1]+m[2],prefix:m[1]+' '+m[2]};
  }

  function parseFullParts(value){
    const c=compact(value);
    const m=c.match(FULL_RE);
    if(!m)return null;
    const zone=Number(m[1].match(/^\d{1,2}/)?.[0]);
    if(!(zone>=1&&zone<=60)||!precisionDigits(m[3]))return null;
    return {
      compact:c,zoneBand:m[1],grid:m[2],digits:m[3],precision:m[3].length/2,
      compactPrefix:m[1]+m[2],prefix:m[1]+' '+m[2]
    };
  }

  function decodeFull(value,mgrsLib){
    const parts=parseFullParts(value);
    if(!parts)return null;
    if(!mgrsLib||typeof mgrsLib.toPoint!=='function'){
      const error=new Error('MGRS_UNAVAILABLE');error.code='MGRS_UNAVAILABLE';throw error;
    }
    let point;
    try{point=mgrsLib.toPoint(parts.compact);}catch(e){
      const error=new Error('INVALID_MGRS');error.code='INVALID_MGRS';throw error;
    }
    const lon=Number(point?.[0]),lat=Number(point?.[1]);
    if(!validLatLon(lat,lon)){
      const error=new Error('INVALID_MGRS');error.code='INVALID_MGRS';throw error;
    }
    if(typeof mgrsLib.forward==='function'){
      try{
        const rt=compact(mgrsLib.forward([lon,lat],parts.precision));
        const rtParts=parseFullParts(rt);
        if(!rtParts||rtParts.compactPrefix!==parts.compactPrefix){
          const error=new Error('MGRS_ROUNDTRIP_MISMATCH');error.code='MGRS_ROUNDTRIP_MISMATCH';throw error;
        }
      }catch(e){
        if(e?.code)throw e;
        const error=new Error('MGRS_ROUNDTRIP_FAILED');error.code='MGRS_ROUNDTRIP_FAILED';throw error;
      }
    }
    return {...parts,lat,lon,source:'MGRS'};
  }

  function shortParts(value){
    const c=compact(value);
    if(precisionDigits(c))return {kind:'DIGITS',digits:c};
    const m=c.match(GRID_ONLY_RE);
    if(m&&precisionDigits(m[2]))return {kind:'GRID_DIGITS',grid:m[1],digits:m[2]};
    return null;
  }

  function expandShort(value,prefixValue){
    const short=shortParts(value);
    if(!short)return null;
    const prefix=parsePrefix(typeof prefixValue==='string'?prefixValue:prefixValue?.compactPrefix||prefixValue?.prefix);
    if(!prefix){
      const error=new Error('GRID_PREFIX_REQUIRED');error.code='GRID_PREFIX_REQUIRED';throw error;
    }
    const grid=short.kind==='GRID_DIGITS'?short.grid:prefix.grid;
    return {
      ...short,zoneBand:prefix.zoneBand,grid,
      compactPrefix:prefix.zoneBand+grid,
      prefix:prefix.zoneBand+' '+grid,
      mgrs:prefix.zoneBand+grid+short.digits
    };
  }

  function decodeShort(value,prefixValue,mgrsLib){
    const expanded=expandShort(value,prefixValue);
    if(!expanded)return null;
    const decoded=decodeFull(expanded.mgrs,mgrsLib);
    return {...decoded,workingGridApplied:true,shortKind:expanded.kind};
  }

  function haversineKm(a,b){
    const p1=Array.isArray(a)?{lat:Number(a[0]),lon:Number(a[1])}:a;
    const p2=Array.isArray(b)?{lat:Number(b[0]),lon:Number(b[1])}:b;
    if(!validPoint(p1)||!validPoint(p2))return Infinity;
    const R=6371,d2r=Math.PI/180;
    const dLat=(p2.lat-p1.lat)*d2r,dLon=(p2.lon-p1.lon)*d2r;
    const x=Math.sin(dLat/2)**2+Math.cos(p1.lat*d2r)*Math.cos(p2.lat*d2r)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  }

  function validateGridContext(decoded,context,maxKm=165){
    if(!decoded||!context)return true;
    const distance=haversineKm(decoded,context);
    if(!Number.isFinite(distance)||distance>maxKm){
      const error=new Error('GRID_CONTEXT_MISMATCH');error.code='GRID_CONTEXT_MISMATCH';throw error;
    }
    return true;
  }

  function looksLikeCoordinate(value){
    const raw=String(value||'').trim(),c=compact(raw);
    if(!raw)return false;
    if(/^[-+]?\d+(?:\.\d+)?\s*[,\s]\s*[-+]?\d+(?:\.\d+)?$/.test(raw))return true;
    if(/^\d{2,12}$/.test(c))return true;
    if(new RegExp('^\\d{1,2}['+BAND+']').test(c))return true;
    if(new RegExp('^['+GRID+']{2}\\d').test(c))return true;
    return false;
  }

  function validateCoordinateLike(value){
    const raw=String(value||'').trim();
    if(!looksLikeCoordinate(raw))return;
    if(parseWgs84(raw)||parseFullParts(raw)||shortParts(raw))return;
    const error=new Error('INVALID_COORDINATE_FORMAT');error.code='INVALID_COORDINATE_FORMAT';throw error;
  }

  return {
    compact,validLatLon,validPoint,parseWgs84,parsePrefix,parseFullParts,decodeFull,
    shortParts,expandShort,decodeShort,haversineKm,validateGridContext,
    looksLikeCoordinate,validateCoordinateLike
  };
});
