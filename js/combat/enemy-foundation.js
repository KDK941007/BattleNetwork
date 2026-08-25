(()=>{
  const FIELD=window.BattleNetworkField;
  const RANGE=window.BattleNetworkRangeGeometry;
  if(!FIELD)throw new Error('BattleNetworkEnemy: logical field grid is not loaded.');
  if(!RANGE)throw new Error('BattleNetworkEnemy: range geometry is not loaded.');

  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;
  const enemies=[];
  let nextId=1;

  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function normalizeVisual(visual){
    return Object.freeze({
      width:positive(visual?.width,116),
      height:positive(visual?.height,140),
      offsetX:finite(visual?.offsetX),
      offsetY:finite(visual?.offsetY,-29)
    });
  }
  function normalizeHitBox(hitBox){
    return Object.freeze({
      width:positive(hitBox?.width,FIELD.TILE_SIZE*1.32),
      height:positive(hitBox?.height,FIELD.TILE_SIZE*1.32),
      offsetX:finite(hitBox?.offsetX),
      offsetY:finite(hitBox?.offsetY)
    });
  }
  function normalizeHealth(health){
    const maxHp=positive(health?.maxHp,null);
    if(maxHp===null)return Object.freeze({maxHp:null,hp:null});
    const requested=Number(health?.hp);
    const hp=Number.isFinite(requested)?Math.max(0,Math.min(maxHp,requested)):maxHp;
    return Object.freeze({maxHp,hp});
  }
  function hasHealth(enemy){return !!enemy&&enemy.maxHp!==null&&enemy.hp!==null}
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
  function createHealthLabel(){
    const hpEl=document.createElement('div');
    hpEl.className='enemyPrototypeHp enemyPrototypeHp-bottom';
    hpEl.style.cssText="position:absolute;left:50%;bottom:-49px;transform:translateX(-50%);min-width:104px;color:#fff;font-family:'Orbitron',var(--bn-ui-font),system-ui,sans-serif;font-size:40px;font-weight:800;line-height:1;letter-spacing:.015em;font-variant-numeric:tabular-nums;text-align:center;white-space:nowrap;-webkit-text-stroke:3px #050505;text-shadow:-2px -2px 0 #050505,2px -2px 0 #050505,-2px 2px 0 #050505,2px 2px 0 #050505,0 4px 0 #050505;pointer-events:none;z-index:2;";
    return hpEl;
  }
  function renderHealth(enemy){
    if(!enemy.hpEl)return;
    if(!hasHealth(enemy)){enemy.hpEl.style.display='none';return}
    enemy.hpEl.style.display='block';
    enemy.hpEl.textContent=String(Math.ceil(enemy.hp));
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
    el.style.cssText='position:absolute;border:3px solid #ff5b67;border-radius:18px;background:rgba(96,10,24,.88);box-shadow:0 0 0 3px rgba(255,255,255,.18) inset,0 0 20px rgba(255,70,90,.55);z-index:7;pointer-events:none;';
    const hpEl=createHealthLabel();
    el.appendChild(hpEl);
    const health=normalizeHealth(config.health);
    const enemy={id:nextId++,x,y,visual:normalizeVisual(config.visual),hitBox:normalizeHitBox(config.hitBox),maxHp:health.maxHp,hp:health.hp,el,hpEl,flashToken:0};
    scene.appendChild(el);enemies.push(enemy);renderHealth(enemy);render(enemy);
    return enemy.id;
  }
  function getById(id){return enemies.find(enemy=>enemy.id===id)||null}
  function getSnapshot(enemy){return enemy?Object.freeze({id:enemy.id,x:enemy.x,y:enemy.y,visual:enemy.visual,hitBox:enemy.hitBox,maxHp:enemy.maxHp,hp:enemy.hp,isDefeated:hasHealth(enemy)&&enemy.hp<=0,bounds:getBounds(enemy)}):null}
  function getEnemy(id){return getSnapshot(getById(id))}
  function getEnemies(){return Object.freeze(enemies.map(getSnapshot))}
  function configureHealth(id,health={}){
    const enemy=getById(id);if(!enemy)return Object.freeze({applied:false,reason:'ENEMY_NOT_FOUND',enemy:null});
    const normalized=normalizeHealth(health);
    if(normalized.maxHp===null)return Object.freeze({applied:false,reason:'INVALID_MAX_HP',enemy:getSnapshot(enemy)});
    enemy.maxHp=normalized.maxHp;enemy.hp=normalized.hp;renderHealth(enemy);
    return Object.freeze({applied:true,reason:null,enemy:getSnapshot(enemy)});
  }
  function applyDamage(id,amount){
    const enemy=getById(id);if(!enemy)return Object.freeze({applied:false,reason:'ENEMY_NOT_FOUND',amount:0,before:null,after:null,defeatedNow:false,enemy:null});
    const damage=Number(amount);
    if(!Number.isFinite(damage)||damage<=0)return Object.freeze({applied:false,reason:'INVALID_DAMAGE',amount:0,before:enemy.hp,after:enemy.hp,defeatedNow:false,enemy:getSnapshot(enemy)});
    if(!hasHealth(enemy))return Object.freeze({applied:false,reason:'HP_NOT_CONFIGURED',amount:0,before:null,after:null,defeatedNow:false,enemy:getSnapshot(enemy)});
    if(enemy.hp<=0)return Object.freeze({applied:false,reason:'ALREADY_DEFEATED',amount:0,before:enemy.hp,after:enemy.hp,defeatedNow:false,enemy:getSnapshot(enemy)});
    const before=enemy.hp;
    enemy.hp=Math.max(0,before-damage);renderHealth(enemy);
    const applied=before-enemy.hp;
    return Object.freeze({applied:true,reason:null,amount:applied,before,after:enemy.hp,defeatedNow:before>0&&enemy.hp<=0,enemy:getSnapshot(enemy)});
  }
  function containsPointRaw(enemy,x,y){
    if(!enemy||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const centerX=enemy.x+enemy.hitBox.offsetX,centerY=enemy.y+enemy.hitBox.offsetY;
    const halfW=enemy.hitBox.width/2,halfH=enemy.hitBox.height/2;
    return x>=centerX-halfW&&x<=centerX+halfW&&y>=centerY-halfH&&y<=centerY+halfH;
  }
  function containsPoint(id,x,y){
    return containsPointRaw(getById(id),x,y);
  }
  function findEnemyIdAtPoint(x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    for(const enemy of enemies){
      if(containsPointRaw(enemy,x,y))return enemy.id;
    }
    return null;
  }
  function intersectsRange(id,shape){
    const enemy=getById(id);return !!enemy&&RANGE.intersectsBounds(shape,getBounds(enemy));
  }
  function getHitEnemies(shape){
    if(!shape)return Object.freeze([]);
    return Object.freeze(enemies.filter(enemy=>RANGE.intersectsBounds(shape,getBounds(enemy))).map(getSnapshot));
  }
  function debugFlash(id){
    const enemy=getById(id);if(!enemy)return;
    const token=++enemy.flashToken;
    enemy.el.style.filter='brightness(2.35) saturate(1.7)';
    enemy.el.style.boxShadow='0 0 0 3px rgba(255,255,255,.8) inset,0 0 30px rgba(255,245,120,.95)';
    setTimeout(()=>{
      if(enemy.flashToken!==token)return;
      enemy.el.style.filter='';
      enemy.el.style.boxShadow='0 0 0 3px rgba(255,255,255,.18) inset,0 0 20px rgba(255,70,90,.55)';
    },180);
  }

  window.BattleNetworkEnemy=Object.freeze({spawn,getEnemy,getEnemies,configureHealth,applyDamage,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,debugFlash});

  const testCenter=FIELD.tileToWorldCenter(Math.floor(FIELD.GRID_ROWS/2),Math.floor(FIELD.GRID_COLS/2)+3);
  if(testCenter)spawn({x:testCenter.x,y:testCenter.y,health:{maxHp:200}});
})();
