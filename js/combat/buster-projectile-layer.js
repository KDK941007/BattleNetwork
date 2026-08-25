(()=>{
  const battle=document.getElementById('battle');
  const scene=document.getElementById('scene');
  if(!battle||!scene)throw new Error('BattleNetworkBusterProjectile: battle/scene is not available.');

  const layer=document.createElement('div');
  layer.id='busterProjectileLayer';
  layer.style.position='absolute';
  layer.style.left='0';
  layer.style.top='0';
  layer.style.width=`${scene.clientWidth}px`;
  layer.style.height=`${scene.clientHeight}px`;
  layer.style.transformOrigin='0 0';
  layer.style.pointerEvents='none';
  layer.style.willChange='transform';
  layer.style.zIndex='6';
  battle.appendChild(layer);

  const config=Object.freeze({
    normal:Object.freeze({width:30,height:15,border:'2px solid rgba(205,248,255,.9)',background:'#66ddff'}),
    charged:Object.freeze({width:52,height:26,border:'2px solid rgba(255,220,210,.92)',background:'#ff514e'})
  });
  const LEGACY_TRANSLATE_X=9;
  const LEGACY_TRANSLATE_Y=34;
  const FLOOR_CLEARANCE=20;
  let lastSceneTransform='';

  function syncTransform(){
    const next=scene.style.transform||'';
    if(next!==lastSceneTransform){
      layer.style.transform=next;
      lastSceneTransform=next;
    }
    requestAnimationFrame(syncTransform);
  }

  function create(kind){
    const cfg=config[kind];
    if(!cfg)return null;
    const el=document.createElement('div');
    el.className=`busterProjectile ${kind}`;
    el.style.cssText=`position:absolute;width:${cfg.width}px;height:${cfg.height}px;border-radius:50%;background:${cfg.background};border:${cfg.border};pointer-events:none;transform-origin:center;will-change:transform;contain:layout paint style;`;
    el.style.marginLeft=`${LEGACY_TRANSLATE_X-cfg.width/2}px`;
    el.style.marginTop=`${LEGACY_TRANSLATE_Y-cfg.height-FLOOR_CLEARANCE}px`;
    layer.appendChild(el);
    return el;
  }

  function update(el,sceneX,sceneY,angleDeg){
    if(!el||!Number.isFinite(sceneX)||!Number.isFinite(sceneY)||!Number.isFinite(angleDeg))return;
    el.style.transform=`translate3d(${sceneX-LEGACY_TRANSLATE_X}px,${sceneY-LEGACY_TRANSLATE_Y}px,0) rotate(${angleDeg}deg)`;
  }

  function remove(el){el?.remove()}

  function refreshSize(){
    layer.style.width=`${scene.clientWidth}px`;
    layer.style.height=`${scene.clientHeight}px`;
  }

  window.addEventListener('resize',refreshSize,{passive:true});
  requestAnimationFrame(syncTransform);
  window.BattleNetworkBusterProjectile=Object.freeze({create,update,remove,refreshSize});
})();
