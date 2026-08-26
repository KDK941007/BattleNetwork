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

  let activeEnemyId=null;
  let running=true;
  let lastFrame=performance.now();

  function normalizeId(value){return String(value||'').trim()}
  function uiPaused(){
    return customModal?.classList.contains('open')||settingsModal?.classList.contains('open')||chipDetailModal?.classList.contains('open')||editTopBar?.classList.contains('open');
  }
  function isSystemPaused(){return pauseReasons.size>0||uiPaused()||HEALTH.getSnapshot().isDefeated}
  function call(controller,method,...args){
    try{return typeof controller?.[method]==='function'?controller[method](...args):undefined}
    catch(error){console.error(`BattleNetworkEnemyAI controller ${method} failed.`,error);return undefined}
  }
  function destroyAssignment(enemyId){
    const assignment=assignments.get(enemyId);
    if(!assignment)return false;
    if(activeEnemyId===enemyId){call(assignment.controller,'cancel',performance.now());activeEnemyId=null}
    call(assignment.controller,'destroy');
    assignments.delete(enemyId);
    return true;
  }
  function cleanupMissingEnemies(){
    for(const enemyId of [...assignments.keys()])if(!ENEMY.getEnemy(enemyId))destroyAssignment(enemyId);
  }
  function cancelActive(now=performance.now()){
    if(activeEnemyId===null)return false;
    const assignment=assignments.get(activeEnemyId);
    if(assignment)call(assignment.controller,'cancel',now);
    activeEnemyId=null;
    return true;
  }
  function registerBehavior(behaviorId,factory){
    const id=normalizeId(behaviorId);
    if(!id)throw new Error('BattleNetworkEnemyAI: behaviorId is required.');
    if(typeof factory!=='function')throw new Error(`BattleNetworkEnemyAI: factory for ${id} must be a function.`);
    if(registry.has(id))throw new Error(`BattleNetworkEnemyAI: behavior ${id} is already registered.`);
    registry.set(id,factory);
    return id;
  }
  function assignBehavior(enemyId,behaviorId,config={}){
    const enemy=ENEMY.getEnemy(enemyId);
    const id=normalizeId(behaviorId);
    if(!enemy)return Object.freeze({ok:false,reason:'ENEMY_NOT_FOUND',enemyId,behaviorId:id||null});
    const factory=registry.get(id);
    if(!factory)return Object.freeze({ok:false,reason:'BEHAVIOR_NOT_REGISTERED',enemyId,behaviorId:id||null});
    destroyAssignment(enemyId);
    let controller;
    try{controller=factory(Object.freeze({enemyId,config:Object.freeze({...config})}))}
    catch(error){console.error(`BattleNetworkEnemyAI: failed to create behavior ${id}.`,error);return Object.freeze({ok:false,reason:'BEHAVIOR_CREATE_FAILED',enemyId,behaviorId:id})}
    if(!controller||typeof controller!=='object')return Object.freeze({ok:false,reason:'INVALID_CONTROLLER',enemyId,behaviorId:id});
    assignments.set(enemyId,{enemyId,behaviorId:id,controller});
    return Object.freeze({ok:true,reason:null,enemyId,behaviorId:id});
  }
  function clearAssignments(){
    cancelActive();
    for(const enemyId of [...assignments.keys()])destroyAssignment(enemyId);
    return getSnapshot();
  }
  function pause(reason='MANUAL'){
    const key=normalizeId(reason)||'MANUAL';
    pauseReasons.add(key);
    cancelActive();
    return getSnapshot();
  }
  function resume(reason='MANUAL'){
    const key=normalizeId(reason)||'MANUAL';
    pauseReasons.delete(key);
    return getSnapshot();
  }
  function getSnapshot(){
    return Object.freeze({
      schedulerPolicy:'FIRST_ACTIVE',
      running,
      paused:isSystemPaused(),
      pauseReasons:Object.freeze([...pauseReasons]),
      activeEnemyId,
      assignments:Object.freeze([...assignments.values()].map(item=>Object.freeze({enemyId:item.enemyId,behaviorId:item.behaviorId}))),
      registeredBehaviors:Object.freeze([...registry.keys()])
    });
  }
  function tryStartFirstActive(now){
    const enemy=ENEMY.getActiveEnemies()[0]||null;
    if(!enemy)return;
    const assignment=assignments.get(enemy.id);
    if(!assignment)return;
    if(call(assignment.controller,'canStart',now)!==true)return;
    call(assignment.controller,'start',now);
    if(call(assignment.controller,'isBusy')===true)activeEnemyId=enemy.id;
  }
  function updateActive(now,dt){
    if(activeEnemyId===null)return;
    const assignment=assignments.get(activeEnemyId);
    if(!assignment){activeEnemyId=null;return}
    call(assignment.controller,'update',now,dt);
    if(call(assignment.controller,'isBusy')!==true)activeEnemyId=null;
  }
  function loop(now){
    if(!running)return;
    const dt=Math.min((now-lastFrame)/1000,.05);
    lastFrame=now;
    cleanupMissingEnemies();
    if(isSystemPaused()){
      cancelActive(now);
      requestAnimationFrame(loop);
      return;
    }
    updateActive(now,dt);
    if(activeEnemyId===null)tryStartFirstActive(now);
    requestAnimationFrame(loop);
  }
  function stop(){if(!running)return;running=false;cancelActive()}
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
