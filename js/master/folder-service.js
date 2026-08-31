(()=>{
  const data=window.BattleNetworkData||{};
  const STORAGE_KEY='battleNetworkEquippedFolderId';

  // Chip-detail test rule:
  // while testing one chip, the Custom screen exposes only that target chip.
  // Change only this target when moving to the next chip-detail test.
  const TEST_TARGET=Object.freeze({
    enabled:true,
    type:'SPREADGUN',
    chipId:'CHIP_EXE4_S008',
    codes:Object.freeze(['L','M','N','*'])
  });

  const LEGACY_TYPE_BY_CHIP_ID=Object.freeze({
    CHIP_0001:'CANNON',
    CHIP_0002:'SWORD',
    CHIP_0003:'WIDE',
    CHIP_0004:'BOMB',
    CHIP_0005:'RECOVER',
    CHIP_EXE4_S004:'AIRSHOT',
    CHIP_EXE4_S005:'VULCAN1',
    CHIP_EXE4_S006:'VULCAN2',
    CHIP_EXE4_S007:'VULCAN3',
    CHIP_EXE4_S008:'SPREADGUN',
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

  function buildTestCards(folderId){
    const codes=TEST_TARGET.codes;
    if(!codes.length)throw new Error('BattleNetwork folder: test target has no chip codes.');
    return Array.from({length:30},(_,index)=>({
      id:index,
      type:TEST_TARGET.type,
      code:codes[index%codes.length],
      chipId:TEST_TARGET.chipId,
      folderId,
      slotNo:index+1
    }));
  }

  function toLegacyCards(folderId=getEquippedFolderId()){
    if(TEST_TARGET.enabled)return buildTestCards(folderId);
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