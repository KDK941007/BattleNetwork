(()=>{
  const FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,PLAYER=window.BattleNetworkPlayer,RUNTIME=window.BattleNetworkEnemy1Runtime;
  const battle=document.getElementById('battle'),scene=document.getElementById('scene');
  if(!FIELD||!ENEMY||!PLAYER||!RUNTIME||!battle||!scene)return;

  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2,SH=FIELD.WORLD_SIZE*PY*2;
  const NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox',`0 0 ${SW} ${SH}`);
  svg.dataset.testOnly='hitbox-debug-layer';
  svg.style.cssText=`position:absolute;left:0;top:0;width:${SW}px;height:${SH}px;overflow:visible;pointer-events:none;z-index:30;display:none;`;
  const playerPoly=document.createElementNS(NS,'polygon');
  playerPoly.setAttribute('fill','rgba(76,229,255,.12)');
  playerPoly.setAttribute('stroke','rgba(76,229,255,.98)');
  playerPoly.setAttribute('stroke-width','7');
  playerPoly.setAttribute('stroke-dasharray','18 10');
  playerPoly.setAttribute('vector-effect','non-scaling-stroke');
  svg.appendChild(playerPoly);
  scene.appendChild(svg);

  const enemyPolys=new Map();
  let requested=false,frame=null;

  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function points(bounds){
    if(!bounds)return '';
    const p1=project(bounds.left,bounds.top),p2=project(bounds.right,bounds.top),p3=project(bounds.right,bounds.bottom),p4=project(bounds.left,bounds.bottom);
    return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
  }
  function ensureEnemyPoly(id){
    let poly=enemyPolys.get(id);if(poly)return poly;
    poly=document.createElementNS(NS,'polygon');
    poly.setAttribute('fill','rgba(255,82,102,.12)');
    poly.setAttribute('stroke','rgba(255,82,102,.98)');
    poly.setAttribute('stroke-width','7');
    poly.setAttribute('stroke-dasharray','18 10');
    poly.setAttribute('vector-effect','non-scaling-stroke');
    svg.appendChild(poly);enemyPolys.set(id,poly);return poly;
  }
  function draw(){
    frame=null;
    const enabled=requested&&RUNTIME.getDebugState().enabled;
    if(!enabled){svg.style.display='none';return}
    svg.style.display='block';
    playerPoly.setAttribute('points',points(PLAYER.getBounds()));
    const active=ENEMY.getActiveEnemies(),ids=new Set();
    for(const enemy of active){ids.add(enemy.id);ensureEnemyPoly(enemy.id).setAttribute('points',points(enemy.bounds))}
    for(const [id,poly] of enemyPolys){if(!ids.has(id)){poly.remove();enemyPolys.delete(id)}}
    frame=requestAnimationFrame(draw);
  }
  function sync(){
    const enabled=requested&&RUNTIME.getDebugState().enabled;
    if(enabled){if(frame===null)frame=requestAnimationFrame(draw)}
    else{if(frame!==null){cancelAnimationFrame(frame);frame=null}svg.style.display='none'}
    renderButton();
  }
  function setEnabled(value){requested=value===true;sync();return requested}
  function getEnabled(){return requested}

  const wrap=battle.querySelector('[data-test-only="enemy-debug-tools"]');
  const tools=wrap?.querySelector('div');
  const modePanel=tools?.firstElementChild;
  const button=document.createElement('button');
  button.type='button';
  button.style.cssText='min-height:36px;border:1px solid #ffe27a;border-radius:6px;background:#30270d;color:#fff7c9;font-weight:900;font-variant-numeric:tabular-nums;padding:6px 10px;';
  function renderButton(){const active=requested&&RUNTIME.getDebugState().enabled;button.textContent=`当たり判定 ${active?'ON':'OFF'}`;button.style.background=active?'#14532d':'#30270d'}
  button.addEventListener('click',()=>setEnabled(!requested));
  modePanel?.appendChild(button);
  RUNTIME.subscribeDebug(sync);
  renderButton();

  window.BattleNetworkHitboxDebug=Object.freeze({setEnabled,getEnabled});
})();
