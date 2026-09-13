(()=>{
  const HUD=window.BattleNetworkPlayerHud;
  const PLAYER_EL=document.getElementById('player');
  const SCENE=PLAYER_EL?.parentElement||null;
  if(!HUD||!PLAYER_EL||!SCENE)throw new Error('BattleNetworkFullSynchro: required dependency is missing.');

  const RESET_VALUE=153;
  const ringBack=document.createElement('div');
  const ringFront=document.createElement('div');
  ringBack.className='fullSynchroRingLayer back';
  ringFront.className='fullSynchroRingLayer front';
  ringBack.setAttribute('aria-hidden','true');
  ringFront.setAttribute('aria-hidden','true');
  SCENE.appendChild(ringBack);
  SCENE.appendChild(ringFront);

  let destroyed=false;
  let frameId=0;
  let lastTransform='';
  let lastWidth=0;
  let lastHeight=0;
  let resizeObserver=null;

  function isActive(){
    return HUD.getKokoroValue?.()===255||HUD.getKokoroState?.()==='FULL_SYNCHRO';
  }

  function isAttackChip(chip){
    const power=Number(chip?.power);
    return Number.isFinite(power)&&power>0;
  }

  function applyToChip(chip){
    const beforePower=Number(chip?.power);
    if(!isActive()||!isAttackChip(chip)){
      return Object.freeze({chip,applied:false,beforePower:Number.isFinite(beforePower)?beforePower:null,afterPower:Number.isFinite(beforePower)?beforePower:null,resetValue:null});
    }
    const afterPower=beforePower*2;
    const powered=Object.freeze({...chip,power:afterPower,fullSynchroApplied:true,fullSynchroBasePower:beforePower});
    HUD.setKokoroValue(RESET_VALUE);
    return Object.freeze({chip:powered,applied:true,beforePower,afterPower,resetValue:RESET_VALUE});
  }

  function isCounterWindowActive(enemyId){
    const snapshot=window.BattleNetworkEnemyAI?.getBehaviorSnapshot?.(enemyId,'ATTACK');
    return snapshot?.fullSyncActive===true;
  }

  function triggerCounter(context={}){
    if(context.sourceType!=='CHIP'){
      return Object.freeze({applied:false,reason:'NOT_ATTACK_CHIP',before:HUD.getKokoroValue(),after:HUD.getKokoroValue()});
    }
    const before=HUD.getKokoroValue();
    const after=HUD.setKokoroValue(255);
    return Object.freeze({applied:true,reason:null,before,after,enemyId:context.enemyId??null,sourceId:context.sourceId??null});
  }

  function applyRingSize(width,height){
    const nextWidth=Number(width);
    const nextHeight=Number(height);
    if(!Number.isFinite(nextWidth)||!Number.isFinite(nextHeight)||nextWidth<=0||nextHeight<=0)return;
    if(nextWidth===lastWidth&&nextHeight===lastHeight)return;
    lastWidth=nextWidth;
    lastHeight=nextHeight;
    for(const ring of [ringBack,ringFront]){
      ring.style.width=`${nextWidth*2}px`;
      ring.style.height=`${nextHeight*2}px`;
      ring.style.marginLeft=`${-nextWidth/2}px`;
      ring.style.marginTop=`${-nextHeight/2}px`;
    }
  }

  function syncInitialRingSize(){
    applyRingSize(PLAYER_EL.offsetWidth,PLAYER_EL.offsetHeight);
  }

  function observeRingSize(){
    if(typeof ResizeObserver!=='function')return;
    resizeObserver=new ResizeObserver(entries=>{
      const entry=entries[0];
      if(!entry)return;
      const borderBox=entry.borderBoxSize;
      const box=Array.isArray(borderBox)?borderBox[0]:borderBox;
      const width=Number(box?.inlineSize)||PLAYER_EL.offsetWidth;
      const height=Number(box?.blockSize)||PLAYER_EL.offsetHeight;
      applyRingSize(width,height);
    });
    resizeObserver.observe(PLAYER_EL);
  }

  function syncRingTransform(){
    const transform=PLAYER_EL.style.transform||'';
    if(transform!==lastTransform){
      lastTransform=transform;
      ringBack.style.transform=transform;
      ringFront.style.transform=transform;
    }
    if(!destroyed)frameId=requestAnimationFrame(syncRingTransform);
  }

  function syncVisual(snapshot=HUD.getKokoroSnapshot?.()){
    const active=snapshot?.state==='FULL_SYNCHRO';
    PLAYER_EL.classList.toggle('fullSynchro',active);
    ringBack.classList.toggle('active',active);
    ringFront.classList.toggle('active',active);
  }

  const unsubscribe=typeof HUD.subscribeKokoro==='function'?HUD.subscribeKokoro(syncVisual):null;
  syncInitialRingSize();
  observeRingSize();
  syncVisual();
  syncRingTransform();

  window.BattleNetworkFullSynchro=Object.freeze({
    RESET_VALUE,
    isActive,
    isAttackChip,
    applyToChip,
    isCounterWindowActive,
    triggerCounter,
    destroy(){
      destroyed=true;
      if(frameId)cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      if(typeof unsubscribe==='function')unsubscribe();
      PLAYER_EL.classList.remove('fullSynchro');
      ringBack.remove();
      ringFront.remove();
    }
  });
})();
