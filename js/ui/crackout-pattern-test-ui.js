(()=>{
  const FIELD=window.BattleNetworkField;
  const PLAYER=window.BattleNetworkPlayer;
  const battle=document.getElementById('battle');
  const scene=document.getElementById('scene');
  const playerEl=document.getElementById('player');
  const arrowEl=document.getElementById('arrow');
  const aButton=document.getElementById('A');
  if(!FIELD||!PLAYER||!battle||!scene||!playerEl||!arrowEl||!aButton)return;

  const PX=.72,PY=.36;
  const WORLD=FIELD.WORLD_SIZE;
  const TILE=FIELD.TILE_SIZE;
  const SW=WORLD*PX*2;
  const DESCRIPTION='プレイヤー座標＋向き×1マスの座標が属するマスを使用前から常時プレビュー';
  let hideTimer=null;
  let lastTileKey='';

  const wrap=document.createElement('div');
  const label=document.createElement('div');
  const detail=document.createElement('div');
  wrap.dataset.testOnly='crackout-pattern-test';
  wrap.style.cssText='position:absolute;left:10px;top:10px;z-index:69;display:flex;flex-direction:column;gap:5px;max-width:min(320px,54vw);padding:6px;border:1px solid rgba(126,231,255,.65);border-radius:8px;background:rgba(5,22,31,.9);color:#eaffff;font:800 10px/1.3 system-ui,sans-serif;pointer-events:none;box-sizing:border-box;';
  label.textContent='クラックアウト D：1マス先座標＋照準【採用】';
  label.style.cssText='min-height:24px;display:flex;align-items:center;color:#eaffff;font-weight:900;';
  detail.style.cssText='white-space:normal;color:#c8f5ff;';
  detail.textContent=DESCRIPTION;
  wrap.append(label,detail);
  battle.appendChild(wrap);

  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  const w=TILE*PX*2,h=TILE*PY*2;
  svg.dataset.testOnly='crackout-target-tile';
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.style.cssText=`position:absolute;width:${w}px;height:${h}px;left:0;top:0;z-index:17;pointer-events:none;opacity:0;will-change:transform,opacity;contain:layout paint style;`;
  path.setAttribute('d',`M ${w/2} 0 L ${w} ${h/2} L ${w/2} ${h} L 0 ${h/2} Z`);
  path.setAttribute('fill','rgba(65,220,255,.24)');
  path.setAttribute('stroke','rgba(143,242,255,.98)');
  path.setAttribute('stroke-width','5');
  svg.appendChild(path);
  scene.appendChild(svg);

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

  function place(tile,active=false){
    if(!tile){svg.style.opacity='0';lastTileKey='';return}
    const key=`${tile.row}:${tile.col}`;
    if(key!==lastTileKey){
      const center=FIELD.tileToWorldCenter(tile.row,tile.col);
      const p=project(center.x,center.y);
      svg.style.transform=`translate(${p.x-w/2}px,${p.y-h/2}px)`;
      lastTileKey=key;
    }
    if(active){
      path.setAttribute('fill','rgba(255,97,72,.34)');
      path.setAttribute('stroke','rgba(255,221,121,.98)');
    }else{
      path.setAttribute('fill','rgba(65,220,255,.24)');
      path.setAttribute('stroke','rgba(143,242,255,.98)');
    }
    svg.style.opacity='1';
  }

  function updatePreview(){place(getTarget(),false)}

  function showUsedTarget(){
    const tile=getTarget();
    place(tile,true);
    detail.textContent=tile?`${DESCRIPTION} / 発動対象 row ${tile.row}・col ${tile.col}`:`${DESCRIPTION} / 対象なし`;
    if(hideTimer)clearTimeout(hideTimer);
    hideTimer=setTimeout(()=>{
      hideTimer=null;
      updatePreview();
      detail.textContent=DESCRIPTION;
    },650);
  }

  const observer=new MutationObserver(updatePreview);
  observer.observe(playerEl,{attributes:true,attributeFilter:['style']});
  observer.observe(arrowEl,{attributes:true,attributeFilter:['style']});
  aButton.addEventListener('pointerdown',showUsedTarget);

  window.BattleNetworkCrackOutPatternTest=Object.freeze({
    getPattern:()=> 'D',
    getTargetTile:()=>getTarget()
  });
  updatePreview();
})();