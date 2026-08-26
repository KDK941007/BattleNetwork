from pathlib import Path

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, content):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

ai_js = r'''(()=>{
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
'''

straight_js = r'''(()=>{
  const AI=window.BattleNetworkEnemyAI;
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const PLAYER=window.BattleNetworkPlayer;
  const PLAYER_DAMAGE=window.BattleNetworkPlayerDamage;
  const scene=document.getElementById('scene');
  if(!AI||!FIELD||!ENEMY||!PLAYER||!PLAYER_DAMAGE||!scene){
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
  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;

  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
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
    let telegraph=null;
    let projectile=null;
    let nextAttackAt=performance.now();

    function removeTelegraph(){if(telegraph?.el)telegraph.el.remove();telegraph=null}
    function removeProjectile(){if(projectile?.el)projectile.el.remove();projectile=null}
    function scheduleNext(now=performance.now()){nextAttackAt=now+cfg.cooldownMs}
    function canStart(now){const enemy=ENEMY.getEnemy(enemyId);return !!enemy&&!enemy.isDefeated&&!telegraph&&!projectile&&now>=nextAttackAt}
    function start(now){
      if(!canStart(now))return false;
      const enemy=ENEMY.getEnemy(enemyId),playerPos=PLAYER.getPosition();
      if(!enemy)return false;
      const direction=normalize(playerPos.x-enemy.x,playerPos.y-enemy.y);
      const distance=FIELD.toWorldDistance(cfg.telegraphDistanceTiles);
      const end={x:enemy.x+direction.x*distance,y:enemy.y+direction.y*distance};
      const a=project(enemy.x,enemy.y),b=project(end.x,end.y);
      const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
      const el=document.createElement('div');
      el.className='enemyTestTelegraph';
      el.style.cssText=`position:absolute;left:${a.x}px;top:${a.y-24}px;width:${length}px;height:6px;transform-origin:0 50%;transform:rotate(${angle}deg);background:rgba(255,76,76,.72);border:1px solid rgba(255,230,120,.95);border-radius:4px;box-shadow:0 0 5px rgba(255,70,70,.45);pointer-events:none;z-index:8;`;
      scene.appendChild(el);
      telegraph={origin:{x:enemy.x,y:enemy.y},direction,fireAt:now+cfg.telegraphMs,el};
      return true;
    }
    function fireTelegraph(){
      if(!telegraph)return;
      const data=telegraph;
      removeTelegraph();
      const el=document.createElement('div');
      el.className='enemyTestProjectile';
      el.style.cssText='position:absolute;width:28px;height:14px;border-radius:50%;background:#ff4a50;border:2px solid #ffd66d;box-shadow:0 0 8px rgba(255,80,80,.65);pointer-events:none;z-index:9;transform-origin:center;';
      scene.appendChild(el);
      projectile={x:data.origin.x,y:data.origin.y,dx:data.direction.x,dy:data.direction.y,travel:0,el};
    }
    function finish(now){removeProjectile();scheduleNext(now)}
    function updateProjectile(dt,now){
      if(!projectile)return;
      const step=cfg.projectileSpeed*dt;
      projectile.x+=projectile.dx*step;projectile.y+=projectile.dy*step;projectile.travel+=step;
      const p=project(projectile.x,projectile.y);
      projectile.el.style.transform=`translate(${p.x-14}px,${p.y-31}px)`;
      const hit=PLAYER_DAMAGE.resolvePointHit({x:projectile.x,y:projectile.y,damage:cfg.damage,sourceType:'ENEMY',sourceId:enemyId,attackId:BEHAVIOR_ID});
      if(hit.hit){finish(now);return}
      const out=projectile.x<0||projectile.x>FIELD.WORLD_SIZE||projectile.y<0||projectile.y>FIELD.WORLD_SIZE;
      if(out||projectile.travel>=cfg.maxTravelWorld)finish(now);
    }
    function update(now,dt){if(telegraph&&now>=telegraph.fireAt)fireTelegraph();updateProjectile(dt,now)}
    function cancel(now=performance.now()){const busy=!!telegraph||!!projectile;removeTelegraph();removeProjectile();if(busy)scheduleNext(now)}
    function destroy(){removeTelegraph();removeProjectile()}
    function isBusy(){return !!telegraph||!!projectile}
    function getSnapshot(){return Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,busy:isBusy(),nextAttackAt,config:cfg})}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot});
  }

  AI.registerBehavior(BEHAVIOR_ID,createController);
  window.BattleNetworkEnemyStraightShotBehavior=Object.freeze({BEHAVIOR_ID,DEFAULT_CONFIG});
})();
'''

wave_js = r'''(()=>{
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const AI=window.BattleNetworkEnemyAI;
  const battle=document.getElementById('battle');
  if(!FIELD)throw new Error('BattleNetworkWave: logical field grid is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkWave: enemy foundation is not loaded.');
  if(!AI)throw new Error('BattleNetworkWave: enemy AI foundation is not loaded.');
  if(!battle)throw new Error('BattleNetworkWave: battle element is not available.');

  // v100 test-only composition/timing/behavior assignment. These are not final enemy or Wave specifications.
  const TEST_CONFIG=Object.freeze({
    testOnly:true,
    enemyMaxHp:200,
    behaviorId:'PROTOTYPE_STRAIGHT_SHOT',
    clearNoticeMs:1500,
    startNoticeMs:1500,
    spawnTiles:Object.freeze([
      Object.freeze({rowOffset:0,colOffset:3}),
      Object.freeze({rowOffset:-3,colOffset:3})
    ])
  });
  const listeners=new Set();
  const notice=document.createElement('div');
  notice.className='waveStatusNotice';
  notice.setAttribute('aria-live','polite');
  battle.appendChild(notice);

  let state={waveNumber:0,pendingWaveNumber:1,status:'WAITING_CUSTOM',enemyIds:[]};
  let transitionToken=0;

  function getSnapshot(){
    const enemyState=ENEMY.getBattleState();
    return Object.freeze({waveNumber:state.waveNumber,pendingWaveNumber:state.pendingWaveNumber,status:state.status,enemyIds:Object.freeze(state.enemyIds.slice()),total:enemyState.total,active:enemyState.active,defeated:enemyState.defeated,allDefeated:enemyState.allDefeated});
  }
  function render(){
    notice.dataset.status=state.status;
    if(state.status==='CLEARING'||(state.status==='WAITING_CUSTOM'&&state.waveNumber>0)){notice.textContent='WAVE CLEAR';return}
    if(state.status==='STARTING'){notice.textContent=`WAVE ${state.pendingWaveNumber} START`;return}
    const number=state.status==='ACTIVE'?state.waveNumber:state.pendingWaveNumber;
    notice.textContent=`WAVE ${number}`;
  }
  function emit(){const current=getSnapshot();listeners.forEach(listener=>{try{listener(current)}catch(error){console.error('BattleNetworkWave listener failed.',error)}});return current}
  function subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);listener(getSnapshot());return()=>listeners.delete(listener)}
  function getPlayer(){return window.BattleNetworkPlayer||null}
  function scheduleTransition(delayMs,callback){const token=++transitionToken;setTimeout(()=>{if(token===transitionToken)callback()},delayMs)}
  function spawnTestEnemy(tile){
    const centerRow=Math.floor(FIELD.GRID_ROWS/2),centerCol=Math.floor(FIELD.GRID_COLS/2);
    const point=FIELD.tileToWorldCenter(centerRow+tile.rowOffset,centerCol+tile.colOffset);
    if(!point)throw new Error('BattleNetworkWave: test spawn tile is outside the field.');
    const enemyId=ENEMY.spawn({x:point.x,y:point.y,health:{maxHp:TEST_CONFIG.enemyMaxHp}});
    const assigned=AI.assignBehavior(enemyId,TEST_CONFIG.behaviorId);
    if(!assigned.ok)throw new Error(`BattleNetworkWave: failed to assign ${TEST_CONFIG.behaviorId} to enemy ${enemyId}: ${assigned.reason}`);
    return enemyId;
  }
  function spawnWave(waveNumber){
    const enemyIds=TEST_CONFIG.spawnTiles.map(spawnTestEnemy);
    state={waveNumber,pendingWaveNumber:null,status:'ACTIVE',enemyIds};
    render();const result=emit();
    getPlayer()?.resumeAfterWaveTransition?.();
    AI.resume('WAVE_TRANSITION');
    return result;
  }
  function openNextWaveCustom(){
    if(state.status!=='CLEARING')return getSnapshot();
    state={...state,status:'WAITING_CUSTOM'};render();emit();getPlayer()?.openNextWaveCustom?.();return getSnapshot();
  }
  function onEnemyState(enemyState){
    if(state.status!=='ACTIVE'||!enemyState.allDefeated)return;
    AI.pause('WAVE_TRANSITION');
    getPlayer()?.pauseForWaveTransition?.();
    state={...state,pendingWaveNumber:state.waveNumber+1,status:'CLEARING'};render();emit();scheduleTransition(TEST_CONFIG.clearNoticeMs,openNextWaveCustom);
  }
  function startNextWave(){
    if(state.status!=='WAITING_CUSTOM'||!Number.isFinite(state.pendingWaveNumber))return getSnapshot();
    const nextWaveNumber=state.pendingWaveNumber;
    AI.pause('WAVE_TRANSITION');
    getPlayer()?.pauseForWaveTransition?.();
    AI.clearAssignments();
    ENEMY.clearAll();
    state={waveNumber:state.waveNumber,pendingWaveNumber:nextWaveNumber,status:'STARTING',enemyIds:[]};render();emit();
    scheduleTransition(TEST_CONFIG.startNoticeMs,()=>{if(state.status!=='STARTING'||state.pendingWaveNumber!==nextWaveNumber)return;spawnWave(nextWaveNumber)});
    return getSnapshot();
  }
  function startTestWave(){return startNextWave()}
  function onCustomConfirmed(){return startNextWave()}

  window.BattleNetworkWave=Object.freeze({TEST_CONFIG,getSnapshot,subscribe,startTestWave,startNextWave,onCustomConfirmed});
  AI.pause('WAVE_TRANSITION');
  ENEMY.subscribe(onEnemyState);
  render();
})();
'''

write('js/combat/enemy-ai-system.js', ai_js)
write('js/combat/enemy-behavior-straight-shot.js', straight_js)
write('js/combat/wave-system.js', wave_js)

old_index = '''<script src="./js/combat/enemy-foundation.js?v=97"></script>\n<script src="./js/combat/wave-system.js?v=99"></script>\n<script src="./js/combat/player-health.js?v=90"></script>\n<script src="./js/ui/player-hud.js?v=82"></script>\n<script src="./js/combat/projectile-shadow-renderer.js?v=77"></script>\n<script src="./js/combat/buster-projectile-layer.js?v=78"></script>\n<script src="./js/combat/b-attack-system.js?v=73"></script>\n<script src="./js/game.js?v=98"></script>\n<script src="./js/combat/player-damage-system.js?v=92"></script>\n<script src="./js/combat/enemy-test-attack.js?v=88"></script>'''
new_index = '''<script src="./js/combat/enemy-foundation.js?v=97"></script>\n<script src="./js/combat/player-health.js?v=90"></script>\n<script src="./js/ui/player-hud.js?v=82"></script>\n<script src="./js/combat/projectile-shadow-renderer.js?v=77"></script>\n<script src="./js/combat/buster-projectile-layer.js?v=78"></script>\n<script src="./js/combat/b-attack-system.js?v=73"></script>\n<script src="./js/game.js?v=98"></script>\n<script src="./js/combat/player-damage-system.js?v=92"></script>\n<script src="./js/combat/enemy-ai-system.js?v=100"></script>\n<script src="./js/combat/enemy-behavior-straight-shot.js?v=100"></script>\n<script src="./js/combat/wave-system.js?v=100"></script>'''
index = replace_once(read('index.html'), old_index, new_index, 'index script order')
write('index.html', index)

sw = read('sw.js')
sw = replace_once(sw, "const CACHE_NAME = 'battlenetwork-runtime-v99';", "const CACHE_NAME = 'battlenetwork-runtime-v100';", 'sw cache')
sw = replace_once(sw, "  './js/combat/enemy-test-attack.js',", "  './js/combat/enemy-ai-system.js',\n  './js/combat/enemy-behavior-straight-shot.js',", 'sw enemy attack asset')
write('sw.js', sw)

legacy = ROOT / 'js/combat/enemy-test-attack.js'
if legacy.exists():
    legacy.unlink()

# GAME_DESIGN: document architecture/provisional scope without making final enemy behavior decisions.
game = read('GAME_DESIGN.md')
anchor = "- 通常時のWave表示位置、およびCLEAR／STARTの最終デザイン・SE等は引き続き本番演出確定時に変更可能とする。\n"
insert = anchor + "\n### v100 敵AI共通基盤（検証用）\n\n- v100で決めるのは敵AIの共通構造であり、実ゲームに登場する敵の正式な移動・攻撃・HP・攻撃力・頻度・名称・Wave配置を確定するものではない。\n- 敵個体と攻撃Behaviorを分離し、`BattleNetworkEnemyAI` にBehaviorを登録して、Wave生成時に敵IDへBehaviorを割り当てる構造とする。これにより後から敵ごとの正式AIへ差し替え可能にする。\n- v88から使用していた直線射撃は `PROTOTYPE_STRAIGHT_SHOT` としてBehaviorへ分離する。威力10、予兆0.7秒、クールタイム2.2秒、弾速720等は引き続き検証値であり、本番敵性能として確定しない。\n- v100の攻撃スケジューラは既存挙動を大きく変えないため暫定 `FIRST_ACTIVE` とし、複数敵がいる場合は先頭の生存敵だけが新規攻撃を開始する。複数敵の同時攻撃・交互攻撃等は正式敵AI設計時に決定する。\n- CLEAR／START／Wave間CUSTOM中は敵AI基盤を明示停止し、進行中の検証攻撃もキャンセルする。新Wave生成後にAIを再開する。\n- 射撃型・突進型・砲撃型という分類はAI基盤検証のための候補であり、正式な敵3種類の仕様として確定しない。\n"
if '### v100 敵AI共通基盤（検証用）' not in game:
    game = replace_once(game, anchor, insert, 'GAME_DESIGN v100 anchor')
write('GAME_DESIGN.md', game)

status = read('DEVELOPMENT_STATUS.md')
status = status.replace('- 敵AI。', '- 本番敵AI（移動・攻撃選択・複数敵スケジューリング等）。', 1)
old_tail = '''## 次フェーズ: 本番敵AI・Wave構成設計\n\nv99のWave切替演出は実機確認で、`WAVE CLEAR`／`WAVE n START` の中央演出、約1.5秒の間、CLEAR中／START中の戦闘停止、CUSTOMへの遷移、次Wave開始まで問題ないことを確認済み。現時点ではこの演出とテンポを採用する。\n\nただし、CLEAR／STARTの演出内容・色・表示時間1.5秒、および通常Wave表記位置は最終確定ではない。本番Wave演出やSE、HUD全体の仕上げ段階で再調整可能とし、Wave進行ロジックは表示位置や演出へ依存させない。\n\n次は、本番敵AI・敵構成／Wave数を設計し、現在の検証用2体構成から実ゲーム用Waveへ段階的に移行する。ウェーブ間強化の採否、本番Wave演出／SE、ボス接続は関連設計と合わせて後続で確定する。'''
new_tail = '''## 次フェーズ: v100 敵AI共通基盤 実機確認\n\nv99のWave切替演出は実機確認済み。v100では正式な敵デザインを決めず、後から敵ごとのAI／Behaviorを差し替えられる共通基盤を追加した。`js/combat/enemy-ai-system.js` がBehavior登録・敵IDへの割当・一時停止／再開・実行スケジューリングを担当し、従来の `enemy-test-attack.js` の直線射撃は `js/combat/enemy-behavior-straight-shot.js` の `PROTOTYPE_STRAIGHT_SHOT` へ分離した。旧テスト攻撃ファイルは実行経路から削除した。\n\nv100の `FIRST_ACTIVE` スケジューラと直線射撃の威力10／予兆0.7秒／クールタイム2.2秒／弾速720は検証用であり、本番敵仕様ではない。複数敵同時攻撃、正式な移動AI、敵ごとの攻撃選択、HP／攻撃力／頻度、正式な3種類の敵内容は後続で決定する。Wave切替中はAIを明示停止し、CUSTOM決定後の新Wave生成時にBehaviorを再割当してAIを再開する。\n\n実機確認では以下を優先する。\n\n1. WAVE開始後、先頭の生存テスト敵が従来同様の予兆付き直線射撃を行い、プレイヤーへ命中すると10ダメージになること。\n2. 1体目が生存中は2体目が新規攻撃を開始せず、1体目撃破後は2体目が直線射撃を開始すること。\n3. CUSTOM、WAVE CLEAR、WAVE n START中は新規敵攻撃が開始されず、進行中の検証用予兆／弾も残らないこと。\n4. 次Wave開始時に旧WaveのAI割当が残らず、新しく生成された2体へBehaviorが再割当されること。\n5. v99のWave演出、チップ0枚決定、Wave単位チップリセット、プレイヤーHP／位置引継ぎが維持されていること。\n6. v100確認後、正式敵の内容を決める前に必要であれば突進／範囲攻撃など別Behaviorでも共通基盤を検証し、その後に敵3種類の正式仕様・Wave構成を確定する。'''
status = replace_once(status, old_tail, new_tail, 'DEVELOPMENT_STATUS tail')
write('DEVELOPMENT_STATUS.md', status)

print('v100 patch applied')
