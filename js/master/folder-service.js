(()=>{
  const data=window.BattleNetworkData||{};
  const STORAGE_KEY='battleNetworkEquippedFolderId';
  const TEST_ONLY_VULCAN1=true;
  const VULCAN1_CODES=Object.freeze(['E','S','V','*']);
  const LEGACY_TYPE_BY_CHIP_ID=Object.freeze({
    CHIP_0001:'CANNON',
    CHIP_0002:'SWORD',
    CHIP_0003:'WIDE',
    CHIP_0004:'BOMB',
    CHIP_0005:'RECOVER',
    CHIP_EXE4_S004:'AIRSHOT',
    CHIP_EXE4_S005:'VULCAN1',
    CHIP_EXE4_S106:'CRACKOUT',
    CHIP_EXE4_S119:'AREASTEAL',
    CHIP_EXE4_S148:'ATTACK10'
  });

  const folderById=new Map((data.FOLDER_MASTER||[]).map(row=>[row.folderId,row]));
  const defaultFolder=(data.FOLDER_MASTER||[]).find(row=>row.defaultFlg)||data.FOLDER_MASTER?.[0]||null;

  function getStoredFolderId(){try{return localStorage.getItem(STORAGE_KEY)}catch{return null}}
  function getEquippedFolderId(){const stored=getStoredFolderId();if(stored&&folderById.has(stored))return stored;return defaultFolder?.folderId||null}
  function getFolder(folderId=getEquippedFolderId()){return folderById.get(folderId)||null}
  function getFolderEntries(folderId=getEquippedFolderId()){return (data.FOLDER_CHIP_RELATION||[]).filter(row=>row.folderId===folderId).sort((a,b)=>a.slotNo-b.slotNo).map(row=>({...row}))}
  function equipFolder(folderId){if(!folderById.has(folderId))throw new Error(`BattleNetwork folder: unknown folderId ${folderId}`);try{localStorage.setItem(STORAGE_KEY,folderId)}catch{}return getFolder(folderId)}

  function buildVulcan1TestCards(folderId){
    return Array.from({length:30},(_,index)=>({id:index,type:'VULCAN1',code:VULCAN1_CODES[index%VULCAN1_CODES.length],chipId:'CHIP_EXE4_S005',folderId,slotNo:index+1}));
  }

  function toLegacyCards(folderId=getEquippedFolderId()){
    if(TEST_ONLY_VULCAN1)return buildVulcan1TestCards(folderId);
    return getFolderEntries(folderId).map((entry,index)=>({id:index,type:LEGACY_TYPE_BY_CHIP_ID[entry.chipId]||`CHIP_${entry.chipId}`,code:entry.codeId,chipId:entry.chipId,folderId:entry.folderId,slotNo:entry.slotNo}));
  }

  function installCurrentBattleBridge(){
    const nativeMap=Array.prototype.map;
    Array.prototype.map=function(callback,thisArg){
      const isLegacyBattleFolder=this.length===30&&Array.isArray(this[0])&&this[0][0]==='CANNON'&&this[0][1]==='A';
      if(!isLegacyBattleFolder)return nativeMap.call(this,callback,thisArg);
      Array.prototype.map=nativeMap;
      return toLegacyCards();
    };
  }

  window.BattleNetworkFolder={getFolder,getFolderEntries,getEquippedFolderId,equipFolder,toLegacyCards,installCurrentBattleBridge};
  installCurrentBattleBridge();
})();