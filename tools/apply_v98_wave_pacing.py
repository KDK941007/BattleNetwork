from pathlib import Path
import re

root = Path('.')

# Replace the small Wave controller as a whole. The 1s values are tuning values for device verification, not final game-balance timing.
wave_path = root / 'js/combat/wave-system.js'
wave_path.write_text(r'''(()=>{
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const battle=document.getElementById('battle');
  if(!FIELD)throw new Error('BattleNetworkWave: logical field grid is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkWave: enemy foundation is not loaded.');
  if(!battle)throw new Error('BattleNetworkWave: battle element is not available.');

  // v98 test-only composition/timing. Count/positions/HP/timing are not final game-balance values.
  const TEST_CONFIG=Object.freeze({
    testOnly:true,
    enemyMaxHp:200,
    clearNoticeMs:1000,
    startNoticeMs:1000,
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

  // waveNumber is the active/last completed wave. pendingWaveNumber is the wave to start after CUSTOM.
  let state={waveNumber:0,pendingWaveNumber:1,status:'WAITING_CUSTOM',enemyIds:[]};
  let transitionToken=0;

  function getSnapshot(){
    const enemyState=ENEMY.getBattleState();
    return Object.freeze({
      waveNumber:state.waveNumber,
      pendingWaveNumber:state.pendingWaveNumber,
      status:state.status,
      enemyIds:Object.freeze(state.enemyIds.slice()),
      total:enemyState.total,
      active:enemyState.active,
      defeated:enemyState.defeated,
      allDefeated:enemyState.allDefeated
    });
  }
  function render(){
    notice.dataset.status=state.status;
    if(state.status==='CLEARING'||(state.status==='WAITING_CUSTOM'&&state.waveNumber>0)){
      notice.textContent='WAVE CLEAR';
      return;
    }
    if(state.status==='STARTING'){
      notice.textContent=`WAVE ${state.pendingWaveNumber} START`;
      return;
    }
    const number=state.status==='ACTIVE'?state.waveNumber:state.pendingWaveNumber;
    notice.textContent=`WAVE ${number}`;
  }
  function emit(){
    const current=getSnapshot();
    listeners.forEach(listener=>{try{listener(current)}catch(error){console.error('BattleNetworkWave listener failed.',error)}});
    return current;
  }
  function subscribe(listener){
    if(typeof listener!=='function')return()=>{};
    listeners.add(listener);
    listener(getSnapshot());
    return()=>listeners.delete(listener);
  }
  function getPlayer(){return window.BattleNetworkPlayer||null}
  function scheduleTransition(delayMs,callback){
    const token=++transitionToken;
    setTimeout(()=>{if(token===transitionToken)callback()},delayMs);
  }
  function spawnTestEnemy(tile){
    const centerRow=Math.floor(FIELD.GRID_ROWS/2),centerCol=Math.floor(FIELD.GRID_COLS/2);
    const point=FIELD.tileToWorldCenter(centerRow+tile.rowOffset,centerCol+tile.colOffset);
    if(!point)throw new Error('BattleNetworkWave: test spawn tile is outside the field.');
    return ENEMY.spawn({x:point.x,y:point.y,health:{maxHp:TEST_CONFIG.enemyMaxHp}});
  }
  function spawnWave(waveNumber){
    const enemyIds=TEST_CONFIG.spawnTiles.map(spawnTestEnemy);
    state={waveNumber,pendingWaveNumber:null,status:'ACTIVE',enemyIds};
    render();
    const result=emit();
    getPlayer()?.resumeAfterWaveTransition?.();
    return result;
  }
  function openNextWaveCustom(){
    if(state.status!=='CLEARING')return getSnapshot();
    state={...state,status:'WAITING_CUSTOM'};
    render();
    emit();
    getPlayer()?.openNextWaveCustom?.();
    return getSnapshot();
  }
  function onEnemyState(enemyState){
    if(state.status!=='ACTIVE'||!enemyState.allDefeated)return;
    getPlayer()?.pauseForWaveTransition?.();
    state={...state,pendingWaveNumber:state.waveNumber+1,status:'CLEARING'};
    render();
    emit();
    scheduleTransition(TEST_CONFIG.clearNoticeMs,openNextWaveCustom);
  }
  function startNextWave(){
    if(state.status!=='WAITING_CUSTOM'||!Number.isFinite(state.pendingWaveNumber))return getSnapshot();
    const nextWaveNumber=state.pendingWaveNumber;
    getPlayer()?.pauseForWaveTransition?.();
    ENEMY.clearAll();
    state={waveNumber:state.waveNumber,pendingWaveNumber:nextWaveNumber,status:'STARTING',enemyIds:[]};
    render();
    emit();
    scheduleTransition(TEST_CONFIG.startNoticeMs,()=>{
      if(state.status!=='STARTING'||state.pendingWaveNumber!==nextWaveNumber)return;
      spawnWave(nextWaveNumber);
    });
    return getSnapshot();
  }
  function startTestWave(){return startNextWave()}
  function onCustomConfirmed(){return startNextWave()}

  window.BattleNetworkWave=Object.freeze({
    TEST_CONFIG,
    getSnapshot,
    subscribe,
    startTestWave,
    startNextWave,
    onCustomConfirmed
  });

  ENEMY.subscribe(onEnemyState);
  render();
})();
''', encoding='utf-8')

# Split Wave transition responsibilities in player/game state so CLEAR and START notices can hold combat safely.
game_path = root / 'js/game.js'
game = game_path.read_text(encoding='utf-8')
old_send = "$('send').onclick=()=>{if(s.selected.length){s.queue.forEach(id=>s.discard.add(id));let ss=new Set(s.selected);s.hand.forEach(id=>{let p=s.draw.indexOf(id);if(p>=0)s.draw.splice(p,1);if(!ss.has(id))s.discard.add(id)});s.queue=s.selected.slice()}s.hand=[];s.selected=[];s.custom=0;s.customReady=false;$('customModal').classList.remove('open');s.paused=false;updateHud();window.BattleNetworkWave?.onCustomConfirmed?.()};"
new_send = "$('send').onclick=()=>{if(s.selected.length){s.queue.forEach(id=>s.discard.add(id));let ss=new Set(s.selected);s.hand.forEach(id=>{let p=s.draw.indexOf(id);if(p>=0)s.draw.splice(p,1);if(!ss.has(id))s.discard.add(id)});s.queue=s.selected.slice()}s.hand=[];s.selected=[];s.custom=0;s.customReady=false;$('customModal').classList.remove('open');let waveState=window.BattleNetworkWave?.onCustomConfirmed?.();s.paused=waveState?.status==='STARTING';updateHud()};"
if old_send not in game:
    raise SystemExit('game send handler anchor not found')
game = game.replace(old_send, new_send, 1)

old_transition = "function prepareNextWave(){if(s.defeated)return false;s.paused=true;clearCharge();s.dash=0;s.dvx=0;s.dvy=0;s.ix=0;s.iy=0;player.classList.remove('dashing');joyReset();A.classList.remove('pressed');B.classList.remove('pressed');setPreviewMode('none');clearPlayerProjectiles();resetWave();return true}"
new_transition = "function pauseForWaveTransition(){if(s.defeated)return false;s.paused=true;clearCharge();s.dash=0;s.dvx=0;s.dvy=0;s.ix=0;s.iy=0;player.classList.remove('dashing');joyReset();A.classList.remove('pressed');B.classList.remove('pressed');setPreviewMode('none');clearPlayerProjectiles();return true}\nfunction openNextWaveCustom(){if(!pauseForWaveTransition())return false;resetWave();return true}\nfunction resumeAfterWaveTransition(){if(s.defeated)return false;if($('customModal').classList.contains('open'))return false;s.paused=false;return true}\nfunction prepareNextWave(){if(!pauseForWaveTransition())return false;return openNextWaveCustom()}"
if old_transition not in game:
    raise SystemExit('game transition anchor not found')
game = game.replace(old_transition, new_transition, 1)

old_export = "window.BattleNetworkPlayer=Object.freeze({HIT_STUN_MS,getPosition:()=>Object.freeze({x:s.x,y:s.y}),getVisual:()=>PLAYER_VISUAL,getHitBox:()=>PLAYER_HITBOX,getBounds:getPlayerBounds,containsPoint:playerContainsPoint,isDirectionLocked:()=>s.directionLocked,getFacing:()=>Object.freeze({x:s.dx,y:s.dy}),beginHitStun,isHitStunned,getRemainingHitStunMs,clearHitStun,setDefeated,isDefeated:()=>s.defeated,prepareNextWave});"
new_export = "window.BattleNetworkPlayer=Object.freeze({HIT_STUN_MS,getPosition:()=>Object.freeze({x:s.x,y:s.y}),getVisual:()=>PLAYER_VISUAL,getHitBox:()=>PLAYER_HITBOX,getBounds:getPlayerBounds,containsPoint:playerContainsPoint,isDirectionLocked:()=>s.directionLocked,getFacing:()=>Object.freeze({x:s.dx,y:s.dy}),beginHitStun,isHitStunned,getRemainingHitStunMs,clearHitStun,setDefeated,isDefeated:()=>s.defeated,pauseForWaveTransition,openNextWaveCustom,resumeAfterWaveTransition,prepareNextWave});"
if old_export not in game:
    raise SystemExit('player export anchor not found')
game = game.replace(old_export, new_export, 1)
game_path.write_text(game, encoding='utf-8')

# Cache bust changed JS.
index_path = root / 'index.html'
index = index_path.read_text(encoding='utf-8')
for old,new in [
    ('./js/combat/wave-system.js?v=97','./js/combat/wave-system.js?v=98'),
    ('./js/game.js?v=97','./js/game.js?v=98'),
]:
    if old not in index:
        raise SystemExit(f'index anchor not found: {old}')
    index = index.replace(old,new,1)
index_path.write_text(index, encoding='utf-8')

sw_path = root / 'sw.js'
sw = sw_path.read_text(encoding='utf-8')
if "battlenetwork-runtime-v97" not in sw:
    raise SystemExit('sw v97 anchor not found')
sw_path.write_text(sw.replace('battlenetwork-runtime-v97','battlenetwork-runtime-v98',1), encoding='utf-8')

# Add formal behavior notes; the 1.0 second is explicitly provisional/tuning-only.
design_path = root / 'GAME_DESIGN.md'
design = design_path.read_text(encoding='utf-8')
anchor = "- 現在のWave表示位置は暫定であり、Wave進行ロジックは表示位置に依存させない。\n"
addition = anchor + "\n### v98 Wave切替テンポ\n\n- 全敵撃破直後は戦闘を停止し、`WAVE CLEAR` を一定時間表示してからCUSTOMを開く。CLEAR表示中はプレイヤー操作・CUSTOMゲージ進行・プレイヤー側の発射済み弾を継続させない。\n- CUSTOM決定が新Wave開始に該当する場合、CUSTOMを閉じた直後に `WAVE n START` を表示し、その表示中は戦闘停止を維持する。表示時間経過後に敵を生成して戦闘を開始する。\n- 最初のWAVE 1も `CUSTOM決定 → WAVE 1 START → 戦闘開始` の同じ流れへ統一する。\n- v98のCLEAR表示時間とSTART表示時間はともに `1.0秒` を実機テンポ確認用の調整値として使用する。本番確定値ではなく、実機確認結果に応じて変更可能とする。\n"
if anchor not in design:
    raise SystemExit('GAME_DESIGN v97 anchor not found')
design = design.replace(anchor, addition, 1)
design_path.write_text(design, encoding='utf-8')

status_path = root / 'DEVELOPMENT_STATUS.md'
status = status_path.read_text(encoding='utf-8')
# Append v98 history after v97 history paragraph.
history_anchor = "v97でWave間CUSTOM接続を追加した。全敵撃破時にWaveを `WAITING_CUSTOM` へ遷移させ、プレイヤー側の `prepareNextWave()` で戦闘を停止、プレイヤー弾を消去し、Wave単位のチップ状態をリセットしてCUSTOM画面を開く。CUSTOM決定後に前Waveの敵を `clearAll()` で削除し、Wave番号を+1して検証用2体を再生成する。固定待機秒数・ウェーブ間強化・本番Wave数／敵構成は未確定のまま。プレイヤーHPと位置は引き継ぎ、自動回復は行わない。またCUSTOM決定はチップ0枚選択でも可能にし、その場合は新規チップを追加せず、表示された未選択手札も消費・破棄しない。\n"
history_add = history_anchor + "\nv98でWave切替のテンポを追加した。全敵撃破直後は戦闘を停止して `WAVE CLEAR` を表示し、実機確認用の調整値1.0秒後にCUSTOMを開く。CUSTOM決定が新Wave開始に該当する場合は `WAVE n START` を表示して戦闘停止を維持し、同じく調整値1.0秒後に敵生成・戦闘再開する。初回WAVE 1もCUSTOM決定後にSTART表示を経由する。1.0秒は本番確定値ではなく、実機テンポ確認後に変更可能とする。\n"
if history_anchor not in status:
    raise SystemExit('DEVELOPMENT_STATUS v97 history anchor not found')
status = status.replace(history_anchor, history_add, 1)

section_re = re.compile(r"## 次フェーズ: v97 Wave間CUSTOM 実機確認\n.*?(?=\n## |\Z)", re.S)
new_section = """## 次フェーズ: v98 Wave切替テンポ 実機確認

v97のWave間CUSTOMフローは想定どおり動作確認済み。v98では `全敵撃破 → WAVE CLEAR表示 → 一呼吸 → CUSTOM` と `CUSTOM決定 → WAVE n START表示 → 一呼吸 → 敵生成・戦闘開始` の2段階を追加した。CLEAR／STARTの表示時間はともに1.0秒を実機確認用の調整値とし、本番値として固定しない。初回WAVE 1もSTART表示を経由する。

優先対象は以下。

1. 全敵撃破直後にCUSTOMが即表示されず、`WAVE CLEAR` が約1秒見えてからCUSTOMが開くことを確認する。
2. `WAVE CLEAR` 表示中はプレイヤーが移動・攻撃できず、CUSTOMゲージも進行しないことを確認する。
3. Wave間CUSTOMで決定すると即敵が出現せず、`WAVE 2 START` が約1秒表示された後に敵2体が生成されることを確認する。
4. START表示中も移動・A/B/X/Y・CUSTOMゲージが進行せず、敵生成後に通常戦闘へ復帰することを確認する。
5. 初回CUSTOM決定時も `WAVE 1 START` → 約1秒 → WAVE 1開始となることを確認する。
6. チップ0枚決定、Wave単位チップリセット、プレイヤーHP／位置引継ぎがv97どおり維持されることを確認する。
7. 表示時間1.0秒が長い／短い場合は実機感覚に合わせて調整し、本番Wave演出確定までは調整値として管理する。
8. v98確認後、本番敵AI・敵構成／Wave数・ウェーブ間強化の採否・本番Wave演出へ段階的に進む。
"""
if not section_re.search(status):
    raise SystemExit('DEVELOPMENT_STATUS next-phase section not found')
status = section_re.sub(new_section.rstrip(), status, count=1)
status_path.write_text(status, encoding='utf-8')

print('v98 wave pacing patch applied')
