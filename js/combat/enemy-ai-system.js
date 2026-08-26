(()=>{
  const ENEMY=window.BattleNetworkEnemy;
  const HEALTH=window.BattleNetworkPlayerHealth;
  if(!ENEMY)throw new Error('BattleNetworkEnemyAI: enemy foundation is not loaded.');
  if(!HEALTH)throw new Error('BattleNetworkEnemyAI: player health is not loaded.');

  const registry=new Map();
  const assignments=new Map();
  const pauseReasons=new Set(['WAVE_TRANSITION']);
  const customModal=document.getElementById('customModal');
  const settingsModal=document.getElementById('settingsModal');
  const chipDetailModal=document.getElementById('chipDetailModal');
  const editTopBar=document.getElementById('editTopBar');

  let running=true;
  let lastFrame=performance.now();

  function normalizeId(value){return String(value||'').trim()}
  function normalizeChannel(value){return (normalizeId(value)||'ATTACK').toUpperCase()}
  function assignmentKey(enemyId,channel){return `${enemyId}:${channel}`}
  function uiPaused(){
    return customModal?.classList.contains('open')||settingsModal?.classList.contains('open')||chipDetailModal?.classList.contains('open')||editTopBar?.classList.contains('open');
  }
  function isSystemPaused(){return pauseReasons.size>0||uiPaused()||HEALTH.getSnapshot().isDefeated}
  function call(controller,method,...args){
    try{return typeof controller?.[method]==='function'?controller[method](...args):undefined}
    catch(error){console.error(`BattleNetworkEnemyAI controller ${method} failed.`,error);return undefined}
  }
  function isBusy(assignment){return call(assignment?.controller,'isBusy')===true}
  function cancelAssignment(assignment,now=performance.now()){
    if(!assignment||!isBusy(assignment))return false;
    call(assignment.controller,'cancel',now);
    return true;
  }
  function destroyByKey(key){
    const assignment=assignments.get(key);
    if(!assignment)return false;
    cancelAssignment(assignment);
    call(assignment.controller,'destroy');
    assignments.delete(key);
    return true;
  }
  function destroyAssignment(enemyId,channel=null){
    if(channel!==null)return destroyByKey(assignmentKey(enemyId,normalizeChannel(channel)));
    let removed=false;
    for(const [key,assignment] of [...assignments.entries()]){
      if(assignment.enemyId===enemyId){destroyByKey(key);removed=true}
    }
    return removed;
  }
  function cleanupMissingEnemies(){
    for(const [key,assignment] of [...assignments.entries()])if(!ENEMY.getEnemy(assignment.enemyId))destroyByKey(key);
  }
  function cancelAll(now=performance.now()){
    let cancelled=0;
    for(const assignment of assignments.values())if(cancelAssignment(assignment,now))cancelled++;
    return cancelled;
  }
  function registerBehavior(behaviorId,factory,options={}){
    const id=normalizeId(behaviorId);
    if(!id)throw new Error('BattleNetworkEnemyAI: behaviorId is required.');
    if(typeof factory!=='function')throw new Error(`BattleNetworkEnemyAI: factory for ${id} must be a function.`);
    if(registry.has(id))throw new Error(`BattleNetworkEnemyAI: behavior ${id} is already registered.`);
    const channel=normalizeChannel(options?.channel);
    registry.set(id,Object.freeze({factory,channel}));
    return id;
  }
  function assignBehavior(enemyId,behaviorId,config={}){
    const enemy=ENEMY.getEnemy(enemyId);
    const id=normalizeId(behaviorId);
    if(!enemy)return Object.freeze({ok:false,reason:'ENEMY_NOT_FOUND',enemyId,behaviorId:id||null,channel:null});
    const registered=registry.get(id);
    if(!registered)return Object.freeze({ok:false,reason:'BEHAVIOR_NOT_REGISTERED',enemyId,behaviorId:id||null,channel:null});
    const {factory,channel}=registered;
    destroyAssignment(enemyId,channel);
    let controller;
    try{controller=factory(Object.freeze({enemyId,channel,config:Object.freeze({...config})}))}
    catch(error){console.error(`BattleNetworkEnemyAI: failed to create behavior ${id}.`,error);return Object.freeze({ok:false,reason:'BEHAVIOR_CREATE_FAILED',enemyId,behaviorId:id,channel})}
    if(!controller||typeof controller!=='object')return Object.freeze({ok:false,reason:'INVALID_CONTROLLER',enemyId,behaviorId:id,channel});
    assignments.set(assignmentKey(enemyId,channel),{enemyId,behaviorId:id,channel,controller});
    return Object.freeze({ok:true,reason:null,enemyId,behaviorId:id,channel});
  }
  function clearAssignments(){
    cancelAll();
    for(const key of [...assignments.keys()])destroyByKey(key);
    return getSnapshot();
  }
  function pause(reason='MANUAL'){
    const key=normalizeId(reason)||'MANUAL';
    pauseReasons.add(key);
    cancelAll();
    return getSnapshot();
  }
  function resume(reason='MANUAL'){
    const key=normalizeId(reason)||'MANUAL';
    pauseReasons.delete(key);
    return getSnapshot();
  }
  function getSnapshot(){
    const activeEnemyIds=new Set();
    const activeChannels=[];
    for(const assignment of assignments.values()){
      if(!isBusy(assignment))continue;
      activeEnemyIds.add(assignment.enemyId);
      activeChannels.push(Object.freeze({enemyId:assignment.enemyId,channel:assignment.channel,behaviorId:assignment.behaviorId}));
    }
    return Object.freeze({
      schedulerPolicy:'INDEPENDENT_PER_ENEMY_CHANNEL',
      running,
      paused:isSystemPaused(),
      pauseReasons:Object.freeze([...pauseReasons]),
      activeEnemyIds:Object.freeze([...activeEnemyIds]),
      activeChannels:Object.freeze(activeChannels),
      assignments:Object.freeze([...assignments.values()].map(item=>Object.freeze({enemyId:item.enemyId,behaviorId:item.behaviorId,channel:item.channel}))),
      registeredBehaviors:Object.freeze([...registry.entries()].map(([behaviorId,item])=>Object.freeze({behaviorId,channel:item.channel})))
    });
  }
  function updateAssignment(assignment,now,dt){
    const enemy=ENEMY.getEnemy(assignment.enemyId);
    if(!enemy){destroyByKey(assignmentKey(assignment.enemyId,assignment.channel));return}

    // Already-started work owns its channel update cycle. Attack source-death
    // handling remains behavior-specific; movement behavior stops itself on defeat.
    if(isBusy(assignment)){
      call(assignment.controller,'update',now,dt);
      return;
    }

    if(enemy.isDefeated)return;
    if(call(assignment.controller,'canStart',now)!==true)return;
    call(assignment.controller,'start',now);
  }
  function loop(now){
    if(!running)return;
    const dt=Math.min((now-lastFrame)/1000,.05);
    lastFrame=now;
    cleanupMissingEnemies();
    if(isSystemPaused()){
      cancelAll(now);
      requestAnimationFrame(loop);
      return;
    }
    for(const assignment of [...assignments.values()])updateAssignment(assignment,now,dt);
    requestAnimationFrame(loop);
  }
  function stop(){if(!running)return;running=false;cancelAll()}
  function start(){if(running)return;running=true;lastFrame=performance.now();requestAnimationFrame(loop)}

  window.BattleNetworkEnemyAI=Object.freeze({
    registerBehavior,
    assignBehavior,
    detachBehavior:destroyAssignment,
    clearAssignments,
    pause,
    resume,
    getSnapshot,
    start,
    stop
  });
  requestAnimationFrame(loop);
})();
