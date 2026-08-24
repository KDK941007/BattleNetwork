(()=>{
  const db=window.BattleNetworkDB;
  const SAVE_VERSION=1;
  const MASTER_VERSION=1;

  async function ensureMeta(key,value){
    const current=await db.get('save_meta',key);
    if(current)return current;
    const row={key,value};
    await db.put('save_meta',row);
    return row;
  }

  async function initialize(){
    await db.openDatabase();
    const now=new Date().toISOString();
    await ensureMeta('save_version',SAVE_VERSION);
    await ensureMeta('master_version',MASTER_VERSION);
    await ensureMeta('created_at',now);
    await db.put('save_meta',{key:'last_saved_at',value:now});
    return true;
  }

  async function touchLastSavedAt(){
    await db.put('save_meta',{key:'last_saved_at',value:new Date().toISOString()});
  }

  async function getOwnedChips(){
    return db.getAll('owned_chips');
  }

  async function setOwnedChipQuantity(chipId,codeId,quantity){
    const qty=Math.max(0,Math.trunc(Number(quantity)||0));
    if(qty===0){
      await db.remove('owned_chips',[chipId,codeId]);
    }else{
      await db.put('owned_chips',{chip_id:chipId,code_id:codeId,quantity:qty});
    }
    await touchLastSavedAt();
    return qty;
  }

  async function addOwnedChip(chipId,codeId,amount=1){
    const current=await db.get('owned_chips',[chipId,codeId]);
    const next=(current?.quantity||0)+Math.trunc(Number(amount)||0);
    return setOwnedChipQuantity(chipId,codeId,next);
  }

  async function getFolders(){
    return db.getAll('folders');
  }

  async function getFolder(folderId){
    return db.get('folders',folderId);
  }

  async function saveFolder(folder){
    const now=new Date().toISOString();
    const current=await getFolder(folder.folder_id);
    const row={
      folder_id:folder.folder_id,
      folder_name:folder.folder_name||current?.folder_name||'フォルダ',
      is_active:Boolean(folder.is_active??current?.is_active??false),
      regular_slot_no:folder.regular_slot_no??current?.regular_slot_no??null,
      created_at:current?.created_at||folder.created_at||now,
      updated_at:now
    };
    await db.put('folders',row);
    await touchLastSavedAt();
    return row;
  }

  async function getFolderChips(folderId){
    const rows=await db.getAllByIndex('folder_chips','by_folder_id',folderId);
    return rows.sort((a,b)=>a.slot_no-b.slot_no);
  }

  async function saveFolderChip(folderId,slotNo,chipId,codeId){
    const row={folder_id:folderId,slot_no:Number(slotNo),chip_id:chipId,code_id:codeId};
    await db.put('folder_chips',row);
    await touchLastSavedAt();
    return row;
  }

  async function removeFolderChip(folderId,slotNo){
    await db.remove('folder_chips',[folderId,Number(slotNo)]);
    await touchLastSavedAt();
  }

  async function getPlayerProgress(playerId='PLAYER_1'){
    return db.get('player_progress',playerId);
  }

  async function savePlayerProgress(progress){
    const row={...progress,player_id:progress.player_id||'PLAYER_1',updated_at:new Date().toISOString()};
    await db.put('player_progress',row);
    await touchLastSavedAt();
    return row;
  }

  window.BattleNetworkSaveData={
    SAVE_VERSION,
    MASTER_VERSION,
    initialize,
    getOwnedChips,
    setOwnedChipQuantity,
    addOwnedChip,
    getFolders,
    getFolder,
    saveFolder,
    getFolderChips,
    saveFolderChip,
    removeFolderChip,
    getPlayerProgress,
    savePlayerProgress
  };

  initialize().catch(error=>{
    console.warn('[BattleNetworkDB] IndexedDB initialization failed. The game will continue without persistent save data.',error);
  });
})();
