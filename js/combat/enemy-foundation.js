(()=>{
  const FIELD=window.BattleNetworkField;
  if(!FIELD)throw new Error('BattleNetworkEnemy: logical field grid is not loaded.');

  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;
  const enemies=[];
  let nextId=1;

  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function normalizeVisual(visual){
    return Object.freeze({
      width:positive(visual?.width,48),
      height:positive(visual?.height,58),
      offsetX:finite(visual?.offsetX),
      offsetY:finite(visual?.offsetY,-29)
    });
  }
  function normalizeHitBox(hitBox){
    return Object.freeze({
      width:positive(hitBox?.width,FIELD.TILE_SIZE*.55),
      height:positive(hitBox?.height,FIELD.TILE_SIZE*.55),
      offsetX:finite(hitBox?.offsetX),
      offsetY:finite(hitBox?.offsetY)
    });
  }
  function getBounds(enemy){
    const centerX=enemy.x+enemy.hitBox.offsetX,centerY=enemy.y+enemy.hitBox.offsetY;
    const halfW=enemy.hitBox.width/2,halfH=enemy.hitBox.height/2;
    return Object.freeze({left:centerX-halfW,right:centerX+halfW,top:centerY-halfH,bottom:centerY+halfH,width:enemy.hitBox.width,height:enemy.hitBox.height,centerX,centerY});
  }
  function render(enemy){
    const p=project(enemy.x,enemy.y),v=enemy.visual;
    enemy.el.style.width=v.width+'px';
    enemy.el.style.height=v.height+'px';
    enemy.el.style.transform=`translate(${p.x-v.width/2+v.offsetX}px,${p.y-v.height+v.offsetY}px)`;
  }
  function spawn(config={}){
    const x=Number(config.x),y=Number(config.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('BattleNetworkEnemy: spawn requires finite world x/y.');
    if(x<0||x>FIELD.WORLD_SIZE||y<0||y>FIELD.WORLD_SIZE)throw new Error('BattleNetworkEnemy: spawn position is outside the world.');
    const scene=document.getElementById('scene');
    if(!scene)throw new Error('BattleNetworkEnemy: scene is not available.');
    const el=document.createElement('div');
    el.className='enemyPrototype';
    el.setAttribute('aria-label','テスト敵');
    el.style.cssText='position:absolute;border:3px solid #ff5b67;border-radius:12px;background:rgba(96,10,24,.88);box-shadow:0 0 0 3px rgba(255,255,255,.18) inset,0 0 16px rgba(255,70,90,.55);z-index:7;pointer-events:none;';
    const enemy={id:nextId++,x,y,visual:normalizeVisual(config.visual),hitBox:normalizeHitBox(config.hitBox),el};
    scene.appendChild(el);enemies.push(enemy);render(enemy);
    return enemy.id;
  }
  function getById(id){return enemies.find(enemy=>enemy.id===id)||null}
  function getSnapshot(enemy){return enemy?Object.freeze({id:enemy.id,x:enemy.x,y:enemy.y,visual:enemy.visual,hitBox:enemy.hitBox,bounds:getBounds(enemy)}):null}
  function getEnemy(id){return getSnapshot(getById(id))}
  function getEnemies(){return Object.freeze(enemies.map(getSnapshot))}
  function containsPoint(id,x,y){
    const enemy=getById(id);if(!enemy||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const b=getBounds(enemy);return x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom;
  }

  window.BattleNetworkEnemy=Object.freeze({spawn,getEnemy,getEnemies,containsPoint});

  const testCenter=FIELD.tileToWorldCenter(Math.floor(FIELD.GRID_ROWS/2),Math.floor(FIELD.GRID_COLS/2)+3);
  if(testCenter)spawn({x:testCenter.x,y:testCenter.y});
})();
