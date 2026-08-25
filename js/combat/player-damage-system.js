(()=>{
  const HEALTH=window.BattleNetworkPlayerHealth;
  const PLAYER=window.BattleNetworkPlayer;
  const RANGE=window.BattleNetworkRangeGeometry;
  if(!HEALTH)throw new Error('BattleNetworkPlayerDamage: player health is not loaded.');
  if(!PLAYER)throw new Error('BattleNetworkPlayerDamage: player foundation is not loaded.');
  if(!RANGE)throw new Error('BattleNetworkPlayerDamage: range geometry is not loaded.');

  function freezeResult(result){return Object.freeze(result)}
  function sourceMeta(input={}){
    return Object.freeze({
      sourceType:String(input.sourceType||'ENEMY'),
      sourceId:input.sourceId??null,
      attackId:input.attackId??null
    });
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
      ...sourceMeta(input),
      health
    });
  }
  function applyResolvedDamage(input={}){
    const damage=Number(input.damage);
    if(!Number.isFinite(damage)||damage<=0)return missResult('INVALID_DAMAGE',input);
    const result=HEALTH.applyDamage(damage);
    return freezeResult({
      hit:true,
      applied:result.ok===true,
      reason:result.reason,
      requestedDamage:damage,
      appliedDamage:result.appliedDamage||0,
      beforeHp:result.beforeHp,
      afterHp:result.afterHp,
      defeatedNow:result.defeatedNow===true,
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

  window.BattleNetworkPlayerDamage=Object.freeze({resolvePointHit,resolveRangeHit});
})();
