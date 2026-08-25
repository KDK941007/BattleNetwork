(()=>{
  const scene=document.getElementById('scene');
  if(!scene)throw new Error('BattleNetworkProjectileShadow: scene is not available.');

  const tracked=new Map();
  const LEGACY_TRANSLATE_X=9;
  const LEGACY_TRANSLATE_Y=34;
  const FLOOR_CLEARANCE=20;
  const bulletConfig={
    cannon:{bulletWidth:132,bulletHeight:66,shadowWidth:114,shadowHeight:39,opacity:.48},
    normal:{bulletWidth:30,bulletHeight:15,shadowWidth:28,shadowHeight:10,opacity:.4},
    charged:{bulletWidth:52,bulletHeight:26,shadowWidth:50,shadowHeight:16,opacity:.5}
  };

  function getKind(bullet){
    if(bullet.classList.contains('cannon'))return 'cannon';
    if(bullet.classList.contains('charged'))return 'charged';
    if(bullet.classList.contains('normal'))return 'normal';
    return null;
  }

  function attach(bullet,kind=null){
    if(tracked.has(bullet))return true;
    const resolvedKind=kind||getKind(bullet),config=bulletConfig[resolvedKind];
    if(!config)return false;
    bullet.style.marginLeft=`${LEGACY_TRANSLATE_X-config.bulletWidth/2}px`;
    bullet.style.marginTop=`${LEGACY_TRANSLATE_Y-config.bulletHeight-FLOOR_CLEARANCE}px`;
    const shadow=document.createElement('div');
    shadow.className=`projectileFloorShadow ${resolvedKind}`;
    shadow.style.cssText=`position:absolute;width:${config.shadowWidth}px;height:${config.shadowHeight}px;border-radius:50%;background:rgba(0,0,0,${config.opacity});filter:blur(1.4px);z-index:5;pointer-events:none;transform-origin:center;`;
    scene.appendChild(shadow);
    tracked.set(bullet,{shadow,config});
    return true;
  }

  function update(bullet,floorX,floorY){
    const entry=tracked.get(bullet);
    if(!entry||!Number.isFinite(floorX)||!Number.isFinite(floorY))return;
    const cfg=entry.config;
    entry.shadow.style.transform=`translate(${floorX-cfg.shadowWidth/2}px,${floorY-cfg.shadowHeight/2}px)`;
  }

  function detach(bullet){
    const entry=tracked.get(bullet);
    if(!entry)return;
    entry.shadow.remove();
    tracked.delete(bullet);
  }

  window.BattleNetworkProjectileShadow=Object.freeze({attach,update,detach});
  scene.querySelectorAll('.bullet').forEach(bullet=>attach(bullet));
})();
