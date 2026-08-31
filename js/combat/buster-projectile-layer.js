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
    charged:Object.freeze({width:52,height:26,border:'2px solid rgba(255,220,210,.92)',background:'#ff514e'}),
    vulcan:Object.freeze({width:34,height:17,border:'1px solid rgba(255,246,174,.9)',background:'#ffe97a'}),
    spread:Object.freeze({width:38,height:19,border:'1px solid rgba(205,248,255,.92)',background:'#8eeaff'})
  });
  const LEGACY_TRANSLATE_X=9;
  const LEGACY_TRANSLATE_Y=34;
  const FLOOR_CLEARANCE=20;
  const vulcanPool=[];
  const spreadPool=[];
  let lastSceneTransform='';

  function syncTransform(){
    const next=scene.style.transform||'';
    if(next!==lastSceneTransform){
      layer.style.transform=next;
      lastSceneTransform=next;
    }
    requestAnimationFrame(syncTransform);
  }

  function createElement(kind,cfg){
    const el=document.createElement('div');
    el.className=`busterProjectile ${kind}`;
    el.dataset.projectileKind=kind;
    el.style.cssText=`position:absolute;width:${cfg.width}px;height:${cfg.height}px;border-radius:50%;background:${cfg.background};border:${cfg.border};pointer-events:none;transform-origin:center;will-change:transform;contain:layout paint style;box-shadow:none;filter:none;`;
    el.style.marginLeft=`${LEGACY_TRANSLATE_X-cfg.width/2}px`;
    el.style.marginTop=`${LEGACY_TRANSLATE_Y-cfg.height-FLOOR_CLEARANCE}px`;
    return el;
  }

  function poolFor(kind){return kind==='vulcan'?vulcanPool:kind==='spread'?spreadPool:null}
  function create(kind){
    const cfg=config[kind];
    if(!cfg)return null;
    const pool=poolFor(kind);
    let el=pool&&pool.length?pool.pop():null;
    if(!el)el=createElement(kind,cfg);
    el.style.display='block';
    layer.appendChild(el);
    return el;
  }

  function update(el,sceneX,sceneY,angleDeg){
    if(!el||!Number.isFinite(sceneX)||!Number.isFinite(sceneY)||!Number.isFinite(angleDeg))return;
    el.style.transform=`translate3d(${sceneX-LEGACY_TRANSLATE_X}px,${sceneY-LEGACY_TRANSLATE_Y}px,0) rotate(${angleDeg}deg)`;
  }

  function remove(el){
    if(!el)return;
    const pool=poolFor(el.dataset.projectileKind);
    if(pool&&pool.length<6){
      el.style.display='none';
      el.style.transform='translate3d(-9999px,-9999px,0)';
      el.remove();
      pool.push(el);
      return;
    }
    el.remove();
  }

  function refreshSize(){
    layer.style.width=`${scene.clientWidth}px`;
    layer.style.height=`${scene.clientHeight}px`;
  }

  window.addEventListener('resize',refreshSize,{passive:true});
  requestAnimationFrame(syncTransform);
  window.BattleNetworkBusterProjectile=Object.freeze({create,update,remove,refreshSize});
})();