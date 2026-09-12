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

  function syncRingGeometry(){
    const transform=PLAYER_EL.style.transform||'';
    if(transform!==lastTransform){
      lastTransform=transform;
      ringBack.style.transform=transform;
      ringFront.style.transform=transform;
    }
    const width=PLAYER_EL.offsetWidth;
    const height=PLAYER_EL.offsetHeight;
    if(width!==lastWidth||height!==lastHeight){
      lastWidth=width;
      lastHeight=height;
      for(const ring of [ringBack,ringFront]){
        ring.style.width=`${width*2}px`;
        ring.style.height=`${height*2}px`;
        ring.style.marginLeft=`${-width/2}px`;
        ring.style.marginTop=`${-height/2}px`;
      }
    }
    if(!destroyed)frameId=requestAnimationFrame(syncRingGeometry);
  }

  function syncVisual(snapshot=HUD.getKokoroSnapshot?.()){
    const active=snapshot?.state==='FULL_SYNCHRO';
    PLAYER_EL.classList.toggle('fullSynchro',active);
    ringBack.classList.toggle('active',active);
    ringFront.classList.toggle('active',active);
  }

  const unsubscribe=typeof HUD.subscribeKokoro==='function'?HUD.subscribeKokoro(syncVisual):null;
  syncVisual();
  syncRingGeometry();

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
      if(typeof unsubscribe==='function')unsubscribe();
      PLAYER_EL.classList.remove('fullSynchro');
      ringBack.remove();
      ringFront.remove();
    }
  });
})();
