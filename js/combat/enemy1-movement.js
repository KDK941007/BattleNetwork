(()=>{
  const AI=window.BattleNetworkEnemyAI,FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,PLAYER=window.BattleNetworkPlayer,RUNTIME=window.BattleNetworkEnemy1Runtime,NAV=window.BattleNetworkEnemyNavigation;
  if(!AI||!FIELD||!ENEMY||!PLAYER||!RUNTIME)throw new Error('BattleNetworkEnemy1Movement: required dependency is missing.');
  const BEHAVIOR_ID='ENEMY1_MOVEMENT';
  const EDGE=FIELD.TILE_SIZE*.7;
  const PUSH_STUN_MS=100;
  const PATH_RECALC_MS=250;
  const WAYPOINT_REACHED=Math.max(12,FIELD.TILE_SIZE*.12);
  function random(a,b){return a+Math.random()*(b-a)}
  function unit(dx,dy){const l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l}}
  function tileKeyAt(position){const tile=FIELD.getTileAtWorld(position.x,position.y);return tile?`${tile.row}:${tile.col}`:''}
  function createController({enemyId}){
    let active=false,target=null,waitUntil=0,lastX=null,lastY=null,pushStunUntil=0,path=[],pathTargetKey='',lastPathAt=-Infinity;
    function clearPath(){path=[];pathTargetKey=''}
    function chooseWander(enemy){clearPath();const angle=Math.random()*Math.PI*2,distance=FIELD.toWorldDistance(random(1,2));target={x:Math.max(EDGE,Math.min(FIELD.WORLD_SIZE-EDGE,enemy.x+Math.cos(angle)*distance)),y:Math.max(EDGE,Math.min(FIELD.WORLD_SIZE-EDGE,enemy.y+Math.sin(angle)*distance))}}
    function updatePerception(enemy,player){const config=RUNTIME.getEnemyConfig(),start=FIELD.toWorldDistance(config.perceptionStartTiles),release=FIELD.toWorldDistance(config.perceptionReleaseTiles),d=Math.hypot(player.x-enemy.x,player.y-enemy.y),aware=RUNTIME.getPerception(enemyId);if(!aware&&d<=start)RUNTIME.setPerception(enemyId,true);else if(aware&&d>release){RUNTIME.setPerception(enemyId,false);target=null;clearPath();waitUntil=performance.now()+random(800,1500)}return RUNTIME.getPerception(enemyId)}
    function shouldChase(enemy,player,now){const config=RUNTIME.getEnemyConfig(),distance=Math.hypot(player.x-enemy.x,player.y-enemy.y),chaseRange=FIELD.toWorldDistance(config.chaseRangeTiles);if(distance>chaseRange)return false;if(config.chasePolicy===RUNTIME.CHASE_POLICY.ALWAYS_WHILE_AWARE)return true;if(config.chasePolicy===RUNTIME.CHASE_POLICY.OVERLAP_COOLDOWN_CHASE){if(!AI.isChannelEnabled('ATTACK'))return true;const attackRange=FIELD.toWorldDistance(RUNTIME.getPattern().attackStartRangeTiles);if(distance<=attackRange&&RUNTIME.isAttackReady(enemyId,now))return false;return true}return false}
    function chaseDirection(enemy,player){const config=RUNTIME.getEnemyConfig(),dx=player.x-enemy.x,dy=player.y-enemy.y,distance=Math.hypot(dx,dy),toward=unit(dx,dy);if(config.chaseDistanceMode===RUNTIME.CHASE_DISTANCE_MODE.APPROACH){const stopTiles=Number(config.approachStopTiles);if(Number.isFinite(stopTiles)&&stopTiles>=0&&distance<=FIELD.toWorldDistance(stopTiles))return null;return toward}if(config.chaseDistanceMode!==RUNTIME.CHASE_DISTANCE_MODE.KEEP_BAND)return toward;const minTiles=config.keepDistanceMinTiles,maxTiles=config.keepDistanceMaxTiles;if(!Number.isFinite(minTiles)||!Number.isFinite(maxTiles)||minTiles<0||maxTiles<minTiles)return toward;const min=FIELD.toWorldDistance(minTiles),max=FIELD.toWorldDistance(maxTiles);if(distance>max)return toward;if(distance<min)return{x:-toward.x,y:-toward.y};return null}
    function moveTo(enemy,x,y){if(enemy.collision?.allowPlayerOverlap!==true&&ENEMY.wouldOverlapBounds?.(enemyId,x,y,PLAYER.getBounds()))return false;const result=ENEMY.setPosition(enemyId,x,y);if(result?.applied){lastX=result.enemy.x;lastY=result.enemy.y;return true}return false}
    function buildPath(player,now){if(!NAV?.findPath)return false;path=[...NAV.findPath(enemyId,player,{blockedBounds:PLAYER.getBounds()})];pathTargetKey=tileKeyAt(player);lastPathAt=now;return path.length>0}
    function followPath(enemy,player,speed,dt,now){
      const playerKey=tileKeyAt(player);
      if((!path.length||pathTargetKey!==playerKey)&&now-lastPathAt>=PATH_RECALC_MS&&!buildPath(player,now))return false;
      while(path.length&&Math.hypot(path[0].x-enemy.x,path[0].y-enemy.y)<=WAYPOINT_REACHED)path.shift();
      if(!path.length){if(now-lastPathAt>=PATH_RECALC_MS)buildPath(player,now);return false}
      const waypoint=path[0],d=unit(waypoint.x-enemy.x,waypoint.y-enemy.y);
      if(moveTo(enemy,enemy.x+d.x*speed*dt,enemy.y+d.y*speed*dt))return true;
      if(now-lastPathAt>=PATH_RECALC_MS){clearPath();buildPath(player,now)}
      return false;
    }
    function chase(enemy,player,speed,dt,now){
      const config=RUNTIME.getEnemyConfig(),d=chaseDirection(enemy,player);if(!d){clearPath();return}
      if(config.navigationPolicy===RUNTIME.NAVIGATION_POLICY?.DIRECT||!NAV){clearPath();moveTo(enemy,enemy.x+d.x*speed*dt,enemy.y+d.y*speed*dt);return}
      if(path.length){followPath(enemy,player,speed,dt,now);return}
      if(moveTo(enemy,enemy.x+d.x*speed*dt,enemy.y+d.y*speed*dt)){pathTargetKey=tileKeyAt(player);return}
      if(buildPath(player,now))followPath(enemy,player,speed,dt,now);
    }
    function detectExternalPush(enemy,now,dt){if(lastX===null||lastY===null){lastX=enemy.x;lastY=enemy.y;return false}const moved=Math.hypot(enemy.x-lastX,enemy.y-lastY),maxOwnMove=RUNTIME.getPattern().moveSpeedWorld*dt+1;if(moved>maxOwnMove){pushStunUntil=Math.max(pushStunUntil,now+PUSH_STUN_MS);target=null;clearPath();lastX=enemy.x;lastY=enemy.y;return true}lastX=enemy.x;lastY=enemy.y;return false}
    function canStart(){const e=ENEMY.getEnemy(enemyId);return !!e&&!e.isDefeated}
    function start(){active=true;return true}
    function update(now,dt){const enemy=ENEMY.getEnemy(enemyId);if(!enemy||enemy.isDefeated){active=false;return}detectExternalPush(enemy,now,dt);const player=PLAYER.getPosition(),aware=updatePerception(enemy,player);if(now<pushStunUntil)return;if(RUNTIME.isAttackLocked(enemyId))return;const speed=RUNTIME.getPattern().moveSpeedWorld;if(aware){target=null;if(!shouldChase(enemy,player,now)){clearPath();return}chase(enemy,player,speed,dt,now);return}clearPath();if(now<waitUntil)return;if(!target)chooseWander(enemy);const dx=target.x-enemy.x,dy=target.y-enemy.y,remain=Math.hypot(dx,dy);if(remain<=Math.max(3,speed*dt)){if(moveTo(enemy,target.x,target.y)){target=null;waitUntil=now+random(800,1500)}else{target=null;waitUntil=now+random(300,700)}return}const d=unit(dx,dy);if(!moveTo(enemy,enemy.x+d.x*speed*dt,enemy.y+d.y*speed*dt)){target=null;waitUntil=now+random(300,700)}}
    function cancel(){active=false;target=null;clearPath()}
    function destroy(){cancel();RUNTIME.clearEnemy(enemyId)}
    function isBusy(){return active}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot:()=>Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,aware:RUNTIME.getPerception(enemyId),chasePolicy:RUNTIME.getEnemyConfig().chasePolicy,chaseRangeTiles:RUNTIME.getEnemyConfig().chaseRangeTiles,chaseDistanceMode:RUNTIME.getEnemyConfig().chaseDistanceMode,navigationPolicy:RUNTIME.getEnemyConfig().navigationPolicy,pathWaypoints:path.length,approachStopTiles:RUNTIME.getEnemyConfig().approachStopTiles,keepDistanceMinTiles:RUNTIME.getEnemyConfig().keepDistanceMinTiles,keepDistanceMaxTiles:RUNTIME.getEnemyConfig().keepDistanceMaxTiles,pushStunMs:PUSH_STUN_MS,pushStunned:performance.now()<pushStunUntil,busy:active})});
  }
  AI.registerBehavior(BEHAVIOR_ID,createController,{channel:'MOVEMENT'});
  window.BattleNetworkEnemy1Movement=Object.freeze({BEHAVIOR_ID,PUSH_STUN_MS,PATH_RECALC_MS});
})();
