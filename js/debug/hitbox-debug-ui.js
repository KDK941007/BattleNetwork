(()=>{
  const FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,PLAYER=window.BattleNetworkPlayer,RUNTIME=window.BattleNetworkEnemy1Runtime;
  const battle=document.getElementById('battle'),scene=document.getElementById('scene');
  if(!FIELD||!ENEMY||!PLAYER||!RUNTIME||!battle||!scene)return;

  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2,SH=FIELD.WORLD_SIZE*PY*2,NS='http://www.w3.org/2000/svg';
  const LIMIT=Object.freeze({min:.1,max:2,step:.1});
  const OFFSET_STEP=.1;
  let diameterTiles=1,playerOffsetTiles=0,enemyOffsetTiles=0;
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox',`0 0 ${SW} ${SH}`);svg.dataset.testOnly='hitbox-debug-layer';
  svg.style.cssText=`position:absolute;left:0;top:0;width:${SW}px;height:${SH}px;overflow:visible;pointer-events:none;z-index:30;display:none;`;
  const playerEllipse=document.createElementNS(NS,'ellipse');
  playerEllipse.setAttribute('fill','rgba(76,229,255,.12)');playerEllipse.setAttribute('stroke','rgba(76,229,255,.98)');playerEllipse.setAttribute('stroke-width','7');playerEllipse.setAttribute('stroke-dasharray','18 10');playerEllipse.setAttribute('vector-effect','non-scaling-stroke');svg.appendChild(playerEllipse);scene.appendChild(svg);
  const enemyEllipses=new Map();let requested=false,frame=null;
  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function offsetWorld(position,offsetTiles){
    const delta=FIELD.toWorldDistance(offsetTiles)/Math.SQRT2;
    return{x:position.x+delta,y:position.y+delta};
  }
  function setCircle(el,x,y,diameter,offsetTiles=0){const shifted=offsetWorld({x,y},offsetTiles),c=project(shifted.x,shifted.y),r=diameter/2;el.setAttribute('cx',c.x);el.setAttribute('cy',c.y);el.setAttribute('rx',Math.SQRT2*r*PX);el.setAttribute('ry',Math.SQRT2*r*PY)}
  function ensureEnemyEllipse(id){let el=enemyEllipses.get(id);if(el)return el;el=document.createElementNS(NS,'ellipse');el.setAttribute('fill','rgba(255,82,102,.12)');el.setAttribute('stroke','rgba(255,82,102,.98)');el.setAttribute('stroke-width','7');el.setAttribute('stroke-dasharray','18 10');el.setAttribute('vector-effect','non-scaling-stroke');svg.appendChild(el);enemyEllipses.set(id,el);return el}
  function draw(){frame=null;const enabled=requested&&RUNTIME.getDebugState().enabled;if(!enabled){svg.style.display='none';return}svg.style.display='block';const diameter=FIELD.toWorldDistance(diameterTiles),pp=PLAYER.getPosition();setCircle(playerEllipse,pp.x,pp.y,diameter,playerOffsetTiles);const active=ENEMY.getActiveEnemies(),ids=new Set();for(const enemy of active){ids.add(enemy.id);setCircle(ensureEnemyEllipse(enemy.id),enemy.x,enemy.y,diameter,enemyOffsetTiles)}for(const [id,el] of enemyEllipses){if(!ids.has(id)){el.remove();enemyEllipses.delete(id)}}frame=requestAnimationFrame(draw)}
  function sync(){const enabled=requested&&RUNTIME.getDebugState().enabled;if(enabled){if(frame===null)frame=requestAnimationFrame(draw)}else{if(frame!==null){cancelAnimationFrame(frame);frame=null}svg.style.display='none'}renderButton()}
  function setEnabled(value){requested=value===true;sync();return requested}function getEnabled(){return requested}
  function clampDiameter(value){return Math.max(LIMIT.min,Math.min(LIMIT.max,Math.round(Number(value)*10)/10))}
  function roundOffset(value){return Math.round(Number(value)*10)/10}
  function setDiameterTiles(value){diameterTiles=clampDiameter(value);renderSize();return diameterTiles}
  function adjustDiameter(direction){return setDiameterTiles(diameterTiles+(direction<0?-LIMIT.step:LIMIT.step))}
  function getDiameterTiles(){return diameterTiles}
  function setPlayerOffsetTiles(value){playerOffsetTiles=roundOffset(value);playerOffsetRow.refresh();return playerOffsetTiles}
  function setEnemyOffsetTiles(value){enemyOffsetTiles=roundOffset(value);enemyOffsetRow.refresh();return enemyOffsetTiles}
  function getPlayerOffsetTiles(){return playerOffsetTiles}function getEnemyOffsetTiles(){return enemyOffsetTiles}

  const wrap=battle.querySelector('[data-test-only="enemy-debug-tools"]'),tools=wrap?.querySelector('div'),modePanel=tools?.firstElementChild;
  const button=document.createElement('button');button.type='button';button.style.cssText='min-height:36px;border:1px solid #ffe27a;border-radius:6px;background:#30270d;color:#fff7c9;font-weight:900;font-variant-numeric:tabular-nums;padding:6px 10px;';
  function renderButton(){const active=requested&&RUNTIME.getDebugState().enabled;button.textContent=`当たり判定 ${active?'ON':'OFF'}`;button.style.background=active?'#14532d':'#30270d'}button.addEventListener('click',()=>setEnabled(!requested));modePanel?.appendChild(button);

  function makeRow(labelText,getter,adjust){
    const box=document.createElement('div'),label=document.createElement('span'),control=document.createElement('span'),prev=document.createElement('button'),value=document.createElement('strong'),next=document.createElement('button');
    box.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:38px;padding:2px 0;';label.textContent=labelText;label.style.cssText='color:#c8f5ff;font-weight:900;min-width:86px;';control.style.cssText='display:inline-flex;align-items:center;gap:8px;white-space:nowrap;';
    for(const b of [prev,next]){b.type='button';b.style.cssText='width:42px;height:34px;padding:0;border:1px solid #8eeaff;border-radius:5px;background:#0c4053;color:#eaffff;font-weight:900;line-height:1;'}prev.textContent='◀';next.textContent='▶';value.style.cssText='display:inline-block;min-width:92px;text-align:center;color:#fff;font-size:13px;';
    box.refresh=()=>{const raw=getter();value.textContent=raw===0?'0.0 マス':`${raw<0?'上':'下'} ${Math.abs(raw).toFixed(1)} マス`};prev.addEventListener('click',()=>adjust(-1));next.addEventListener('click',()=>adjust(1));control.append(prev,value,next);box.append(label,control);box.refresh();return box;
  }

  const sizeBox=document.createElement('div'),label=document.createElement('span'),control=document.createElement('span'),prev=document.createElement('button'),value=document.createElement('strong'),next=document.createElement('button');
  sizeBox.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:38px;padding:2px 0;';label.textContent='判定直径';label.style.cssText='color:#c8f5ff;font-weight:900;min-width:86px;';control.style.cssText='display:inline-flex;align-items:center;gap:8px;white-space:nowrap;';
  for(const b of [prev,next]){b.type='button';b.style.cssText='width:42px;height:34px;padding:0;border:1px solid #8eeaff;border-radius:5px;background:#0c4053;color:#eaffff;font-weight:900;line-height:1;'}prev.textContent='◀';next.textContent='▶';value.style.cssText='display:inline-block;min-width:92px;text-align:center;color:#fff;font-size:13px;';
  function renderSize(){value.textContent=`${diameterTiles.toFixed(1)} マス`;prev.disabled=diameterTiles<=LIMIT.min;next.disabled=diameterTiles>=LIMIT.max;prev.style.opacity=prev.disabled?'.35':'1';next.style.opacity=next.disabled?'.35':'1'}prev.addEventListener('click',()=>adjustDiameter(-1));next.addEventListener('click',()=>adjustDiameter(1));control.append(prev,value,next);sizeBox.append(label,control);modePanel?.appendChild(sizeBox);renderSize();
  const playerOffsetRow=makeRow('P中心上下',()=>playerOffsetTiles,direction=>setPlayerOffsetTiles(playerOffsetTiles+(direction<0?-OFFSET_STEP:OFFSET_STEP)));
  const enemyOffsetRow=makeRow('敵中心上下',()=>enemyOffsetTiles,direction=>setEnemyOffsetTiles(enemyOffsetTiles+(direction<0?-OFFSET_STEP:OFFSET_STEP)));
  modePanel?.append(playerOffsetRow,enemyOffsetRow);

  RUNTIME.subscribeDebug(sync);renderButton();
  window.BattleNetworkHitboxDebug=Object.freeze({LIMIT,OFFSET_STEP,setEnabled,getEnabled,setDiameterTiles,adjustDiameter,getDiameterTiles,setPlayerOffsetTiles,setEnemyOffsetTiles,getPlayerOffsetTiles,getEnemyOffsetTiles});
})();
