(()=>{
  const RANGE=window.BattleNetworkRangeGeometry;
  const ENEMY=window.BattleNetworkEnemy;
  const DATA=window.BattleNetworkData;
  const FIELD=window.BattleNetworkField;
  if(!RANGE)throw new Error('BattleNetworkCombatHitTest: range geometry is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkCombatHitTest: enemy foundation is not loaded.');
  if(!DATA)throw new Error('BattleNetworkCombatHitTest: master data is not loaded.');
  if(!FIELD)throw new Error('BattleNetworkCombatHitTest: field grid is not loaded.');

  let lastObservedAttack=null;
  const firstLineHitCache=new WeakMap();
  function perf(name,fn){const p=window.BattleNetworkPerfTest;return p?.measure?p.measure(name,fn):fn()}
  function trace(name,detail=''){window.BattleNetworkPerfTest?.trace?.(name,detail)}
  function behaviorParam(behaviorId,paramId,fallback){const row=DATA.BEHAVIOR_PARAM_MASTER?.find(item=>item.behaviorId===behaviorId&&item.paramId===paramId);const value=Number(row?.defaultValue);return Number.isFinite(value)?value:fallback}
  function testRange(shape){return ENEMY.getHitEnemies(shape)}
  function damageAndFlash(enemy,damage){const value=Number(damage);const result=Number.isFinite(value)&&value>0?ENEMY.applyDamage(enemy.id,value):null;ENEMY.debugFlash(enemy.id);return result}
  function flashHits(shape,damage=null){const hits=testRange(shape);hits.forEach(enemy=>damageAndFlash(enemy,damage));return hits}
  function rayEntryDistance(origin,direction,bounds,padding=0){const left=bounds.left-padding,right=bounds.right+padding,top=bounds.top-padding,bottom=bounds.bottom+padding;let near=0,far=Infinity;for(const [o,d,min,max] of [[origin.x,direction.x,left,right],[origin.y,direction.y,top,bottom]]){if(Math.abs(d)<1e-9){if(o<min||o>max)return null;continue}let a=(min-o)/d,b=(max-o)/d;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return null}return far>=0?Math.max(0,near):null}
  function getFirstCannonHit(input){
    const attack=input?.shape?input:{shape:input};const shape=attack.shape;
    if(!shape||shape.rangeTypeId!=='LINE')return null;if(firstLineHitCache.has(shape))return firstLineHitCache.get(shape);
    return perf('firstHit',()=>{let first=null;testRange(shape).forEach(enemy=>{const distance=rayEntryDistance(shape.origin,shape.direction,enemy.bounds,(shape.widthWorld||0)/2);if(distance===null||distance>shape.lengthWorld)return;if(!first||distance<first.distance)first={enemy,distance}});const result=first?Object.freeze({enemy:first.enemy,distance:first.distance}):null;firstLineHitCache.set(shape,result);return result});
  }
  function isAirShot(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId==='CHIP_EXE4_S004'}
  function isVulcan1(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId==='CHIP_EXE4_S005'}
  function isSpreadGun(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId==='CHIP_EXE4_S008'}
  function isCannon(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId==='CHIP_0001'}
  function airShotSpeed(){return 4000}function vulcan1Speed(){return 4000}function spreadGunSpeed(){return 4000}
  function cannonSpeed(){const value=Number(window.BattleNetworkTestSettings?.getCannonSettings?.().projectileSpeed);return Number.isFinite(value)&&value>0?value:2000}
  function pushAirShotEnemy(enemyId,direction){const enemy=ENEMY.getEnemy(enemyId);if(!enemy||enemy.isDefeated)return false;const dir=RANGE.normalizeDirection(direction);const distance=FIELD.toWorldDistance(1);const result=ENEMY.setPosition(enemyId,enemy.x+dir.x*distance,enemy.y+dir.y*distance);return result?.applied===true}
  function scheduleCannon(attack){
    const airShot=isAirShot(attack),vulcan1=isVulcan1(attack),spreadGun=isSpreadGun(attack),cannon=isCannon(attack);const speed=airShot?airShotSpeed():vulcan1?vulcan1Speed():spreadGun?spreadGunSpeed():cannon?cannonSpeed():behaviorParam('CANNON_SHOT','PROJECTILE_SPEED',2000);if(!(speed>0))return;
    const first=getFirstCannonHit(attack);if(!first)return;if(spreadGun)trace('SPREAD:scheduled',`${first.distance.toFixed(0)}u`);
    setTimeout(()=>{if(spreadGun)trace('SPREAD:directHit:start');const result=damageAndFlash(first.enemy,attack.damage);if(airShot&&!result?.defeatedNow)pushAirShotEnemy(first.enemy.id,attack.shape.direction);if(spreadGun){window.BattleNetworkSpreadGun?.onDirectHit?.(attack,first.enemy);trace('SPREAD:directHit:end')}},first.distance/speed*1000)
  }
  function scheduleBomb(attack){const delay=behaviorParam('BOMB_THROW','EXPLOSION_DELAY',.28);setTimeout(()=>flashHits(attack.shape,attack.damage),Math.max(0,delay)*1000)}
  function resolveBehavior(input){if(!input)return;const attack=input.shape?input:{shape:input,damage:null};const shape=attack.shape;if(!shape)return;if(isSpreadGun(attack))trace('SPREAD:attackObserved');if(shape.rangeTypeId==='LINE'){scheduleCannon(attack);return}if(shape.rangeTypeId==='RECT'){flashHits(shape,attack.damage);return}if(shape.rangeTypeId==='CIRCLE')scheduleBomb(attack)}
  function observeAttackRange(){const combatRange=window.BattleNetworkCombatRange;const attack=combatRange?.getLastAttackContext?.()||null;if(attack&&attack!==lastObservedAttack){lastObservedAttack=attack;resolveBehavior(attack)}requestAnimationFrame(observeAttackRange)}
  window.BattleNetworkCombatHitTest=Object.freeze({testRange,flashHits,resolveBehavior,getFirstCannonHit});requestAnimationFrame(observeAttackRange);
})();
