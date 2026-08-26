from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected 1 match, found {count}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# Enemy foundation: make defeated enemies non-interactive and expose Wave-ready battle state.
p = Path('js/combat/enemy-foundation.js')
text = p.read_text(encoding='utf-8')
text = text.replace(
    "  const enemies=[];\n  let nextId=1;",
    "  const enemies=[];\n  const listeners=new Set();\n  let nextId=1;",
    1
)
text = text.replace(
    "  function hasHealth(enemy){return !!enemy&&enemy.maxHp!==null&&enemy.hp!==null}\n",
    "  function hasHealth(enemy){return !!enemy&&enemy.maxHp!==null&&enemy.hp!==null}\n  function isDefeatedRaw(enemy){return hasHealth(enemy)&&enemy.hp<=0}\n  function getBattleState(){\n    const total=enemies.length;\n    let active=0,defeated=0;\n    enemies.forEach(enemy=>{if(isDefeatedRaw(enemy))defeated++;else active++});\n    return Object.freeze({total,active,defeated,allDefeated:total>0&&active===0});\n  }\n  function emitBattleState(){\n    const state=getBattleState();\n    listeners.forEach(listener=>{try{listener(state)}catch(error){console.error('BattleNetworkEnemy listener failed.',error)}});\n    return state;\n  }\n  function subscribe(listener){\n    if(typeof listener!=='function')return()=>{};\n    listeners.add(listener);\n    listener(getBattleState());\n    return()=>listeners.delete(listener);\n  }\n",
    1
)
text = text.replace(
    "  function createHealthLabel(){\n    const hpEl=document.createElement('div');",
    "  function createDefeatLabel(){\n    const defeatEl=document.createElement('div');\n    defeatEl.className='enemyPrototypeDefeat';\n    defeatEl.textContent='DELETED';\n    defeatEl.style.cssText=\"display:none;position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);padding:4px 8px;border:2px solid rgba(255,228,130,.92);border-radius:6px;background:rgba(12,14,20,.86);color:#fff0b0;font-family:'Orbitron',var(--bn-ui-font),system-ui,sans-serif;font-size:16px;font-weight:900;line-height:1;letter-spacing:.08em;white-space:nowrap;pointer-events:none;z-index:3;\";\n    return defeatEl;\n  }\n  function createHealthLabel(){\n    const hpEl=document.createElement('div');",
    1
)
text = text.replace(
    "  function renderHealth(enemy){\n    if(!enemy.hpEl)return;\n    if(!hasHealth(enemy)){enemy.hpEl.style.display='none';return}\n    enemy.hpEl.style.display='block';\n    enemy.hpEl.textContent=String(Math.ceil(enemy.hp));\n  }",
    "  function renderHealth(enemy){\n    if(!enemy.hpEl)return;\n    if(!hasHealth(enemy)||isDefeatedRaw(enemy)){enemy.hpEl.style.display='none';return}\n    enemy.hpEl.style.display='block';\n    enemy.hpEl.textContent=String(Math.ceil(enemy.hp));\n  }\n  function syncDefeatPresentation(enemy){\n    const defeated=isDefeatedRaw(enemy);\n    enemy.el.classList.toggle('defeated',defeated);\n    enemy.el.style.borderColor=defeated?'rgba(160,160,170,.9)':'#ff5b67';\n    enemy.el.style.background=defeated?'rgba(38,40,48,.72)':'rgba(96,10,24,.88)';\n    if(enemy.defeatEl)enemy.defeatEl.style.display=defeated?'block':'none';\n    renderHealth(enemy);\n    return defeated;\n  }",
    1
)
text = text.replace(
    "    const hpEl=createHealthLabel();\n    el.appendChild(hpEl);\n    const health=normalizeHealth(config.health);\n    const enemy={id:nextId++,x,y,visual:normalizeVisual(config.visual),hitBox:normalizeHitBox(config.hitBox),maxHp:health.maxHp,hp:health.hp,el,hpEl,flashToken:0};\n    scene.appendChild(el);enemies.push(enemy);renderHealth(enemy);render(enemy);\n    return enemy.id;",
    "    const hpEl=createHealthLabel(),defeatEl=createDefeatLabel();\n    el.appendChild(hpEl);el.appendChild(defeatEl);\n    const health=normalizeHealth(config.health);\n    const enemy={id:nextId++,x,y,visual:normalizeVisual(config.visual),hitBox:normalizeHitBox(config.hitBox),maxHp:health.maxHp,hp:health.hp,el,hpEl,defeatEl,flashToken:0};\n    scene.appendChild(el);enemies.push(enemy);syncDefeatPresentation(enemy);render(enemy);emitBattleState();\n    return enemy.id;",
    1
)
text = text.replace(
    "  function getSnapshot(enemy){return enemy?Object.freeze({id:enemy.id,x:enemy.x,y:enemy.y,visual:enemy.visual,hitBox:enemy.hitBox,maxHp:enemy.maxHp,hp:enemy.hp,isDefeated:hasHealth(enemy)&&enemy.hp<=0,bounds:getBounds(enemy)}):null}\n  function getEnemy(id){return getSnapshot(getById(id))}\n  function getEnemies(){return Object.freeze(enemies.map(getSnapshot))}",
    "  function getSnapshot(enemy){return enemy?Object.freeze({id:enemy.id,x:enemy.x,y:enemy.y,visual:enemy.visual,hitBox:enemy.hitBox,maxHp:enemy.maxHp,hp:enemy.hp,isDefeated:isDefeatedRaw(enemy),bounds:getBounds(enemy)}):null}\n  function getEnemy(id){return getSnapshot(getById(id))}\n  function getEnemies(){return Object.freeze(enemies.map(getSnapshot))}\n  function getActiveEnemies(){return Object.freeze(enemies.filter(enemy=>!isDefeatedRaw(enemy)).map(getSnapshot))}",
    1
)
text = text.replace(
    "    enemy.maxHp=normalized.maxHp;enemy.hp=normalized.hp;renderHealth(enemy);\n    return Object.freeze({applied:true,reason:null,enemy:getSnapshot(enemy)});",
    "    enemy.maxHp=normalized.maxHp;enemy.hp=normalized.hp;syncDefeatPresentation(enemy);emitBattleState();\n    return Object.freeze({applied:true,reason:null,enemy:getSnapshot(enemy)});",
    1
)
text = text.replace(
    "    enemy.hp=Math.max(0,before-damage);renderHealth(enemy);\n    const applied=before-enemy.hp;\n    return Object.freeze({applied:true,reason:null,amount:applied,before,after:enemy.hp,defeatedNow:before>0&&enemy.hp<=0,enemy:getSnapshot(enemy)});",
    "    enemy.hp=Math.max(0,before-damage);\n    const applied=before-enemy.hp,defeatedNow=before>0&&enemy.hp<=0;\n    syncDefeatPresentation(enemy);emitBattleState();\n    return Object.freeze({applied:true,reason:null,amount:applied,before,after:enemy.hp,defeatedNow,enemy:getSnapshot(enemy)});",
    1
)
text = text.replace(
    "  function containsPointRaw(enemy,x,y){\n    if(!enemy||!Number.isFinite(x)||!Number.isFinite(y))return false;",
    "  function containsPointRaw(enemy,x,y){\n    if(!enemy||isDefeatedRaw(enemy)||!Number.isFinite(x)||!Number.isFinite(y))return false;",
    1
)
text = text.replace(
    "    for(const enemy of enemies){\n      if(containsPointRaw(enemy,x,y))return enemy.id;",
    "    for(const enemy of enemies){\n      if(!isDefeatedRaw(enemy)&&containsPointRaw(enemy,x,y))return enemy.id;",
    1
)
text = text.replace(
    "  function intersectsRange(id,shape){\n    const enemy=getById(id);return !!enemy&&RANGE.intersectsBounds(shape,getBounds(enemy));\n  }\n  function getHitEnemies(shape){\n    if(!shape)return Object.freeze([]);\n    return Object.freeze(enemies.filter(enemy=>RANGE.intersectsBounds(shape,getBounds(enemy))).map(getSnapshot));\n  }",
    "  function intersectsRange(id,shape){\n    const enemy=getById(id);return !!enemy&&!isDefeatedRaw(enemy)&&RANGE.intersectsBounds(shape,getBounds(enemy));\n  }\n  function getHitEnemies(shape){\n    if(!shape)return Object.freeze([]);\n    return Object.freeze(enemies.filter(enemy=>!isDefeatedRaw(enemy)&&RANGE.intersectsBounds(shape,getBounds(enemy))).map(getSnapshot));\n  }",
    1
)
text = text.replace(
    "  function debugFlash(id){\n    const enemy=getById(id);if(!enemy)return;",
    "  function debugFlash(id){\n    const enemy=getById(id);if(!enemy||isDefeatedRaw(enemy))return;",
    1
)
text = text.replace(
    "  window.BattleNetworkEnemy=Object.freeze({spawn,getEnemy,getEnemies,configureHealth,applyDamage,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,debugFlash});",
    "  window.BattleNetworkEnemy=Object.freeze({spawn,getEnemy,getEnemies,getActiveEnemies,getBattleState,subscribe,configureHealth,applyDamage,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,debugFlash});",
    1
)
p.write_text(text, encoding='utf-8')

# Browser cache/version sync.
replace_once('index.html', './js/combat/enemy-foundation.js?v=76', './js/combat/enemy-foundation.js?v=94')
replace_once('sw.js', "const CACHE_NAME = 'battlenetwork-runtime-v93';", "const CACHE_NAME = 'battlenetwork-runtime-v94';")

# Formal game design.
game_design = Path('GAME_DESIGN.md')
gd = game_design.read_text(encoding='utf-8')
marker = "- 撃破後の再戦・ステージ終了・トップへ戻る等の導線は、Wave／ステージ進行設計と合わせて後続で確定する。\n"
if gd.count(marker) != 1:
    raise SystemExit(f'GAME_DESIGN.md: expected player defeat marker once, found {gd.count(marker)}')
enemy_defeat = marker + "\n### 敵撃破状態\n\n- 敵HPが `0` に到達した時点で撃破状態へ移行する。\n- 撃破済みの敵は、新規攻撃のターゲット取得、点Hit判定、Range Hit判定の対象から除外する。\n- 撃破後は敵HP表示を停止する。v94時点の敵本体のグレー表示と `DELETED` 表示は動作確認用の仮表現であり、本番イラスト・撃破アニメーション確定後に差し替え可能とする。\n- 敵共通基盤は `getBattleState()` で `total / active / defeated / allDefeated` を公開し、`subscribe()` で状態変化を購読できるようにする。Wave進行はこの共通状態を起点に接続する。\n- 撃破前にすでに発射・発動済みの敵攻撃を撃破時に消去するか継続するかは、敵共通撃破処理では一律に決めず、攻撃Behavior側の仕様として後続で確定する。v94では既存挙動を変更しない。\n- Wave進行は敵撃破処理の実機確認後に接続する。\n"
game_design.write_text(gd.replace(marker, enemy_defeat, 1), encoding='utf-8')

# Development status history and next phase.
status_path = Path('DEVELOPMENT_STATUS.md')
status = status_path.read_text(encoding='utf-8')
insert_marker = '新規チップ追加は一旦止め'
pos = status.find(insert_marker)
if pos < 0:
    raise SystemExit('DEVELOPMENT_STATUS.md: history insertion marker not found')
v94_history = "v94で敵HP0時の共通撃破処理を追加した。`enemy-foundation.js` はHP0の敵を点Hit判定・Range Hit判定・ターゲット取得から除外し、HP表示を停止する。表示は本体をグレー化し `DELETED` を重ねる仮表現とし、本番イラスト／アニメーションへ後から差し替える。Wave接続用として `getActiveEnemies()`、`getBattleState()`（total / active / defeated / allDefeated）、`subscribe()` を追加した。撃破前に発射・発動済みの敵攻撃を消すか継続するかはBehavior側の未確定事項のため、v94では既存挙動を変更しない。v94は敵撃破表示・Hit除外・全敵撃破状態の実機確認待ち。\n\n"
status = status[:pos] + v94_history + status[pos:]
status = status.replace('- 敵側の撃破処理と、プレイヤー撃破後の本番導線。', '- プレイヤー撃破後の本番導線。', 1)
old_next = '''## 次フェーズ: 敵HP0時の撃破処理

v91の被弾後無敵・点滅、v92の0.3秒のけぞり、v93のプレイヤーHP0撃破フローまで実機確認済み。敵側は `BattleNetworkEnemy.applyDamage()` で `defeatedNow`、snapshotで `isDefeated` を既に取得できるため、次はこのHP0判定を起点に敵撃破処理を成立させる。Wave進行は敵撃破完了を前提とするため、敵撃破処理を先に完成させ、その後Wave進行へ接続する。

優先対象は以下。

1. 敵HPが `0` に到達した時点で撃破状態へ移行する。
2. 撃破した敵を新規攻撃・Hit判定・ターゲット取得の対象から除外する。
3. 撃破時の敵表示／HP表示を停止し、仮の撃破演出を用意する。本番イラスト・アニメーションは後から差し替え可能とする。
4. 既に発射済みの敵固有攻撃を撃破時にどう扱うかは攻撃Behaviorと整合させて確定する。
5. 敵撃破完了をWave進行側から参照できる共通状態／通知方法を整理する。
6. 敵撃破処理の実機確認後、複数敵とWave進行へ接続する。
7. プレイヤー撃破後の再戦／終了導線はWave・ステージ進行設計と同時に確定する。'''
new_next = '''## 次フェーズ: v94 敵撃破 実機確認

v91〜v93のプレイヤー側被弾・撃破フローまで実機確認済み。v94では敵HP0時の共通撃破処理を追加し、撃破済み敵をHit判定・ターゲット取得から除外、HP表示停止、仮 `DELETED` 表示へ切り替える。Wave接続用の全敵撃破状態も公開する。次は実機で敵撃破成立を確認し、問題なければ複数敵とWave進行へ接続する。

優先対象は以下。

1. テスト敵HPを `0` まで減らすとHP数字が消え、敵がグレー＋ `DELETED` の仮表示になることを確認する。
2. 撃破後の敵へバスター／チップを当てても、新たな命中対象として扱われないことを確認する。
3. 撃破後はテスト敵が新規攻撃を開始しないことを確認する。
4. `BattleNetworkEnemy.getBattleState()` がテスト敵撃破後 `active=0 / defeated=1 / allDefeated=true` となる構成をリポジトリ上で確認済みとする。
5. 撃破前にすでに発射・発動済みの敵攻撃の扱いは今回確定せず、既存挙動を維持する。
6. v94実機確認後、複数敵を扱えるWave進行基盤へ進む。
7. プレイヤー撃破後の再戦／終了導線はWave・ステージ進行設計と同時に確定する。'''
if status.count(old_next) != 1:
    raise SystemExit(f'DEVELOPMENT_STATUS.md: expected next phase once, found {status.count(old_next)}')
status = status.replace(old_next, new_next, 1)
status_path.write_text(status, encoding='utf-8')

print('v94 patch applied')
