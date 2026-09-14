(()=>{
  const PLAYER=window.BattleNetworkPlayer;
  const ANGER=window.BattleNetworkAnger;
  const CUSTOM_MODAL=document.getElementById('customModal');
  const SETTINGS_MODAL=document.getElementById('settingsModal');
  const CHIP_DETAIL_MODAL=document.getElementById('chipDetailModal');
  const BATTLE=document.getElementById('battle');
  if(!PLAYER)throw new Error('BattleNetworkPlayerStatus: player foundation is not loaded.');

  const DEFAULT_PARALYSIS_MS=1500;
  const SOURCE_ID='PLAYER_PARALYSIS';
  let remainingMs=0;
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
  function syncPlayerLock(){
    if(!isParalyzed())return;
    const current=Number(PLAYER.getRemainingHitStunMs?.())||0;
    if(current+80<remainingMs)PLAYER.beginHitStun?.(remainingMs);
  }
  function clear(reason='EXPIRED'){
    if(!isParalyzed())return false;
    remainingMs=0;
    ANGER?.setIncapacitated?.(SOURCE_ID,false);
    if(frameId){cancelAnimationFrame(frameId);frameId=0}
    window.dispatchEvent(new CustomEvent('battlenetwork:playerparalysischange',{detail:Object.freeze({active:false,reason,remainingMs:0})}));
    return true;
  }
  function frame(now){
    frameId=0;
    const delta=Math.max(0,now-lastAt);lastAt=now;
    if(!isParalyzed())return;
    if(battleTimeRunning()){
      remainingMs=Math.max(0,remainingMs-delta);
      if(remainingMs<=0){clear('EXPIRED');return}
      syncPlayerLock();
    }
    frameId=requestAnimationFrame(frame);
  }
  function ensureLoop(){if(frameId||!isParalyzed())return;lastAt=performance.now();frameId=requestAnimationFrame(frame)}
  function applyParalysis(durationMs=DEFAULT_PARALYSIS_MS,context={}){
    const duration=Number(durationMs);
    if(!Number.isFinite(duration)||duration<=0)return Object.freeze({applied:false,reason:'INVALID_DURATION',remainingMs:getRemainingMs()});
    remainingMs=Math.max(remainingMs,duration);
    ANGER?.setIncapacitated?.(SOURCE_ID,true);
    syncPlayerLock();
    ensureLoop();
    const snapshot=Object.freeze({applied:true,reason:null,remainingMs:getRemainingMs(),context:Object.freeze({...context})});
    window.dispatchEvent(new CustomEvent('battlenetwork:playerparalysischange',{detail:Object.freeze({active:true,reason:'APPLIED',remainingMs:getRemainingMs(),context:snapshot.context})}));
    return snapshot;
  }
  document.addEventListener('visibilitychange',()=>{lastAt=performance.now();if(isParalyzed())ensureLoop()});
  window.BattleNetworkPlayerStatus=Object.freeze({DEFAULT_PARALYSIS_MS,applyParalysis,isParalyzed,getRemainingParalysisMs:getRemainingMs,clearParalysis:clear});
})();
