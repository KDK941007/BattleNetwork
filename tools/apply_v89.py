from pathlib import Path

# v89: Cannon must stop at the first enemy and damage only that enemy.

hit_path = Path('js/combat/combat-hit-test.js')
hit = hit_path.read_text(encoding='utf-8')
old_schedule = """  function scheduleCannon(attack){
    const shape=attack.shape;
    const speed=behaviorParam('CANNON_SHOT','PROJECTILE_SPEED',900);
    if(!shape||!(speed>0))return;
    const hits=testRange(shape);
    hits.forEach(enemy=>{
      const distance=rayEntryDistance(shape.origin,shape.direction,enemy.bounds,(shape.widthWorld||0)/2);
      if(distance===null||distance>shape.lengthWorld)return;
      setTimeout(()=>damageAndFlash(enemy,attack.damage),distance/speed*1000);
    });
  }
"""
new_schedule = """  function getFirstCannonHit(input){
    const attack=input?.shape?input:{shape:input};
    const shape=attack.shape;
    if(!shape||shape.rangeTypeId!=='LINE')return null;
    let first=null;
    testRange(shape).forEach(enemy=>{
      const distance=rayEntryDistance(shape.origin,shape.direction,enemy.bounds,(shape.widthWorld||0)/2);
      if(distance===null||distance>shape.lengthWorld)return;
      if(!first||distance<first.distance)first={enemy,distance};
    });
    return first?Object.freeze({enemy:first.enemy,distance:first.distance}):null;
  }

  function scheduleCannon(attack){
    const speed=behaviorParam('CANNON_SHOT','PROJECTILE_SPEED',900);
    if(!(speed>0))return;
    const first=getFirstCannonHit(attack);
    if(!first)return;
    setTimeout(()=>damageAndFlash(first.enemy,attack.damage),first.distance/speed*1000);
  }
"""
if old_schedule not in hit:
    raise SystemExit('combat-hit-test scheduleCannon target not found')
hit = hit.replace(old_schedule, new_schedule, 1)
old_export = "window.BattleNetworkCombatHitTest=Object.freeze({testRange,flashHits,resolveBehavior});"
new_export = "window.BattleNetworkCombatHitTest=Object.freeze({testRange,flashHits,resolveBehavior,getFirstCannonHit});"
if old_export not in hit:
    raise SystemExit('combat-hit-test export target not found')
hit = hit.replace(old_export, new_export, 1)
hit_path.write_text(hit, encoding='utf-8')

game_path = Path('js/game.js')
game = game_path.read_text(encoding='utf-8')
old_cannon = "if(c.type==='cannon')spawn('cannon',attackShape?.lengthWorld??c.range,c.projectileSpeed||900,attackDirection,null,`CHIP:${c.chipId}`);else if(c.type==='sword'||c.type==='wide'){"
new_cannon = "if(c.type==='cannon'){let cannonRange=attackShape?.lengthWorld??c.range,firstHit=window.BattleNetworkCombatHitTest?.getFirstCannonHit?.({shape:attackShape});if(firstHit&&Number.isFinite(firstHit.distance))cannonRange=Math.min(cannonRange,firstHit.distance);spawn('cannon',cannonRange,c.projectileSpeed||900,attackDirection,null,`CHIP:${c.chipId}`)}else if(c.type==='sword'||c.type==='wide'){"
if old_cannon not in game:
    raise SystemExit('game cannon spawn target not found')
game = game.replace(old_cannon, new_cannon, 1)
game_path.write_text(game, encoding='utf-8')

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
if './js/game.js?v=78' not in index:
    raise SystemExit('index game version target not found')
if './js/combat/combat-hit-test.js?v=73' not in index:
    raise SystemExit('index hit-test version target not found')
index = index.replace('./js/game.js?v=78', './js/game.js?v=89', 1)
index = index.replace('./js/combat/combat-hit-test.js?v=73', './js/combat/combat-hit-test.js?v=89', 1)
index_path.write_text(index, encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8')
if "battlenetwork-runtime-v88" not in sw:
    raise SystemExit('sw cache version target not found')
sw = sw.replace('battlenetwork-runtime-v88', 'battlenetwork-runtime-v89', 1)
sw_path.write_text(sw, encoding='utf-8')

status_path = Path('DEVELOPMENT_STATUS.md')
status = status_path.read_text(encoding='utf-8')
old_v88 = "v88で最初の実被ダメージ確認用として、テスト敵へ単発の直線弾攻撃を追加した。テスト値は威力 `10`、発射前予兆 `0.7秒`、弾速 `720 world units/秒`、次攻撃まで `2.2秒`。予兆開始時のプレイヤー位置へ照準方向を固定し、静的な射線予兆後に弾を発射する。弾中心のworld座標をv87の `resolvePointHit()` へ渡し、プレイヤーHitBoxへ命中した場合のみHPを減算してHUDへ反映する。CUSTOM／設定／チップ詳細／配置編集表示中は攻撃を停止・取消する。これらの値は被ダメージ経路を実機確認するためのテスト値であり、本番敵の正式バランス値としては確定しない。無敵時間・ノックバック・被弾演出・敵AI本体は後続フェーズとする。v88は実機確認待ち。"
new_v88 = old_v88.replace('v88は実機確認待ち。', 'v88のテスト敵攻撃と被ダメージ経路は実機確認で問題なし。')
if old_v88 not in status:
    raise SystemExit('DEVELOPMENT_STATUS v88 target not found')
status = status.replace(old_v88, new_v88, 1)
v89 = "\nv89でキャノンのBehaviorを正式設計どおり非貫通へ修正した。従来は `CANNON_SHOT` がLINE Range内の全敵へ到達時間ごとにダメージを予約していたため、射線上に複数敵がいる場合に後方の敵までダメージが入っていた。`getFirstCannonHit()` で発射方向上の最前面HitBoxだけを取得し、ダメージ対象をその1体に限定する。同時に `game.js` のキャノン弾の飛翔距離も最初の敵までへ短縮し、最初の敵へ到達した時点で弾DOMを消す。キャノンのRange `LINE(5×0.75)`、威力、弾速、表示サイズ、床影は変更しない。v89は複数敵が射線上に並んだ場合の非貫通を実機確認待ち。\n"
insert_after = new_v88 + "\n"
if insert_after not in status:
    raise SystemExit('DEVELOPMENT_STATUS insertion point not found')
status = status.replace(insert_after, insert_after + v89, 1)
status_path.write_text(status, encoding='utf-8')

field_path = Path('FIELD_COMBAT_DESIGN.md')
field = field_path.read_text(encoding='utf-8')
needle = "Behavior: CANNON_SHOT\n→ 弾速、非貫通等はBehavior"
replacement = "Behavior: CANNON_SHOT\n→ 弾速、非貫通等はBehavior\n→ キャノンは最初に交差した敵HitBoxで停止し、その敵1体だけへダメージを与える。後方の敵へは貫通しない。"
if needle not in field:
    raise SystemExit('FIELD_COMBAT_DESIGN cannon behavior target not found')
field = field.replace(needle, replacement, 1)
field_path.write_text(field, encoding='utf-8')

# Remove the one-time files in the same automated commit.
Path('.github/workflows/apply-v89.yml').unlink(missing_ok=True)
Path('tools/apply_v89.py').unlink(missing_ok=True)
