(()=>{
  const attackLocks=new Set();
  const perception=new Map();
  let patternIndex=1;
  // Temporary device-test patterns: shockwave speed 520 is selected; vary only attack telegraph duration.
  const patterns=Object.freeze([
    Object.freeze({id:'A',label:'A',moveSpeedWorld:95,telegraphMs:850,fullSyncWindowMs:180,recoveryMs:350,cooldownMs:1250,projectileSpeed:520,maxRangeTiles:5}),
    Object.freeze({id:'B',label:'B',moveSpeedWorld:95,telegraphMs:700,fullSyncWindowMs:180,recoveryMs:350,cooldownMs:1250,projectileSpeed:520,maxRangeTiles:5}),
    Object.freeze({id:'C',label:'C',moveSpeedWorld:95,telegraphMs:550,fullSyncWindowMs:180,recoveryMs:350,cooldownMs:1250,projectileSpeed:520,maxRangeTiles:5})
  ]);
  function getPattern(){return patterns[patternIndex]}
  function cyclePattern(){patternIndex=(patternIndex+1)%patterns.length;return getPattern()}
  function isAttackLocked(enemyId){return attackLocks.has(enemyId)}
  function setAttackLocked(enemyId,locked){locked?attackLocks.add(enemyId):attackLocks.delete(enemyId)}
  function getPerception(enemyId){return perception.get(enemyId)===true}
  function setPerception(enemyId,value){perception.set(enemyId,value===true)}
  function clearEnemy(enemyId){attackLocks.delete(enemyId);perception.delete(enemyId)}
  window.BattleNetworkEnemy1Runtime=Object.freeze({patterns,getPattern,cyclePattern,isAttackLocked,setAttackLocked,getPerception,setPerception,clearEnemy});
})();
