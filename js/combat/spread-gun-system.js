(()=>{
  const RANGE=window.BattleNetworkRangeGeometry;
  const ENEMY=window.BattleNetworkEnemy;
  const RELATIVE=window.BattleNetworkRelativeCellRange;
  const HIT_TEST=window.BattleNetworkCombatHitTest;
  const FIELD=window.BattleNetworkField;
  const scene=document.getElementById('scene');
  const A=document.getElementById('A');
  if(!RANGE||!ENEMY||!RELATIVE||!HIT_TEST||!FIELD||!scene||!A)throw new Error('BattleNetworkSpreadGun: required dependency is missing.');

  const CHIP_ID='CHIP_EXE4_S008';
  const PROJECTILE_SPEED=4000;
  const VISUAL_MS=450;
  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;
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
  function project(point){return{x:(point.x-point.y)*PX+SW/2,y:(point.x+point.y)*PY}}

  function showExplosionCells(shapes){
    if(!Array.isArray(shapes)||!shapes.length)return;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',`0 0 ${SW} ${FIELD.WORLD_SIZE*PY*2}`);
    svg.setAttribute('width',String(SW));
    svg.setAttribute('height',String(FIELD.WORLD_SIZE*PY*2));
    svg.setAttribute('aria-hidden','true');
    svg.dataset.testOnly='spreadgun-explosion-cells';
    svg.style.cssText='position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:8;opacity:1;transition:opacity 180ms linear;';
    for(const shape of shapes){
      const polygon=document.createElementNS('http://www.w3.org/2000/svg','polygon');
      polygon.setAttribute('points',shape.points.map(point=>{const p=project(point);return `${p.x},${p.y}`}).join(' '));
      polygon.setAttribute('fill','rgba(94,225,255,.34)');
      polygon.setAttribute('stroke','rgba(196,250,255,.98)');
      polygon.setAttribute('stroke-width','3');
      polygon.setAttribute('vector-effect','non-scaling-stroke');
      svg.appendChild(polygon);
    }
    scene.appendChild(svg);
    setTimeout(()=>{svg.style.opacity='0'},Math.max(0,VISUAL_MS-180));
    setTimeout(()=>svg.remove(),VISUAL_MS);
  }

  function applySpreadExplosion(attack,first){
    if(!attack||!first?.enemy)return;
    const shapes=RELATIVE.createRelativeCells({
      center:{x:first.enemy.x,y:first.enemy.y},
      direction:attack.shape?.direction,
      offsets:OFFSETS,
      cellSizeTiles:1
    });
    showExplosionCells(shapes);
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
