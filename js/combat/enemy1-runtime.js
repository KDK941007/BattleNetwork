(()=>{
  const attackLocks=new Set();
  const perception=new Map();
  const CHASE_POLICY=Object.freeze({ALWAYS_WHILE_AWARE:'ALWAYS_WHILE_AWARE',STOP_IN_ATTACK_RANGE:'STOP_IN_ATTACK_RANGE'});
  const enemyConfig=Object.freeze({chasePolicy:CHASE_POLICY.STOP_IN_ATTACK_RANGE});
  let patternIndex=0;
  // Current confirmed enemy1 values. The PATTERN UI is kept as temporary test infrastructure for the next tuning item.
  const patterns=Object.freeze([
    Object.freeze({id:'A',label:'A',moveSpeedWorld:95,telegraphMs:850,fullSyncWindowMs:180,recoveryMs:250,cooldownMs:1250,projectileSpeed:520,maxRangeTiles:5})
  ]);
  function getPattern(){return patterns[patternIndex]}
  function cyclePattern(){patternIndex=(patternIndex+1)%patterns.length;return getPattern()}
  function getEnemyConfig(){return enemyConfig}
  function isAttackLocked(enemyId){return attackLocks.has(enemyId)}
  function setAttackLocked(enemyId,locked){locked?attackLocks.add(enemyId):attackLocks.delete(enemyId)}
  function getPerception(enemyId){return perception.get(enemyId)===true}
  function setPerception(enemyId,value){perception.set(enemyId,value===true)}
  function clearEnemy(enemyId){attackLocks.delete(enemyId);perception.delete(enemyId)}
  window.BattleNetworkEnemy1Runtime=Object.freeze({CHASE_POLICY,patterns,getPattern,cyclePattern,getEnemyConfig,isAttackLocked,setAttackLocked,getPerception,setPerception,clearEnemy});
})();
