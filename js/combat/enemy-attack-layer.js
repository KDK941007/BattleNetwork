(()=>{
  const battle=document.getElementById('battle');
  const scene=document.getElementById('scene');
  const FIELD=window.BattleNetworkField;
  if(!battle||!scene||!FIELD)throw new Error('BattleNetworkEnemyAttackLayer: required dependency is missing.');

  const layer=document.createElement('div');
  layer.id='enemyAttackLayer';
  layer.style.position='absolute';
  layer.style.left='0';
  layer.style.top='0';
  layer.style.width=`${scene.clientWidth}px`;
  layer.style.height=`${scene.clientHeight}px`;
  layer.style.transformOrigin='0 0';
  layer.style.pointerEvents='none';
  layer.style.willChange='transform';
  layer.style.contain='layout paint style';
  layer.style.zIndex='8';
  battle.appendChild(layer);

  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;
  let lastSceneTransform='';

  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function syncTransform(){
    const next=scene.style.transform||'';
    if(next!==lastSceneTransform){layer.style.transform=next;lastSceneTransform=next}
    requestAnimationFrame(syncTransform);
  }
  function refreshSize(){layer.style.width=`${scene.clientWidth}px`;layer.style.height=`${scene.clientHeight}px`}

  function createTelegraph(){
    const el=document.createElement('div');
    el.className='enemyTestTelegraph';
    el.style.cssText='display:none;position:absolute;height:6px;transform-origin:0 50%;background:rgba(255,76,76,.72);border:1px solid rgba(255,230,120,.95);border-radius:4px;box-shadow:0 0 5px rgba(255,70,70,.45);pointer-events:none;will-change:transform;contain:layout paint style;';
    layer.appendChild(el);
    return el;
  }
  function showTelegraph(el,origin,end){
    if(!el||!origin||!end)return;
    const a=project(origin.x,origin.y),b=project(end.x,end.y);
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
    el.style.width=`${length}px`;
    el.style.transform=`translate3d(${a.x}px,${a.y-24}px,0) rotate(${angle}deg)`;
    el.style.display='block';
  }
  function hideTelegraph(el){if(el)el.style.display='none'}

  function createProjectile(){
    const el=document.createElement('div');
    el.className='enemyTestProjectile';
    el.style.cssText='display:none;position:absolute;width:28px;height:14px;border-radius:50%;background:#ff4a50;border:2px solid #ffd66d;box-shadow:0 0 8px rgba(255,80,80,.65);pointer-events:none;transform-origin:center;will-change:transform;contain:layout paint style;';
    layer.appendChild(el);
    return el;
  }
  function showProjectile(el,x,y){if(!el)return;el.style.display='block';updateProjectile(el,x,y)}
  function updateProjectile(el,x,y){
    if(!el||!Number.isFinite(x)||!Number.isFinite(y))return;
    const p=project(x,y);
    el.style.transform=`translate3d(${p.x-14}px,${p.y-31}px,0)`;
  }
  function hideProjectile(el){if(el)el.style.display='none'}
  function destroy(el){el?.remove()}

  window.addEventListener('resize',refreshSize,{passive:true});
  requestAnimationFrame(syncTransform);
  window.BattleNetworkEnemyAttackLayer=Object.freeze({createTelegraph,showTelegraph,hideTelegraph,createProjectile,showProjectile,updateProjectile,hideProjectile,destroy,refreshSize});
})();
