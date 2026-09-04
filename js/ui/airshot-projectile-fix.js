(()=>{
  const testTarget=window.BattleNetworkFolder?.getTestTarget?.();
  if(!testTarget?.enabled||testTarget.type!=='AIRSHOT')return;

  const scene=document.getElementById('scene');
  const battle=document.getElementById('battle');
  if(!scene||!battle)return;

  const styleSource=document.getElementById('attackEffectReviewStyle')?.textContent||'';
  const imageMatch=styleSource.match(/background-image\s*:\s*url\(["']?(data:image\/webp;base64,[^)"']+)["']?\)/i);
  const projectileImage=imageMatch?.[1]||null;
  if(!projectileImage){
    console.warn('BattleNetwork: AirShot projectile image source was not found.');
    return;
  }

  const style=document.createElement('style');
  style.id='airshotProjectileFixStyle';
  style.textContent=`
    .battle[data-airshot-projectile="reference"] .bullet.cannon::before{content:none!important}
    .battle[data-airshot-projectile="reference"] .bullet.cannon{
      width:18px!important;height:68px!important;border:0!important;border-radius:0!important;
      background:transparent!important;box-shadow:none!important;overflow:visible!important;
    }
    .airshotProjectileReferenceImage{
      position:absolute;left:-188px;top:-34px;width:240px;height:136px;display:block;
      object-fit:fill;opacity:.84;pointer-events:none;user-select:none;-webkit-user-drag:none;
      filter:drop-shadow(0 0 9px rgba(224,252,255,.34));
    }
  `;
  document.head.appendChild(style);

  function decorate(projectile){
    if(!(projectile instanceof HTMLElement)||!projectile.matches('.bullet.cannon'))return;
    if(projectile.querySelector('.airshotProjectileReferenceImage'))return;
    const img=document.createElement('img');
    img.className='airshotProjectileReferenceImage';
    img.alt='';
    img.draggable=false;
    img.src=projectileImage;
    projectile.appendChild(img);
  }

  scene.querySelectorAll('.bullet.cannon').forEach(decorate);
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(!(node instanceof HTMLElement))continue;
        if(node.matches('.bullet.cannon'))decorate(node);
        node.querySelectorAll?.('.bullet.cannon').forEach(decorate);
      }
    }
  });
  observer.observe(scene,{childList:true,subtree:true});

  window.BattleNetworkAirShotProjectileFix=Object.freeze({
    isActive:()=>true,
    decorate
  });
})();
