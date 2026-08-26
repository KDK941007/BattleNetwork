(()=>{
  const AI=window.BattleNetworkEnemyAI;
  const FIELD=window.BattleNetworkField;
  const RANGE=window.BattleNetworkRangeGeometry;
  const PLAYER=window.BattleNetworkPlayer;
  const PLAYER_DAMAGE=window.BattleNetworkPlayerDamage;
  const ATTACK_LAYER=window.BattleNetworkEnemyAttackLayer;
  if(!AI||!FIELD||!RANGE||!PLAYER||!PLAYER_DAMAGE||!ATTACK_LAYER){
    throw new Error('BattleNetworkEnemyTargetAreaBehavior: required dependency is missing.');
  }

  const BEHAVIOR_ID='PROTOTYPE_TARGET_AREA';
  const DEFAULT_CONFIG=Object.freeze({
    testOnly:true,
    damage:10,
    radiusTiles:1.1,
    telegraphMs:900,
    impactMs:140,
    cooldownMs:2600
  });

  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function createController({enemyId,config}){
    const cfg=Object.freeze({
      ...DEFAULT_CONFIG,
      ...config,
      damage:positive(config?.damage,DEFAULT_CONFIG.damage),
      radiusTiles:positive(config?.radiusTiles,DEFAULT_CONFIG.radiusTiles),
      telegraphMs:positive(config?.telegraphMs,DEFAULT_CONFIG.telegraphMs),
      impactMs:positive(config?.impactMs,DEFAULT_CONFIG.impactMs),
      cooldownMs:positive(config?.cooldownMs,DEFAULT_CONFIG.cooldownMs)
    });
    const markerEl=ATTACK_LAYER.createAreaMarker();
    let phase=null;
    let target=null;
    let shape=null;
    let fireAt=0;
    let finishAt=0;
    let nextAttackAt=performance.now();

    function scheduleNext(now=performance.now()){nextAttackAt=now+cfg.cooldownMs}
    function clearMarker(){ATTACK_LAYER.hideArea(markerEl)}
    function canStart(now){return phase===null&&now>=nextAttackAt}
    function start(now){
      if(!canStart(now))return false;
      const playerPos=PLAYER.getPosition();
      target={x:playerPos.x,y:playerPos.y};
      shape=RANGE.createCircle(target,cfg.radiusTiles);
      fireAt=now+cfg.telegraphMs;
      finishAt=0;
      phase='TELEGRAPH';
      ATTACK_LAYER.showAreaTelegraph(markerEl,target,shape.radiusWorld);
      return true;
    }
    function fire(now){
      if(phase!=='TELEGRAPH'||!shape)return;
      PLAYER_DAMAGE.resolveRangeHit({shape,damage:cfg.damage,sourceType:'ENEMY',sourceId:enemyId,attackId:BEHAVIOR_ID});
      ATTACK_LAYER.showAreaImpact(markerEl,target,shape.radiusWorld);
      phase='IMPACT';
      finishAt=now+cfg.impactMs;
    }
    function finish(now){
      clearMarker();
      phase=null;target=null;shape=null;fireAt=0;finishAt=0;
      scheduleNext(now);
    }
    function update(now){
      if(phase==='TELEGRAPH'&&now>=fireAt){fire(now);return}
      if(phase==='IMPACT'&&now>=finishAt)finish(now);
    }
    function cancel(now=performance.now()){
      const busy=phase!==null;
      clearMarker();
      phase=null;target=null;shape=null;fireAt=0;finishAt=0;
      if(busy)scheduleNext(now);
    }
    function destroy(){cancel();ATTACK_LAYER.destroy(markerEl)}
    function isBusy(){return phase!==null}
    function getSnapshot(){return Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,busy:isBusy(),phase,target:target?Object.freeze({...target}):null,nextAttackAt,config:cfg})}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot});
  }

  AI.registerBehavior(BEHAVIOR_ID,createController,{channel:'ATTACK'});
  window.BattleNetworkEnemyTargetAreaBehavior=Object.freeze({BEHAVIOR_ID,DEFAULT_CONFIG});
})();
