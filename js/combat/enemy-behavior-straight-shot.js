(()=>{
  const AI=window.BattleNetworkEnemyAI;
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const PLAYER=window.BattleNetworkPlayer;
  const PLAYER_DAMAGE=window.BattleNetworkPlayerDamage;
  const scene=document.getElementById('scene');
  if(!AI||!FIELD||!ENEMY||!PLAYER||!PLAYER_DAMAGE||!scene){
    throw new Error('BattleNetworkEnemyStraightShotBehavior: required dependency is missing.');
  }

  const BEHAVIOR_ID='PROTOTYPE_STRAIGHT_SHOT';
  const DEFAULT_CONFIG=Object.freeze({
    testOnly:true,
    damage:10,
    telegraphMs:700,
    cooldownMs:2200,
    projectileSpeed:720,
    telegraphDistanceTiles:6,
    maxTravelWorld:FIELD.WORLD_SIZE*1.5
  });
  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;

  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function normalize(dx,dy){const len=Math.hypot(dx,dy)||1;return{x:dx/len,y:dy/len}}
  function createController({enemyId,config}){
    const cfg=Object.freeze({
      ...DEFAULT_CONFIG,
      ...config,
      damage:positive(config?.damage,DEFAULT_CONFIG.damage),
      telegraphMs:positive(config?.telegraphMs,DEFAULT_CONFIG.telegraphMs),
      cooldownMs:positive(config?.cooldownMs,DEFAULT_CONFIG.cooldownMs),
      projectileSpeed:positive(config?.projectileSpeed,DEFAULT_CONFIG.projectileSpeed),
      telegraphDistanceTiles:positive(config?.telegraphDistanceTiles,DEFAULT_CONFIG.telegraphDistanceTiles),
      maxTravelWorld:positive(config?.maxTravelWorld,DEFAULT_CONFIG.maxTravelWorld)
    });
    let telegraph=null;
    let projectile=null;
    let nextAttackAt=performance.now();

    function removeTelegraph(){if(telegraph?.el)telegraph.el.remove();telegraph=null}
    function removeProjectile(){if(projectile?.el)projectile.el.remove();projectile=null}
    function scheduleNext(now=performance.now()){nextAttackAt=now+cfg.cooldownMs}
    function canStart(now){const enemy=ENEMY.getEnemy(enemyId);return !!enemy&&!enemy.isDefeated&&!telegraph&&!projectile&&now>=nextAttackAt}
    function start(now){
      if(!canStart(now))return false;
      const enemy=ENEMY.getEnemy(enemyId),playerPos=PLAYER.getPosition();
      if(!enemy)return false;
      const direction=normalize(playerPos.x-enemy.x,playerPos.y-enemy.y);
      const distance=FIELD.toWorldDistance(cfg.telegraphDistanceTiles);
      const end={x:enemy.x+direction.x*distance,y:enemy.y+direction.y*distance};
      const a=project(enemy.x,enemy.y),b=project(end.x,end.y);
      const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
      const el=document.createElement('div');
      el.className='enemyTestTelegraph';
      el.style.cssText=`position:absolute;left:${a.x}px;top:${a.y-24}px;width:${length}px;height:6px;transform-origin:0 50%;transform:rotate(${angle}deg);background:rgba(255,76,76,.72);border:1px solid rgba(255,230,120,.95);border-radius:4px;box-shadow:0 0 5px rgba(255,70,70,.45);pointer-events:none;z-index:8;`;
      scene.appendChild(el);
      telegraph={origin:{x:enemy.x,y:enemy.y},direction,fireAt:now+cfg.telegraphMs,el};
      return true;
    }
    function fireTelegraph(){
      if(!telegraph)return;
      const data=telegraph;
      removeTelegraph();
      const el=document.createElement('div');
      el.className='enemyTestProjectile';
      el.style.cssText='position:absolute;width:28px;height:14px;border-radius:50%;background:#ff4a50;border:2px solid #ffd66d;box-shadow:0 0 8px rgba(255,80,80,.65);pointer-events:none;z-index:9;transform-origin:center;';
      scene.appendChild(el);
      projectile={x:data.origin.x,y:data.origin.y,dx:data.direction.x,dy:data.direction.y,travel:0,el};
    }
    function finish(now){removeProjectile();scheduleNext(now)}
    function updateProjectile(dt,now){
      if(!projectile)return;
      const step=cfg.projectileSpeed*dt;
      projectile.x+=projectile.dx*step;projectile.y+=projectile.dy*step;projectile.travel+=step;
      const p=project(projectile.x,projectile.y);
      projectile.el.style.transform=`translate(${p.x-14}px,${p.y-31}px)`;
      const hit=PLAYER_DAMAGE.resolvePointHit({x:projectile.x,y:projectile.y,damage:cfg.damage,sourceType:'ENEMY',sourceId:enemyId,attackId:BEHAVIOR_ID});
      if(hit.hit){finish(now);return}
      const out=projectile.x<0||projectile.x>FIELD.WORLD_SIZE||projectile.y<0||projectile.y>FIELD.WORLD_SIZE;
      if(out||projectile.travel>=cfg.maxTravelWorld)finish(now);
    }
    function update(now,dt){if(telegraph&&now>=telegraph.fireAt)fireTelegraph();updateProjectile(dt,now)}
    function cancel(now=performance.now()){const busy=!!telegraph||!!projectile;removeTelegraph();removeProjectile();if(busy)scheduleNext(now)}
    function destroy(){removeTelegraph();removeProjectile()}
    function isBusy(){return !!telegraph||!!projectile}
    function getSnapshot(){return Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,busy:isBusy(),nextAttackAt,config:cfg})}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot});
  }

  AI.registerBehavior(BEHAVIOR_ID,createController);
  window.BattleNetworkEnemyStraightShotBehavior=Object.freeze({BEHAVIOR_ID,DEFAULT_CONFIG});
})();
