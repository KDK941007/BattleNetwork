(()=>{
  const AI=window.BattleNetworkEnemyAI;
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const PLAYER=window.BattleNetworkPlayer;
  const PLAYER_DAMAGE=window.BattleNetworkPlayerDamage;
  const ATTACK_LAYER=window.BattleNetworkEnemyAttackLayer;
  if(!AI||!FIELD||!ENEMY||!PLAYER||!PLAYER_DAMAGE||!ATTACK_LAYER){
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

  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
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
    const telegraphEl=ATTACK_LAYER.createTelegraph();
    const projectileEl=ATTACK_LAYER.createProjectile();
    let telegraph=null;
    let projectile=null;
    let nextAttackAt=performance.now();

    function removeTelegraph(){ATTACK_LAYER.hideTelegraph(telegraphEl);telegraph=null}
    function removeProjectile(){ATTACK_LAYER.hideProjectile(projectileEl);projectile=null}
    function scheduleNext(now=performance.now()){nextAttackAt=now+cfg.cooldownMs}
    function canStart(now){const enemy=ENEMY.getEnemy(enemyId);return !!enemy&&!enemy.isDefeated&&!telegraph&&!projectile&&now>=nextAttackAt}
    function start(now){
      if(!canStart(now))return false;
      const enemy=ENEMY.getEnemy(enemyId),playerPos=PLAYER.getPosition();
      if(!enemy)return false;
      const direction=normalize(playerPos.x-enemy.x,playerPos.y-enemy.y);
      const distance=FIELD.toWorldDistance(cfg.telegraphDistanceTiles);
      const origin={x:enemy.x,y:enemy.y};
      const end={x:enemy.x+direction.x*distance,y:enemy.y+direction.y*distance};
      ATTACK_LAYER.showTelegraph(telegraphEl,origin,end);
      telegraph={origin,direction,fireAt:now+cfg.telegraphMs};
      return true;
    }
    function fireTelegraph(){
      if(!telegraph)return;
      const data=telegraph;
      removeTelegraph();
      projectile={x:data.origin.x,y:data.origin.y,dx:data.direction.x,dy:data.direction.y,travel:0};
      ATTACK_LAYER.showProjectile(projectileEl,projectile.x,projectile.y);
    }
    function finish(now){removeProjectile();scheduleNext(now)}
    function updateProjectile(dt,now){
      if(!projectile)return;
      const step=cfg.projectileSpeed*dt;
      projectile.x+=projectile.dx*step;projectile.y+=projectile.dy*step;projectile.travel+=step;
      ATTACK_LAYER.updateProjectile(projectileEl,projectile.x,projectile.y);
      const hit=PLAYER_DAMAGE.resolvePointHit({x:projectile.x,y:projectile.y,damage:cfg.damage,sourceType:'ENEMY',sourceId:enemyId,attackId:BEHAVIOR_ID});
      if(hit.hit){finish(now);return}
      const out=projectile.x<0||projectile.x>FIELD.WORLD_SIZE||projectile.y<0||projectile.y>FIELD.WORLD_SIZE;
      if(out||projectile.travel>=cfg.maxTravelWorld)finish(now);
    }
    function update(now,dt){if(telegraph&&now>=telegraph.fireAt)fireTelegraph();updateProjectile(dt,now)}
    function cancel(now=performance.now()){const busy=!!telegraph||!!projectile;removeTelegraph();removeProjectile();if(busy)scheduleNext(now)}
    function destroy(){removeTelegraph();removeProjectile();ATTACK_LAYER.destroy(telegraphEl);ATTACK_LAYER.destroy(projectileEl)}
    function isBusy(){return !!telegraph||!!projectile}
    function getSnapshot(){return Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,busy:isBusy(),nextAttackAt,config:cfg})}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot});
  }

  AI.registerBehavior(BEHAVIOR_ID,createController);
  window.BattleNetworkEnemyStraightShotBehavior=Object.freeze({BEHAVIOR_ID,DEFAULT_CONFIG});
})();
