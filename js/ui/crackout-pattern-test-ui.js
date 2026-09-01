(()=>{
  const FIELD=window.BattleNetworkField;
  const PLAYER=window.BattleNetworkPlayer;
  const ENEMY=window.BattleNetworkEnemy;
  const COMBAT_RANGE=window.BattleNetworkCombatRange;
  const battle=document.getElementById('battle');
  const scene=document.getElementById('scene');
  const playerEl=document.getElementById('player');
  const arrowEl=document.getElementById('arrow');
  const aButton=document.getElementById('A');
  const queue=document.getElementById('queue');
  if(!FIELD||!PLAYER||!ENEMY||!COMBAT_RANGE||!battle||!scene||!playerEl||!arrowEl||!aButton||!queue)return;

  const PX=.72,PY=.36;
  const WORLD=FIELD.WORLD_SIZE;
  const TILE=FIELD.TILE_SIZE;
  const SW=WORLD*PX*2;
  const DESCRIPTION='プレイヤー座標＋向き×1マスの座標が属するマスを使用前から常時プレビュー';
  const TERRAIN_LABEL=Object.freeze({
    [FIELD.TERRAIN.NORMAL]:'通常',
    [FIELD.TERRAIN.CRACKED]:'ヒビ',
    [FIELD.TERRAIN.HOLE]:'穴'
  });
  let lastTileKey='';
  let pendingTile=null;
  let lastSeenAttackToken=COMBAT_RANGE.getLastAttackContext?.()?.shotToken??null;
  const terrainVisuals=new Map();

  const wrap=document.createElement('div');
  const label=document.createElement('div');
  const detail=document.createElement('div');
  wrap.dataset.testOnly='crackout-pattern-test';
  wrap.style.cssText='position:absolute;left:10px;top:10px;z-index:69;display:flex;flex-direction:column;gap:5px;max-width:min(340px,58vw);padding:6px;border:1px solid rgba(126,231,255,.65);border-radius:8px;background:rgba(5,22,31,.9);color:#eaffff;font:800 10px/1.3 system-ui,sans-serif;pointer-events:none;box-sizing:border-box;';
  label.textContent='クラックアウト D：1マス先座標＋照準【採用】';
  label.style.cssText='min-height:24px;display:flex;align-items:center;color:#eaffff;font-weight:900;';
  detail.style.cssText='white-space:normal;color:#c8f5ff;';
  detail.textContent=DESCRIPTION;
  wrap.append(label,detail);
  battle.appendChild(wrap);

  const previewSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  const previewPath=document.createElementNS('http://www.w3.org/2000/svg','path');
  const w=TILE*PX*2,h=TILE*PY*2;
  previewSvg.dataset.testOnly='crackout-target-tile';
  previewSvg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  previewSvg.style.cssText=`position:absolute;width:${w}px;height:${h}px;left:0;top:0;z-index:17;pointer-events:none;opacity:0;will-change:transform,opacity;contain:layout paint style;`;
  previewPath.setAttribute('d',`M ${w/2} 0 L ${w} ${h/2} L ${w/2} ${h} L 0 ${h/2} Z`);
  previewPath.setAttribute('fill','rgba(65,220,255,.24)');
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

  function placePreview(tile,active=false){
    if(!tile){previewSvg.style.opacity='0';lastTileKey='';return}
    const key=`${tile.row}:${tile.col}`;
    if(key!==lastTileKey){
      const center=FIELD.tileToWorldCenter(tile.row,tile.col);
      const p=project(center.x,center.y);
      previewSvg.style.transform=`translate(${p.x-w/2}px,${p.y-h/2}px)`;
      lastTileKey=key;
    }
    if(active){
      previewPath.setAttribute('fill','rgba(255,97,72,.34)');
      previewPath.setAttribute('stroke','rgba(255,221,121,.98)');
    }else{
      previewPath.setAttribute('fill','rgba(65,220,255,.24)');
      previewPath.setAttribute('stroke','rgba(143,242,255,.98)');
    }
    previewSvg.style.opacity='1';
  }

  function updatePreview(){placePreview(getTarget(),false)}
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
    svg.style.cssText=`position:absolute;width:${w}px;height:${h}px;left:0;top:0;z-index:3;pointer-events:none;opacity:1;contain:layout paint style;`;
    base.setAttribute('d',`M ${w/2} 0 L ${w} ${h/2} L ${w/2} ${h} L 0 ${h/2} Z`);
    crack.setAttribute('d',`M ${w*.50} ${h*.10} L ${w*.42} ${h*.42} L ${w*.58} ${h*.54} L ${w*.46} ${h*.90} M ${w*.42} ${h*.42} L ${w*.24} ${h*.58} M ${w*.58} ${h*.54} L ${w*.78} ${h*.68}`);
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
      entry.base.setAttribute('fill','rgba(120,72,38,.86)');
      entry.base.setAttribute('stroke','rgba(255,190,92,1)');
      entry.base.setAttribute('stroke-width','7');
      entry.crack.setAttribute('stroke','rgba(255,248,214,1)');
      entry.crack.setAttribute('stroke-width','9');
      entry.crack.style.opacity='1';
    }else{
      entry.base.setAttribute('fill','rgba(0,2,5,.98)');
      entry.base.setAttribute('stroke','rgba(72,214,255,1)');
      entry.base.setAttribute('stroke-width','8');
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
    if(current===FIELD.TERRAIN.HOLE){
      renderTerrain(tile);
      detail.textContent=`${DESCRIPTION} / row ${tile.row}・col ${tile.col}：穴のため変化なし`;
      return Object.freeze({applied:false,reason:'ALREADY_HOLE',terrain:current});
    }
    const next=current===FIELD.TERRAIN.CRACKED
      ?FIELD.TERRAIN.HOLE
      :(isOccupiedByEnemy(tile)?FIELD.TERRAIN.CRACKED:FIELD.TERRAIN.HOLE);
    const changed=FIELD.setTerrain(tile.row,tile.col,next);
    renderTerrain(changed);
    detail.textContent=`${DESCRIPTION} / row ${tile.row}・col ${tile.col}：${TERRAIN_LABEL[current]||current} → ${TERRAIN_LABEL[next]||next}`;
    return Object.freeze({applied:true,reason:null,terrain:next});
  }

  function firstQueuedName(){return queue.querySelector('.q:not(.empty)')?.textContent?.trim()||''}

  function syncAttackTrigger(){
    const context=COMBAT_RANGE.getLastAttackContext?.();
    const token=context?.shotToken??null;
    if(token===null||token===lastSeenAttackToken)return;
    lastSeenAttackToken=token;
    if(context?.sourceId!=='CHIP_EXE4_S106'||!pendingTile)return;
    const tile=pendingTile;
    pendingTile=null;
    placePreview(tile,true);
    applyCrackOut(tile);
    updatePreview();
  }

  aButton.addEventListener('pointerdown',()=>{
    pendingTile=firstQueuedName()==='クラックアウト'?getTarget():null;
  },{capture:true});

  const observer=new MutationObserver(()=>{
    syncAttackTrigger();
    updatePreview();
  });
  observer.observe(playerEl,{attributes:true,attributeFilter:['style']});
  observer.observe(arrowEl,{attributes:true,attributeFilter:['style']});

  window.BattleNetworkCrackOut=Object.freeze({
    getTargetTile:()=>getTarget(),
    applyToTile:(row,col)=>applyCrackOut(FIELD.getTile(row,col)),
    isOccupiedByEnemy:(row,col)=>{const tile=FIELD.getTile(row,col);return !!tile&&isOccupiedByEnemy(tile)}
  });
  window.BattleNetworkCrackOutPatternTest=Object.freeze({
    getPattern:()=> 'D',
    getTargetTile:()=>getTarget()
  });
  updatePreview();
})();
