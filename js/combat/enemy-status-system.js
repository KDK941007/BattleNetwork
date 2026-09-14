(()=>{
  const ENEMY=window.BattleNetworkEnemy;
  const CUSTOM_MODAL=document.getElementById('customModal');
  const SETTINGS_MODAL=document.getElementById('settingsModal');
  const CHIP_DETAIL_MODAL=document.getElementById('chipDetailModal');
  const BATTLE=document.getElementById('battle');
  if(!ENEMY)throw new Error('BattleNetworkEnemyStatus: enemy foundation is not loaded.');

  const DEFAULT_PARALYSIS_MS=1500;
  const paralysis=new Map();
  let frameId=0;
  let lastAt=performance.now();

  function waveIsActive(){const wave=window.BattleNetworkWave?.getSnapshot?.();return !wave||wave.status==='ACTIVE'}
  function battleTimeRunning(){
    if(document.visibilityState==='hidden')return false;
    if(!waveIsActive())return false;
    if(CUSTOM_MODAL?.classList.contains('open'))return false;
    if(SETTINGS_MODAL?.classList.contains('open'))return false;
    if(CHIP_DETAIL_MODAL?.classList.contains('open'))return false;
    if(BATTLE?.classList.contains('editMode'))return false;
    return true;
  }
  function cleanupMissing(){for(const enemyId of [...paralysis.keys()])if(!ENEMY.getEnemy(enemyId))paralysis.delete(enemyId)}
  function isParalyzed(enemyId){const entry=paralysis.get(Number(enemyId));return !!entry&&entry.remainingMs>0}
  function getRemainingMs(enemyId){return Math.max(0,paralysis.get(Number(enemyId))?.remainingMs||0)}
  function clearParalysis(enemyId,reason='CLEARED'){
    const id=Number(enemyId);if(!paralysis.has(id))return false;
    paralysis.delete(id);
    window.dispatchEvent(new CustomEvent('battlenetwork:enemyparalysischange',{detail:Object.freeze({enemyId:id,active:false,reason,remainingMs:0})}));
    return true;
  }
  function frame(now){
    frameId=0;
    const delta=Math.max(0,now-lastAt);lastAt=now;
    cleanupMissing();
    if(battleTimeRunning())for(const [enemyId,entry] of [...paralysis.entries()]){
      entry.remainingMs=Math.max(0,entry.remainingMs-delta);
      if(entry.remainingMs<=0)clearParalysis(enemyId,'EXPIRED');
    }
    if(paralysis.size)frameId=requestAnimationFrame(frame);
  }
  function ensureLoop(){if(frameId||!paralysis.size)return;lastAt=performance.now();frameId=requestAnimationFrame(frame)}
  function applyParalysis(enemyId,durationMs=DEFAULT_PARALYSIS_MS,context={}){
    const id=Number(enemyId),enemy=ENEMY.getEnemy(id),duration=Number(durationMs);
    if(!enemy||enemy.isDefeated)return Object.freeze({applied:false,reason:'ENEMY_UNAVAILABLE',enemyId:id,remainingMs:getRemainingMs(id)});
    if(!Number.isFinite(duration)||duration<=0)return Object.freeze({applied:false,reason:'INVALID_DURATION',enemyId:id,remainingMs:getRemainingMs(id)});
    const current=paralysis.get(id);
    paralysis.set(id,{remainingMs:Math.max(current?.remainingMs||0,duration)});
    ensureLoop();
    const detail=Object.freeze({enemyId:id,active:true,reason:'APPLIED',remainingMs:getRemainingMs(id),context:Object.freeze({...context})});
    window.dispatchEvent(new CustomEvent('battlenetwork:enemyparalysischange',{detail}));
    return Object.freeze({applied:true,reason:null,enemyId:id,remainingMs:getRemainingMs(id)});
  }
  function clearAll(reason='CLEAR_ALL'){for(const enemyId of [...paralysis.keys()])clearParalysis(enemyId,reason);if(frameId){cancelAnimationFrame(frameId);frameId=0}}
  document.addEventListener('visibilitychange',()=>{lastAt=performance.now();if(paralysis.size)ensureLoop()});
  window.BattleNetworkEnemyStatus=Object.freeze({DEFAULT_PARALYSIS_MS,applyParalysis,isParalyzed,getRemainingParalysisMs:getRemainingMs,clearParalysis,clearAll});
})();
