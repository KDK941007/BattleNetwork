(()=>{
  const DEFAULTS=Object.freeze({
    fullSyncWindowMs:180,
    enemyAttackRecoveryMs:250,
    attackCooldownMs:3000,
    enemyApproachStopTiles:1
  });
  window.BattleNetworkCombatDefaults=DEFAULTS;
})();
