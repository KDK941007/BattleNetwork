from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected 1 match, found {count}: {old[:140]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# --------------------------------------------------
# game.js: player defeat runtime
# --------------------------------------------------
replace_once(
    'js/game.js',
    'lastShot:-1e9,lock:0,hitStunUntil:0,directionLocked:false',
    'lastShot:-1e9,lock:0,hitStunUntil:0,defeated:false,directionLocked:false'
)

replace_once(
    'js/game.js',
    "function openCustom(initial=false){s.paused=true;joyReset();clearCharge();$('customModal').classList.add('open');if(initial||!s.hand.length)nextHand();else renderCustom();updateFooterChips()}",
    "function openCustom(initial=false){if(s.defeated)return;s.paused=true;joyReset();clearCharge();$('customModal').classList.add('open');if(initial||!s.hand.length)nextHand();else renderCustom();updateFooterChips()}"
)

replace_once(
    'js/game.js',
    "function renderPreview(){if(!s.queue.length){setPreviewMode('none');return}",
    "function renderPreview(){if(s.defeated){setPreviewMode('none');return}if(!s.queue.length){setPreviewMode('none');return}"
)

replace_once(
    'js/game.js',
    "function updateCustomGauge(){let pc=Math.min(s.custom,CUSTOM_TIME)/CUSTOM_TIME*100;$('customFill').style.width=pc+'%';$('customGauge').classList.toggle('ready',s.customReady);$('customGauge').setAttribute('aria-disabled',s.customReady?'false':'true')}",
    "function updateCustomGauge(){let pc=Math.min(s.custom,CUSTOM_TIME)/CUSTOM_TIME*100;$('customFill').style.width=pc+'%';$('customGauge').classList.toggle('ready',s.customReady&&!s.defeated);$('customGauge').setAttribute('aria-disabled',s.defeated||!s.customReady?'true':'false')}"
)

replace_once(
    'js/game.js',
    "function hitBusterEnemy(b){let enemyId=ENEMY.findEnemyIdAtPoint(b.x,b.y);if(enemyId===null)return false;if(Number.isFinite(b.damage)&&b.damage>0)ENEMY.applyDamage(enemyId,b.damage);ENEMY.debugFlash(enemyId);return true}",
    "function hitBusterEnemy(b){let enemyId=ENEMY.findEnemyIdAtPoint(b.x,b.y);if(enemyId===null)return false;if(Number.isFinite(b.damage)&&b.damage>0)ENEMY.applyDamage(enemyId,b.damage);ENEMY.debugFlash(enemyId);return true}\nfunction clearPlayerProjectiles(){for(let i=bullets.length-1;i>=0;i--){let b=bullets[i];if(b.layer==='buster')B_PROJECTILE.remove(b.el);else{P_SHADOW.detach(b.el);b.el.remove()}}bullets.length=0}"
)

replace_once(
    'js/game.js',
    "function useChip(){if(s.paused||s.dash>0||s.lock>0||isHitStunned()||!s.queue.length||editMode)return;",
    "function useChip(){if(s.defeated||s.paused||s.dash>0||s.lock>0||isHitStunned()||!s.queue.length||editMode)return;"
)

replace_once(
    'js/game.js',
    "A.onpointerdown=e=>{if(editMode||isHitStunned())return;e.preventDefault();A.classList.add('pressed');useChip()};",
    "A.onpointerdown=e=>{if(editMode||s.defeated||isHitStunned())return;e.preventDefault();A.classList.add('pressed');useChip()};"
)

replace_once(
    'js/game.js',
    "function clearHitStun(){s.hitStunUntil=0}\n",
    "function clearHitStun(){s.hitStunUntil=0}\nfunction setDefeated(value=true){let next=!!value;if(s.defeated===next)return s.defeated;s.defeated=next;if(next){clearCharge();clearHitStun();s.dash=0;s.dvx=0;s.dvy=0;s.ix=0;s.iy=0;player.classList.remove('dashing');joyReset();A.classList.remove('pressed');B.classList.remove('pressed');setPreviewMode('none');clearPlayerProjectiles();player.classList.add('defeated');let notice=$('defeatNotice');if(notice)notice.hidden=false;$('customGauge').disabled=true;[joy,A,B,X,Y].forEach(el=>el?.setAttribute('aria-disabled','true'))}else{player.classList.remove('defeated');let notice=$('defeatNotice');if(notice)notice.hidden=true;$('customGauge').disabled=false;[joy,A,B,X,Y].forEach(el=>el?.setAttribute('aria-disabled','false'))}updateCustomGauge();return s.defeated}\n"
)

replace_once(
    'js/game.js',
    "function bDown(e){if(editMode||s.paused||s.dash>0||s.lock>0||isHitStunned())return;",
    "function bDown(e){if(editMode||s.defeated||s.paused||s.dash>0||s.lock>0||isHitStunned())return;"
)

replace_once(
    'js/game.js',
    "function dash(){if(editMode||s.paused||s.lock>0||s.dashCd>0||isHitStunned())return;",
    "function dash(){if(editMode||s.defeated||s.paused||s.lock>0||s.dashCd>0||isHitStunned())return;"
)

replace_once(
    'js/game.js',
    "Y.onpointerdown=e=>{if(editMode||s.paused||isHitStunned())return;e.preventDefault();toggleDirectionLock()};",
    "Y.onpointerdown=e=>{if(editMode||s.defeated||s.paused||isHitStunned())return;e.preventDefault();toggleDirectionLock()};"
)

replace_once(
    'js/game.js',
    "function joyMove(e){if(isHitStunned())return;let r=activeJoyRect;if(!r)return;",
    "function joyMove(e){if(s.defeated||isHitStunned())return;let r=activeJoyRect;if(!r)return;"
)

replace_once(
    'js/game.js',
    "joy.onpointerdown=e=>{if(editMode||s.paused)return;jid=e.pointerId;",
    "joy.onpointerdown=e=>{if(editMode||s.defeated||s.paused)return;jid=e.pointerId;"
)

replace_once(
    'js/game.js',
    "function requestCustomOpen(e){if($('customModal').classList.contains('open'))return;if(!s.customReady||s.paused||editMode)return;",
    "function requestCustomOpen(e){if($('customModal').classList.contains('open'))return;if(s.defeated||!s.customReady||s.paused||editMode)return;"
)

replace_once(
    'js/game.js',
    "if(!s.paused&&!editMode&&!menuOpen){if(s.lock>0)",
    "if(!s.paused&&!editMode&&!menuOpen&&!s.defeated){if(s.lock>0)"
)

replace_once(
    'js/game.js',
    "window.BattleNetworkPlayer=Object.freeze({HIT_STUN_MS,getPosition:()=>Object.freeze({x:s.x,y:s.y}),getVisual:()=>PLAYER_VISUAL,getHitBox:()=>PLAYER_HITBOX,getBounds:getPlayerBounds,containsPoint:playerContainsPoint,isDirectionLocked:()=>s.directionLocked,getFacing:()=>Object.freeze({x:s.dx,y:s.dy}),beginHitStun,isHitStunned,getRemainingHitStunMs,clearHitStun});",
    "window.BattleNetworkPlayer=Object.freeze({HIT_STUN_MS,getPosition:()=>Object.freeze({x:s.x,y:s.y}),getVisual:()=>PLAYER_VISUAL,getHitBox:()=>PLAYER_HITBOX,getBounds:getPlayerBounds,containsPoint:playerContainsPoint,isDirectionLocked:()=>s.directionLocked,getFacing:()=>Object.freeze({x:s.dx,y:s.dy}),beginHitStun,isHitStunned,getRemainingHitStunMs,clearHitStun,setDefeated,isDefeated:()=>s.defeated});"
)

replace_once(
    'js/game.js',
    "window.addEventListener('resize',()=>{refreshBattleSize();activeJoyRect=null;updateSelectionLabel()});refreshBattleSize();applyControls();updateDirectionLockUi();updatePlayerTile();resetWave();let c=camera();",
    "window.addEventListener('resize',()=>{refreshBattleSize();activeJoyRect=null;updateSelectionLabel()});refreshBattleSize();applyControls();updateDirectionLockUi();updatePlayerTile();PLAYER_HEALTH.subscribe(health=>setDefeated(health.isDefeated));resetWave();let c=camera();"
)

# --------------------------------------------------
# Temporary defeat visual (replaceable later)
# --------------------------------------------------
Path('css/player-defeat.css').write_text('''/* v93 temporary defeat presentation. Replaceable by final artwork/effects. */\n.player.defeated{opacity:.28}\n.defeatNotice{\n  position:absolute;\n  left:50%;\n  top:48%;\n  transform:translate(-50%,-50%);\n  z-index:45;\n  pointer-events:none;\n  padding:8px 18px;\n  border:2px solid rgba(255,225,120,.9);\n  border-radius:8px;\n  background:rgba(18,20,28,.82);\n  color:#fff0b0;\n  font-family:Orbitron,system-ui,sans-serif;\n  font-size:clamp(22px,5vw,42px);\n  font-weight:900;\n  letter-spacing:.12em;\n  text-shadow:0 2px 0 #4b1b1b;\n}\n''', encoding='utf-8')

# --------------------------------------------------
# index / cache version
# --------------------------------------------------
replace_once(
    'index.html',
    '<link rel="stylesheet" href="./css/player-damage.css?v=91">',
    '<link rel="stylesheet" href="./css/player-damage.css?v=91">\n<link rel="stylesheet" href="./css/player-defeat.css?v=93">'
)
replace_once(
    'index.html',
    '  <section class="battle" id="battle">\n',
    '  <section class="battle" id="battle">\n    <div class="defeatNotice" id="defeatNotice" hidden aria-live="polite">DELETED</div>\n'
)
replace_once('index.html', './js/game.js?v=92', './js/game.js?v=93')
replace_once('sw.js', "const CACHE_NAME = 'battlenetwork-runtime-v92';", "const CACHE_NAME = 'battlenetwork-runtime-v93';")
replace_once('sw.js', "  './css/player-damage.css',", "  './css/player-damage.css',\n  './css/player-defeat.css',")

# --------------------------------------------------
# GAME_DESIGN: formal functional defeat rules; visual text remains temporary
# --------------------------------------------------
replace_once(
    'GAME_DESIGN.md',
    '- 位置ノックバックが必要な攻撃は、方向・距離・時間を攻撃側の明示的な性能として個別に定義する。\n\n---',
    '''- 位置ノックバックが必要な攻撃は、方向・距離・時間を攻撃側の明示的な性能として個別に定義する。\n\n### プレイヤー撃破状態\n\n- プレイヤーHPが `0` に到達した時点で撃破状態へ移行する。\n- HP0になる致死被弾では、被弾後無敵2秒とのけぞり0.3秒は新規開始しない。\n- 撃破状態では移動および A / B / X / Y の戦闘操作を受け付けず、CUSTOMゲージの進行とCUSTOM再オープンも停止する。\n- 撃破時にBチャージ・ダッシュを中断し、既に飛んでいるプレイヤー側の弾を消去する。攻撃Rangeプレビューも非表示にする。\n- 敵攻撃側もプレイヤー撃破状態を検知して新規攻撃を停止する構成とする。\n- HUDの残HPは `0` を維持する。\n- v93時点の `DELETED` 表示とプレイヤー半透明化は動作確認用の仮演出であり、本番イラスト・撃破アニメーション確定後に差し替え可能とする。\n- 撃破後の再戦・ステージ終了・トップへ戻る等の導線は、Wave／ステージ進行設計と合わせて後続で確定する。\n\n---'''
)

# --------------------------------------------------
# DEVELOPMENT_STATUS
# --------------------------------------------------
status_path = Path('DEVELOPMENT_STATUS.md')
status = status_path.read_text(encoding='utf-8')
insert_marker = '\n\n新規チップ追加は一旦止め'
insert_at = status.find(insert_marker)
if insert_at < 0:
    raise SystemExit('DEVELOPMENT_STATUS.md: history insertion point not found')
v93_history = '''\n\nv93でプレイヤーHP0時の最小撃破フローを追加した。`BattleNetworkPlayerHealth.subscribe()` で `isDefeated` を監視し、HP0到達時に `BattleNetworkPlayer.setDefeated(true)` へ接続する。撃破状態では移動・A/B/X/Y・CUSTOM再オープン・CUSTOMゲージ進行を停止し、Bチャージ／ダッシュを中断、既存のプレイヤー弾を消去、Rangeプレビューを非表示にする。v88のテスト敵攻撃は既存の `health.isDefeated` 判定により予兆・弾を消去して以後の攻撃を停止する。HUDは残HP0を維持する。見た目は動作確認用としてプレイヤーを薄表示し、中央へ `DELETED` の仮表示を出すのみで、本番撃破イラスト／演出ではない。撃破後の再戦・ステージ終了等の導線はWave／ステージ設計と合わせるため未確定のままとする。v93はHP0到達・戦闘停止・仮表示の実機確認待ち。'''
status = status[:insert_at] + v93_history + status[insert_at:]
status = status.replace('- 撃破処理。', '- 敵側の撃破処理と、プレイヤー撃破後の本番導線。', 1)
if status.count('## 次フェーズ:') != 1:
    raise SystemExit(f'DEVELOPMENT_STATUS.md: expected exactly one next phase, found {status.count("## 次フェーズ:")}')
status = status.split('## 次フェーズ:', 1)[0].rstrip() + '''\n\n## 次フェーズ: v93 プレイヤー撃破 実機確認\n\nv91の被弾後無敵・点滅、v92の0.3秒のけぞりまで実機確認済み。v93ではHP0到達時の最小撃破フローを実装し、戦闘操作・CUSTOM進行・敵テスト攻撃を停止する。`DELETED` 表示とプレイヤー薄表示は仮演出であり、本番イラスト／演出としては確定しない。\n\n優先対象は以下。\n\n1. 敵弾でHPが `0` まで減った時にHUDが0のままになることを確認する。\n2. HP0後に移動・A/B/X/Yが反応しないことを確認する。\n3. CUSTOMゲージがHP0時点で停止し、CUSTOM画面を再オープンできないことを確認する。\n4. HP0時に敵の予兆／弾が消え、それ以降テスト敵が攻撃しないことを確認する。\n5. 既存のプレイヤー弾とRangeプレビューが撃破時に消えることを確認する。\n6. 中央の `DELETED` とプレイヤー薄表示が確認できることを確認する。これは仮演出として評価する。\n7. v93確認後、敵HP0時の撃破処理とWave進行のどちらを先に接続するか整理する。プレイヤー撃破後の再戦／終了導線はWave・ステージ設計と同時に確定する。\n'''
status_path.write_text(status, encoding='utf-8')

print('v93 patch applied')
