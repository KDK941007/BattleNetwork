(()=>{
  const FIELD=window.BattleNetworkField;
  const PLAYER=window.BattleNetworkPlayer;
  const ENEMY=window.BattleNetworkEnemy;
  const COMBAT_RANGE=window.BattleNetworkCombatRange;
  const scene=document.getElementById('scene');
  const aButton=document.getElementById('A');
  const queue=document.getElementById('queue');
  if(!FIELD||!PLAYER||!ENEMY||!COMBAT_RANGE||!scene||!aButton||!queue)return;

  const PX=.72,PY=.36;
  const WORLD=FIELD.WORLD_SIZE;
  const TILE=FIELD.TILE_SIZE;
  const SW=WORLD*PX*2;
  let lastTileKey='';
  let triggerWatchId=0;
  let previewFrame=null;
  const terrainVisuals=new Map();

  const previewSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  const previewPath=document.createElementNS('http://www.w3.org/2000/svg','path');
  const w=TILE*PX*2,h=TILE*PY*2;
  previewSvg.dataset.testOnly='crackout-target-tile';
  previewSvg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  previewSvg.style.cssText=`position:absolute;width:${w}px;height:${h}px;left:0;top:0;z-index:17;pointer-events:none;opacity:0;will-change:transform,opacity;contain:layout paint style;`;
  previewPath.setAttribute('d',`M ${w/2} 0 L ${w} ${h/2} L ${w/2} ${h} L 0 ${h/2} Z`);
  previewPath.setAttribute('fill','rgba(65,220,255,.16)');
  previewPath.setAttribute('stroke','rgba(143,242,255,.98)');
  previewPath.setAttribute('stroke-width','5');
  previewSvg.appendChild(previewPath);
  scene.appendChild(previewSvg);

  function normalizeDirection(direction){
    const x=Number(direction?.x)||0,y=Number(direction?.y)||0;
    const length=Math.hypot(x,y)||1;
    return{x:x/length,y:y/length};
  }
  function getTarget(){
    const position=PLAYER.getPosition();
    const d=normalizeDirection(PLAYER.getFacing());
    const x=position.x+d.x*TILE,y=position.y+d.y*TILE;
    if(x<0||x>=WORLD||y<0||y>=WORLD)return null;
    return FIELD.getTileAtWorld(x,y);
  }
  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function firstQueuedName(){return queue.querySelector('.q:not(.empty)')?.textContent?.trim()||''}
  function isCrackOutHeld(){return firstQueuedName()==='クラックアウト'}
  function placePreview(tile,active=false){
    if(!tile||!isCrackOutHeld()){
      previewSvg.style.opacity='0';
      lastTileKey='';
      return;
    }
    const key=`${tile.row}:${tile.col}`;
    if(key!==lastTileKey){
      const center=FIELD.tileToWorldCenter(tile.row,tile.col);
      const p=project(center.x,center.y);
      previewSvg.style.transform=`translate(${p.x-w/2}px,${p.y-h/2}px)`;
      lastTileKey=key;
    }
    previewPath.setAttribute('fill',active?'rgba(255,97,72,.22)':'rgba(65,220,255,.16)');
    previewPath.setAttribute('stroke',active?'rgba(255,221,121,.98)':'rgba(143,242,255,.98)');
    previewSvg.style.opacity='1';
  }
  function updatePreview(){placePreview(isCrackOutHeld()?getTarget():null,false)}
  function runPreviewFrame(){
    previewFrame=null;
    if(!isCrackOutHeld()){updatePreview();return}
    updatePreview();
    previewFrame=requestAnimationFrame(runPreviewFrame);
  }
  function syncPreviewTracking(){
    if(isCrackOutHeld()){
      if(previewFrame===null)previewFrame=requestAnimationFrame(runPreviewFrame);
    }else{
      if(previewFrame!==null){cancelAnimationFrame(previewFrame);previewFrame=null}
      updatePreview();
    }
  }
  function tileKey(tile){return `${tile.row}:${tile.col}`}

  function ensureTerrainVisual(tile){
    const key=tileKey(tile);
    let entry=terrainVisuals.get(key);
    if(entry)return entry;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    const base=document.createElementNS('http://www.w3.org/2000/svg','path');
    const crack=document.createElementNS('http://www.w3.org/2000/svg','path');
    svg.dataset.crackoutTerrain=key;
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    svg.style.cssText=`position:absolute;width:${w}px;height:${h}px;left:0;top:0;z-index:4;pointer-events:none;opacity:1;contain:layout paint style;`;
    base.setAttribute('d',`M ${w/2} 0 L ${w} ${h/2} L ${w/2} ${h} L 0 ${h/2} Z`);
    crack.setAttribute('d',`M ${w*.50} ${h*.06} L ${w*.42} ${h*.40} L ${w*.59} ${h*.53} L ${w*.45} ${h*.94} M ${w*.42} ${h*.40} L ${w*.20} ${h*.58} M ${w*.59} ${h*.53} L ${w*.82} ${h*.70}`);
    crack.setAttribute('fill','none');
    crack.setAttribute('stroke-linecap','round');
    crack.setAttribute('stroke-linejoin','round');
    svg.append(base,crack);
    const center=FIELD.tileToWorldCenter(tile.row,tile.col);
    const p=project(center.x,center.y);
    svg.style.transform=`translate(${p.x-w/2}px,${p.y-h/2}px)`;
    scene.appendChild(svg);
    entry={svg,base,crack};
    terrainVisuals.set(key,entry);
    return entry;
  }

  function renderTerrain(tile){
    if(!tile)return;
    const terrain=tile.currentTerrain;
    const key=tileKey(tile);
    if(terrain!==FIELD.TERRAIN.CRACKED&&terrain!==FIELD.TERRAIN.HOLE){
      terrainVisuals.get(key)?.svg.remove();
      terrainVisuals.delete(key);
      return;
    }
    const entry=ensureTerrainVisual(tile);
    if(terrain===FIELD.TERRAIN.CRACKED){
      entry.base.setAttribute('fill','rgb(111,63,27)');
      entry.base.setAttribute('stroke','rgb(255,183,63)');
      entry.base.setAttribute('stroke-width','10');
      entry.crack.setAttribute('stroke','rgb(255,255,225)');
      entry.crack.setAttribute('stroke-width','11');
      entry.crack.style.opacity='1';
    }else{
      entry.base.setAttribute('fill','rgb(0,0,0)');
      entry.base.setAttribute('stroke','rgb(19,43,54)');
      entry.base.setAttribute('stroke-width','10');
      entry.crack.style.opacity='0';
    }
  }

  function isOccupiedByEnemy(tile){
    return ENEMY.getActiveEnemies().some(enemy=>{
      const enemyTile=FIELD.getTileAtWorld(enemy.x,enemy.y);
      return enemyTile?.row===tile.row&&enemyTile?.col===tile.col;
    });
  }

  function applyCrackOut(tile){
    if(!tile)return Object.freeze({applied:false,reason:'NO_TARGET',terrain:null});
    const current=tile.currentTerrain;
    if(current===FIELD.TERRAIN.HOLE){renderTerrain(tile);return Object.freeze({applied:false,reason:'ALREADY_HOLE',terrain:current})}
    const next=current===FIELD.TERRAIN.CRACKED?FIELD.TERRAIN.HOLE:(isOccupiedByEnemy(tile)?FIELD.TERRAIN.CRACKED:FIELD.TERRAIN.HOLE);
    const changed=FIELD.setTerrain(tile.row,tile.col,next);
    renderTerrain(changed);
    return Object.freeze({applied:true,reason:null,terrain:next});
  }

  function watchForCrackOutUse(tile,startToken,watchId,startTime){
    if(watchId!==triggerWatchId)return;
    const context=COMBAT_RANGE.getLastAttackContext?.();
    const token=context?.shotToken??null;
    if(token!==null&&token!==startToken){
      if(context?.sourceId==='CHIP_EXE4_S106'){
        placePreview(tile,true);
        applyCrackOut(tile);
        syncPreviewTracking();
      }
      return;
    }
    if(performance.now()-startTime>=700)return;
    requestAnimationFrame(()=>watchForCrackOutUse(tile,startToken,watchId,startTime));
  }

  aButton.addEventListener('pointerdown',()=>{
    if(!isCrackOutHeld())return;
    const tile=getTarget();
    if(!tile)return;
    const startToken=COMBAT_RANGE.getLastAttackContext?.()?.shotToken??null;
    const watchId=++triggerWatchId;
    requestAnimationFrame(()=>watchForCrackOutUse(tile,startToken,watchId,performance.now()));
  },{capture:true});

  const queueObserver=new MutationObserver(syncPreviewTracking);
  queueObserver.observe(queue,{childList:true,subtree:true,characterData:true});

  window.addEventListener('battlenetwork:terrainchange',event=>{
    const row=Number(event.detail?.row),col=Number(event.detail?.col);
    if(!Number.isFinite(row)||!Number.isFinite(col))return;
    renderTerrain(FIELD.getTile(row,col));
  });

  window.BattleNetworkCrackOut=Object.freeze({
    getTargetTile:()=>getTarget(),
    applyToTile:(row,col)=>applyCrackOut(FIELD.getTile(row,col)),
    isOccupiedByEnemy:(row,col)=>{const tile=FIELD.getTile(row,col);return !!tile&&isOccupiedByEnemy(tile)}
  });
  window.BattleNetworkCrackOutPatternTest=Object.freeze({getPattern:()=> 'D',getTargetTile:()=>getTarget()});
  syncPreviewTracking();
})();
