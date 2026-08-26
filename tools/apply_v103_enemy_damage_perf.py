from pathlib import Path

root=Path('.')
path=root/'js/combat/enemy-foundation.js'
s=path.read_text(encoding='utf-8')

old='''  function createHealthLabel(){\n    const hpEl=document.createElement('div');\n    hpEl.className='enemyPrototypeHp enemyPrototypeHp-bottom';\n    hpEl.style.cssText="position:absolute;left:50%;bottom:-49px;transform:translateX(-50%);min-width:104px;color:#fff;font-family:\'Orbitron\',var(--bn-ui-font),system-ui,sans-serif;font-size:40px;font-weight:800;line-height:1;letter-spacing:.015em;font-variant-numeric:tabular-nums;text-align:center;white-space:nowrap;-webkit-text-stroke:3px #050505;text-shadow:-2px -2px 0 #050505,2px -2px 0 #050505,-2px 2px 0 #050505,2px 2px 0 #050505,0 4px 0 #050505;pointer-events:none;z-index:2;";\n    return hpEl;\n  }\n  function renderHealth(enemy){\n    if(!enemy.hpEl)return;\n    if(!hasHealth(enemy)||isDefeatedRaw(enemy)){enemy.hpEl.style.display='none';return}\n    enemy.hpEl.style.display='block';\n    enemy.hpEl.textContent=String(Math.ceil(enemy.hp));\n  }'''
new='''  function createHealthLabel(){\n    const hpEl=document.createElement('div');\n    hpEl.className='enemyPrototypeHp enemyPrototypeHp-bottom';\n    hpEl.style.cssText="position:absolute;left:50%;bottom:-49px;transform:translateX(-50%);min-width:104px;color:#fff;font-family:\'Orbitron\',var(--bn-ui-font),system-ui,sans-serif;font-size:40px;font-weight:800;line-height:1;letter-spacing:.015em;font-variant-numeric:tabular-nums;text-align:center;white-space:nowrap;-webkit-text-stroke:3px #050505;text-shadow:-2px -2px 0 #050505,2px -2px 0 #050505,-2px 2px 0 #050505,2px 2px 0 #050505,0 4px 0 #050505;pointer-events:none;z-index:2;";\n    return hpEl;\n  }\n  function createHitFlash(){\n    const hitFlashEl=document.createElement('div');\n    hitFlashEl.className='enemyPrototypeHitFlash';\n    hitFlashEl.style.cssText='position:absolute;inset:-3px;border:2px solid rgba(255,248,178,.96);border-radius:18px;background:rgba(255,244,150,.58);opacity:0;pointer-events:none;z-index:4;will-change:opacity;transform:translateZ(0);';\n    return hitFlashEl;\n  }\n  function renderHealth(enemy){\n    if(!enemy.hpEl)return;\n    if(!hasHealth(enemy)||isDefeatedRaw(enemy)){if(enemy.hpEl.style.display!=='none')enemy.hpEl.style.display='none';return}\n    if(enemy.hpEl.style.display!=='block')enemy.hpEl.style.display='block';\n    const text=String(Math.ceil(enemy.hp));\n    if(enemy.hpEl.textContent!==text)enemy.hpEl.textContent=text;\n  }'''
if old not in s: raise SystemExit('health block not found')
s=s.replace(old,new,1)

old="""    const hpEl=createHealthLabel(),defeatEl=createDefeatLabel();\n    el.appendChild(hpEl);el.appendChild(defeatEl);\n    const health=normalizeHealth(config.health);\n    const enemy={id:nextId++,x,y,visual:normalizeVisual(config.visual),hitBox:normalizeHitBox(config.hitBox),maxHp:health.maxHp,hp:health.hp,el,hpEl,defeatEl,flashToken:0};"""
new="""    const hpEl=createHealthLabel(),defeatEl=createDefeatLabel(),hitFlashEl=createHitFlash();\n    el.appendChild(hpEl);el.appendChild(defeatEl);el.appendChild(hitFlashEl);\n    const health=normalizeHealth(config.health);\n    const enemy={id:nextId++,x,y,visual:normalizeVisual(config.visual),hitBox:normalizeHitBox(config.hitBox),maxHp:health.maxHp,hp:health.hp,el,hpEl,defeatEl,hitFlashEl,hitFlashAnimation:null,flashToken:0};"""
if old not in s: raise SystemExit('spawn flash block not found')
s=s.replace(old,new,1)

old="""  function clearAll(){\n    enemies.forEach(enemy=>{enemy.flashToken++;enemy.el?.remove()});\n    enemies.length=0;\n    return emitBattleState();\n  }"""
new="""  function clearAll(){\n    enemies.forEach(enemy=>{enemy.flashToken++;enemy.hitFlashAnimation?.cancel?.();enemy.el?.remove()});\n    enemies.length=0;\n    return emitBattleState();\n  }"""
if old not in s: raise SystemExit('clearAll block not found')
s=s.replace(old,new,1)

old="""    const before=enemy.hp;\n    enemy.hp=Math.max(0,before-damage);\n    const applied=before-enemy.hp,defeatedNow=before>0&&enemy.hp<=0;\n    syncDefeatPresentation(enemy);emitBattleState();\n    return Object.freeze({applied:true,reason:null,amount:applied,before,after:enemy.hp,defeatedNow,enemy:getSnapshot(enemy)});"""
new="""    const before=enemy.hp;\n    enemy.hp=Math.max(0,before-damage);\n    const applied=before-enemy.hp,defeatedNow=before>0&&enemy.hp<=0;\n    if(defeatedNow){syncDefeatPresentation(enemy);emitBattleState()}\n    else renderHealth(enemy);\n    return Object.freeze({applied:true,reason:null,amount:applied,before,after:enemy.hp,defeatedNow,enemy:getSnapshot(enemy)});"""
if old not in s: raise SystemExit('applyDamage block not found')
s=s.replace(old,new,1)

old="""  function debugFlash(id){\n    const enemy=getById(id);if(!enemy||isDefeatedRaw(enemy))return;\n    const token=++enemy.flashToken;\n    enemy.el.style.filter='brightness(2.35) saturate(1.7)';\n    enemy.el.style.boxShadow='0 0 0 3px rgba(255,255,255,.8) inset,0 0 30px rgba(255,245,120,.95)';\n    setTimeout(()=>{\n      if(enemy.flashToken!==token)return;\n      enemy.el.style.filter='';\n      enemy.el.style.boxShadow='0 0 0 3px rgba(255,255,255,.18) inset,0 0 20px rgba(255,70,90,.55)';\n    },180);\n  }"""
new="""  function debugFlash(id){\n    const enemy=getById(id);if(!enemy||isDefeatedRaw(enemy)||!enemy.hitFlashEl)return;\n    const el=enemy.hitFlashEl;\n    enemy.flashToken++;\n    enemy.hitFlashAnimation?.cancel?.();\n    if(typeof el.animate==='function'){\n      const animation=el.animate([{opacity:.88},{opacity:0}],{duration:140,easing:'ease-out'});\n      enemy.hitFlashAnimation=animation;\n      animation.onfinish=()=>{if(enemy.hitFlashAnimation===animation){enemy.hitFlashAnimation=null;el.style.opacity='0'}};\n      animation.oncancel=()=>{if(enemy.hitFlashAnimation===animation)enemy.hitFlashAnimation=null};\n      return;\n    }\n    const token=enemy.flashToken;\n    el.style.opacity='.88';\n    setTimeout(()=>{if(enemy.flashToken===token)el.style.opacity='0'},140);\n  }"""
if old not in s: raise SystemExit('debugFlash block not found')
s=s.replace(old,new,1)
path.write_text(s,encoding='utf-8')

index_path=root/'index.html'
index=index_path.read_text(encoding='utf-8')
index=index.replace('./js/combat/enemy-foundation.js?v=97','./js/combat/enemy-foundation.js?v=103',1)
index_path.write_text(index,encoding='utf-8')

sw_path=root/'sw.js'
sw=sw_path.read_text(encoding='utf-8')
if "battlenetwork-runtime-v102" not in sw: raise SystemExit('v102 cache marker not found')
sw=sw.replace("battlenetwork-runtime-v102","battlenetwork-runtime-v103",1)
sw_path.write_text(sw,encoding='utf-8')

status_path=root/'DEVELOPMENT_STATUS.md'
status=status_path.read_text(encoding='utf-8')
marker='## 次フェーズ: v102 敵攻撃描画負荷 実機確認'
if marker not in status: raise SystemExit('v102 status marker not found')
prefix=status.split(marker,1)[0]
section='''## 次フェーズ: v103 敵被ダメージ描画負荷 実機確認\n\nv102の敵攻撃専用レイヤー化・予兆／弾DOM再利用は実機確認で改善を確認済み。敵の独立行動、攻撃予兆・弾位置、Wave切替停止等の挙動を維持したまま、予兆表示直前の引っかかりは改善した。\n\n新たに、プレイヤーが敵へダメージを与えた瞬間に画面が重くなるように見える事象を確認した。v102時点では通常ダメージごとに `applyDamage()` が `syncDefeatPresentation()` と `emitBattleState()` を呼び、HP以外のclass／border／background／撃破表示も再設定していた。また `debugFlash()` が巨大な `scene` 内の敵本体へ `filter: brightness/saturate` と強い `box-shadow` を180ms適用していた。\n\nv103では通常ダメージ時はHP文字だけを必要時に更新し、class／border／background／Wave向け撃破状態通知は実際に撃破した瞬間だけ行う。ヒット可視化は敵生成時に小さな `enemyPrototypeHitFlash` オーバーレイを1個用意し、敵本体のfilter／box-shadowを書き換えず、そのオーバーレイのopacityだけをWeb Animations API中心で短時間変化させる。WAAPI非対応時のみ軽量なopacity切替へフォールバックする。ダメージ値、Hit判定、敵HP、撃破条件、Wave完了条件は変更しない。\n\n実機確認では以下を優先する。\n\n1. バスター／チップで敵へダメージを与えた瞬間の引っかかりが改善していること。\n2. ダメージ時の軽量ヒット発光が視認でき、HP表示が即時更新されること。\n3. 通常ダメージでは敵の見た目・AI・Wave状態が不必要に変化しないこと。\n4. HP0時は従来どおりHP表示停止・DELETED表示・新規行動停止・Wave撃破判定が成立すること。\n5. 連射バスターなど短時間に複数回命中しても、画面負荷が大きく増えないこと。\n6. v102の敵予兆負荷改善とv101の敵独立行動が維持されていること。\n7. v103でも負荷が残る場合は、大きなtext-stroke/text-shadowを持つ敵HP表示自体をscene外の専用HUDレイヤーへ分離する案を次の切り分け対象とする。\n'''
status_path.write_text(prefix+section,encoding='utf-8')
