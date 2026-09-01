(()=>{
  const FIELD=window.BattleNetworkField;
  const PLAYER=window.BattleNetworkPlayer;
  const ENEMY=window.BattleNetworkEnemy;
  const AI=window.BattleNetworkEnemyAI;
  const battle=document.getElementById('battle');
  const scene=document.getElementById('scene');
  const A=document.getElementById('A');
  const queue=document.getElementById('queue');
  if(!FIELD||!PLAYER||!ENEMY||!AI||!battle||!scene||!A||!queue)return;

  const SVG_NS='http://www.w3.org/2000/svg';
  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2,SH=FIELD.WORLD_SIZE*PY*2;
  const PAUSE_REASON='AREA_STEAL_SELECTION';
  let active=false,timer=null,shade=null,svg=null,activationTimer=null;

  function firstQueuedName(){return queue.querySelector('.q:not(.empty)')?.textContent?.trim()||''}
  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function playerLandingBounds(center){const hit=PLAYER.getHitBox?.();if(!hit)return null;const halfW=Number(hit.width)/2,halfH=Number(hit.height)/2,offsetX=Number(hit.offsetX)||0,offsetY=Number(hit.offsetY)||0,cx=center.x+offsetX,cy=center.y+offsetY;return{left:cx-halfW,right:cx+halfW,top:cy-halfH,bottom:cy+halfH,width:Number(hit.width),height:Number(hit.height),centerX:cx,centerY:cy}}
  function getSettings(){const raw=window.BattleNetworkTestSettings?.getAreaStealSettings?.()||{};const range=Math.max(3,Math.min(7,Math.round(Number(raw.rangeTiles)||3))),time=Math.max(.8,Math.min(3,Number(raw.selectionTimeSec)||.8));return{rangeTiles:range,selectionTimeSec:time}}
  function isSelectable(row,col,origin,allowHole){
    if(row===origin.row&&col===origin.col)return false;
    const tile=FIELD.getTile(row,col);if(!tile)return false;
    if(tile.currentTerrain===FIELD.TERRAIN.HOLE&&!allowHole)return false;
    const occupied=(FIELD.getOccupantsAt?.(row,col)||[]).some(id=>id!=='player');if(occupied)return false;
    const center=FIELD.tileToWorldCenter(row,col),bounds=center?playerLandingBounds(center):null;
    if(!center||!bounds)return false;
    if(ENEMY.isPlayerBoundsBlocked?.(bounds))return false;
    return true;
  }
  function polygonPoints(row,col){const b=FIELD.tileToWorldBounds(row,col);if(!b)return '';return [project(b.left,b.top),project(b.right,b.top),project(b.right,b.bottom),project(b.left,b.bottom)].map(p=>`${p.x},${p.y}`).join(' ')}
  function cleanupVisuals(){shade?.remove();svg?.remove();shade=null;svg=null}
  function finish(){if(!active)return;active=false;if(timer!==null){clearTimeout(timer);timer=null}cleanupVisuals();AI.resume(PAUSE_REASON);PLAYER.resumeAfterChipSelection?.()}
  function choose(row,col,allowHole){if(!active)return false;const origin=FIELD.worldToTile(PLAYER.getPosition().x,PLAYER.getPosition().y);if(!isSelectable(row,col,origin,allowHole))return false;const moved=PLAYER.teleportToTile?.(row,col,{allowHole})===true;if(moved)finish();return moved}
  function renderCells(origin,rangeTiles,allowHole){
    shade=document.createElement('div');shade.dataset.areaStealShade='true';shade.style.cssText=`position:absolute;left:0;top:0;width:${SW}px;height:${SH}px;z-index:48;background:rgba(0,4,14,.68);pointer-events:auto;touch-action:none;`;
    svg=document.createElementNS(SVG_NS,'svg');svg.dataset.areaStealLayer='true';svg.setAttribute('viewBox',`0 0 ${SW} ${SH}`);svg.style.cssText=`position:absolute;left:0;top:0;width:${SW}px;height:${SH}px;z-index:49;overflow:visible;pointer-events:auto;touch-action:none;`;
    const rowMin=Math.max(0,origin.row-rangeTiles),rowMax=Math.min(FIELD.GRID_ROWS-1,origin.row+rangeTiles),colMin=Math.max(0,origin.col-rangeTiles),colMax=Math.min(FIELD.GRID_COLS-1,origin.col+rangeTiles);
    for(let row=rowMin;row<=rowMax;row++)for(let col=colMin;col<=colMax;col++){
      if(Math.max(Math.abs(row-origin.row),Math.abs(col-origin.col))>rangeTiles)continue;
      if(!isSelectable(row,col,origin,allowHole))continue;
      const cell=document.createElementNS(SVG_NS,'polygon');cell.dataset.areaStealCell='true';cell.dataset.row=String(row);cell.dataset.col=String(col);cell.setAttribute('points',polygonPoints(row,col));cell.setAttribute('fill','rgba(80,238,255,.48)');cell.setAttribute('stroke','rgba(196,253,255,.98)');cell.setAttribute('stroke-width','5');cell.setAttribute('vector-effect','non-scaling-stroke');cell.style.cssText='pointer-events:all;cursor:pointer;touch-action:none;';svg.appendChild(cell);
    }
    svg.addEventListener('pointerdown',event=>{
      if(!active)return;
      const cell=event.target?.closest?.('[data-area-steal-cell="true"]');
      if(!cell)return;
      event.preventDefault();event.stopPropagation();
      const row=Number(cell.dataset.row),col=Number(cell.dataset.col);
      if(Number.isInteger(row)&&Number.isInteger(col))choose(row,col,allowHole);
    });
    scene.append(shade,svg);
  }
  function begin(){
    if(active||PLAYER.isDefeated?.())return false;
    if(PLAYER.pauseForChipSelection?.()!==true)return false;
    AI.pause(PAUSE_REASON);
    active=true;
    const settings=getSettings(),position=PLAYER.getPosition(),origin=FIELD.worldToTile(position.x,position.y),allowHole=PLAYER.canStandOnHole?.()===true;
    renderCells(origin,settings.rangeTiles,allowHole);
    timer=setTimeout(()=>finish(),settings.selectionTimeSec*1000);
    return true;
  }

  A.addEventListener('pointerdown',()=>{
    if(active||firstQueuedName()!=='エリアスチール')return;
    if(activationTimer!==null)clearTimeout(activationTimer);
    activationTimer=setTimeout(()=>{activationTimer=null;if(!active)begin()},0);
  },true);
  battle.addEventListener('pointerdown',event=>{
    if(!active)return;
    if(event.target?.closest?.('[data-area-steal-cell="true"]'))return;
    event.preventDefault();event.stopImmediatePropagation();
  },true);

  window.BattleNetworkAreaSteal=Object.freeze({begin,isActive:()=>active,cancel:finish});
})();