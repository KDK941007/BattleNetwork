(()=>{
  const HEALTH=window.BattleNetworkPlayerHealth;
  const PLAYER=window.BattleNetworkPlayer;
  const RANGE=window.BattleNetworkRangeGeometry;
  const PLAYER_EL=document.getElementById('player');
  if(!HEALTH)throw new Error('BattleNetworkPlayerDamage: player health is not loaded.');
  if(!PLAYER)throw new Error('BattleNetworkPlayerDamage: player foundation is not loaded.');
  if(!RANGE)throw new Error('BattleNetworkPlayerDamage: range geometry is not loaded.');

  const INVINCIBILITY_MS=2000;
  let invincibleUntil=0;
  let invincibilityTimer=null;

  function freezeResult(result){return Object.freeze(result)}
  function sourceMeta(input={}){
    return Object.freeze({
      sourceType:String(input.sourceType||'ENEMY'),
      sourceId:input.sourceId??null,
      attackId:input.attackId??null
    });
  }
  function isInvincible(now=performance.now()){
    return now<invincibleUntil;
  }
  function remainingInvincibilityMs(now=performance.now()){
    return Math.max(0,invincibleUntil-now);
  }
  function clearInvincibilityVisual(){
    PLAYER_EL?.classList.remove('damageInvincible');
  }
  function scheduleInvincibilityEnd(){
    if(invincibilityTimer!==null)clearTimeout(invincibilityTimer);
    const remaining=remainingInvincibilityMs();
    if(remaining<=0){
      invincibilityTimer=null;
      clearInvincibilityVisual();
      return;
    }
    invincibilityTimer=setTimeout(()=>{
      invincibilityTimer=null;
      if(isInvincible())scheduleInvincibilityEnd();
      else clearInvincibilityVisual();
    },remaining+16);
  }
  function beginInvincibility(durationMs=INVINCIBILITY_MS){
    const duration=Number(durationMs);
    if(!Number.isFinite(duration)||duration<=0)return false;
    invincibleUntil=performance.now()+duration;
    PLAYER_EL?.classList.add('damageInvincible');
    scheduleInvincibilityEnd();
    return true;
  }
  function clearInvincibility(){
    invincibleUntil=0;
    if(invincibilityTimer!==null){
      clearTimeout(invincibilityTimer);
      invincibilityTimer=null;
    }
    clearInvincibilityVisual();
  }
  function missResult(reason,input={}){
    const health=HEALTH.getSnapshot();
    return freezeResult({
      hit:false,
      applied:false,
      reason,
      requestedDamage:Number(input.damage),
      appliedDamage:0,
      beforeHp:health.hp,
      afterHp:health.hp,
      defeatedNow:false,
      invincible:isInvincible(),
      remainingInvincibilityMs:remainingInvincibilityMs(),
      ...sourceMeta(input),
      health
    });
  }
  function applyResolvedDamage(input={}){
    const damage=Number(input.damage);
    if(!Number.isFinite(damage)||damage<=0)return missResult('INVALID_DAMAGE',input);
    if(isInvincible())return missResult('INVINCIBLE',input);
    const result=HEALTH.applyDamage(damage);
    if(result.ok===true&&(result.appliedDamage||0)>0&&result.defeatedNow!==true){
      PLAYER.beginHitStun?.();
      beginInvincibility();
    }
    return freezeResult({
      hit:true,
      applied:result.ok===true,
      reason:result.reason,
      requestedDamage:damage,
      appliedDamage:result.appliedDamage||0,
      beforeHp:result.beforeHp,
      afterHp:result.afterHp,
      defeatedNow:result.defeatedNow===true,
      invincible:isInvincible(),
      remainingInvincibilityMs:remainingInvincibilityMs(),
      ...sourceMeta(input),
      health:HEALTH.getSnapshot()
    });
  }
  function resolvePointHit(input={}){
    const x=Number(input.x),y=Number(input.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return missResult('INVALID_POINT',input);
    if(!PLAYER.containsPoint(x,y))return missResult('MISS',input);
    return applyResolvedDamage(input);
  }
  function resolveRangeHit(input={}){
    const shape=input.shape;
    if(!shape)return missResult('INVALID_RANGE',input);
    let hit=false;
    try{hit=RANGE.intersectsBounds(shape,PLAYER.getBounds())}catch{return missResult('INVALID_RANGE',input)}
    if(!hit)return missResult('MISS',input);
    return applyResolvedDamage(input);
  }

  window.BattleNetworkPlayerDamage=Object.freeze({
    INVINCIBILITY_MS,
    resolvePointHit,
    resolveRangeHit,
    isInvincible,
    getRemainingInvincibilityMs:remainingInvincibilityMs,
    clearInvincibility
  });
})();
