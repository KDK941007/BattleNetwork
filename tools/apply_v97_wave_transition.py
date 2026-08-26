from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'expected text not found: {path}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

# Enemy cleanup API for moving between waves.
replace_once(
    'js/combat/enemy-foundation.js',
    "  function configureHealth(id,health={}){\n",
    "  function clearAll(){\n    enemies.forEach(enemy=>{enemy.flashToken++;enemy.el?.remove()});\n    enemies.length=0;\n    return emitBattleState();\n  }\n  function configureHealth(id,health={}){\n"
)
replace_once(
    'js/combat/enemy-foundation.js',
    "window.BattleNetworkEnemy=Object.freeze({spawn,getEnemy,getEnemies,getActiveEnemies,getBattleState,subscribe,configureHealth,applyDamage,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,debugFlash});",
    "window.BattleNetworkEnemy=Object.freeze({spawn,getEnemy,getEnemies,getActiveEnemies,getBattleState,subscribe,clearAll,configureHealth,applyDamage,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,debugFlash});"
)

# CUSTOM can be confirmed with zero newly selected chips. Unselected hand cards are not consumed.
game = Path('js/game.js')
text = game.read_text(encoding='utf-8')
old_send = "}else if(!s.queue.length)return;s.hand=[];s.selected=[];s.custom=0;s.customReady=false;$('customModal').classList.remove('open');s.paused=false;updateHud()};"
new_send = "}s.hand=[];s.selected=[];s.custom=0;s.customReady=false;$('customModal').classList.remove('open');s.paused=false;updateHud();window.BattleNetworkWave?.onCustomConfirmed?.()};"
if old_send not in text:
    raise SystemExit('CUSTOM send handler text not found')
text = text.replace(old_send, new_send, 1)

prepare_fn = "function prepareNextWave(){if(s.defeated)return false;s.paused=true;clearCharge();s.dash=0;s.dvx=0;s.dvy=0;s.ix=0;s.iy=0;player.classList.remove('dashing');joyReset();A.classList.remove('pressed');B.classList.remove('pressed');setPreviewMode('none');clearPlayerProjectiles();resetWave();return true}\n"
marker = "function bDown(e){"
if marker not in text:
    raise SystemExit('bDown marker not found')
text = text.replace(marker, prepare_fn + marker, 1)
old_api = "setDefeated,isDefeated:()=>s.defeated});"
new_api = "setDefeated,isDefeated:()=>s.defeated,prepareNextWave});"
if old_api not in text:
    raise SystemExit('player public API marker not found')
text = text.replace(old_api, new_api, 1)
game.write_text(text, encoding='utf-8')

# v97 wave transition: clear -> CUSTOM -> next wave on confirm. No fixed wait or inter-wave upgrade yet.
Path('js/combat/wave-system.js').write_text(r'''(()=>{
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const battle=document.getElementById('battle');
  if(!FIELD)throw new Error('BattleNetworkWave: logical field grid is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkWave: enemy foundation is not loaded.');
  if(!battle)throw new Error('BattleNetworkWave: battle element is not available.');

  // v97 test-only composition. Count/positions/HP and repeated use across waves are not final balance values.
  const TEST_CONFIG=Object.freeze({
    testOnly:true,
    enemyMaxHp:200,
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

  let state={waveNumber:1,status:'IDLE',enemyIds:[]};
  let unsubscribeEnemy=null;

  function getSnapshot(){
    const enemyState=ENEMY.getBattleState();
    return Object.freeze({
      waveNumber:state.waveNumber,
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
    notice.textContent=state.status==='WAITING_CUSTOM'?'WAVE CLEAR':`WAVE ${state.waveNumber}`;
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
  function spawnTestEnemy(tile){
    const centerRow=Math.floor(FIELD.GRID_ROWS/2),centerCol=Math.floor(FIELD.GRID_COLS/2);
    const point=FIELD.tileToWorldCenter(centerRow+tile.rowOffset,centerCol+tile.colOffset);
    if(!point)throw new Error('BattleNetworkWave: test spawn tile is outside the field.');
    return ENEMY.spawn({x:point.x,y:point.y,health:{maxHp:TEST_CONFIG.enemyMaxHp}});
  }
  function spawnWave(waveNumber){
    const enemyIds=TEST_CONFIG.spawnTiles.map(spawnTestEnemy);
    state={waveNumber,status:'ACTIVE',enemyIds};
    render();
    return emit();
  }
  function requestCustomForNextWave(){
    const prepare=()=>{
      const player=window.BattleNetworkPlayer;
      if(!player?.prepareNextWave?.())console.warn('BattleNetworkWave: next-wave CUSTOM preparation was not started.');
    };
    if(typeof queueMicrotask==='function')queueMicrotask(prepare);
    else Promise.resolve().then(prepare);
  }
  function onEnemyState(enemyState){
    if(state.status!=='ACTIVE'||!enemyState.allDefeated)return;
    state={...state,status:'WAITING_CUSTOM'};
    render();
    emit();
    requestCustomForNextWave();
  }
  function startTestWave(){
    if(state.status!=='IDLE')return getSnapshot();
    const result=spawnWave(1);
    if(!unsubscribeEnemy)unsubscribeEnemy=ENEMY.subscribe(onEnemyState);
    return result;
  }
  function startNextWave(){
    if(state.status!=='WAITING_CUSTOM')return getSnapshot();
    ENEMY.clearAll();
    return spawnWave(state.waveNumber+1);
  }
  function onCustomConfirmed(){
    if(state.status!=='WAITING_CUSTOM')return getSnapshot();
    return startNextWave();
  }

  window.BattleNetworkWave=Object.freeze({
    TEST_CONFIG,
    getSnapshot,
    subscribe,
    startTestWave,
    startNextWave,
    onCustomConfirmed
  });

  startTestWave();
})();
''', encoding='utf-8')

# Browser cache busting.
replace_once('index.html', '<script src="./js/combat/enemy-foundation.js?v=95"></script>', '<script src="./js/combat/enemy-foundation.js?v=97"></script>')
replace_once('index.html', '<script src="./js/combat/wave-system.js?v=95"></script>', '<script src="./js/combat/wave-system.js?v=97"></script>')
replace_once('index.html', '<script src="./js/game.js?v=93"></script>', '<script src="./js/game.js?v=97"></script>')
replace_once('sw.js', "const CACHE_NAME = 'battlenetwork-runtime-v96';", "const CACHE_NAME = 'battlenetwork-runtime-v97';")

# Formal design additions.
gd = Path('GAME_DESIGN.md')
g = gd.read_text(encoding='utf-8')
custom_marker = "最終方式はプロトタイプでゲームテンポを確認して決定する。\n\n---\n\n## 7. チップコンボ"
custom_new = """最終方式はプロトタイプでゲームテンポを確認して決定する。\n\n### CUSTOM決定時の0枚選択\n\n- CUSTOM画面はチップを1枚も新規選択していない状態でも決定できる。\n- 0枚選択で決定した場合、新しいチップを使用待ちキューへ追加しない。CUSTOMに表示された未選択チップは消費・破棄扱いにしない。\n- 既に未使用の使用待ちチップが残っている通常CUSTOMでは、0枚選択で決定しても既存キューを維持する。\n- Wave切替時はWave単位リセットにより使用待ちキューを空にするため、そこで0枚選択を決定した場合はチップなしで次Waveを開始する。\n\n---\n\n## 7. チップコンボ"""
if custom_marker not in g:
    raise SystemExit('GAME_DESIGN custom marker not found')
g = g.replace(custom_marker, custom_new, 1)
wave_marker = "- v95では次Waveを自動開始しない。次Waveまでの待機時間、Wave数、敵構成、出現位置、ボス接続は後続設計で確定する。\n\n---\n\n## 11. ウェーブ間強化"
wave_new = """- v95では次Waveを自動開始しない。次Waveまでの待機時間、Wave数、敵構成、出現位置、ボス接続は後続設計で確定する。\n\n### v97 Wave間CUSTOM接続\n\n- Wave内の全敵撃破後は戦闘を一時停止し、固定待機秒数を挟まずCUSTOM画面へ移る。固定待機時間や本番Wave終了演出はまだ確定しない。\n- Wave切替時はフォルダをWave開始時の状態へ戻し、使用済み／破棄済みチップ、使用待ちキュー、CUSTOMゲージをリセットして改めて抽選する。\n- CUSTOMの決定を次Wave開始トリガーとし、0枚選択での決定も許可する。\n- 次Wave開始時に前Waveの敵DOM／敵状態を削除してから新Waveの敵を生成する。\n- プレイヤーの現在HPとworld位置は次Waveへ引き継ぎ、Wave切替による自動HP回復は行わない。\n- ウェーブ間強化は引き続き導入候補であり、v97には含めない。\n- v97では検証用として同じ2体構成を次Waveでも再利用するが、敵数・構成・配置・Wave数の本番仕様ではない。\n- 現在のWave表示位置は暫定であり、Wave進行ロジックは表示位置に依存させない。\n\n---\n\n## 11. ウェーブ間強化"""
if wave_marker not in g:
    raise SystemExit('GAME_DESIGN wave marker not found')
g = g.replace(wave_marker, wave_new, 1)
gd.write_text(g, encoding='utf-8')

# Status history + next verification phase.
ds = Path('DEVELOPMENT_STATUS.md')
d = ds.read_text(encoding='utf-8')
d = d.replace(
    "v95は実機確認待ち。",
    "v95は実機確認で、2体の独立撃破、1体撃破時のWave継続、全敵撃破時のみWAVE CLEARへ遷移することを確認済み。v96でCUSTOM文字をゲージ中央へ移し、Wave表記との重なりを解消した。v96の表示調整も実機確認済みで、Wave表記位置自体は今後変更可能な暫定配置としている。",
    1
)
history_marker = "\n新規チップ追加は一旦止め、既存5種類を使用してバトル側の基礎システムを作り込む方針は継続する。"
v97_history = """\nv97でWave間CUSTOM接続を追加した。全敵撃破時にWaveを `WAITING_CUSTOM` へ遷移させ、プレイヤー側の `prepareNextWave()` で戦闘を停止、プレイヤー弾を消去し、Wave単位のチップ状態をリセットしてCUSTOM画面を開く。CUSTOM決定後に前Waveの敵を `clearAll()` で削除し、Wave番号を+1して検証用2体を再生成する。固定待機秒数・ウェーブ間強化・本番Wave数／敵構成は未確定のまま。プレイヤーHPと位置は引き継ぎ、自動回復は行わない。またCUSTOM決定はチップ0枚選択でも可能にし、その場合は新規チップを追加せず、表示された未選択手札も消費・破棄しない。\n"""
if history_marker not in d:
    raise SystemExit('DEVELOPMENT_STATUS history marker not found')
d = d.replace(history_marker, v97_history + history_marker, 1)
phase_heading = "## 次フェーズ: 次Wave生成・Wave間進行 設計"
idx = d.find(phase_heading)
if idx < 0:
    raise SystemExit('DEVELOPMENT_STATUS next phase heading not found')
new_phase = """## 次フェーズ: v97 Wave間CUSTOM 実機確認\n\nv97では全敵撃破から次Waveまでを `WAVE CLEAR → CUSTOM → 決定 → 次Wave生成` の最小フローへ接続した。固定待機秒数やウェーブ間強化は入れず、CUSTOM決定を次Wave開始トリガーとする。CUSTOMはチップ0枚選択でも決定可能とし、未選択手札を消費しない。プレイヤーHP／位置は引き継ぎ、自動回復はしない。検証用の敵2体・配置・HP200は本番値ではない。Wave表記位置も引き続き暫定とする。\n\n優先対象は以下。\n\n1. WAVE 1の2体を倒すと `WAVE CLEAR` になり、そのままCUSTOM画面が開くことを確認する。\n2. Wave間CUSTOMで使用済み／破棄済みチップがリセットされ、フォルダ30枚から再抽選されることを確認する。\n3. チップを1枚も選ばず決定でき、その場合でもCUSTOMが閉じて `WAVE 2` が開始することを確認する。\n4. 0枚決定時、表示されていた未選択チップが消費／破棄扱いになっていないことを確認する。\n5. WAVE 2開始時にWAVE 1の撃破済み敵が消え、検証用2体が新しくHP200で生成されることを確認する。\n6. Wave切替前後でプレイヤーHPと位置が維持され、自動回復しないことを確認する。\n7. WAVE 2でも全敵撃破→CUSTOM→次Waveの繰り返しが成立することを確認する。\n8. v97確認後、本番敵AI・敵構成／Wave数・ウェーブ間強化の採否・本番Wave演出へ段階的に進む。\n9. 複数敵が同時に攻撃する実装へ進んだ段階で、v91の連続被弾防止と無敵中の弾通過を再確認する。\n"""
d = d[:idx] + new_phase
ds.write_text(d, encoding='utf-8')

print('v97 patch prepared')
