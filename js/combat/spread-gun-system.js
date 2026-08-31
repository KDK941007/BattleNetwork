(()=>{
  const RANGE=window.BattleNetworkRangeGeometry;
  const ENEMY=window.BattleNetworkEnemy;
  const RELATIVE=window.BattleNetworkRelativeCellRange;
  const HIT_TEST=window.BattleNetworkCombatHitTest;
  const A=document.getElementById('A');
  if(!RANGE||!ENEMY||!RELATIVE||!HIT_TEST||!A)throw new Error('BattleNetworkSpreadGun: required dependency is missing.');

  const CHIP_ID='CHIP_EXE4_S008';
  const PROJECTILE_SPEED=4000;
  const OFFSETS=Object.freeze([
    Object.freeze({forward:-1,lateral:-1}),
    Object.freeze({forward:-1,lateral:0}),
    Object.freeze({forward:-1,lateral:1}),
    Object.freeze({forward:0,lateral:-1}),
    Object.freeze({forward:0,lateral:1}),
    Object.freeze({forward:1,lateral:-1}),
    Object.freeze({forward:1,lateral:0}),
    Object.freeze({forward:1,lateral:1})
  ]);
  const handledTokens=new Set();

  function isSpreadAttack(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId===CHIP_ID}

  function applySpreadExplosion(attack,first){
    if(!attack||!first?.enemy)return;
    const shapes=RELATIVE.createRelativeCells({
      center:{x:first.enemy.x,y:first.enemy.y},
      direction:attack.shape?.direction,
      offsets:OFFSETS,
      cellSizeTiles:1
    });
    const hits=RELATIVE.getHitEnemies(shapes,{excludeIds:[first.enemy.id]});
    const damage=Number(attack.damage);
    if(Number.isFinite(damage)&&damage>0){
      for(const enemy of hits){
        ENEMY.applyDamage(enemy.id,damage);
        ENEMY.debugFlash(enemy.id);
      }
    }
    window.BattleNetworkSpreadGun.lastExplosion=Object.freeze({
      sourceToken:attack.shotToken,
      center:Object.freeze({x:first.enemy.x,y:first.enemy.y}),
      direction:Object.freeze({...RANGE.normalizeDirection(attack.shape?.direction)}),
      shapes,
      hitEnemyIds:Object.freeze(hits.map(enemy=>enemy.id))
    });
  }

  function scheduleSpreadExplosion(attack){
    const token=attack?.shotToken;
    if(token==null||handledTokens.has(token))return false;
    handledTokens.add(token);
    const first=HIT_TEST.getFirstCannonHit({shape:attack.shape});
    if(!first)return false;
    const delayMs=Math.max(0,first.distance/PROJECTILE_SPEED*1000);
    setTimeout(()=>applySpreadExplosion(attack,first),delayMs);
    if(handledTokens.size>64){
      const oldest=handledTokens.values().next().value;
      handledTokens.delete(oldest);
    }
    return true;
  }

  function captureSpreadContext(previousToken,attempt=0){
    const attack=window.BattleNetworkCombatRange?.getLastAttackContext?.()||null;
    if(isSpreadAttack(attack)&&attack.shotToken!==previousToken){
      scheduleSpreadExplosion(attack);
      return;
    }
    if(attempt>=20)return;
    setTimeout(()=>captureSpreadContext(previousToken,attempt+1),16);
  }

  A.addEventListener('pointerdown',()=>{
    const previousToken=window.BattleNetworkCombatRange?.getLastAttackContext?.()?.shotToken??null;
    setTimeout(()=>captureSpreadContext(previousToken,0),0);
  });

  window.BattleNetworkSpreadGun={
    CHIP_ID,
    PROJECTILE_SPEED,
    OFFSETS,
    lastExplosion:null,
    scheduleSpreadExplosion
  };
})();
