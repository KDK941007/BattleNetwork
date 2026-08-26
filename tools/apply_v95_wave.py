from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'expected text not found: {path}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# Enemy foundation no longer owns prototype spawning. Wave layer owns the test composition.
replace_once(
    'js/combat/enemy-foundation.js',
    "  window.BattleNetworkEnemy=Object.freeze({spawn,getEnemy,getEnemies,getActiveEnemies,getBattleState,subscribe,configureHealth,applyDamage,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,debugFlash});\n\n  const testCenter=FIELD.tileToWorldCenter(Math.floor(FIELD.GRID_ROWS/2),Math.floor(FIELD.GRID_COLS/2)+3);\n  if(testCenter)spawn({x:testCenter.x,y:testCenter.y,health:{maxHp:200}});\n})();\n",
    "  window.BattleNetworkEnemy=Object.freeze({spawn,getEnemy,getEnemies,getActiveEnemies,getBattleState,subscribe,configureHealth,applyDamage,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,debugFlash});\n})();\n"
)

Path('js/combat/wave-system.js').write_text(r'''(()=>{
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const battle=document.getElementById('battle');
  if(!FIELD)throw new Error('BattleNetworkWave: logical field grid is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkWave: enemy foundation is not loaded.');
  if(!battle)throw new Error('BattleNetworkWave: battle element is not available.');

  // v95 test-only composition. Enemy count/positions are not final game-balance values.
  const TEST_CONFIG=Object.freeze({
    testOnly:true,
    waveNumber:1,
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

  let state={waveNumber:TEST_CONFIG.waveNumber,status:'IDLE',enemyIds:[]};
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
    notice.textContent=state.status==='CLEARED'?'WAVE CLEAR':`WAVE ${state.waveNumber}`;
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
  function onEnemyState(enemyState){
    if(state.status!=='ACTIVE')return;
    if(!enemyState.allDefeated)return;
    state={...state,status:'CLEARED'};
    render();
    emit();
  }
  function startTestWave(){
    if(state.status!=='IDLE')return getSnapshot();
    const enemyIds=TEST_CONFIG.spawnTiles.map(spawnTestEnemy);
    state={waveNumber:TEST_CONFIG.waveNumber,status:'ACTIVE',enemyIds};
    render();
    unsubscribeEnemy=ENEMY.subscribe(onEnemyState);
    return emit();
  }

  window.BattleNetworkWave=Object.freeze({
    TEST_CONFIG,
    getSnapshot,
    subscribe,
    startTestWave
  });

  startTestWave();
})();
''', encoding='utf-8')

Path('css/wave-status.css').write_text(r'''/* v95 temporary Wave verification UI. Final Wave presentation is not decided. */
.waveStatusNotice{
  position:absolute;
  left:50%;
  top:6px;
  transform:translateX(-50%);
  z-index:24;
  pointer-events:none;
  min-width:96px;
  padding:5px 12px;
  border:2px solid rgba(255,225,120,.9);
  border-radius:7px;
  background:rgba(16,19,28,.82);
  color:#fff0b0;
  font-family:Orbitron,var(--bn-ui-font),system-ui,sans-serif;
  font-size:clamp(12px,2.5vw,19px);
  font-weight:900;
  line-height:1;
  letter-spacing:.08em;
  text-align:center;
  white-space:nowrap;
}
.waveStatusNotice[data-status="CLEARED"]{
  min-width:132px;
}
''', encoding='utf-8')

# Browser assets / load order.
replace_once(
    'index.html',
    '<link rel="stylesheet" href="./css/player-defeat.css?v=93">\n',
    '<link rel="stylesheet" href="./css/player-defeat.css?v=93">\n<link rel="stylesheet" href="./css/wave-status.css?v=95">\n'
)
replace_once(
    'index.html',
    '<script src="./js/combat/enemy-foundation.js?v=94"></script>\n',
    '<script src="./js/combat/enemy-foundation.js?v=95"></script>\n<script src="./js/combat/wave-system.js?v=95"></script>\n'
)

replace_once('sw.js', "const CACHE_NAME = 'battlenetwork-runtime-v94';", "const CACHE_NAME = 'battlenetwork-runtime-v95';")
replace_once('sw.js', "  './css/player-defeat.css',\n", "  './css/player-defeat.css',\n  './css/wave-status.css',\n")
replace_once('sw.js', "  './js/combat/enemy-foundation.js',\n", "  './js/combat/enemy-foundation.js',\n  './js/combat/wave-system.js',\n")

# Formal design: only the structural rule is fixed; v95 composition/presentation stays test-only.
replace_once(
    'GAME_DESIGN.md',
    '敵をすべて撃破すると次ウェーブへ進む。\n',
    '''敵をすべて撃破すると次ウェーブへ進む。\n\n### v95 最小Wave検証\n\n- Wave完了判定は、Wave内の敵が全て撃破された時だけ成立する。一部の敵が撃破された段階ではWaveを継続する。\n- v95では複数敵処理の成立確認用として、同一テスト敵を2体配置した1Waveのみを使用する。`2体` とその配置は検証用の最小値であり、本番の敵数・構成・配置として確定しない。\n- 敵共通基盤の `getBattleState().allDefeated` をWave完了検知へ接続する。\n- v95の `WAVE 1 / WAVE CLEAR` 表示は動作確認用の仮UIであり、本番のWave開始・終了演出として確定しない。\n- v95では次Waveを自動開始しない。次Waveまでの待機時間、Wave数、敵構成、出現位置、ボス接続は後続設計で確定する。\n'''
)

status = Path('DEVELOPMENT_STATUS.md')
text = status.read_text(encoding='utf-8')
old_v94 = "v94で敵HP0時の共通撃破処理を追加した。`enemy-foundation.js` はHP0の敵を点Hit判定・Range Hit判定・ターゲット取得から除外し、HP表示を停止する。表示は本体をグレー化し `DELETED` を重ねる仮表現とし、本番イラスト／アニメーションへ後から差し替える。Wave接続用として `getActiveEnemies()`、`getBattleState()`（total / active / defeated / allDefeated）、`subscribe()` を追加した。撃破前に発射・発動済みの敵攻撃を消すか継続するかはBehavior側の未確定事項のため、v94では既存挙動を変更しない。v94は敵撃破表示・Hit除外・全敵撃破状態の実機確認待ち。"
new_v94 = "v94で敵HP0時の共通撃破処理を追加した。`enemy-foundation.js` はHP0の敵を点Hit判定・Range Hit判定・ターゲット取得から除外し、HP表示を停止する。表示は本体をグレー化し `DELETED` を重ねる仮表現とし、本番イラスト／アニメーションへ後から差し替える。Wave接続用として `getActiveEnemies()`、`getBattleState()`（total / active / defeated / allDefeated）、`subscribe()` を追加した。撃破前に発射・発動済みの敵攻撃を消すか継続するかはBehavior側の未確定事項のため、v94では既存挙動を変更しない。実機確認で、敵HP0時の仮DELETED表示、HP表示停止、撃破済み敵のHit／ターゲット除外、新規攻撃停止まで問題ないことを確認済み。"
if old_v94 not in text:
    raise SystemExit('v94 status history text not found')
text = text.replace(old_v94, new_v94, 1)
old_phase = '''## 次フェーズ: 複数敵とWave進行\n\nv91〜v94までのプレイヤー被弾・プレイヤー撃破・敵撃破の基礎フローは実機確認済み。次はv94で追加した `getBattleState()` / `subscribe()` を起点に、複数敵が存在する1Waveを成立させ、全敵撃破後にWave完了を検知できる最小進行へ接続する。敵種類・出現数・配置・次Waveまでの待機時間などのゲームバランス値はまだ確定していないため、推測で本番値にはしない。\n\n優先対象は以下。\n\n1. 複数敵を同一Waveへ配置できる最小構造を用意する。\n2. 敵ごとのHP・Hit判定・撃破状態が独立して動作することを確認する。\n3. 一部の敵だけを撃破した段階ではWave完了にしない。\n4. `allDefeated` が成立した時だけWave完了を検知する。\n5. Wave完了後の次Wave開始タイミング・表示演出は仮値／仮演出として切り分け、本番仕様は後続で確定する。\n6. 複数敵攻撃を導入した段階で、v91の被弾後無敵による連続被弾防止と無敵中の弾通過を再確認する。\n7. 最小Wave進行の実機確認後、本番敵AI・敵構成・Wave数・ボス接続へ段階的に進む。'''
new_phase = '''## 次フェーズ: v95 最小Wave 実機確認\n\nv91〜v94までのプレイヤー／敵の基礎戦闘フローは実機確認済み。v95では敵生成の責務を `enemy-foundation.js` から `wave-system.js` へ移し、検証用として同一テスト敵2体の `WAVE 1` を生成する。1体だけの撃破ではWave継続、2体とも撃破して `getBattleState().allDefeated` が成立した時だけ `WAVE CLEAR` へ遷移する。2体という数・配置とWave表示は検証用で、本番値／本番演出ではない。次Waveの自動開始はまだ実装しない。\n\n優先対象は以下。\n\n1. 戦闘開始時にテスト敵が2体表示され、それぞれHP200を独立して持つことを確認する。\n2. 片方だけを攻撃・撃破でき、もう片方のHP／Hit判定が独立して残ることを確認する。\n3. 1体目撃破時点では上部表示が `WAVE 1` のままであることを確認する。\n4. 2体とも撃破した時だけ上部表示が `WAVE CLEAR` へ変わることを確認する。\n5. 撃破済みの敵がバスター／チップのHit対象へ戻らないことを複数敵状態でも再確認する。\n6. v95確認後、次Wave生成API・Wave間停止／待機・チップフォルダのWave単位リセットを設計する。\n7. 複数敵が同時に攻撃する実装へ進んだ段階で、v91の連続被弾防止と無敵中の弾通過を再確認する。'''
if old_phase not in text:
    raise SystemExit('current wave phase block not found')
text = text.replace(old_phase, new_phase, 1)
insert_marker = '\n新規チップ追加は一旦止め、既存5種類を使用してバトル側の基礎システムを作り込む方針は継続する。'
v95_history = "\nv95で最小Wave基盤を追加した。テスト敵の自動生成を `enemy-foundation.js` から分離し、新規 `wave-system.js` が検証用 `WAVE 1` としてHP200の同一テスト敵2体を生成する。2体・配置は複数敵検証のための仮値で本番仕様ではない。Waveは `getBattleState().allDefeated` を購読し、1体撃破ではACTIVEを維持、全2体撃破時だけCLEAREDへ遷移する。画面上部の `WAVE 1 / WAVE CLEAR` は仮UIで、次Wave自動開始・待機時間・本番敵構成は未確定のまま。v95は実機確認待ち。\n"
if insert_marker not in text:
    raise SystemExit('history insert marker not found')
text = text.replace(insert_marker, v95_history + insert_marker, 1)
status.write_text(text, encoding='utf-8')
