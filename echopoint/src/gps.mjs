export class GpsService{
  constructor({onFix,onError,onGap}={}){
    this.watchId=null;
    this.onFix=onFix||(()=>{});
    this.onError=onError||(()=>{});
    this.onGap=onGap||(()=>{});
  }
  start(){
    if(this.watchId!==null)return true;
    if(typeof navigator==='undefined'||!navigator.geolocation)return false;
    this.watchId=navigator.geolocation.watchPosition(
      pos=>this.onFix({
        lat:Number(pos.coords.latitude),
        lon:Number(pos.coords.longitude),
        accuracyM:Number(pos.coords.accuracy),
        altitudeM:Number.isFinite(Number(pos.coords.altitude))?Number(pos.coords.altitude):undefined,
        timestamp:Number(pos.timestamp||Date.now()),
        source:'GPS',
        name:'현재위치'
      }),
      error=>{this.onGap();this.onError(error);},
      {enableHighAccuracy:true,maximumAge:5000,timeout:12000}
    );
    return true;
  }
  stop(){
    if(this.watchId!==null&&typeof navigator!=='undefined'&&navigator.geolocation){
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId=null;
  }
}
