(()=>{
  const data=window.BattleNetworkData||{};
  const CHIP_ID='CHIP_DARK_VULCAN';
  const pushUnique=(rows,key,row)=>{
    if(!Array.isArray(rows)||rows.some(existing=>key(existing,row)))return;
    rows.push(row);
  };

  pushUnique(data.CHIP_MASTER,(a,b)=>a.chipId===b.chipId,{
    chipId:CHIP_ID,
    libraryNo:null,
    chipName:'ダークバルカン',
    capacityMb:99,
    classId:'STANDARD',
    rarity:null,
    rangeTypeId:'LINE',
    behaviorId:'CANNON_SHOT',
    description:'24連射するダークチップ。使用後、そのウェーブ中は方向入力が反転する。',
    rangeDescription:'前方直線',
    secretFlg:false
  });
  pushUnique(data.CHIP_ATTRIBUTE_RELATION,(a,b)=>a.chipId===b.chipId&&a.attributeId===b.attributeId,{chipId:CHIP_ID,attributeId:'NORMAL',displayPriority:1,primaryFlg:true});
  pushUnique(data.CHIP_CODE_RELATION,(a,b)=>a.chipId===b.chipId&&a.codeId===b.codeId,{chipId:CHIP_ID,codeId:'V'});
  pushUnique(data.CHIP_VALUE_RELATION,(a,b)=>a.chipId===b.chipId&&a.valueNo===b.valueNo,{chipId:CHIP_ID,valueNo:1,valueTypeId:'DAMAGE',value:20,valueMode:'MULTI_HIT',displayOrder:1,displayFlg:true,labelOverride:'攻撃力（20×24）'});
  pushUnique(data.CHIP_SPECIAL_TYPE_RELATION,(a,b)=>a.chipId===b.chipId&&a.specialTypeId===b.specialTypeId,{chipId:CHIP_ID,specialTypeId:'DARK'});
  pushUnique(data.CHIP_RANGE_PARAM_RELATION,(a,b)=>a.chipId===b.chipId&&a.paramId===b.paramId,{chipId:CHIP_ID,paramId:'LENGTH_TILES',paramValue:7});
  pushUnique(data.CHIP_RANGE_PARAM_RELATION,(a,b)=>a.chipId===b.chipId&&a.paramId===b.paramId,{chipId:CHIP_ID,paramId:'WIDTH_TILES',paramValue:.75});

  window.BattleNetworkDarkVulcanMaster=Object.freeze({CHIP_ID});
})();
