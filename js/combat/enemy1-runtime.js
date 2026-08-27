(()=>{
  const DEFAULTS=window.BattleNetworkCombatDefaults;
  if(!DEFAULTS)throw new Error('BattleNetworkEnemy1Runtime: combat defaults are not loaded.');
  const attackLocks=new Set();
  const perception=new Map();
  const nextAttackAt=new Map();
  const debugListeners=new Set();
  const CHASE_POLICY=Object.freeze({ALWAYS_WHILE_AWARE:'ALWAYS_WHILE_AWARE',OVERLAP_COOLDOWN_CHASE:'OVERLAP_COOLDOWN_CHASE'});
  const CHASE_DISTANCE_MODE=Object.freeze({APPROACH:'APPROACH',KEEP_BAND:'KEEP_BAND'});
  const ATTACK_DEFAULTS=Object.freeze({projectileSpeed:520,damage:10});
  const enemyConfig=Object.freeze({chasePolicy:CHASE_POLICY.OVERLAP_COOLDOWN_CHASE,chaseDistanceMode:CHASE_DISTANCE_MODE.APPROACH,perceptionStartTiles:5,perceptionReleaseTiles:8,chaseRangeTiles:8,approachStopTiles:DEFAULTS.enemyApproachStopTiles,keepDistanceMinTiles:null,keepDistanceMaxTiles:null});
  let patternIndex=0;
  let debugState={enabled:false,showPerception:true,showAttackGlow:true};
  const patterns=Object.freeze([
    Object.freeze({id:'B',label:'B',moveSpeedWorld:DEFAULTS.enemyMoveSpeed,telegraphMs:DEFAULTS.enemyAttackTelegraphMs,fullSyncWindowMs:DEFAULTS.fullSyncWindowMs,recoveryMs:DEFAULTS.enemyAttackRecoveryMs,cooldownMs:DEFAULTS.attackCooldownMs,projectileSpeed:ATTACK_DEFAULTS.projectileSpeed,maxRangeTiles:enemyConfig.perceptionReleaseTiles})
  ]);
  function getPattern(){return patterns[patternIndex]}
  function cyclePattern(){patternIndex=(patternIndex+1)%patterns.length;return getPattern()}
  function getEnemyConfig(){return enemyConfig}
  function getAttackDefaults(){return ATTACK_DEFAULTS}
  function getDebugState(){return Object.freeze({...debugState})}
  function emitDebug(){const snapshot=getDebugState();debugListeners.forEach(fn=>{try{fn(snapshot)}catch(error){console.error('BattleNetworkEnemy1Runtime debug listener failed.',error)}});return snapshot}
  function setDebugEnabled(value){debugState={...debugState,enabled:value===true};return emitDebug()}
  function setDebugOption(name,value){if(name!=='showPerception'&&name!=='showAttackGlow')return getDebugState();debugState={...debugState,[name]:value===true};return emitDebug()}
  function subscribeDebug(fn){if(typeof fn!=='function')return()=>{};debugListeners.add(fn);fn(getDebugState());return()=>debugListeners.delete(fn)}
  function isAttackLocked(enemyId){return attackLocks.has(enemyId)}
  function setAttackLocked(enemyId,locked){locked?attackLocks.add(enemyId):attackLocks.delete(enemyId)}
  function getPerception(enemyId){return perception.get(enemyId)===true}
  function setPerception(enemyId,value){perception.set(enemyId,value===true)}
  function setNextAttackAt(enemyId,value){nextAttackAt.set(enemyId,Number(value)||0)}
  function getNextAttackAt(enemyId){return nextAttackAt.get(enemyId)||0}
  function isAttackReady(enemyId,now=performance.now()){return now>=getNextAttackAt(enemyId)}
  function clearEnemy(enemyId){attackLocks.delete(enemyId);perception.delete(enemyId);nextAttackAt.delete(enemyId)}
  window.BattleNetworkEnemy1Runtime=Object.freeze({CHASE_POLICY,CHASE_DISTANCE_MODE,ATTACK_DEFAULTS,patterns,getPattern,cyclePattern,getEnemyConfig,getAttackDefaults,getDebugState,setDebugEnabled,setDebugOption,subscribeDebug,isAttackLocked,setAttackLocked,getPerception,setPerception,setNextAttackAt,getNextAttackAt,isAttackReady,clearEnemy});
})();
