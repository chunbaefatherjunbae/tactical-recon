const DB_NAME='echopoint_db';
const DB_VERSION=1;
const STORES=['settings','plans','tracks','missions','locations','recovery'];

export function openDatabase(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      for(const name of STORES){
        if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});
      }
    };
    req.onsuccess=()=>resolve(new EchoDatabase(req.result));
    req.onerror=()=>reject(req.error);
  });
}

class EchoDatabase{
  constructor(db){this.db=db;}
  request(storeName,mode,fn){
    return new Promise((resolve,reject)=>{
      const tx=this.db.transaction(storeName,mode);
      const store=tx.objectStore(storeName);
      let req;
      try{req=fn(store);}catch(error){reject(error);return;}
      if(req){
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error);
      }else{
        tx.oncomplete=()=>resolve(undefined);
      }
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error||new Error('DB_ABORT'));
    });
  }
  get(store,id){return this.request(store,'readonly',s=>s.get(id));}
  getAll(store){return this.request(store,'readonly',s=>s.getAll());}
  put(store,value){return this.request(store,'readwrite',s=>s.put(value));}
  delete(store,id){return this.request(store,'readwrite',s=>s.delete(id));}
}
