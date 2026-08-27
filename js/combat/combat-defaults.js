(()=>{
  const PARAMS=window.BattleNetworkParameters;
  if(!PARAMS)throw new Error('BattleNetworkCombatDefaults: parameter system is not loaded.');
  const enemy=PARAMS.getBase('enemy');
  const DEFAULTS=Object.freeze({
    fullSyncWindowMs:enemy.fullSyncWindowMs,
    enemyAttackRecoveryMs:enemy.attackRecoveryMs,
    enemyAttackTelegraphMs:enemy.attackTelegraphMs,
    attackCooldownMs:enemy.attackCooldownMs,
    enemyApproachStopTiles:enemy.approachStopTiles,
    enemyPerceptionStartTiles:enemy.perceptionStartTiles,
    enemyPerceptionReleaseTiles:enemy.perceptionReleaseTiles,
    enemyChaseRangeTiles:enemy.chaseRangeTiles,
    enemyMoveSpeed:enemy.moveSpeed
  });
  window.BattleNetworkCombatDefaults=DEFAULTS;
})();
