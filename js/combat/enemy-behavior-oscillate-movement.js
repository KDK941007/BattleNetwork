(()=>{
  const AI=window.BattleNetworkEnemyAI;
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  if(!AI||!FIELD||!ENEMY)throw new Error('BattleNetworkEnemyOscillateMovement: required dependency is missing.');

  const BEHAVIOR_ID='PROTOTYPE_OSCILLATE_MOVEMENT';
  const DEFAULT_CONFIG=Object.freeze({
    testOnly:true,
    distanceTiles:1,
    speedWorld:90,
    directionSign:1
  });

  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function sign(value){return Number(value)<0?-1:1}
  function createController({enemyId,config}){
    const initial=ENEMY.getEnemy(enemyId);
    if(!initial)throw new Error(`BattleNetworkEnemyOscillateMovement: enemy ${enemyId} is missing.`);
    const distanceWorld=FIELD.toWorldDistance(positive(config?.distanceTiles,DEFAULT_CONFIG.distanceTiles));
    const speedWorld=positive(config?.speedWorld,DEFAULT_CONFIG.speedWorld);
    const originX=initial.x,originY=initial.y;
    const minX=Math.max(0,originX-distanceWorld),maxX=Math.min(FIELD.WORLD_SIZE,originX+distanceWorld);
    let direction=sign(config?.directionSign??DEFAULT_CONFIG.directionSign);
    let running=false;

    function canStart(){const enemy=ENEMY.getEnemy(enemyId);return !!enemy&&!enemy.isDefeated&&!running}
    function start(){if(!canStart())return false;running=true;return true}
    function update(_now,dt){
      if(!running)return;
      const enemy=ENEMY.getEnemy(enemyId);
      if(!enemy||enemy.isDefeated){running=false;return}
      let nextX=enemy.x+direction*speedWorld*dt;
      if(nextX>=maxX){nextX=maxX;direction=-1}
      else if(nextX<=minX){nextX=minX;direction=1}
      const result=ENEMY.setPosition(enemyId,nextX,originY);
      if(!result?.applied&&result?.reason==='TERRAIN_BLOCKED')direction*=-1;
    }
    function cancel(){running=false}
    function destroy(){running=false}
    function isBusy(){return running}
    function getSnapshot(){return Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,busy:running,originX,originY,minX,maxX,direction,speedWorld,distanceWorld})}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot});
  }

  AI.registerBehavior(BEHAVIOR_ID,createController,{channel:'MOVEMENT'});
  window.BattleNetworkEnemyOscillateMovement=Object.freeze({BEHAVIOR_ID,DEFAULT_CONFIG});
})();
