(()=>{
  const scene=document.getElementById('scene');
  if(!scene)throw new Error('BattleNetworkProjectileShadow: scene is not available.');

  const tracked=new Map();
  const LEGACY_TRANSLATE_X=9;
  const LEGACY_TRANSLATE_Y=34;
  const FLOOR_CLEARANCE=20;
  const bulletConfig={
    cannon:{shadowWidth:114,shadowHeight:39,opacity:.48},
    normal:{shadowWidth:28,shadowHeight:10,opacity:.4},
    charged:{shadowWidth:50,shadowHeight:16,opacity:.5}
  };

  function getKind(bullet){
    if(bullet.classList.contains('cannon'))return 'cannon';
    if(bullet.classList.contains('charged'))return 'charged';
    if(bullet.classList.contains('normal'))return 'normal';
    return null;
  }

  function sync(entry){
    const transform=entry.bullet.style.transform||'';
    const match=transform.match(/translate\(([-+\d.]+)px,\s*([-+\d.]+)px\)/);
    if(!match)return;
    const tx=Number(match[1]),ty=Number(match[2]);
    if(!Number.isFinite(tx)||!Number.isFinite(ty))return;
    const cfg=entry.config;
    const floorX=tx+LEGACY_TRANSLATE_X;
    const floorY=ty+LEGACY_TRANSLATE_Y;
    entry.shadow.style.transform=`translate(${floorX-cfg.shadowWidth/2}px,${floorY-cfg.shadowHeight/2}px)`;
  }

  function attach(bullet){
    if(tracked.has(bullet))return;
    const kind=getKind(bullet),config=bulletConfig[kind];
    if(!config)return;

    const bulletWidth=bullet.offsetWidth;
    const bulletHeight=bullet.offsetHeight;
    bullet.style.marginLeft=`${LEGACY_TRANSLATE_X-bulletWidth/2}px`;
    bullet.style.marginTop=`${LEGACY_TRANSLATE_Y-bulletHeight-FLOOR_CLEARANCE}px`;

    const shadow=document.createElement('div');
    shadow.className=`projectileFloorShadow ${kind}`;
    shadow.style.cssText=`position:absolute;width:${config.shadowWidth}px;height:${config.shadowHeight}px;border-radius:50%;background:rgba(0,0,0,${config.opacity});filter:blur(1.4px);z-index:5;pointer-events:none;transform-origin:center;`;
    scene.appendChild(shadow);
    const entry={bullet,shadow,config,observer:null};
    entry.observer=new MutationObserver(()=>sync(entry));
    entry.observer.observe(bullet,{attributes:true,attributeFilter:['style']});
    tracked.set(bullet,entry);
    sync(entry);
  }

  function detach(bullet){
    const entry=tracked.get(bullet);
    if(!entry)return;
    entry.observer.disconnect();
    entry.shadow.remove();
    tracked.delete(bullet);
  }

  const sceneObserver=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node instanceof HTMLElement&&node.classList.contains('bullet'))attach(node);
      }
      for(const node of record.removedNodes){
        if(node instanceof HTMLElement&&node.classList.contains('bullet'))detach(node);
      }
    }
  });
  sceneObserver.observe(scene,{childList:true});

  scene.querySelectorAll('.bullet').forEach(attach);
})();
