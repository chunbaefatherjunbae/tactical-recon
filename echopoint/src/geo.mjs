import {validPoint} from './coordinates.mjs';

const EARTH_KM=6371.0088;
const DEG=Math.PI/180;
const RAD=180/Math.PI;

export function normalize360(deg){
  const value=Number(deg);
  if(!Number.isFinite(value))return NaN;
  return ((value%360)+360)%360;
}

export function haversineKm(a,b){
  if(!validPoint(a)||!validPoint(b))return NaN;
  const lat1=Number(a.lat)*DEG;
  const lat2=Number(b.lat)*DEG;
  const dLat=(Number(b.lat)-Number(a.lat))*DEG;
  const dLon=(Number(b.lon)-Number(a.lon))*DEG;
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return EARTH_KM*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}

export function initialBearing(a,b){
  if(!validPoint(a)||!validPoint(b))return NaN;
  const p1=Number(a.lat)*DEG;
  const p2=Number(b.lat)*DEG;
  const dl=(Number(b.lon)-Number(a.lon))*DEG;
  const y=Math.sin(dl)*Math.cos(p2);
  const x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
  return normalize360(Math.atan2(y,x)*RAD);
}

export function pointSegmentDistanceMeters(point,a,b){
  if(!validPoint(point)||!validPoint(a)||!validPoint(b))return Infinity;
  const lat0=Number(point.lat)*DEG;
  const cos=Math.max(0.01,Math.cos(lat0));
  const toXY=c=>[
    (Number(c.lon)-Number(point.lon))*111320*cos,
    (Number(c.lat)-Number(point.lat))*110540
  ];
  const A=toXY(a),B=toXY(b);
  const vx=B[0]-A[0],vy=B[1]-A[1],denom=vx*vx+vy*vy;
  if(!denom)return Math.hypot(A[0],A[1]);
  const t=Math.max(0,Math.min(1,-(A[0]*vx+A[1]*vy)/denom));
  return Math.hypot(A[0]+t*vx,A[1]+t*vy);
}
