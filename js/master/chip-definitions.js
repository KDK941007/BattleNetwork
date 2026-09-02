(()=>{
  const root=window.BattleNetworkData=window.BattleNetworkData||{};

  const CHIP_ATTRIBUTE_MASTER=[
    {attributeId:'NORMAL',attributeType:'ELEMENT',attributeName:'無属性',iconPath:'./assets/attributes/01_normal.png',sortOrder:1},
    {attributeId:'FIRE',attributeType:'ELEMENT',attributeName:'炎',iconPath:'./assets/attributes/02_fire.png',sortOrder:2},
    {attributeId:'WATER',attributeType:'ELEMENT',attributeName:'水',iconPath:'./assets/attributes/03_water.png',sortOrder:3},
    {attributeId:'ELECTRIC',attributeType:'ELEMENT',attributeName:'電気',iconPath:'./assets/attributes/04_electric.png',sortOrder:4},
    {attributeId:'WOOD',attributeType:'ELEMENT',attributeName:'木',iconPath:'./assets/attributes/05_wood.png',sortOrder:5},
    {attributeId:'TERRAIN_BREAK',attributeType:'SYSTEM',attributeName:'地形破壊',iconPath:'./assets/attributes/06_terrain_break.png',sortOrder:6},
    {attributeId:'RECOVERY',attributeType:'SYSTEM',attributeName:'リカバリー',iconPath:'./assets/attributes/07_recovery.png',sortOrder:7},
    {attributeId:'SWORD',attributeType:'SYSTEM',attributeName:'ソード',iconPath:'./assets/attributes/08_sword.png',sortOrder:8},
    {attributeId:'WIND',attributeType:'SYSTEM',attributeName:'風',iconPath:'./assets/attributes/09_wind.png',sortOrder:9},
    {attributeId:'INVISIBLE',attributeType:'SYSTEM',attributeName:'インビジブル',iconPath:'./assets/attributes/10_invisible.png',sortOrder:10},
    {attributeId:'OBJECT',attributeType:'SYSTEM',attributeName:'置物',iconPath:'./assets/attributes/11_object.png',sortOrder:11},
    {attributeId:'PLUS',attributeType:'SYSTEM',attributeName:'数値付加',iconPath:'./assets/attributes/12_plus.png',sortOrder:12},
    {attributeId:'BREAK',attributeType:'SYSTEM',attributeName:'ブレイク',iconPath:'./assets/attributes/13_break.png',sortOrder:13}
  ];

  const CHIP_CODE_MASTER=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','*'].map((codeValue,index)=>({codeId:codeValue,codeValue,sortOrder:index+1}));
  const CHIP_CLASS_MASTER=[
    {classId:'STANDARD',className:'スタンダード',classInitial:'S',sortOrder:1},
    {classId:'MEGA',className:'メガ',classInitial:'M',sortOrder:2},
    {classId:'GIGA',className:'ギガ',classInitial:'G',sortOrder:3}
  ];
  const CHIP_SPECIAL_TYPE_MASTER=[{specialTypeId:'DARK',specialTypeName:'ダークチップ'}];
  const VALUE_TYPE_MASTER=[
    {valueTypeId:'DAMAGE',valueName:'ダメージ',displayLabel:'攻撃力',unit:null},
    {valueTypeId:'RECOVERY',valueName:'HP回復',displayLabel:'回復量',unit:null},
    {valueTypeId:'BARRIER_HP',valueName:'バリア耐久',displayLabel:'耐久値',unit:null},
    {valueTypeId:'ADD_DAMAGE',valueName:'攻撃力加算',displayLabel:'加算値',unit:null}
  ];
  const SHOOTING_RANGE_DEFAULT_TILES=7;
  const RANGE_TYPE_MASTER=[
    {rangeTypeId:'LINE',rangeName:'直線',displayCategory:'射撃',displayDirection:'自由方向',sortOrder:1},
    {rangeTypeId:'RECT',rangeName:'矩形',displayCategory:'近接',displayDirection:'自由方向',sortOrder:2},
    {rangeTypeId:'CIRCLE',rangeName:'円形',displayCategory:'範囲',displayDirection:'発生地点基準',sortOrder:3},
    {rangeTypeId:'SECTOR',rangeName:'扇形',displayCategory:'範囲',displayDirection:'自由方向',sortOrder:4},
    {rangeTypeId:'RING',rangeName:'円環',displayCategory:'範囲',displayDirection:'発生地点基準',sortOrder:5},
    {rangeTypeId:'SELF',rangeName:'自分自身',displayCategory:'回復',displayDirection:'自分中心',sortOrder:6},
    {rangeTypeId:'THROW_AOE',rangeName:'投擲範囲（互換）',displayCategory:'投擲',displayDirection:'前方',sortOrder:90,legacyFlg:true}
  ];
  const RANGE_PARAM_MASTER=[
    {rangeTypeId:'LINE',paramId:'LENGTH_TILES',paramName:'射程マス数',dataType:'number',defaultValue:SHOOTING_RANGE_DEFAULT_TILES,requiredFlg:true,displayLabel:'射程',displayOrder:1},
    {rangeTypeId:'LINE',paramId:'WIDTH_TILES',paramName:'幅マス数',dataType:'number',defaultValue:null,requiredFlg:true,displayLabel:'幅',displayOrder:2},
    {rangeTypeId:'RECT',paramId:'LENGTH_TILES',paramName:'長さマス数',dataType:'number',defaultValue:null,requiredFlg:true,displayLabel:'射程',displayOrder:1},
    {rangeTypeId:'RECT',paramId:'WIDTH_TILES',paramName:'幅マス数',dataType:'number',defaultValue:null,requiredFlg:true,displayLabel:'範囲',displayOrder:2},
    {rangeTypeId:'CIRCLE',paramId:'RADIUS_TILES',paramName:'半径マス数',dataType:'number',defaultValue:null,requiredFlg:true,displayLabel:'半径',displayOrder:1},
    {rangeTypeId:'SECTOR',paramId:'RADIUS_TILES',paramName:'半径マス数',dataType:'number',defaultValue:null,requiredFlg:true,displayLabel:'射程',displayOrder:1},
    {rangeTypeId:'SECTOR',paramId:'ANGLE_DEG',paramName:'開き角度',dataType:'number',defaultValue:null,requiredFlg:true,displayLabel:'角度',displayOrder:2},
    {rangeTypeId:'RING',paramId:'INNER_RADIUS_TILES',paramName:'内側半径マス数',dataType:'number',defaultValue:null,requiredFlg:true,displayLabel:'内側半径',displayOrder:1},
    {rangeTypeId:'RING',paramId:'OUTER_RADIUS_TILES',paramName:'外側半径マス数',dataType:'number',defaultValue:null,requiredFlg:true,displayLabel:'外側半径',displayOrder:2},
    {rangeTypeId:'THROW_AOE',paramId:'RADIUS',paramName:'爆発半径（互換world units）',dataType:'number',defaultValue:null,requiredFlg:true,displayLabel:'範囲',displayOrder:1}
  ];

  const CHIP_TIMING_DEFAULTS=Object.freeze({startupDelaySec:.10,actionLockSec:.25});
  const BEHAVIOR_MASTER=[
    {behaviorId:'CANNON_SHOT',behaviorName:'キャノン射撃',handlerKey:'CANNON_SHOT'},
    {behaviorId:'SWORD_SLASH',behaviorName:'ソード攻撃',handlerKey:'SWORD_SLASH'},
    {behaviorId:'BOMB_THROW',behaviorName:'ボム投擲',handlerKey:'BOMB_THROW'},
    {behaviorId:'RECOVER_HP',behaviorName:'HP回復',handlerKey:'RECOVER_HP'}
  ];
  const BEHAVIOR_PARAM_MASTER=[
    {behaviorId:'CANNON_SHOT',paramId:'STARTUP_DELAY',paramName:'発動前硬直',dataType:'number',defaultValue:CHIP_TIMING_DEFAULTS.startupDelaySec,requiredFlg:true},
    {behaviorId:'CANNON_SHOT',paramId:'ACTION_LOCK',paramName:'発動後硬直',dataType:'number',defaultValue:CHIP_TIMING_DEFAULTS.actionLockSec,requiredFlg:true},
    {behaviorId:'CANNON_SHOT',paramId:'PROJECTILE_SPEED',paramName:'弾速',dataType:'number',defaultValue:2000,requiredFlg:true},
    {behaviorId:'SWORD_SLASH',paramId:'STARTUP_DELAY',paramName:'発動前硬直',dataType:'number',defaultValue:CHIP_TIMING_DEFAULTS.startupDelaySec,requiredFlg:true},
    {behaviorId:'SWORD_SLASH',paramId:'ACTION_LOCK',paramName:'発動後硬直',dataType:'number',defaultValue:CHIP_TIMING_DEFAULTS.actionLockSec,requiredFlg:true},
    {behaviorId:'BOMB_THROW',paramId:'STARTUP_DELAY',paramName:'発動前硬直',dataType:'number',defaultValue:CHIP_TIMING_DEFAULTS.startupDelaySec,requiredFlg:true},
    {behaviorId:'BOMB_THROW',paramId:'ACTION_LOCK',paramName:'発動後硬直',dataType:'number',defaultValue:CHIP_TIMING_DEFAULTS.actionLockSec,requiredFlg:true},
    {behaviorId:'BOMB_THROW',paramId:'EXPLOSION_DELAY',paramName:'爆発遅延',dataType:'number',defaultValue:.28,requiredFlg:true},
    {behaviorId:'BOMB_THROW',paramId:'THROW_DISTANCE_TILES',paramName:'投擲距離マス数',dataType:'number',defaultValue:3,requiredFlg:true},
    {behaviorId:'BOMB_THROW',paramId:'IGNORE_INTERMEDIATE_OBSTACLES',paramName:'投擲経路上の障害物を無視',dataType:'boolean',defaultValue:true,requiredFlg:true},
    {behaviorId:'RECOVER_HP',paramId:'STARTUP_DELAY',paramName:'発動前硬直',dataType:'number',defaultValue:CHIP_TIMING_DEFAULTS.startupDelaySec,requiredFlg:true},
    {behaviorId:'RECOVER_HP',paramId:'ACTION_LOCK',paramName:'発動後硬直',dataType:'number',defaultValue:CHIP_TIMING_DEFAULTS.actionLockSec,requiredFlg:true}
  ];

  Object.assign(root,{CHIP_ATTRIBUTE_MASTER,CHIP_CODE_MASTER,CHIP_CLASS_MASTER,CHIP_SPECIAL_TYPE_MASTER,VALUE_TYPE_MASTER,SHOOTING_RANGE_DEFAULT_TILES,RANGE_TYPE_MASTER,RANGE_PARAM_MASTER,CHIP_TIMING_DEFAULTS,BEHAVIOR_MASTER,BEHAVIOR_PARAM_MASTER});
})();