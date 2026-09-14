(()=>{
  const PLAYER=window.BattleNetworkPlayer;
  const ANGER=window.BattleNetworkAnger;
  const PLAYER_EL=document.getElementById('player');
  const CUSTOM_MODAL=document.getElementById('customModal');
  const SETTINGS_MODAL=document.getElementById('settingsModal');
  const CHIP_DETAIL_MODAL=document.getElementById('chipDetailModal');
  const BATTLE=document.getElementById('battle');
  if(!PLAYER||!PLAYER_EL)throw new Error('BattleNetworkPlayerStatus: player foundation is not loaded.');

  const DEFAULT_PARALYSIS_MS=1500;
  const ANGER_TRIGGER_MS=2000;
  const SOURCE_ID='PLAYER_PARALYSIS';
  let remainingMs=0;
  let activeElapsedMs=0;
  let angerTriggerChecked=false;
  let frameId=0;
  let lastAt=performance.now();

  function waveIsActive(){const wave=window.BattleNetworkWave?.getSnapshot?.();return !wave||wave.status==='ACTIVE'}
  function battleTimeRunning(){
    if(document.visibilityState==='hidden')return false;
    if(PLAYER.isDefeated?.())return false;
    if(!waveIsActive())return false;
    if(CUSTOM_MODAL?.classList.contains('open'))return false;
    if(SETTINGS_MODAL?.classList.contains('open'))return false;
    if(CHIP_DETAIL_MODAL?.classList.contains('open'))return false;
    if(BATTLE?.classList.contains('editMode'))return false;
    if(window.BattleNetworkAreaSteal?.isActive?.()===true)return false;
    return true;
  }
  function isParalyzed(){return remainingMs>0}
  function getRemainingMs(){return Math.max(0,remainingMs)}
  function syncVisual(){PLAYER_EL.classList.toggle('statusParalyzed',isParalyzed())}
  function syncPlayerLock(){
    if(!isParalyzed())return;
    const current=Number(PLAYER.getRemainingHitStunMs?.())||0;
    if(current+80<remainingMs)PLAYER.beginHitStun?.(remainingMs);
  }
  function clear(reason='EXPIRED'){
    const hadState=isParalyzed()||PLAYER_EL.classList.contains('statusParalyzed');
    remainingMs=0;
    activeElapsedMs=0;
    angerTriggerChecked=false;
    syncVisual();
    ANGER?.setIncapacitated?.(SOURCE_ID,false);
    if(frameId){cancelAnimationFrame(frameId);frameId=0}
    if(!hadState)return false;
    window.dispatchEvent(new CustomEvent('battlenetwork:playerparalysischange',{detail:Object.freeze({active:false,reason,remainingMs:0})}));
    return true;
  }
  function triggerAngerIfNeeded(){
    if(angerTriggerChecked||activeElapsedMs<ANGER_TRIGGER_MS)return;
    angerTriggerChecked=true;
    if(ANGER?.isActive?.()!==true)ANGER?.trigger?.('CONTINUOUS_INCAPACITATION',{sourceId:SOURCE_ID,seconds:activeElapsedMs/1000,status:'PARALYSIS'});
  }
  function frame(now){
    frameId=0;
    const delta=Math.max(0,now-lastAt);lastAt=now;
    if(!isParalyzed())return;
    if(battleTimeRunning()){
      remainingMs=Math.max(0,remainingMs-delta);
      activeElapsedMs+=delta;
      triggerAngerIfNeeded();
      if(remainingMs<=0){clear('EXPIRED');return}
      syncPlayerLock();
    }
    frameId=requestAnimationFrame(frame);
  }
  function ensureLoop(){if(frameId||!isParalyzed())return;lastAt=performance.now();frameId=requestAnimationFrame(frame)}
  function applyParalysis(durationMs=DEFAULT_PARALYSIS_MS,context={}){
    const duration=Number(durationMs);
    if(!Number.isFinite(duration)||duration<=0)return Object.freeze({applied:false,reason:'INVALID_DURATION',remainingMs:getRemainingMs()});
    const startingNewEpisode=!isParalyzed();
    remainingMs=Math.max(remainingMs,duration);
    if(startingNewEpisode){activeElapsedMs=0;angerTriggerChecked=false}
    syncVisual();
    ANGER?.setIncapacitated?.(SOURCE_ID,true);
    syncPlayerLock();
    ensureLoop();
    const snapshot=Object.freeze({applied:true,reason:null,remainingMs:getRemainingMs(),context:Object.freeze({...context})});
    window.dispatchEvent(new CustomEvent('battlenetwork:playerparalysischange',{detail:Object.freeze({active:true,reason:'APPLIED',remainingMs:getRemainingMs(),context:snapshot.context})}));
    return snapshot;
  }
  document.addEventListener('visibilitychange',()=>{lastAt=performance.now();if(isParalyzed())ensureLoop()});
  syncVisual();
  window.BattleNetworkPlayerStatus=Object.freeze({DEFAULT_PARALYSIS_MS,ANGER_TRIGGER_MS,applyParalysis,isParalyzed,getRemainingParalysisMs:getRemainingMs,clearParalysis:clear});
})();
