(()=>{
  const root=window.BattleNetworkData=window.BattleNetworkData||{};

  const CHIP_ATTRIBUTE_RELATION=[
    {chipId:'CHIP_0001',attributeId:'NORMAL',displayPriority:1,primaryFlg:true},
    {chipId:'CHIP_0002',attributeId:'SWORD',displayPriority:1,primaryFlg:true},
    {chipId:'CHIP_0002',attributeId:'NORMAL',displayPriority:2,primaryFlg:false},
    {chipId:'CHIP_0003',attributeId:'SWORD',displayPriority:1,primaryFlg:true},
    {chipId:'CHIP_0003',attributeId:'NORMAL',displayPriority:2,primaryFlg:false},
    {chipId:'CHIP_0004',attributeId:'NORMAL',displayPriority:1,primaryFlg:true},
    {chipId:'CHIP_0005',attributeId:'RECOVERY',displayPriority:1,primaryFlg:true},
    {chipId:'CHIP_0005',attributeId:'NORMAL',displayPriority:2,primaryFlg:false}
  ];

  const CHIP_CODE_RELATION=[
    {chipId:'CHIP_0001',codeId:'A'},
    {chipId:'CHIP_0001',codeId:'B'},
    {chipId:'CHIP_0001',codeId:'C'},
    {chipId:'CHIP_0001',codeId:'*'},
    {chipId:'CHIP_0002',codeId:'S'},
    {chipId:'CHIP_0002',codeId:'E'},
    {chipId:'CHIP_0003',codeId:'S'},
    {chipId:'CHIP_0003',codeId:'E'},
    {chipId:'CHIP_0004',codeId:'B'},
    {chipId:'CHIP_0004',codeId:'L'},
    {chipId:'CHIP_0004',codeId:'*'},
    {chipId:'CHIP_0005',codeId:'A'},
    {chipId:'CHIP_0005',codeId:'L'}
  ];

  const CHIP_VALUE_RELATION=[
    {chipId:'CHIP_0001',valueNo:1,valueTypeId:'DAMAGE',value:40,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'CHIP_0002',valueNo:1,valueTypeId:'DAMAGE',value:80,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'CHIP_0003',valueNo:1,valueTypeId:'DAMAGE',value:80,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'CHIP_0004',valueNo:1,valueTypeId:'DAMAGE',value:50,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'CHIP_0005',valueNo:1,valueTypeId:'RECOVERY',value:10,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null}
  ];

  const CHIP_SPECIAL_TYPE_RELATION=[];

  const CHIP_RANGE_PARAM_RELATION=[
    {chipId:'CHIP_0001',paramId:'DISTANCE',paramValue:900},
    {chipId:'CHIP_0002',paramId:'DISTANCE',paramValue:155},
    {chipId:'CHIP_0002',paramId:'WIDTH',paramValue:75},
    {chipId:'CHIP_0003',paramId:'DISTANCE',paramValue:155},
    {chipId:'CHIP_0003',paramId:'WIDTH',paramValue:500},
    {chipId:'CHIP_0004',paramId:'THROW_DISTANCE',paramValue:430},
    {chipId:'CHIP_0004',paramId:'RADIUS',paramValue:115}
  ];

  const CHIP_BEHAVIOR_PARAM_RELATION=[
    {chipId:'CHIP_0003',paramId:'ACTION_LOCK',paramValue:.28}
  ];

  Object.assign(root,{
    CHIP_ATTRIBUTE_RELATION,
    CHIP_CODE_RELATION,
    CHIP_VALUE_RELATION,
    CHIP_SPECIAL_TYPE_RELATION,
    CHIP_RANGE_PARAM_RELATION,
    CHIP_BEHAVIOR_PARAM_RELATION
  });
})();
