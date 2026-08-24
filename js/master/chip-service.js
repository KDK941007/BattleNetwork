(()=>{
  const data=window.BattleNetworkData||{};
  const byId=(rows,key)=>new Map((rows||[]).map(row=>[row[key],row]));

  const chipById=byId(data.CHIP_MASTER,'chipId');
  const attributeById=byId(data.CHIP_ATTRIBUTE_MASTER,'attributeId');
  const codeById=byId(data.CHIP_CODE_MASTER,'codeId');
  const classById=byId(data.CHIP_CLASS_MASTER,'classId');
  const specialTypeById=byId(data.CHIP_SPECIAL_TYPE_MASTER,'specialTypeId');
  const valueTypeById=byId(data.VALUE_TYPE_MASTER,'valueTypeId');
  const rangeTypeById=byId(data.RANGE_TYPE_MASTER,'rangeTypeId');
  const behaviorById=byId(data.BEHAVIOR_MASTER,'behaviorId');

  const LEGACY_CHIP_MAP={
    CANNON:{chipId:'CHIP_0001',type:'cannon',viz:'cannon'},
    SWORD:{chipId:'CHIP_0002',type:'sword',viz:'sword'},
    WIDE:{chipId:'CHIP_0003',type:'wide',viz:'wide'},
    BOMB:{chipId:'CHIP_0004',type:'bomb',viz:'bomb'},
    RECOVER:{chipId:'CHIP_0005',type:'recover',viz:'recover'}
  };

  function getChip(chipId){
    return chipById.get(chipId)||null;
  }

  function getChipClass(chipId){
    const chip=getChip(chipId);
    return chip?classById.get(chip.classId)||null:null;
  }

  function getChipSpecialTypes(chipId){
    return (data.CHIP_SPECIAL_TYPE_RELATION||[])
      .filter(row=>row.chipId===chipId)
      .map(row=>({...row,specialType:specialTypeById.get(row.specialTypeId)||null}))
      .filter(row=>row.specialType);
  }

  /*
   * UI theme priority:
   * DARK is a special type and always overrides the base class color.
   * Otherwise use STANDARD / MEGA / GIGA.
   */
  function getChipTheme(chipId){
    if(getChipSpecialTypes(chipId).some(row=>row.specialTypeId==='DARK'))return 'dark';
    const chipClass=getChipClass(chipId);
    if(chipClass?.classId==='MEGA')return 'mega';
    if(chipClass?.classId==='GIGA')return 'giga';
    return 'standard';
  }

  function getChipAttributes(chipId){
    return (data.CHIP_ATTRIBUTE_RELATION||[])
      .filter(row=>row.chipId===chipId)
      .sort((a,b)=>a.displayPriority-b.displayPriority)
      .map(row=>({...row,attribute:attributeById.get(row.attributeId)||null}))
      .filter(row=>row.attribute);
  }

  function getPrimaryAttribute(chipId){
    const attributes=getChipAttributes(chipId);
    return (attributes.find(row=>row.primaryFlg)||attributes[0]||{}).attribute||null;
  }

  function getChipCodes(chipId){
    return (data.CHIP_CODE_RELATION||[])
      .filter(row=>row.chipId===chipId)
      .map(row=>codeById.get(row.codeId))
      .filter(Boolean)
      .sort((a,b)=>a.sortOrder-b.sortOrder);
  }

  function getChipValues(chipId){
    return (data.CHIP_VALUE_RELATION||[])
      .filter(row=>row.chipId===chipId)
      .sort((a,b)=>a.displayOrder-b.displayOrder)
      .map(row=>({...row,valueType:valueTypeById.get(row.valueTypeId)||null}));
  }

  function getRangeParams(chipId){
    const chip=getChip(chipId);
    if(!chip)return {};
    const definitions=(data.RANGE_PARAM_MASTER||[]).filter(row=>row.rangeTypeId===chip.rangeTypeId);
    const overrides=new Map((data.CHIP_RANGE_PARAM_RELATION||[]).filter(row=>row.chipId===chipId).map(row=>[row.paramId,row.paramValue]));
    return Object.fromEntries(definitions.map(def=>[def.paramId,overrides.has(def.paramId)?overrides.get(def.paramId):def.defaultValue]));
  }

  function getBehaviorParams(chipId){
    const chip=getChip(chipId);
    if(!chip)return {};
    const definitions=(data.BEHAVIOR_PARAM_MASTER||[]).filter(row=>row.behaviorId===chip.behaviorId);
    const overrides=new Map((data.CHIP_BEHAVIOR_PARAM_RELATION||[]).filter(row=>row.chipId===chipId).map(row=>[row.paramId,row.paramValue]));
    return Object.fromEntries(definitions.map(def=>[def.paramId,overrides.has(def.paramId)?overrides.get(def.paramId):def.defaultValue]));
  }

  function validateMasterData(){
    const errors=[];
    const chips=data.CHIP_MASTER||[];
    const chipIds=new Set();

    chips.forEach(chip=>{
      if(chipIds.has(chip.chipId))errors.push(`chip_id重複: ${chip.chipId}`);
      chipIds.add(chip.chipId);
      if(!classById.has(chip.classId))errors.push(`class_id未定義: ${chip.chipId}/${chip.classId}`);
      if(!rangeTypeById.has(chip.rangeTypeId))errors.push(`range_type_id未定義: ${chip.chipId}/${chip.rangeTypeId}`);
      if(!behaviorById.has(chip.behaviorId))errors.push(`behavior_id未定義: ${chip.chipId}/${chip.behaviorId}`);

      const attrs=getChipAttributes(chip.chipId);
      if(!attrs.length)errors.push(`属性・系統未設定: ${chip.chipId}`);
      if(attrs.filter(row=>row.primaryFlg).length!==1)errors.push(`primary属性は1件必須: ${chip.chipId}`);

      (data.RANGE_PARAM_MASTER||[])
        .filter(row=>row.rangeTypeId===chip.rangeTypeId&&row.requiredFlg)
        .forEach(def=>{
          if(getRangeParams(chip.chipId)[def.paramId]==null)errors.push(`Range必須値未設定: ${chip.chipId}/${def.paramId}`);
        });

      (data.BEHAVIOR_PARAM_MASTER||[])
        .filter(row=>row.behaviorId===chip.behaviorId&&row.requiredFlg)
        .forEach(def=>{
          if(getBehaviorParams(chip.chipId)[def.paramId]==null)errors.push(`Behavior必須値未設定: ${chip.chipId}/${def.paramId}`);
        });
    });

    (data.CHIP_CODE_RELATION||[]).forEach(row=>{
      if(!chipById.has(row.chipId))errors.push(`コード関連chip_id未定義: ${row.chipId}`);
      if(!codeById.has(row.codeId))errors.push(`code_id未定義: ${row.chipId}/${row.codeId}`);
    });

    (data.CHIP_SPECIAL_TYPE_RELATION||[]).forEach(row=>{
      if(!chipById.has(row.chipId))errors.push(`特殊種別関連chip_id未定義: ${row.chipId}`);
      if(!specialTypeById.has(row.specialTypeId))errors.push(`special_type_id未定義: ${row.chipId}/${row.specialTypeId}`);
    });

    return errors;
  }

  function createGameCompatibilityData(){
    const errors=validateMasterData();
    if(errors.length)throw new Error(`BattleNetwork master validation failed:\n${errors.join('\n')}`);

    const ATTR_IMAGE={};
    const ATTR_LABEL={};
    (data.CHIP_ATTRIBUTE_MASTER||[]).forEach(attr=>{
      const key=attr.attributeId.toLowerCase();
      ATTR_IMAGE[key]=attr.iconPath;
      ATTR_LABEL[key]=attr.attributeName;
    });

    const CHIP={};
    Object.entries(LEGACY_CHIP_MAP).forEach(([legacyKey,legacy])=>{
      const chip=getChip(legacy.chipId);
      const primary=getPrimaryAttribute(chip.chipId);
      const values=getChipValues(chip.chipId);
      const damage=values.find(row=>row.valueTypeId==='DAMAGE');
      const recovery=values.find(row=>row.valueTypeId==='RECOVERY');
      const range=getRangeParams(chip.chipId);
      const behavior=getBehaviorParams(chip.chipId);

      CHIP[legacyKey]={
        chipId:chip.chipId,
        name:chip.chipName,
        type:legacy.type,
        attr:(primary?.attributeId||'NORMAL').toLowerCase(),
        power:damage?.value,
        heal:recovery?.value,
        range:range.DISTANCE??range.THROW_DISTANCE,
        width:range.WIDTH,
        radius:range.RADIUS,
        lock:behavior.ACTION_LOCK,
        projectileSpeed:behavior.PROJECTILE_SPEED,
        explosionDelay:behavior.EXPLOSION_DELAY,
        image:chip.imagePath,
        detail:chip.description,
        rangeText:chip.rangeDescription,
        viz:legacy.viz
      };
    });

    return {CHIP,ATTR_IMAGE,ATTR_LABEL};
  }

  window.BattleNetworkMaster={
    getChip,
    getChipClass,
    getChipSpecialTypes,
    getChipTheme,
    getChipAttributes,
    getPrimaryAttribute,
    getChipCodes,
    getChipValues,
    getRangeParams,
    getBehaviorParams,
    validateMasterData,
    createGameCompatibilityData
  };
})();
