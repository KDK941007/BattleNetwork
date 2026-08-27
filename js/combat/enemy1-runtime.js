(()=>{
  const DEFAULTS=window.BattleNetworkCombatDefaults;
  if(!DEFAULTS)throw new Error('BattleNetworkEnemy1Runtime: combat defaults are not loaded.');
  const attackLocks=new Set();
  const perception=new Map();
  const debugListeners=new Set();
  const CHASE_POLICY=Object.freeze({ALWAYS_WHILE_AWARE:'ALWAYS_WHILE_AWARE',STOP_IN_ATTACK_RANGE:'STOP_IN_ATTACK_RANGE'});
  const enemyConfig=Object.freeze({chasePolicy:CHASE_POLICY.STOP_IN_ATTACK_RANGE,perceptionStartTiles:5,perceptionReleaseTiles:8});
  let patternIndex=1;
  let debugState={enabled:false,showPerception:true,showAttackGlow:true};
  // Temporary device-test patterns: vary only attack range. Confirmed values remain fixed.
  const patterns=Object.freeze([
    Object.freeze({id:'A',label:'A',moveSpeedWorld:95,telegraphMs:850,fullSyncWindowMs:DEFAULTS.fullSyncWindowMs,recoveryMs:DEFAULTS.enemyAttackRecoveryMs,cooldownMs:DEFAULTS.attackCooldownMs,projectileSpeed:520,maxRangeTiles:4}),
    Object.freeze({id:'B',label:'B',moveSpeedWorld:95,telegraphMs:850,fullSyncWindowMs:DEFAULTS.fullSyncWindowMs,recoveryMs:DEFAULTS.enemyAttackRecoveryMs,cooldownMs:DEFAULTS.attackCooldownMs,projectileSpeed:520,maxRangeTiles:5}),
    Object.freeze({id:'C',label:'C',moveSpeedWorld:95,telegraphMs:850,fullSyncWindowMs:DEFAULTS.fullSyncWindowMs,recoveryMs:DEFAULTS.enemyAttackRecoveryMs,cooldownMs:DEFAULTS.attackCooldownMs,projectileSpeed:520,maxRangeTiles:6})
  ]);
  function getPattern(){return patterns[patternIndex]}
  function cyclePattern(){patternIndex=(patternIndex+1)%patterns.length;return getPattern()}
  function getEnemyConfig(){return enemyConfig}
  function getDebugState(){return Object.freeze({...debugState})}
  function emitDebug(){const snapshot=getDebugState();debugListeners.forEach(fn=>{try{fn(snapshot)}catch(error){console.error('BattleNetworkEnemy1Runtime debug listener failed.',error)}});return snapshot}
  function setDebugEnabled(value){debugState={...debugState,enabled:value===true};return emitDebug()}
  function setDebugOption(name,value){if(name!=='showPerception'&&name!=='showAttackGlow')return getDebugState();debugState={...debugState,[name]:value===true};return emitDebug()}
  function subscribeDebug(fn){if(typeof fn!=='function')return()=>{};debugListeners.add(fn);fn(getDebugState());return()=>debugListeners.delete(fn)}
  function isAttackLocked(enemyId){return attackLocks.has(enemyId)}
  function setAttackLocked(enemyId,locked){locked?attackLocks.add(enemyId):attackLocks.delete(enemyId)}
  function getPerception(enemyId){return perception.get(enemyId)===true}
  function setPerception(enemyId,value){perception.set(enemyId,value===true)}
  function clearEnemy(enemyId){attackLocks.delete(enemyId);perception.delete(enemyId)}
  window.BattleNetworkEnemy1Runtime=Object.freeze({CHASE_POLICY,patterns,getPattern,cyclePattern,getEnemyConfig,getDebugState,setDebugEnabled,setDebugOption,subscribeDebug,isAttackLocked,setAttackLocked,getPerception,setPerception,clearEnemy});
})();
