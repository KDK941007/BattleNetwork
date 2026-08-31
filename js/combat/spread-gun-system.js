(()=>{
  const RANGE=window.BattleNetworkRangeGeometry;
  const ENEMY=window.BattleNetworkEnemy;
  const RELATIVE=window.BattleNetworkRelativeCellRange;
  const FIELD=window.BattleNetworkField;
  const scene=document.getElementById('scene');
  if(!RANGE||!ENEMY||!RELATIVE||!FIELD||!scene)throw new Error('BattleNetworkSpreadGun: required dependency is missing.');

  const CHIP_ID='CHIP_EXE4_S008';
  const VISUAL_MS=450;
  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;
  const OFFSETS=Object.freeze([
    Object.freeze({forward:-1,lateral:-1}),Object.freeze({forward:-1,lateral:0}),Object.freeze({forward:-1,lateral:1}),
    Object.freeze({forward:0,lateral:-1}),Object.freeze({forward:0,lateral:1}),
    Object.freeze({forward:1,lateral:-1}),Object.freeze({forward:1,lateral:0}),Object.freeze({forward:1,lateral:1})
  ]);

  function isSpreadAttack(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId===CHIP_ID}
  function project(point){return{x:(point.x-point.y)*PX+SW/2,y:(point.x+point.y)*PY}}
  function showExplosionCells(shapes){
    if(!Array.isArray(shapes)||!shapes.length)return;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    svg.setAttribute('viewBox',`0 0 ${SW} ${FIELD.WORLD_SIZE*PY*2}`);svg.setAttribute('width',String(SW));svg.setAttribute('height',String(FIELD.WORLD_SIZE*PY*2));svg.setAttribute('aria-hidden','true');svg.dataset.testOnly='spreadgun-explosion-cells';
    svg.style.cssText='position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:8;opacity:.8;';
    let d='';
    for(const shape of shapes){const pts=shape.points.map(project);if(!pts.length)continue;d+=`M${pts[0].x} ${pts[0].y}`;for(let i=1;i<pts.length;i++)d+=`L${pts[i].x} ${pts[i].y}`;d+='Z'}
    path.setAttribute('d',d);path.setAttribute('fill','rgba(94,225,255,.25)');path.setAttribute('stroke','rgba(196,250,255,.95)');path.setAttribute('stroke-width','2');path.setAttribute('vector-effect','non-scaling-stroke');svg.appendChild(path);scene.appendChild(svg);setTimeout(()=>svg.remove(),VISUAL_MS);
  }
  function onDirectHit(attack,directEnemy){
    if(!isSpreadAttack(attack)||!directEnemy)return false;
    const shapes=RELATIVE.createRelativeCells({center:{x:directEnemy.x,y:directEnemy.y},direction:attack.shape?.direction,offsets:OFFSETS,cellSizeTiles:1});
    const hits=RELATIVE.getHitEnemies(shapes,{excludeIds:[directEnemy.id]});
    const damage=Number(attack.damage);
    if(Number.isFinite(damage)&&damage>0)for(const enemy of hits){ENEMY.applyDamage(enemy.id,damage);ENEMY.debugFlash(enemy.id)}
    showExplosionCells(shapes);
    window.BattleNetworkSpreadGun.lastExplosion=Object.freeze({sourceToken:attack.shotToken,center:Object.freeze({x:directEnemy.x,y:directEnemy.y}),direction:Object.freeze({...RANGE.normalizeDirection(attack.shape?.direction)}),shapes,hitEnemyIds:Object.freeze(hits.map(enemy=>enemy.id))});
    return true;
  }
  window.BattleNetworkSpreadGun={CHIP_ID,OFFSETS,lastExplosion:null,onDirectHit};
})();