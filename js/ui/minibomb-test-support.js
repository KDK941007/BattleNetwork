(()=>{
  const MASTER=window.BattleNetworkMaster;
  if(!MASTER)throw new Error('BattleNetworkMiniBomb: required master service is missing.');

  const DIAMETER_TILES=2;
  const settings=Object.freeze({diameterTiles:DIAMETER_TILES});
  window.BattleNetworkMiniBombSettings=Object.freeze({getSettings:()=>settings});

  // Finalized MiniBomb parameters: fixed 3-tile throw and 2-tile blast diameter.
  // This file no longer changes the active chip-detail test target.
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
