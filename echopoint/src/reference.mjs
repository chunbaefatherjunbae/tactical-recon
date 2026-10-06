import {validPoint} from './coordinates.mjs';

function timestampOf(value){
  const n=Number(value?.timestamp??value?.at??value?.createdAt??0);
  return Number.isFinite(n)&&n>0?n:0;
}

export function selectReference({gps,temp,lastFix}={}){
  if(gps?.enabled&&validPoint(gps.fix)){
    return {...gps.fix,referenceKind:'GPS',timestamp:timestampOf(gps.fix)};
  }
  const candidates=[];
  if(validPoint(temp))candidates.push({...temp,referenceKind:'TEMP',timestamp:timestampOf(temp)});
  if(validPoint(lastFix))candidates.push({...lastFix,referenceKind:'LAST',timestamp:timestampOf(lastFix)});
  candidates.sort((a,b)=>b.timestamp-a.timestamp);
  return candidates[0]||null;
}

export function referenceLabel(ref){
  if(!ref)return {label:'POS',detail:'NO FIX'};
  if(ref.referenceKind==='GPS')return {label:'POS',detail:'GPS FIX'};
  const time=ref.timestamp?new Date(ref.timestamp).toTimeString().slice(0,5):'--:--';
  return {label:'REF',detail:`${ref.referenceKind} · ${time}`};
}
