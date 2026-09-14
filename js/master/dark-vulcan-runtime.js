(()=>{
  const MASTER=window.BattleNetworkMaster;
  const DATA=window.BattleNetworkData||{};
  const META=window.BattleNetworkDarkVulcanMaster;
  if(!MASTER?.createGameCompatibilityData||!META?.CHIP_ID||MASTER.__darkVulcanCompatInstalled)return;

  const CHIP_ID=META.CHIP_ID;
  const tileDistanceToWorld=value=>{
    const n=Number(value);
    return Number.isFinite(n)&&window.BattleNetworkField?.toWorldDistance?window.BattleNetworkField.toWorldDistance(n):undefined;
  };
  const timing=DATA.CHIP_TIMING_DEFAULTS||Object.freeze({startupDelaySec:.10,actionLockSec:.25});
  const nativeCreate=MASTER.createGameCompatibilityData.bind(MASTER);

  MASTER.createGameCompatibilityData=()=>{
    const compat=nativeCreate();
    if(compat?.CHIP&&!compat.CHIP.DARKVULCAN){
      const chip=MASTER.getChip(CHIP_ID);
      const primary=MASTER.getPrimaryAttribute(CHIP_ID);
      const damage=MASTER.getChipValues(CHIP_ID).find(row=>row.valueTypeId==='DAMAGE');
      const runtime={
        chipId:CHIP_ID,
        name:chip?.chipName||'ダークバルカン',
        type:'vulcan',
        attr:(primary?.attributeId||'NORMAL').toLowerCase(),
        power:damage?.value??20,
        heal:undefined,
        rangeTypeId:'LINE',
        rangeTiles:7,
        widthTiles:.75,
        radiusTiles:undefined,
        throwDistanceTiles:undefined,
        range:tileDistanceToWorld(7),
        width:tileDistanceToWorld(.75),
        radius:undefined,
        lock:timing.actionLockSec,
        startupDelay:timing.startupDelaySec,
        projectileSpeed:4000,
        explosionDelay:undefined,
        image:MASTER.getChipImagePath(chip)||'./assets/chips/ダークバルカン.png',
        detail:chip?.description||'',
        rangeText:chip?.rangeDescription||'前方直線',
        viz:'cannon',
        burstCount:24,
        burstIntervalSec:.10
      };
      compat.CHIP.DARKVULCAN=Object.freeze(runtime);
    }
    return compat;
  };

  MASTER.__darkVulcanCompatInstalled=true;
})();
