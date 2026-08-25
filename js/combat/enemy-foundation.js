(()=>{
  const FIELD=window.BattleNetworkField;
  if(!FIELD)throw new Error('BattleNetworkEnemy: logical field grid is not loaded.');

  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;
  const enemies=[];
  let nextId=1;

  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function normalizeHitBox(hitBox){
    const width=Number(hitBox?.width);
    const height=Number(hitBox?.height);
    return Object.freeze({
      width:Number.isFinite(width)&&width>0?width:FIELD.TILE_SIZE*.55,
      height:Number.isFinite(height)&&height>0?height:FIELD.TILE_SIZE*.55
    });
  }
  function getBounds(enemy){
    const halfW=enemy.hitBox.width/2,halfH=enemy.hitBox.height/2;
    return Object.freeze({left:enemy.x-halfW,right:enemy.x+halfW,top:enemy.y-halfH,bottom:enemy.y+halfH,width:enemy.hitBox.width,height:enemy.hitBox.height});
  }
  function render(enemy){
    const p=project(enemy.x,enemy.y);
    enemy.el.style.transform=`translate(${p.x-24}px,${p.y-58}px)`;
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
    el.style.cssText='position:absolute;width:48px;height:58px;border:3px solid #ff5b67;border-radius:12px;background:rgba(96,10,24,.88);box-shadow:0 0 0 3px rgba(255,255,255,.18) inset,0 0 16px rgba(255,70,90,.55);z-index:7;pointer-events:none;';
    const enemy={id:nextId++,x,y,hitBox:normalizeHitBox(config.hitBox),el};
    scene.appendChild(el);enemies.push(enemy);render(enemy);
    return enemy.id;
  }
  function getById(id){return enemies.find(enemy=>enemy.id===id)||null}
  function getSnapshot(enemy){return enemy?Object.freeze({id:enemy.id,x:enemy.x,y:enemy.y,hitBox:enemy.hitBox,bounds:getBounds(enemy)}):null}
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
