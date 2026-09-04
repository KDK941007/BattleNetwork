(()=>{
  const scene=document.getElementById('scene');
  const RANGE=window.BattleNetworkCombatRange;
  if(!scene||!RANGE)return;

  const AIRSHOT_ID='CHIP_EXE4_S004';
  const style=document.createElement('style');
  style.id='airshotFinalEffectStyle';
  style.textContent=`
    .bullet.cannon.airshotFinalEffect{
      overflow:visible!important;
      border:0!important;
      pointer-events:none!important;
      transform-origin:center!important;
      width:104px!important;
      height:72px!important;
      border-radius:50%!important;
      background:radial-gradient(ellipse at 68% 50%,rgba(251,255,255,.98) 0 9%,rgba(207,252,255,.92) 20%,rgba(118,231,249,.74) 42%,rgba(71,199,229,.33) 65%,transparent 80%)!important;
      box-shadow:0 0 22px rgba(177,250,255,.94),0 0 50px rgba(92,220,244,.68),0 0 78px rgba(64,185,221,.34)!important;
      filter:blur(.2px) saturate(1.05);
    }
    .bullet.cannon.airshotFinalEffect::before{
      content:"";
      position:absolute;
      right:48%;
      top:50%;
      width:220px;
      height:124px;
      transform:translateY(-50%);
      background:
        radial-gradient(ellipse at 90% 50%,rgba(220,253,255,.70) 0 16%,rgba(135,235,251,.42) 34%,transparent 61%),
        radial-gradient(ellipse at 66% 28%,rgba(161,242,253,.42) 0 18%,rgba(95,215,241,.20) 42%,transparent 64%),
        radial-gradient(ellipse at 48% 74%,rgba(136,232,248,.38) 0 20%,rgba(73,201,233,.18) 44%,transparent 66%),
        radial-gradient(ellipse at 22% 46%,rgba(103,216,241,.29) 0 18%,transparent 58%);
      filter:blur(8px);
      opacity:1;
    }
    .bullet.cannon.airshotFinalEffect::after{
      content:"";
      position:absolute;
      right:38%;
      top:50%;
      width:188px;
      height:102px;
      border-radius:50%;
      border-top:9px solid rgba(214,253,255,.88);
      border-bottom:9px solid rgba(126,232,251,.72);
      border-left:5px solid rgba(83,205,237,.32);
      transform:translateY(-50%) scaleY(.72);
      box-shadow:0 0 15px rgba(136,238,253,.72),inset 0 0 18px rgba(107,226,248,.28);
      opacity:.94;
    }
  `;
  document.head.appendChild(style);

  function isAirShotContext(){
    const context=RANGE.getLastAttackContext?.();
    return context?.sourceType==='CHIP'&&context?.sourceId===AIRSHOT_ID;
  }

  function decorate(projectile){
    if(!(projectile instanceof HTMLElement)||!projectile.matches('.bullet.cannon'))return false;
    if(!isAirShotContext())return false;
    projectile.classList.add('airshotFinalEffect');
    return true;
  }

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

  window.BattleNetworkAirShotEffect=Object.freeze({
    mode:'A3_FINAL',
    decorate
  });
})();
