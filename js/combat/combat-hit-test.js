(()=>{
  const RANGE=window.BattleNetworkRangeGeometry;
  const ENEMY=window.BattleNetworkEnemy;
  const DATA=window.BattleNetworkData;
  if(!RANGE)throw new Error('BattleNetworkCombatHitTest: range geometry is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkCombatHitTest: enemy foundation is not loaded.');
  if(!DATA)throw new Error('BattleNetworkCombatHitTest: master data is not loaded.');

  let lastObservedAttack=null;

  function behaviorParam(behaviorId,paramId,fallback){
    const row=DATA.BEHAVIOR_PARAM_MASTER?.find(item=>item.behaviorId===behaviorId&&item.paramId===paramId);
    const value=Number(row?.defaultValue);
    return Number.isFinite(value)?value:fallback;
  }

  function testRange(shape){return ENEMY.getHitEnemies(shape)}

  function damageAndFlash(enemy,damage){
    const value=Number(damage);
    if(Number.isFinite(value)&&value>0)ENEMY.applyDamage(enemy.id,value);
    ENEMY.debugFlash(enemy.id);
  }

  function flashHits(shape,damage=null){
    const hits=testRange(shape);
    hits.forEach(enemy=>damageAndFlash(enemy,damage));
    return hits;
  }

  function rayEntryDistance(origin,direction,bounds,padding=0){
    const left=bounds.left-padding,right=bounds.right+padding,top=bounds.top-padding,bottom=bounds.bottom+padding;
    let near=0,far=Infinity;
    for(const [o,d,min,max] of [[origin.x,direction.x,left,right],[origin.y,direction.y,top,bottom]]){
      if(Math.abs(d)<1e-9){if(o<min||o>max)return null;continue}
      let a=(min-o)/d,b=(max-o)/d;
      if(a>b)[a,b]=[b,a];
      near=Math.max(near,a);far=Math.min(far,b);
      if(near>far)return null;
    }
    return far>=0?Math.max(0,near):null;
  }

  function scheduleCannon(attack){
    const shape=attack.shape;
    const speed=behaviorParam('CANNON_SHOT','PROJECTILE_SPEED',900);
    if(!shape||!(speed>0))return;
    const hits=testRange(shape);
    hits.forEach(enemy=>{
      const distance=rayEntryDistance(shape.origin,shape.direction,enemy.bounds,(shape.widthWorld||0)/2);
      if(distance===null||distance>shape.lengthWorld)return;
      setTimeout(()=>damageAndFlash(enemy,attack.damage),distance/speed*1000);
    });
  }

  function scheduleBomb(attack){
    const delay=behaviorParam('BOMB_THROW','EXPLOSION_DELAY',.28);
    setTimeout(()=>flashHits(attack.shape,attack.damage),Math.max(0,delay)*1000);
  }

  function resolveBehavior(input){
    if(!input)return;
    const attack=input.shape?input:{shape:input,damage:null};
    const shape=attack.shape;
    if(!shape)return;
    if(shape.rangeTypeId==='LINE'){scheduleCannon(attack);return}
    if(shape.rangeTypeId==='RECT'){flashHits(shape,attack.damage);return}
    if(shape.rangeTypeId==='CIRCLE')scheduleBomb(attack);
  }

  function observeAttackRange(){
    const combatRange=window.BattleNetworkCombatRange;
    const attack=combatRange?.getLastAttackContext?.()||null;
    if(attack&&attack!==lastObservedAttack){
      lastObservedAttack=attack;
      resolveBehavior(attack);
    }
    requestAnimationFrame(observeAttackRange);
  }

  window.BattleNetworkCombatHitTest=Object.freeze({testRange,flashHits,resolveBehavior});
  requestAnimationFrame(observeAttackRange);
})();
