from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected 1 match, found {count}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'js/game.js',
    'const WORLD=FIELD.WORLD_SIZE,PX=.72,PY=.36,SW=WORLD*PX*2,SH=WORLD*PY*2,SPEED=260,DEAD=.12,FOLLOW=.14,CAMERA_ZOOM=.62,DASH_DIST=180,DASH_TIME=.13,DASH_CD=.65,CUSTOM_TIME=10,LONG_PRESS_MS=520;',
    'const WORLD=FIELD.WORLD_SIZE,PX=.72,PY=.36,SW=WORLD*PX*2,SH=WORLD*PY*2,SPEED=260,DEAD=.12,FOLLOW=.14,CAMERA_ZOOM=.62,DASH_DIST=180,DASH_TIME=.13,DASH_CD=.65,CUSTOM_TIME=10,LONG_PRESS_MS=520,HIT_STUN_MS=300;'
)
replace_once('js/game.js', 'lastShot:-1e9,lock:0,directionLocked:false', 'lastShot:-1e9,lock:0,hitStunUntil:0,directionLocked:false')
replace_once('js/game.js', "function useChip(){if(s.paused||s.dash>0||s.lock>0||!s.queue.length||editMode)return;", "function useChip(){if(s.paused||s.dash>0||s.lock>0||isHitStunned()||!s.queue.length||editMode)return;")
replace_once('js/game.js', "A.onpointerdown=e=>{if(editMode)return;e.preventDefault();A.classList.add('pressed');useChip()};", "A.onpointerdown=e=>{if(editMode||isHitStunned())return;e.preventDefault();A.classList.add('pressed');useChip()};")
clear_charge = "function clearCharge(){s.bHeld=false;s.charged=false;s.bTapAction=null;s.bHoldAction=null;s.bChargeTime=0;B.classList.remove('pressed');arrow.classList.remove('charging','ready')}"
helpers = clear_charge + "\nfunction isHitStunned(now=performance.now()){return now<s.hitStunUntil}\nfunction getRemainingHitStunMs(now=performance.now()){return Math.max(0,s.hitStunUntil-now)}\nfunction beginHitStun(durationMs=HIT_STUN_MS){let duration=Number(durationMs);if(!Number.isFinite(duration)||duration<=0)return false;s.hitStunUntil=performance.now()+duration;clearCharge();if(s.dash>0){s.dash=0;s.dvx=0;s.dvy=0;player.classList.remove('dashing')}A.classList.remove('pressed');return true}\nfunction clearHitStun(){s.hitStunUntil=0}\n"
replace_once('js/game.js', clear_charge + '\n', helpers)
replace_once('js/game.js', "function bDown(e){if(editMode||s.paused||s.dash>0||s.lock>0)return;", "function bDown(e){if(editMode||s.paused||s.dash>0||s.lock>0||isHitStunned())return;")
replace_once('js/game.js', "function dash(){if(editMode||s.paused||s.lock>0||s.dashCd>0)return;", "function dash(){if(editMode||s.paused||s.lock>0||s.dashCd>0||isHitStunned())return;")
replace_once('js/game.js', "Y.onpointerdown=e=>{if(editMode||s.paused)return;e.preventDefault();toggleDirectionLock()};", "Y.onpointerdown=e=>{if(editMode||s.paused||isHitStunned())return;e.preventDefault();toggleDirectionLock()};")
replace_once('js/game.js', "function joyMove(e){let r=activeJoyRect;if(!r)return;", "function joyMove(e){if(isHitStunned())return;let r=activeJoyRect;if(!r)return;")
replace_once('js/game.js', "}else if(s.lock<=0){s.x+=s.ix*SPEED*dt;s.y+=s.iy*SPEED*dt}}", "}else if(s.lock<=0&&!isHitStunned(t)){s.x+=s.ix*SPEED*dt;s.y+=s.iy*SPEED*dt}}")
replace_once(
    'js/game.js',
    "window.BattleNetworkPlayer=Object.freeze({getPosition:()=>Object.freeze({x:s.x,y:s.y}),getVisual:()=>PLAYER_VISUAL,getHitBox:()=>PLAYER_HITBOX,getBounds:getPlayerBounds,containsPoint:playerContainsPoint,isDirectionLocked:()=>s.directionLocked,getFacing:()=>Object.freeze({x:s.dx,y:s.dy})});",
    "window.BattleNetworkPlayer=Object.freeze({HIT_STUN_MS,getPosition:()=>Object.freeze({x:s.x,y:s.y}),getVisual:()=>PLAYER_VISUAL,getHitBox:()=>PLAYER_HITBOX,getBounds:getPlayerBounds,containsPoint:playerContainsPoint,isDirectionLocked:()=>s.directionLocked,getFacing:()=>Object.freeze({x:s.dx,y:s.dy}),beginHitStun,isHitStunned,getRemainingHitStunMs,clearHitStun});"
)

replace_once(
    'js/combat/player-damage-system.js',
    "    if(result.ok===true&&(result.appliedDamage||0)>0&&result.defeatedNow!==true){\n      beginInvincibility();\n    }",
    "    if(result.ok===true&&(result.appliedDamage||0)>0&&result.defeatedNow!==true){\n      PLAYER.beginHitStun?.();\n      beginInvincibility();\n    }"
)

replace_once('index.html', './js/game.js?v=90', './js/game.js?v=92')
replace_once('index.html', './js/combat/player-damage-system.js?v=91', './js/combat/player-damage-system.js?v=92')
replace_once('sw.js', "const CACHE_NAME = 'battlenetwork-runtime-v91';", "const CACHE_NAME = 'battlenetwork-runtime-v92';")

replace_once(
    'GAME_DESIGN.md',
    '- のけぞり・ノックバックは被弾後無敵とは分離し、後続フェーズで設計する。',
    '''- のけぞりは被弾後無敵と同時に開始するが、状態の役割は分離して管理する。位置を押し戻すノックバックは通常被弾の共通仕様にせず、攻撃ごとの個別性能として別途設計する。\n\n### のけぞり（Flinch）\n\n- 通常の被弾で実ダメージが成立し、HP0にならなかった場合にのけぞりを発生させる。\n- のけぞり時間の現行調整値は `0.3秒` とし、実機確認で長短を調整する。\n- のけぞり中は移動と A / B / X / Y 操作を受け付けない。\n- 被弾時にBチャージ中ならチャージを中断する。ダッシュ中ならその場でダッシュを中断するが、既に発生したダッシュのクールタイムは維持する。\n- 通常ののけぞりではプレイヤーworld座標を移動させない。\n- のけぞり0.3秒と被弾後無敵2秒は独立して進行し、のけぞり終了後は無敵点滅中でも通常操作へ復帰する。\n- 位置ノックバックが必要な攻撃は、方向・距離・時間を攻撃側の明示的な性能として個別に定義する。'''
)

status_path = Path('DEVELOPMENT_STATUS.md')
status = status_path.read_text(encoding='utf-8')
insert_at = status.find('\n\n新規チップ追加は一旦止め')
if insert_at < 0:
    raise SystemExit('DEVELOPMENT_STATUS.md: history insertion point not found')
v92_history = "\n\nv92で通常被弾時の『のけぞり』を位置ノックバックから分離して実装した。実ダメージが成立してHP0にならなかった場合、`BattleNetworkPlayer.beginHitStun()` を通じて現行調整値 `0.3秒` ののけぞり状態へ入る。のけぞり中は移動と A / B / X / Y 操作を無効化し、Bチャージ中なら即キャンセル、ダッシュ中ならその場で中断する。ダッシュの既存クールタイムは維持する。通常ののけぞりではworld座標を押し戻さず、位置ノックバックは将来必要な攻撃ごとの個別性能として残す。v91の被弾後無敵2秒は独立して同時開始し、0.3秒後には点滅中でも操作へ復帰する。v92はのけぞり時間・操作停止・チャージ／ダッシュ中断・位置非移動の実機確認待ち。"
status = status[:insert_at] + v92_history + status[insert_at:]
if '- 被弾時ののけぞり・ノックバック。' not in status:
    raise SystemExit('DEVELOPMENT_STATUS.md: old flinch/knockback item not found')
status = status.replace('- 被弾時ののけぞり・ノックバック。', '- 攻撃ごとの個別性能としての位置ノックバック。', 1)
heading = '\n## 次フェーズ: のけぞり・ノックバック\n'
next_at = status.find(heading)
if next_at < 0:
    raise SystemExit('DEVELOPMENT_STATUS.md: next-phase heading not found')
new_tail = '''\n## 次フェーズ: v92 のけぞり実機確認\n\nv91の被弾後無敵・点滅まで実機確認済み。v92では通常被弾時に現行調整値0.3秒ののけぞりを追加し、移動・A/B/X/Y停止、Bチャージとダッシュの中断を接続した。通常被弾では位置を押し戻さず、ノックバックは攻撃ごとの個別性能として分離する。次は実機で0.3秒の操作感と中断挙動を確認し、問題なければHP0時の撃破処理へ進む。\n\n優先対象は以下。\n\n1. 被弾直後、約0.3秒だけ移動できないことを確認する。\n2. のけぞり中は A / B / X / Y が反応しないことを確認する。\n3. Bチャージ中の被弾でチャージがキャンセルされることを確認する。\n4. ダッシュ中の被弾でダッシュがその場で中断され、既存クールタイムは残ることを確認する。\n5. 通常被弾でプレイヤー位置が押し戻されないこと、0.3秒後は2秒無敵の点滅中でも操作へ復帰することを確認する。\n6. v92確認後、HP0時の撃破処理へ進む。位置ノックバックは必要な攻撃を実装する段階で個別設計する。\n7. 高頻度攻撃・複数敵攻撃の導入時にv91の連続被弾防止と弾通過を再確認し、その後敵AI・Wave進行へ段階的に進める。'''
status = status[:next_at] + new_tail
status_path.write_text(status, encoding='utf-8')

print('v92 retry patch applied')
