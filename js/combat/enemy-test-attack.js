(()=>{
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const PLAYER=window.BattleNetworkPlayer;
  const HEALTH=window.BattleNetworkPlayerHealth;
  const PLAYER_DAMAGE=window.BattleNetworkPlayerDamage;
  const scene=document.getElementById('scene');
  const customModal=document.getElementById('customModal');
  const settingsModal=document.getElementById('settingsModal');
  const chipDetailModal=document.getElementById('chipDetailModal');
  const editTopBar=document.getElementById('editTopBar');

  if(!FIELD||!ENEMY||!PLAYER||!HEALTH||!PLAYER_DAMAGE||!scene){
    throw new Error('BattleNetworkEnemyTestAttack: required dependency is missing.');
  }

  const CONFIG=Object.freeze({
    damage:10,
    telegraphMs:700,
    cooldownMs:2200,
    projectileSpeed:720,
    telegraphDistanceTiles:6,
    maxTravelWorld:FIELD.WORLD_SIZE*1.5
  });
  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;
  let telegraph=null;
  let projectile=null;
  let nextAttackAt=performance.now()+1400;
  let lastFrame=performance.now();
  let running=true;

  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function normalize(dx,dy){const len=Math.hypot(dx,dy)||1;return{x:dx/len,y:dy/len}}
  function combatPaused(){
    return customModal?.classList.contains('open')||settingsModal?.classList.contains('open')||chipDetailModal?.classList.contains('open')||editTopBar?.classList.contains('open');
  }
  function activeEnemy(){return ENEMY.getEnemies().find(enemy=>!enemy.isDefeated)||null}
  function removeTelegraph(){if(telegraph?.el)telegraph.el.remove();telegraph=null}
  function removeProjectile(){if(projectile?.el)projectile.el.remove();projectile=null}
  function scheduleNext(now=performance.now()){nextAttackAt=now+CONFIG.cooldownMs}

  function createTelegraph(enemy,now){
    const playerPos=PLAYER.getPosition();
    const direction=normalize(playerPos.x-enemy.x,playerPos.y-enemy.y);
    const distance=FIELD.toWorldDistance(CONFIG.telegraphDistanceTiles);
    const end={x:enemy.x+direction.x*distance,y:enemy.y+direction.y*distance};
    const a=project(enemy.x,enemy.y),b=project(end.x,end.y);
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
    const el=document.createElement('div');
    el.className='enemyTestTelegraph';
    el.style.cssText=`position:absolute;left:${a.x}px;top:${a.y-24}px;width:${length}px;height:6px;transform-origin:0 50%;transform:rotate(${angle}deg);background:rgba(255,76,76,.72);border:1px solid rgba(255,230,120,.95);border-radius:4px;box-shadow:0 0 5px rgba(255,70,70,.45);pointer-events:none;z-index:8;`;
    scene.appendChild(el);
    telegraph={enemyId:enemy.id,origin:{x:enemy.x,y:enemy.y},direction,fireAt:now+CONFIG.telegraphMs,el};
  }

  function fireTelegraph(){
    if(!telegraph)return;
    const data=telegraph;
    removeTelegraph();
    const el=document.createElement('div');
    el.className='enemyTestProjectile';
    el.style.cssText='position:absolute;width:28px;height:14px;border-radius:50%;background:#ff4a50;border:2px solid #ffd66d;box-shadow:0 0 8px rgba(255,80,80,.65);pointer-events:none;z-index:9;transform-origin:center;';
    scene.appendChild(el);
    projectile={x:data.origin.x,y:data.origin.y,dx:data.direction.x,dy:data.direction.y,travel:0,enemyId:data.enemyId,el};
  }

  function updateProjectile(dt,now){
    if(!projectile)return;
    const step=CONFIG.projectileSpeed*dt;
    projectile.x+=projectile.dx*step;
    projectile.y+=projectile.dy*step;
    projectile.travel+=step;
    const p=project(projectile.x,projectile.y);
    projectile.el.style.transform=`translate(${p.x-14}px,${p.y-31}px)`;

    const hit=PLAYER_DAMAGE.resolvePointHit({
      x:projectile.x,
      y:projectile.y,
      damage:CONFIG.damage,
      sourceType:'ENEMY',
      sourceId:projectile.enemyId,
      attackId:'TEST_STRAIGHT_SHOT'
    });
    if(hit.hit){
      removeProjectile();
      scheduleNext(now);
      return;
    }
    const out=projectile.x<0||projectile.x>FIELD.WORLD_SIZE||projectile.y<0||projectile.y>FIELD.WORLD_SIZE;
    if(out||projectile.travel>=CONFIG.maxTravelWorld){
      removeProjectile();
      scheduleNext(now);
    }
  }

  function cancelForPause(now){
    if(telegraph)removeTelegraph();
    if(projectile)removeProjectile();
    scheduleNext(now);
  }

  function loop(now){
    const dt=Math.min((now-lastFrame)/1000,.05);
    lastFrame=now;
    if(!running)return;

    if(combatPaused()){
      if(telegraph||projectile)cancelForPause(now);
      requestAnimationFrame(loop);
      return;
    }

    const health=HEALTH.getSnapshot();
    if(health.isDefeated){
      removeTelegraph();
      removeProjectile();
      requestAnimationFrame(loop);
      return;
    }

    if(telegraph&&now>=telegraph.fireAt)fireTelegraph();
    updateProjectile(dt,now);
    if(!telegraph&&!projectile&&now>=nextAttackAt){
      const enemy=activeEnemy();
      if(enemy)createTelegraph(enemy,now);else scheduleNext(now);
    }
    requestAnimationFrame(loop);
  }

  function stop(){running=false;removeTelegraph();removeProjectile()}
  function start(){if(running)return;running=true;lastFrame=performance.now();scheduleNext(lastFrame);requestAnimationFrame(loop)}

  window.BattleNetworkEnemyTestAttack=Object.freeze({
    getConfig:()=>CONFIG,
    start,
    stop
  });
  requestAnimationFrame(loop);
})();
