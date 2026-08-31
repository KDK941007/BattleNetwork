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
  const PATTERNS=Object.freeze(['A','B','C']);
  const LABELS=Object.freeze({
    A:'A：境界越え',
    B:'B：1マス先座標',
    C:'C：照準プレビュー'
  });
  const DESCRIPTIONS=Object.freeze({
    A:'現在マスから向き方向へ進み、最初に入る隣接マスを対象',
    B:'プレイヤー座標＋向き×1マスの座標が属するマスを対象',
    C:'Aと同じ対象マスを使用前から常時プレビュー'
  });

  let pattern='A';
  let hideTimer=null;
  let lastTileKey='';

  const wrap=document.createElement('div');
  const button=document.createElement('button');
  const detail=document.createElement('div');
  wrap.dataset.testOnly='crackout-pattern-test';
  wrap.style.cssText='position:absolute;left:10px;top:10px;z-index:69;display:flex;flex-direction:column;gap:5px;max-width:min(320px,54vw);padding:6px;border:1px solid rgba(126,231,255,.65);border-radius:8px;background:rgba(5,22,31,.9);color:#eaffff;font:800 10px/1.3 system-ui,sans-serif;pointer-events:auto;box-sizing:border-box;';
  button.type='button';
  button.style.cssText='min-height:36px;border:1px solid #8eeaff;border-radius:6px;background:#0c4053;color:#eaffff;font-weight:900;padding:6px 10px;';
  detail.style.cssText='white-space:normal;color:#c8f5ff;';
  wrap.append(button,detail);
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

  function inWorld(x,y){return x>=0&&x<WORLD&&y>=0&&y<WORLD}

  function targetA(position,direction){
    const tile=FIELD.getTileAtWorld(position.x,position.y);
    if(!tile)return null;
    const bounds=FIELD.tileToWorldBounds(tile.row,tile.col);
    const d=normalizeDirection(direction);
    const tx=Math.abs(d.x)<1e-8?Infinity:(d.x>0?(bounds.right-position.x)/d.x:(bounds.left-position.x)/d.x);
    const ty=Math.abs(d.y)<1e-8?Infinity:(d.y>0?(bounds.bottom-position.y)/d.y:(bounds.top-position.y)/d.y);
    const exit=Math.min(tx>1e-8?tx:Infinity,ty>1e-8?ty:Infinity);
    if(!Number.isFinite(exit))return null;
    const x=position.x+d.x*(exit+.1),y=position.y+d.y*(exit+.1);
    return inWorld(x,y)?FIELD.getTileAtWorld(x,y):null;
  }

  function targetB(position,direction){
    const d=normalizeDirection(direction);
    const x=position.x+d.x*TILE,y=position.y+d.y*TILE;
    return inWorld(x,y)?FIELD.getTileAtWorld(x,y):null;
  }

  function getTarget(){
    const position=PLAYER.getPosition();
    const facing=PLAYER.getFacing();
    return pattern==='B'?targetB(position,facing):targetA(position,facing);
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

  function updatePreview(){
    if(pattern!=='C')return;
    place(getTarget(),false);
  }

  function render(){
    button.textContent=`クラックアウト ${LABELS[pattern]}　▶`;
    detail.textContent=DESCRIPTIONS[pattern];
    if(pattern==='C')updatePreview();
    else{svg.style.opacity='0';lastTileKey=''}
  }

  function cyclePattern(){
    const index=PATTERNS.indexOf(pattern);
    pattern=PATTERNS[(index+1)%PATTERNS.length];
    if(hideTimer){clearTimeout(hideTimer);hideTimer=null}
    render();
  }

  function showUsedTarget(){
    const tile=getTarget();
    place(tile,true);
    detail.textContent=tile?`${DESCRIPTIONS[pattern]} / 発動対象 row ${tile.row}・col ${tile.col}`:`${DESCRIPTIONS[pattern]} / 対象なし`;
    if(hideTimer)clearTimeout(hideTimer);
    hideTimer=setTimeout(()=>{
      hideTimer=null;
      if(pattern==='C'){updatePreview();detail.textContent=DESCRIPTIONS[pattern]}
      else{svg.style.opacity='0';lastTileKey='';detail.textContent=DESCRIPTIONS[pattern]}
    },650);
  }

  const observer=new MutationObserver(()=>{if(pattern==='C')updatePreview()});
  observer.observe(playerEl,{attributes:true,attributeFilter:['style']});
  observer.observe(arrowEl,{attributes:true,attributeFilter:['style']});
  button.addEventListener('click',cyclePattern);
  aButton.addEventListener('pointerdown',()=>showUsedTarget());

  window.BattleNetworkCrackOutPatternTest=Object.freeze({
    getPattern:()=>pattern,
    setPattern:value=>{if(PATTERNS.includes(value)){pattern=value;render()}return pattern},
    getTargetTile:()=>getTarget()
  });
  render();
})();