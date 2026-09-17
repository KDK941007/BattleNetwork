(()=>{
  const RANGE=window.BattleNetworkRangeGeometry;
  const ENEMY=window.BattleNetworkEnemy;
  const DATA=window.BattleNetworkData;
  const FIELD=window.BattleNetworkField;
  const MASTER=window.BattleNetworkMaster;
  const KOKORO=window.BattleNetworkKokoro;
  const FULL_SYNC=window.BattleNetworkFullSynchro;
  const ENEMY_STATUS=window.BattleNetworkEnemyStatus;
  if(!RANGE)throw new Error('BattleNetworkCombatHitTest: range geometry is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkCombatHitTest: enemy foundation is not loaded.');
  if(!DATA)throw new Error('BattleNetworkCombatHitTest: master data is not loaded.');
  if(!FIELD)throw new Error('BattleNetworkCombatHitTest: field grid is not loaded.');

  let lastObservedAttack=null;
  function perf(name,fn){const p=window.BattleNetworkPerfTest;return p?.measure?p.measure(name,fn):fn()}
  function trace(name,detail=''){window.BattleNetworkPerfTest?.trace?.(name,detail)}
  function behaviorParam(behaviorId,paramId,fallback){const row=DATA.BEHAVIOR_PARAM_MASTER?.find(item=>item.behaviorId===behaviorId&&item.paramId===paramId);const value=Number(row?.defaultValue);return Number.isFinite(value)?value:fallback}
  function testRange(shape){return ENEMY.getHitEnemies(shape)}
  function chipBasePower(attack,damage){
    const explicit=Number(attack?.kokoroBasePower);
    if(Number.isFinite(explicit)&&explicit>0)return explicit;
    const value=MASTER?.getChipValues?.(attack?.sourceId)?.find(item=>item.valueTypeId==='DAMAGE');
    const masterPower=Number(value?.value);
    if(Number.isFinite(masterPower)&&masterPower>0)return masterPower;
    const fallback=Number(damage);
    return Number.isFinite(fallback)&&fallback>0?fallback:null;
  }
  function applyChipKokoro(attack,damage,result){
    if(attack?.sourceType!=='CHIP'||result?.applied!==true||!(Number(result.amount)>0)||!KOKORO?.applyChipHit)return null;
    return KOKORO.applyChipHit({
      basePower:chipBasePower(attack,damage),
      damage:Number(damage),
      sourceType:'CHIP',
      sourceId:attack.sourceId??null,
      attackId:attack.attackId??attack.sourceId??null,
      actionToken:attack.actionToken??attack.kokoroActionToken??attack.shotToken,
      kokoro:attack.kokoro,
      excludeKokoro:attack.excludeKokoro===true
    });
  }
  function isCounterHit(enemy,attack){return attack?.sourceType==='CHIP'&&FULL_SYNC?.isCounterWindowActive?.(enemy?.id)===true}
  function applyCounter(enemy,attack,result){
    if(result?.applied!==true||!(Number(result.amount)>0)||!FULL_SYNC?.triggerCounter)return null;
    const counter=FULL_SYNC.triggerCounter({sourceType:'CHIP',sourceId:attack?.sourceId??null,attackId:attack?.attackId??attack?.sourceId??null,enemyId:enemy?.id??null,blockedByAnger:attack?.angerApplied===true});
    if(result.defeatedNow!==true)ENEMY_STATUS?.applyParalysis?.(enemy.id,1500,{sourceType:'COUNTER',sourceId:attack?.sourceId??null,attackId:attack?.attackId??attack?.sourceId??null});
    return counter;
  }
  function damageAndFlash(enemy,damage,attack=null){
    const value=Number(damage),counterHit=isCounterHit(enemy,attack);
    const result=Number.isFinite(value)&&value>0?ENEMY.applyDamage(enemy.id,value):null;
    if(result){if(counterHit)applyCounter(enemy,attack,result);else applyChipKokoro(attack,value,result)}
    ENEMY.debugFlash(enemy.id);
    return result;
  }
  function flashHits(shape,damage=null,attack=null){const hits=testRange(shape);hits.forEach(enemy=>damageAndFlash(enemy,damage,attack));return hits}
  function rayEntryDistance(origin,direction,bounds,padding=0){const left=bounds.left-padding,right=bounds.right+padding,top=bounds.top-padding,bottom=bounds.bottom+padding;let near=0,far=Infinity;for(const [o,d,min,max] of [[origin.x,direction.x,left,right],[origin.y,direction.y,top,bottom]]){if(Math.abs(d)<1e-9){if(o<min||o>max)return null;continue}let a=(min-o)/d,b=(max-o)/d;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return null}return far>=0?Math.max(0,near):null}
  function getFirstCannonHit(input){
    const attack=input?.shape?input:{shape:input};const shape=attack.shape;
    if(!shape||shape.rangeTypeId!=='LINE')return null;
    return perf('firstHit',()=>{let first=null;testRange(shape).forEach(enemy=>{const distance=rayEntryDistance(shape.origin,shape.direction,enemy.bounds,(shape.widthWorld||0)/2);if(distance===null||distance>shape.lengthWorld)return;if(!first||distance<first.distance)first={enemy,distance}});return first?Object.freeze({enemy:first.enemy,distance:first.distance}):null});
  }
  function isAirShot(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId==='CHIP_EXE4_S004'}
  function isVulcan1(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId==='CHIP_EXE4_S005'}
  function isDarkVulcan(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId==='CHIP_DARK_VULCAN'}
  function isSpreadGun(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId==='CHIP_EXE4_S008'}
  function isCannon(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId==='CHIP_0001'}
  function airShotSpeed(){return 4000}function vulcan1Speed(){return 4000}function spreadGunSpeed(){return 4000}
  function cannonSpeed(){const value=Number(window.BattleNetworkTestSettings?.getCannonSettings?.().projectileSpeed);return Number.isFinite(value)&&value>0?value:2000}
  function pushAirShotEnemy(enemyId,direction){const enemy=ENEMY.getEnemy(enemyId);if(!enemy||enemy.isDefeated)return false;const dir=RANGE.normalizeDirection(direction);const distance=FIELD.toWorldDistance(1);const result=ENEMY.setPosition(enemyId,enemy.x+dir.x*distance,enemy.y+dir.y*distance);return result?.applied===true}
  function eightDirectionStep(direction){
    const dir=RANGE.normalizeDirection(direction),stepAngle=Math.PI/4,index=Math.round(Math.atan2(dir.y,dir.x)/stepAngle),angle=index*stepAngle;
    return{x:Math.round(Math.cos(angle)),y:Math.round(Math.sin(angle))};
  }
  function getVulcanInductionTile(enemy,direction){
    if(!enemy)return null;
    const hitTile=FIELD.worldToTile(enemy.x,enemy.y),step=eightDirectionStep(direction),row=hitTile.row+step.y,col=hitTile.col+step.x;
    return FIELD.getTile(row,col);
  }
  function triggerVulcanInduction(tile,damage,excludeEnemyId=null,attack=null){
    if(!tile)return Object.freeze([]);
    const hits=[];
    for(const occupantId of FIELD.getOccupantsAt?.(tile.row,tile.col)||[]){
      const match=/^enemy:(\d+)$/.exec(String(occupantId));
      if(!match)continue;
      const enemyId=Number(match[1]);
      if(enemyId===excludeEnemyId)continue;
      const enemy=ENEMY.getEnemy(enemyId);
      if(!enemy||enemy.isDefeated)continue;
      damageAndFlash(enemy,damage,attack);hits.push(enemyId);
    }
    window.dispatchEvent(new CustomEvent('battlenetwork:vulcan-induction',{detail:Object.freeze({row:tile.row,col:tile.col,damage:Number(damage)||0,enemyIds:Object.freeze(hits.slice())})}));
    return Object.freeze(hits);
  }
  function scheduleCannon(attack){
    const airShot=isAirShot(attack),vulcan1=isVulcan1(attack),darkVulcan=isDarkVulcan(attack),vulcanInduction=vulcan1||darkVulcan,spreadGun=isSpreadGun(attack),cannon=isCannon(attack);const speed=airShot?airShotSpeed():vulcanInduction?vulcan1Speed():spreadGun?spreadGunSpeed():cannon?cannonSpeed():behaviorParam('CANNON_SHOT','PROJECTILE_SPEED',2000);if(!(speed>0))return;
    const initial=getFirstCannonHit(attack);if(!initial)return;if(spreadGun)trace('SPREAD:scheduled',`${initial.distance.toFixed(0)}u`);
    const resolveAtDistance=travelled=>{
      const candidate=getFirstCannonHit(attack);if(!candidate)return;
      const delay=Math.max(0,candidate.distance-travelled)/speed*1000;
      setTimeout(()=>{
        const current=getFirstCannonHit(attack);
        if(!current)return;
        if(current.enemy.id!==candidate.enemy.id||current.distance>candidate.distance+.5){resolveAtDistance(Math.max(travelled,candidate.distance));return}
        const target=current.enemy;
        if(spreadGun)trace('SPREAD:directHit:start');
        const inductionTile=vulcanInduction?getVulcanInductionTile(target,attack.shape.direction):null;
        const result=damageAndFlash(target,attack.damage,attack);
        if(airShot&&!result?.defeatedNow)pushAirShotEnemy(target.id,attack.shape.direction);
        if(vulcanInduction&&result?.applied)triggerVulcanInduction(inductionTile,attack.damage,target.id,attack);
        if(spreadGun){window.BattleNetworkSpreadGun?.onDirectHit?.(attack,target);trace('SPREAD:directHit:end')}
      },delay);
    };
    resolveAtDistance(0);
  }
  function scheduleBomb(attack){const behaviorDelayMs=Math.max(0,behaviorParam('BOMB_THROW','EXPLOSION_DELAY',.28))*1000,visualThrowMs=attack?.sourceId==='CHIP_0004'?Number(window.BattleNetworkMiniBombEffect?.throwMs):NaN,delayMs=Number.isFinite(visualThrowMs)&&visualThrowMs>=0?visualThrowMs:behaviorDelayMs;setTimeout(()=>flashHits(attack.shape,attack.damage,attack),delayMs)}
  function resolveBehavior(input){if(!input)return;const attack=input.shape?input:{shape:input,damage:null};const shape=attack.shape;if(!shape)return;if(isSpreadGun(attack))trace('SPREAD:attackObserved');if(shape.rangeTypeId==='LINE'){scheduleCannon(attack);return}if(shape.rangeTypeId==='RECT'){flashHits(shape,attack.damage,attack);return}if(shape.rangeTypeId==='CIRCLE')scheduleBomb(attack)}
  function observeAttackRange(){const combatRange=window.BattleNetworkCombatRange;const attack=combatRange?.getLastAttackContext?.()||null;if(attack&&attack!==lastObservedAttack){lastObservedAttack=attack;resolveBehavior(attack)}requestAnimationFrame(observeAttackRange)}
  window.BattleNetworkCombatHitTest=Object.freeze({testRange,flashHits,resolveBehavior,getFirstCannonHit,getVulcanInductionTile,triggerVulcanInduction});requestAnimationFrame(observeAttackRange);
})();