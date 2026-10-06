import {parseCoordinate,formatMgrs,validPoint} from './coordinates.mjs';

function uniqueAddressParts(parts){
  const seen=new Set();
  return parts.filter(value=>{
    const clean=String(value||'').trim();
    if(!clean||clean==='대한민국'||/^\d{5}$/.test(clean)||seen.has(clean))return false;
    seen.add(clean);return true;
  }).map(value=>String(value).trim());
}

export function normalizeKoreanAddress(data,fallback=''){
  const a=data?.address||{};
  const province=a.state||a.province||a.region;
  const city=a.city||a.municipality;
  const district=a.city_district||a.borough||a.county;
  const locality=a.town||a.village||a.suburb||a.quarter||a.neighbourhood;
  const road=a.road||a.pedestrian||a.residential||a.path;
  const house=a.house_number;
  const building=a.building||a.amenity||a.shop||a.tourism;
  let parts=uniqueAddressParts([province,city,district]);
  if(road)parts=uniqueAddressParts([...parts,road,house]);
  else parts=uniqueAddressParts([...parts,locality,building]);
  if(parts.length>=2)return parts.join(' ');
  const display=String(data?.display_name||'').split(',').map(v=>v.trim()).filter(v=>v&&v!=='대한민국'&&!/^\d{5}$/.test(v));
  return display.length?display.reverse().join(' '):fallback;
}

export async function searchLocations(query,{mgrsLib,workingGrid,savedLocations=[]}={}){
  const q=String(query||'').trim();
  if(!q)return [];
  try{
    const direct=parseCoordinate(q,{mgrsLib,workingGrid});
    if(direct){
      return [{
        id:'search_'+Date.now().toString(36),
        name:direct.source==='MGRS'?'MGRS POSITION':'WGS84 POSITION',
        lat:direct.lat,lon:direct.lon,source:direct.source,address:''
      }];
    }
  }catch(error){
    if(error?.code)throw error;
  }

  const local=savedLocations.filter(item=>{
    const hay=(String(item.name||'')+' '+String(item.address||'')).toLowerCase();
    return hay.includes(q.toLowerCase())&&validPoint(item);
  }).slice(0,6).map(item=>({...item,source:item.source||'SAVED'}));

  if(typeof navigator!=='undefined'&&!navigator.onLine)return local;
  if(typeof fetch!=='function')return local;

  const url='https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=6&addressdetails=1&accept-language=ko&q='+encodeURIComponent(q);
  const res=await fetch(url,{headers:{Accept:'application/json'}});
  if(!res.ok)throw new Error('ADDRESS_SEARCH_FAILED');
  const data=await res.json();
  const remote=Array.isArray(data)?data.map(row=>{
    const lat=Number(row.lat),lon=Number(row.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    const address=normalizeKoreanAddress(row,row.display_name||q);
    return {
      id:'addr_'+String(row.place_id||Math.random().toString(36).slice(2)),
      name:String(row.name||address||q),
      lat,lon,address:String(address||row.display_name||q),
      source:'ADDRESS'
    };
  }).filter(Boolean):[];
  return [...local,...remote].slice(0,8);
}

export function resultSubtitle(result,mgrsLib){
  const mgrs=formatMgrs(result,mgrsLib,5);
  return result.address?result.address+' · '+mgrs:mgrs;
}
