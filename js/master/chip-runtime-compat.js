(()=>{
  const data=window.BattleNetworkData||{};
  const service=window.BattleNetworkMaster;
  if(!service)return;

  const tileDistanceToWorld=value=>{
    if(value==null)return undefined;
    const n=Number(value);
    if(!Number.isFinite(n))return undefined;
    return window.BattleNetworkField?.toWorldDistance?window.BattleNetworkField.toWorldDistance(n):undefined;
  };

  const ATTR_IMAGE={};
  const ATTR_LABEL={};
  (data.CHIP_ATTRIBUTE_MASTER||[]).forEach(attr=>{
    const key=attr.attributeId.toLowerCase();
    ATTR_IMAGE[key]=attr.iconPath;
    ATTR_LABEL[key]=attr.attributeName;
  });

  const buildImplemented=(legacyKey,chipId,type,viz)=>{
    const chip=service.getChip(chipId);
    const primary=service.getPrimaryAttribute(chipId);
    const values=service.getChipValues(chipId);
    const damage=values.find(row=>row.valueTypeId==='DAMAGE');
    const recovery=values.find(row=>row.valueTypeId==='RECOVERY');
    const range=service.getRangeParams(chipId);
    const behavior=service.getBehaviorParams(chipId);
    const lengthTiles=range.LENGTH_TILES;
    const widthTiles=range.WIDTH_TILES;
    const radiusTiles=range.RADIUS_TILES;
    const throwDistanceTiles=behavior.THROW_DISTANCE_TILES;
    return [legacyKey,{
      chipId,
      name:chip?.chipName||legacyKey,
      type,
      attr:(primary?.attributeId||'NORMAL').toLowerCase(),
      power:damage?.value,
      heal:recovery?.value,
      rangeTypeId:chip?.rangeTypeId||null,
      rangeTiles:lengthTiles,
      widthTiles,
      radiusTiles,
      throwDistanceTiles,
      range:lengthTiles!=null?tileDistanceToWorld(lengthTiles):throwDistanceTiles!=null?tileDistanceToWorld(throwDistanceTiles):undefined,
      width:widthTiles!=null?tileDistanceToWorld(widthTiles):undefined,
      radius:radiusTiles!=null?tileDistanceToWorld(radiusTiles):undefined,
      lock:behavior.ACTION_LOCK,
      projectileSpeed:behavior.PROJECTILE_SPEED,
      explosionDelay:behavior.EXPLOSION_DELAY,
      image:service.getChipImagePath(chipId),
      detail:chip?.description||'',
      rangeText:chip?.rangeDescription||'',
      viz
    }];
  };

  const displayOnly=(legacyKey,chipId,imageName=null)=>{
    const chip=service.getChip(chipId);
    const primary=service.getPrimaryAttribute(chipId);
    const values=service.getChipValues(chipId);
    const damage=values.find(row=>row.valueTypeId==='DAMAGE');
    const recovery=values.find(row=>row.valueTypeId==='RECOVERY');
    return [legacyKey,{
      chipId,
      name:chip?.chipName||legacyKey,
      type:'unsupported',
      attr:(primary?.attributeId||'NORMAL').toLowerCase(),
      power:damage?.value,
      heal:recovery?.value,
      rangeTypeId:chip?.rangeTypeId||null,
      rangeTiles:undefined,
      widthTiles:undefined,
      radiusTiles:undefined,
      throwDistanceTiles:undefined,
      range:undefined,
      width:undefined,
      radius:undefined,
      lock:.25,
      projectileSpeed:undefined,
      explosionDelay:undefined,
      image:imageName?`./assets/chips/${imageName}.png`:service.getChipImagePath(chipId),
      detail:chip?.description||'バトル挙動は未実装。',
      rangeText:chip?.rangeDescription||'未確定',
      viz:''
    }];
  };

  service.createGameCompatibilityData=()=>{
    const CHIP=Object.fromEntries([
      buildImplemented('CANNON','CHIP_0001','cannon','cannon'),
      buildImplemented('SWORD','CHIP_0002','sword','sword'),
      buildImplemented('WIDE','CHIP_0003','wide','wide'),
      buildImplemented('BOMB','CHIP_0004','bomb','bomb'),
      buildImplemented('RECOVER','CHIP_0005','recover','recover'),
      displayOnly('AIRSHOT','CHIP_EXE4_S004','エアシュート'),
      displayOnly('VULCAN1','CHIP_EXE4_S005','バルカン1'),
      displayOnly('CRACKOUT','CHIP_EXE4_S106'),
      displayOnly('AREASTEAL','CHIP_EXE4_S119'),
      displayOnly('ATTACK10','CHIP_EXE4_S148')
    ]);
    return {CHIP,ATTR_IMAGE,ATTR_LABEL};
  };
})();
