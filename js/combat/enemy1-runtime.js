(()=>{
  const attackLocks=new Set();
  const perception=new Map();
  let patternIndex=1;
  const patterns=Object.freeze([
    Object.freeze({id:'A',label:'A',moveSpeedWorld:80,telegraphMs:850,fullSyncWindowMs:180,recoveryMs:450,cooldownMs:1500,projectileSpeed:520,maxRangeTiles:4}),
    Object.freeze({id:'B',label:'B',moveSpeedWorld:95,telegraphMs:700,fullSyncWindowMs:180,recoveryMs:350,cooldownMs:1250,projectileSpeed:620,maxRangeTiles:5}),
    Object.freeze({id:'C',label:'C',moveSpeedWorld:110,telegraphMs:600,fullSyncWindowMs:160,recoveryMs:300,cooldownMs:1050,projectileSpeed:720,maxRangeTiles:6})
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
