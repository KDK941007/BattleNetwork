(()=>{
  const DB_NAME='BattleNetworkDB';
  const DB_VERSION=1;
  let openPromise=null;

  function ensureStore(db,name,options,indexes=[]){
    if(db.objectStoreNames.contains(name))return;
    const store=db.createObjectStore(name,options);
    indexes.forEach(index=>store.createIndex(index.name,index.keyPath,index.options||{}));
  }

  function openDatabase(){
    if(openPromise)return openPromise;

    openPromise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){
        openPromise=null;
        reject(new Error('IndexedDB is not supported in this browser.'));
        return;
      }

      const request=indexedDB.open(DB_NAME,DB_VERSION);

      request.onupgradeneeded=()=>{
        const db=request.result;
        ensureStore(db,'save_meta',{keyPath:'key'});
        ensureStore(db,'player_progress',{keyPath:'player_id'});
        ensureStore(db,'owned_chips',{keyPath:['chip_id','code_id']},[
          {name:'by_chip_id',keyPath:'chip_id'}
        ]);
        ensureStore(db,'folders',{keyPath:'folder_id'},[
          {name:'by_active',keyPath:'is_active'}
        ]);
        ensureStore(db,'folder_chips',{keyPath:['folder_id','slot_no']},[
          {name:'by_folder_id',keyPath:'folder_id'},
          {name:'by_chip_code',keyPath:['chip_id','code_id']}
        ]);
      };

      request.onsuccess=()=>{
        const db=request.result;
        db.onversionchange=()=>{
          db.close();
          openPromise=null;
        };
        resolve(db);
      };

      request.onerror=()=>{
        openPromise=null;
        reject(request.error||new Error('Failed to open IndexedDB.'));
      };

      request.onblocked=()=>{
        console.warn('[BattleNetworkDB] Database upgrade is blocked by another open tab.');
      };
    });

    return openPromise;
  }

  async function runRequest(storeName,mode,requestFactory){
    const db=await openDatabase();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,mode);
      const store=tx.objectStore(storeName);
      let request;
      let result;

      try{
        request=requestFactory(store);
      }catch(error){
        reject(error);
        return;
      }

      if(request){
        request.onsuccess=()=>{result=request.result};
        request.onerror=()=>reject(request.error||new Error(`IndexedDB request failed: ${storeName}`));
      }

      tx.oncomplete=()=>resolve(result);
      tx.onerror=()=>reject(tx.error||new Error(`IndexedDB transaction failed: ${storeName}`));
      tx.onabort=()=>reject(tx.error||new Error(`IndexedDB transaction aborted: ${storeName}`));
    });
  }

  const get=(storeName,key)=>runRequest(storeName,'readonly',store=>store.get(key));
  const getAll=(storeName)=>runRequest(storeName,'readonly',store=>store.getAll());
  const put=(storeName,value)=>runRequest(storeName,'readwrite',store=>store.put(value));
  const remove=(storeName,key)=>runRequest(storeName,'readwrite',store=>store.delete(key));
  const getAllByIndex=(storeName,indexName,key)=>runRequest(storeName,'readonly',store=>store.index(indexName).getAll(key));

  window.BattleNetworkDB={
    DB_NAME,
    DB_VERSION,
    openDatabase,
    get,
    getAll,
    put,
    remove,
    getAllByIndex
  };
})();
