(()=>{
  const RANGE=window.BattleNetworkRangeGeometry;
  const ENEMY=window.BattleNetworkEnemy;
  if(!RANGE)throw new Error('BattleNetworkCombatHitTest: range geometry is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkCombatHitTest: enemy foundation is not loaded.');

  let lastObservedRange=null;

  function testRange(shape){
    return ENEMY.getHitEnemies(shape);
  }

  function flashHits(shape){
    const hits=testRange(shape);
    hits.forEach(enemy=>ENEMY.debugFlash(enemy.id));
    return hits;
  }

  function observeAttackRange(){
    const combatRange=window.BattleNetworkCombatRange;
    const shape=combatRange?.getLastAttackRange?.()||null;
    if(shape&&shape!==lastObservedRange){
      lastObservedRange=shape;
      flashHits(shape);
    }
    requestAnimationFrame(observeAttackRange);
  }

  window.BattleNetworkCombatHitTest=Object.freeze({testRange,flashHits});
  requestAnimationFrame(observeAttackRange);
})();
