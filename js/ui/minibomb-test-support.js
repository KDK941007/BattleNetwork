(()=>{
  const MASTER=window.BattleNetworkMaster;
  const FOLDER=window.BattleNetworkFolder;
  if(!MASTER||!FOLDER)throw new Error('BattleNetworkMiniBombTest: required master/folder service is missing.');

  const TEST_TARGET=Object.freeze({
    enabled:true,
    type:'BOMB',
    chipId:'CHIP_0004',
    codes:Object.freeze(['B','L']),
    requiredCards:Object.freeze([])
  });
  const DIAMETER_TILES=2;
  const settings=Object.freeze({diameterTiles:DIAMETER_TILES});
  function getSettings(){return settings}
  window.BattleNetworkMiniBombTestSettings=Object.freeze({TEST_TARGET,getSettings});

  function buildTestCards(folderId=FOLDER.getEquippedFolderId?.()){
    const codes=TEST_TARGET.codes;
    return Array.from({length:30},(_,index)=>({
      id:index,
      type:TEST_TARGET.type,
      code:codes[index%codes.length],
      chipId:TEST_TARGET.chipId,
      folderId,
      slotNo:index+1
    }));
  }

  // Replace only the active chip-detail test target. The original bridge is invoked once
  // on the legacy folder so it restores Array.prototype.map to its native implementation.
  const inheritedMap=Array.prototype.map;
  Array.prototype.map=function(callback,thisArg){
    const isLegacyBattleFolder=this.length===30&&Array.isArray(this[0])&&this[0][0]==='CANNON'&&this[0][1]==='A';
    if(!isLegacyBattleFolder)return inheritedMap.call(this,callback,thisArg);
    inheritedMap.call(this,callback,thisArg);
    return buildTestCards();
  };
  FOLDER.getTestTarget=()=>TEST_TARGET;
  FOLDER.toLegacyCards=folderId=>buildTestCards(folderId);

  // Finalized MiniBomb parameters: fixed 3-tile throw and 2-tile blast diameter.
  const originalCreate=MASTER.createGameCompatibilityData;
  MASTER.createGameCompatibilityData=()=>{
    const result=originalCreate();
    const bomb=result?.CHIP?.BOMB;
    if(!bomb)return result;
    Object.defineProperty(bomb,'throwDistanceTiles',{enumerable:true,configurable:true,get:()=>3});
    Object.defineProperty(bomb,'radiusTiles',{enumerable:true,configurable:true,get:()=>DIAMETER_TILES/2});
    Object.defineProperty(bomb,'radius',{enumerable:true,configurable:true,get:()=>window.BattleNetworkField?.toWorldDistance?window.BattleNetworkField.toWorldDistance(DIAMETER_TILES/2):undefined});
    bomb.rangeText='向いている方向の固定3マス先へ投げる／爆発直径2マス';
    return result;
  };
})();
