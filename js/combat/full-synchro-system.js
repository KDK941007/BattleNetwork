(()=>{
  const HUD=window.BattleNetworkPlayerHud;
  const PLAYER_EL=document.getElementById('player');
  if(!HUD||!PLAYER_EL)throw new Error('BattleNetworkFullSynchro: required dependency is missing.');

  const RESET_VALUE=153;

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

  function syncVisual(snapshot=HUD.getKokoroSnapshot?.()){
    PLAYER_EL.classList.toggle('fullSynchro',snapshot?.state==='FULL_SYNCHRO');
  }

  const unsubscribe=typeof HUD.subscribeKokoro==='function'?HUD.subscribeKokoro(syncVisual):null;
  syncVisual();

  window.BattleNetworkFullSynchro=Object.freeze({
    RESET_VALUE,
    isActive,
    isAttackChip,
    applyToChip,
    isCounterWindowActive,
    triggerCounter,
    destroy(){if(typeof unsubscribe==='function')unsubscribe();PLAYER_EL.classList.remove('fullSynchro')}
  });
})();
