(()=>{
  const scene=document.getElementById('scene');
  const RANGE=window.BattleNetworkCombatRange;
  if(!scene||!RANGE)return;

  const AIRSHOT_ID='CHIP_EXE4_S004';
  document.getElementById('airshotFinalEffectStyle')?.remove();
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

  const SWORD_IDS=new Set(['CHIP_0002','CHIP_0003','CHIP_EXE4_S056']);
  const BASE_FORWARD_OFFSET=150,OFFSET_STEP=10,PX=.72,PY=.36;
  let swordForwardOffset=BASE_FORWARD_OFFSET;

  function isSwordFamilyContext(){
    const context=RANGE.getLastAttackContext?.();
    if(context?.sourceType==='CHIP'&&SWORD_IDS.has(context.sourceId))return true;
    const target=window.BattleNetworkFolder?.getTestTarget?.();
    return target?.enabled===true&&['SWORD','WIDE','LONG'].includes(target.type);
  }

  function projectedDirection(){
    const direction=RANGE.getLastAttackContext?.()?.shape?.direction||window.BattleNetworkPlayer?.getFacing?.()||{x:1,y:0};
    let dx=Number(direction.x),dy=Number(direction.y);
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<.0001){dx=1;dy=0}
    const worldLength=Math.hypot(dx,dy)||1;
    dx/=worldLength;dy/=worldLength;
    const sx=(dx-dy)*PX,sy=(dx+dy)*PY,screenLength=Math.hypot(sx,sy)||1;
    return {x:sx/screenLength,y:sy/screenLength};
  }

  const previousAppendChild=scene.appendChild.bind(scene);
  scene.appendChild=function(node){
    if(node instanceof HTMLElement&&node.classList.contains('slash')&&isSwordFamilyContext()){
      const delta=swordForwardOffset-BASE_FORWARD_OFFSET;
      if(delta!==0){
        const direction=projectedDirection();
        const left=parseFloat(node.style.left)||0;
        const top=parseFloat(node.style.top)||0;
        node.style.left=`${left+direction.x*delta}px`;
        node.style.top=`${top+direction.y*delta}px`;
      }
      node.dataset.reviewForwardOffset=String(swordForwardOffset);
    }
    return previousAppendChild(node);
  };

  const battle=document.getElementById('battle');
  const offsetStyle=document.createElement('style');
  offsetStyle.id='swordOffsetReviewStyle';
  offsetStyle.textContent=`
    #swordOffsetReview{position:absolute;top:8px;right:8px;z-index:80;display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid rgba(174,235,255,.8);border-radius:8px;background:rgba(4,18,32,.86);box-shadow:0 0 12px rgba(86,205,255,.28);color:#e9fbff;font:700 11px/1 system-ui,sans-serif;pointer-events:auto}
    #swordOffsetReview .swordOffsetLabel{white-space:nowrap}
    #swordOffsetReview .swordOffsetValue{min-width:46px;text-align:center;font-variant-numeric:tabular-nums;color:#fff7a8}
    #swordOffsetReview button{width:42px;height:32px;padding:0;border:1px solid rgba(174,235,255,.72);border-radius:6px;background:rgba(20,71,101,.92);color:#fff;font:900 16px/1 system-ui,sans-serif;touch-action:manipulation}
    #swordOffsetReview button:active{transform:scale(.94);filter:brightness(1.22)}
  `;
  document.head.appendChild(offsetStyle);

  let offsetValue=null;
  function updateOffsetValue(){if(offsetValue)offsetValue.textContent=`${swordForwardOffset}px`}
  function setSwordForwardOffset(value){
    const next=Number(value);
    if(!Number.isFinite(next))return swordForwardOffset;
    swordForwardOffset=Math.round(next/OFFSET_STEP)*OFFSET_STEP;
    updateOffsetValue();
    return swordForwardOffset;
  }
  function adjustSwordForwardOffset(delta){return setSwordForwardOffset(swordForwardOffset+Number(delta||0))}

  if(battle&&!document.getElementById('swordOffsetReview')){
    const panel=document.createElement('div');
    panel.id='swordOffsetReview';
    panel.setAttribute('aria-label','ソード系エフェクト前方オフセット確認');
    const label=document.createElement('span');label.className='swordOffsetLabel';label.textContent='SWORD OFFSET';
    const minus=document.createElement('button');minus.type='button';minus.textContent='−10';minus.setAttribute('aria-label','前方オフセットを10ピクセル減らす');
    offsetValue=document.createElement('span');offsetValue.className='swordOffsetValue';
    const plus=document.createElement('button');plus.type='button';plus.textContent='+10';plus.setAttribute('aria-label','前方オフセットを10ピクセル増やす');
    minus.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();adjustSwordForwardOffset(-OFFSET_STEP)});
    plus.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();adjustSwordForwardOffset(OFFSET_STEP)});
    panel.addEventListener('pointerdown',e=>e.stopPropagation());
    panel.append(label,minus,offsetValue,plus);
    battle.appendChild(panel);
    updateOffsetValue();
  }

  window.BattleNetworkAirShotEffect=Object.freeze({mode:'A3_FINAL',decorate});
  window.BattleNetworkSwordOffsetReview=Object.freeze({
    version:'SWORD_OFFSET_REVIEW_V1',
    baseForwardOffset:BASE_FORWARD_OFFSET,
    step:OFFSET_STEP,
    getForwardOffset:()=>swordForwardOffset,
    setForwardOffset:setSwordForwardOffset,
    adjustForwardOffset:adjustSwordForwardOffset
  });
})();
