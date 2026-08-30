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
    {chipId:'CHIP_0005',attributeId:'NORMAL',displayPriority:2,primaryFlg:false},
    {chipId:'CHIP_EXE4_S004',attributeId:'WIND',displayPriority:1,primaryFlg:true},
    {chipId:'CHIP_EXE4_S005',attributeId:'NORMAL',displayPriority:1,primaryFlg:true},
    {chipId:'CHIP_EXE4_S106',attributeId:'TERRAIN_BREAK',displayPriority:1,primaryFlg:true},
    {chipId:'CHIP_EXE4_S119',attributeId:'NORMAL',displayPriority:1,primaryFlg:true},
    {chipId:'CHIP_EXE4_S148',attributeId:'PLUS',displayPriority:1,primaryFlg:true},
    {chipId:'TEST_9001',attributeId:'SWORD',displayPriority:1,primaryFlg:true},
    {chipId:'TEST_9001',attributeId:'NORMAL',displayPriority:2,primaryFlg:false},
    {chipId:'TEST_9002',attributeId:'NORMAL',displayPriority:1,primaryFlg:true},
    {chipId:'TEST_9003',attributeId:'NORMAL',displayPriority:1,primaryFlg:true}
  ];

  const CHIP_CODE_RELATION=[
    {chipId:'CHIP_0001',codeId:'A'},
    {chipId:'CHIP_0001',codeId:'B'},
    {chipId:'CHIP_0001',codeId:'C'},
    {chipId:'CHIP_0001',codeId:'*'},
    {chipId:'CHIP_0002',codeId:'E'},
    {chipId:'CHIP_0002',codeId:'L'},
    {chipId:'CHIP_0002',codeId:'S'},
    {chipId:'CHIP_0003',codeId:'E'},
    {chipId:'CHIP_0003',codeId:'L'},
    {chipId:'CHIP_0003',codeId:'S'},
    {chipId:'CHIP_0004',codeId:'B'},
    {chipId:'CHIP_0004',codeId:'L'},
    {chipId:'CHIP_0004',codeId:'T'},
    {chipId:'CHIP_0004',codeId:'*'},
    {chipId:'CHIP_0005',codeId:'A'},
    {chipId:'CHIP_0005',codeId:'L'},
    {chipId:'CHIP_0005',codeId:'N'},
    {chipId:'CHIP_0005',codeId:'*'},
    {chipId:'CHIP_EXE4_S004',codeId:'A'},
    {chipId:'CHIP_EXE4_S004',codeId:'S'},
    {chipId:'CHIP_EXE4_S004',codeId:'V'},
    {chipId:'CHIP_EXE4_S004',codeId:'*'},
    {chipId:'CHIP_EXE4_S005',codeId:'E'},
    {chipId:'CHIP_EXE4_S005',codeId:'S'},
    {chipId:'CHIP_EXE4_S005',codeId:'V'},
    {chipId:'CHIP_EXE4_S005',codeId:'*'},
    {chipId:'CHIP_EXE4_S106',codeId:'*'},
    {chipId:'CHIP_EXE4_S119',codeId:'E'},
    {chipId:'CHIP_EXE4_S119',codeId:'M'},
    {chipId:'CHIP_EXE4_S119',codeId:'S'},
    {chipId:'CHIP_EXE4_S119',codeId:'*'},
    {chipId:'CHIP_EXE4_S148',codeId:'*'},
    {chipId:'TEST_9001',codeId:'M'},
    {chipId:'TEST_9002',codeId:'G'},
    {chipId:'TEST_9003',codeId:'D'}
  ];

  const CHIP_VALUE_RELATION=[
    {chipId:'CHIP_0001',valueNo:1,valueTypeId:'DAMAGE',value:40,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'CHIP_0002',valueNo:1,valueTypeId:'DAMAGE',value:80,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'CHIP_0003',valueNo:1,valueTypeId:'DAMAGE',value:80,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'CHIP_0004',valueNo:1,valueTypeId:'DAMAGE',value:50,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'CHIP_0005',valueNo:1,valueTypeId:'RECOVERY',value:10,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'CHIP_EXE4_S004',valueNo:1,valueTypeId:'DAMAGE',value:20,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'CHIP_EXE4_S005',valueNo:1,valueTypeId:'DAMAGE',value:10,valueMode:'MULTI_HIT',displayOrder:1,displayFlg:true,labelOverride:'攻撃力（10×3）'},
    {chipId:'CHIP_EXE4_S119',valueNo:1,valueTypeId:'DAMAGE',value:10,valueMode:'CONDITIONAL',displayOrder:1,displayFlg:true,labelOverride:'占有不可時ダメージ'},
    {chipId:'CHIP_EXE4_S148',valueNo:1,valueTypeId:'ADD_DAMAGE',value:10,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'TEST_9001',valueNo:1,valueTypeId:'DAMAGE',value:100,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'TEST_9002',valueNo:1,valueTypeId:'DAMAGE',value:200,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null},
    {chipId:'TEST_9003',valueNo:1,valueTypeId:'DAMAGE',value:150,valueMode:'FIXED',displayOrder:1,displayFlg:true,labelOverride:null}
  ];

  const CHIP_SPECIAL_TYPE_RELATION=[
    {chipId:'TEST_9003',specialTypeId:'DARK'}
  ];

  const CHIP_RANGE_PARAM_RELATION=[
    {chipId:'CHIP_0001',paramId:'LENGTH_TILES',paramValue:5},
    {chipId:'CHIP_0001',paramId:'WIDTH_TILES',paramValue:.75},
    {chipId:'CHIP_0002',paramId:'LENGTH_TILES',paramValue:1},
    {chipId:'CHIP_0002',paramId:'WIDTH_TILES',paramValue:1},
    {chipId:'CHIP_0003',paramId:'LENGTH_TILES',paramValue:1},
    {chipId:'CHIP_0003',paramId:'WIDTH_TILES',paramValue:3},
    {chipId:'CHIP_0004',paramId:'RADIUS_TILES',paramValue:.75},
    {chipId:'TEST_9001',paramId:'LENGTH_TILES',paramValue:1},
    {chipId:'TEST_9001',paramId:'WIDTH_TILES',paramValue:1},
    {chipId:'TEST_9002',paramId:'LENGTH_TILES',paramValue:5},
    {chipId:'TEST_9002',paramId:'WIDTH_TILES',paramValue:.25},
    {chipId:'TEST_9003',paramId:'RADIUS_TILES',paramValue:.75}
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
