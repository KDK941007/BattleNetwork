from pathlib import Path

repo = Path('.')

new_ai = r'''(()=>{
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
  function destroyAssignment(enemyId){
    const assignment=assignments.get(enemyId);
    if(!assignment)return false;
    cancelAssignment(assignment);
    call(assignment.controller,'destroy');
    assignments.delete(enemyId);
    return true;
  }
  function cleanupMissingEnemies(){
    for(const enemyId of [...assignments.keys()])if(!ENEMY.getEnemy(enemyId))destroyAssignment(enemyId);
  }
  function cancelAll(now=performance.now()){
    let cancelled=0;
    for(const assignment of assignments.values())if(cancelAssignment(assignment,now))cancelled++;
    return cancelled;
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
    cancelAll();
    for(const enemyId of [...assignments.keys()])destroyAssignment(enemyId);
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
    const activeEnemyIds=[];
    for(const assignment of assignments.values())if(isBusy(assignment))activeEnemyIds.push(assignment.enemyId);
    return Object.freeze({
      schedulerPolicy:'INDEPENDENT_PER_ENEMY',
      running,
      paused:isSystemPaused(),
      pauseReasons:Object.freeze([...pauseReasons]),
      activeEnemyIds:Object.freeze(activeEnemyIds),
      assignments:Object.freeze([...assignments.values()].map(item=>Object.freeze({enemyId:item.enemyId,behaviorId:item.behaviorId}))),
      registeredBehaviors:Object.freeze([...registry.keys()])
    });
  }
  function updateAssignment(assignment,now,dt){
    const enemy=ENEMY.getEnemy(assignment.enemyId);
    if(!enemy){destroyAssignment(assignment.enemyId);return}

    // A behavior that already started keeps ownership of its own update cycle.
    // Whether an already-fired attack survives source defeat remains behavior-specific.
    if(isBusy(assignment)){
      call(assignment.controller,'update',now,dt);
      return;
    }

    // Defeated enemies never start a new action.
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
})();'''
(repo/'js/combat/enemy-ai-system.js').write_text(new_ai, encoding='utf-8')

index = (repo/'index.html').read_text(encoding='utf-8')
old = '<script src="./js/combat/enemy-ai-system.js?v=100"></script>'
new = '<script src="./js/combat/enemy-ai-system.js?v=101"></script>'
if old not in index:
    raise SystemExit('index enemy-ai v100 reference not found')
(repo/'index.html').write_text(index.replace(old,new), encoding='utf-8')

sw = (repo/'sw.js').read_text(encoding='utf-8')
if "battlenetwork-runtime-v100" not in sw:
    raise SystemExit('sw v100 cache name not found')
(repo/'sw.js').write_text(sw.replace('battlenetwork-runtime-v100','battlenetwork-runtime-v101',1), encoding='utf-8')

game = (repo/'GAME_DESIGN.md').read_text(encoding='utf-8')
anchor = "- 射撃型・突進型・砲撃型という分類はAI基盤検証のための候補であり、正式な敵3種類の仕様として確定しない。\n"
addition = anchor + "\n### v101 敵の独立行動ルール\n\n- 敵は原則として個体ごとに独立して行動する。複数敵が存在する場合も、グローバルな順番待ちや『1体の攻撃終了後に次の敵が行動』という制御は基本ルールにしない。\n- 各敵は自身のAI／Behavior状態、攻撃クールタイム、移動判断を個別に持ち、他の敵の行動中でも自身の条件を満たせば行動可能とする。\n- v101では `BattleNetworkEnemyAI` のスケジューラを `INDEPENDENT_PER_ENEMY` へ変更し、割り当て済みBehaviorを敵ごとに独立更新する。現行の直線射撃Behaviorでも複数敵がそれぞれ独立して予兆・射撃を開始できる。\n- 将来の移動Behaviorも同じ原則で個体ごとに独立更新する。具体的な移動方法・攻撃選択・行動頻度は正式な敵仕様を決める段階で確定する。\n- 例外として、ボスギミックや敵同士の連携攻撃など『意図的に同期させる』敵を設計する場合のみ、その敵固有仕様として協調制御を追加する。\n"
if anchor not in game:
    raise SystemExit('GAME_DESIGN v100 anchor not found')
(repo/'GAME_DESIGN.md').write_text(game.replace(anchor,addition,1), encoding='utf-8')

status = (repo/'DEVELOPMENT_STATUS.md').read_text(encoding='utf-8')
start = status.find('## 次フェーズ: v100 敵AI共通基盤 実機確認')
if start < 0:
    raise SystemExit('DEVELOPMENT_STATUS v100 section not found')
replacement = '''## 次フェーズ: v101 敵AI独立行動 実機確認

v100の敵AI共通基盤は実機確認で想定どおり動作した。ただし、`FIRST_ACTIVE` により先頭の生存敵だけが攻撃する挙動は検証用であり、ユーザー確認により正式な共通方針を「敵は各々独立して行動する」とした。

v101では `BattleNetworkEnemyAI` のグローバルな単一行動枠を廃止し、`INDEPENDENT_PER_ENEMY` として各敵のBehaviorコントローラを毎フレーム個別更新する。各敵は自身の `canStart / cooldown / busy` に従って行動するため、別の敵が攻撃中でも独立して予兆・攻撃を開始できる。将来の移動処理も同じ原則で敵個体ごとに独立させる。具体的な敵の移動・攻撃内容・HP・攻撃力・頻度・敵3種類の正式仕様は引き続き未確定とする。

実機確認では以下を優先する。

1. WAVE内のテスト敵2体が、互いの攻撃終了を待たずにそれぞれ独立して予兆・直線射撃を開始すること。
2. 片方が攻撃中でも、もう片方が自身のクールタイム条件を満たせば攻撃を開始できること。
3. 片方を撃破しても残った敵のAIが正常に継続し、撃破済み敵は新規行動を開始しないこと。
4. 複数の敵弾が近いタイミングで到達した場合も、v91の2秒無敵により連続被弾が過剰発生しないこと。
5. CUSTOM、WAVE CLEAR、WAVE n START中は全敵のAIが停止し、進行中の検証予兆／弾が残らないこと。
6. v99までのWave演出、v97のチップ0枚決定・Wave単位リセット・HP／位置引継ぎが維持されること。
7. v101確認後、独立行動基盤を使って別Behavior（移動／突進／範囲攻撃等）の検証へ進み、敵3種類の正式仕様はその後に確定する。
'''
(repo/'DEVELOPMENT_STATUS.md').write_text(status[:start] + replacement, encoding='utf-8')
