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
    Object.freeze({forward:-1,lateral:-1}),
    Object.freeze({forward:-1,lateral:0}),
    Object.freeze({forward:-1,lateral:1}),
    Object.freeze({forward:0,lateral:-1}),
    Object.freeze({forward:0,lateral:1}),
    Object.freeze({forward:1,lateral:-1}),
    Object.freeze({forward:1,lateral:0}),
    Object.freeze({forward:1,lateral:1})
  ]);

  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  svg.setAttribute('aria-hidden','true');
  svg.dataset.testOnly='spreadgun-explosion-cells';
  svg.style.cssText='display:none;position:absolute;overflow:visible;pointer-events:none;z-index:8;contain:layout paint style;';
  path.setAttribute('fill','rgba(94,225,255,.25)');
  path.setAttribute('stroke','rgba(196,250,255,.95)');
  path.setAttribute('stroke-width','2');
  path.setAttribute('vector-effect','non-scaling-stroke');
  svg.appendChild(path);
  scene.appendChild(svg);
  let hideTimer=null;

  function perf(name,fn){const p=window.BattleNetworkPerfTest;return p?.measure?p.measure(name,fn):fn()}
  function isSpreadAttack(attack){return attack?.sourceType==='CHIP'&&attack?.sourceId===CHIP_ID}
  function project(point){return{x:(point.x-point.y)*PX+SW/2,y:(point.x+point.y)*PY}}

  function showExplosionCells(shapes){
    if(!Array.isArray(shapes)||!shapes.length)return;
    return perf('spreadVisual',()=>{
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      const polygons=[];
      for(const shape of shapes){
        const points=shape.points.map(project);
        for(const point of points){
          if(point.x<minX)minX=point.x;
          if(point.y<minY)minY=point.y;
          if(point.x>maxX)maxX=point.x;
          if(point.y>maxY)maxY=point.y;
        }
        polygons.push(points);
      }
      if(!Number.isFinite(minX)||!Number.isFinite(minY)||!Number.isFinite(maxX)||!Number.isFinite(maxY))return;
      const pad=4,left=Math.floor(minX-pad),top=Math.floor(minY-pad),width=Math.max(1,Math.ceil(maxX-minX+pad*2)),height=Math.max(1,Math.ceil(maxY-minY+pad*2));
      let d='';
      for(const points of polygons){
        d+=`M ${points[0].x-left} ${points[0].y-top}`;
        for(let i=1;i<points.length;i++)d+=` L ${points[i].x-left} ${points[i].y-top}`;
        d+=' Z ';
      }
      path.setAttribute('d',d);
      svg.style.left=`${left}px`;
      svg.style.top=`${top}px`;
      svg.style.width=`${width}px`;
      svg.style.height=`${height}px`;
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      svg.style.display='block';
      if(hideTimer!==null)clearTimeout(hideTimer);
      hideTimer=setTimeout(()=>{svg.style.display='none';hideTimer=null},VISUAL_MS);
    });
  }

  function onDirectHit(attack,directEnemy){
    if(!isSpreadAttack(attack)||!directEnemy)return false;
    return perf('directHit',()=>{
      const shapes=perf('spreadCalc',()=>RELATIVE.createRelativeCells({
        center:{x:directEnemy.x,y:directEnemy.y},
        direction:attack.shape?.direction,
        offsets:OFFSETS,
        cellSizeTiles:1
      }));
      const hits=perf('spreadCalc',()=>RELATIVE.getHitEnemies(shapes,{excludeIds:[directEnemy.id]}));
      const damage=Number(attack.damage);
      perf('spreadDamage',()=>{
        if(Number.isFinite(damage)&&damage>0){
          for(const enemy of hits)ENEMY.applyDamage(enemy.id,damage);
        }
      });
      showExplosionCells(shapes);
      window.BattleNetworkSpreadGun.lastExplosion=Object.freeze({
        sourceToken:attack.shotToken,
        center:Object.freeze({x:directEnemy.x,y:directEnemy.y}),
        direction:Object.freeze({...RANGE.normalizeDirection(attack.shape?.direction)}),
        shapes,
        hitEnemyIds:Object.freeze(hits.map(enemy=>enemy.id))
      });
      return true;
    });
  }

  window.BattleNetworkSpreadGun={CHIP_ID,OFFSETS,lastExplosion:null,onDirectHit};
})();
