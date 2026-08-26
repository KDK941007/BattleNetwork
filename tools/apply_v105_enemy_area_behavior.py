from pathlib import Path

root = Path('.')

area_behavior = r'''(()=>{
  const AI=window.BattleNetworkEnemyAI;
  const FIELD=window.BattleNetworkField;
  const RANGE=window.BattleNetworkRangeGeometry;
  const PLAYER=window.BattleNetworkPlayer;
  const PLAYER_DAMAGE=window.BattleNetworkPlayerDamage;
  const ATTACK_LAYER=window.BattleNetworkEnemyAttackLayer;
  if(!AI||!FIELD||!RANGE||!PLAYER||!PLAYER_DAMAGE||!ATTACK_LAYER){
    throw new Error('BattleNetworkEnemyTargetAreaBehavior: required dependency is missing.');
  }

  const BEHAVIOR_ID='PROTOTYPE_TARGET_AREA';
  const DEFAULT_CONFIG=Object.freeze({
    testOnly:true,
    damage:10,
    radiusTiles:1.1,
    telegraphMs:900,
    impactMs:140,
    cooldownMs:2600
  });

  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function createController({enemyId,config}){
    const cfg=Object.freeze({
      ...DEFAULT_CONFIG,
      ...config,
      damage:positive(config?.damage,DEFAULT_CONFIG.damage),
      radiusTiles:positive(config?.radiusTiles,DEFAULT_CONFIG.radiusTiles),
      telegraphMs:positive(config?.telegraphMs,DEFAULT_CONFIG.telegraphMs),
      impactMs:positive(config?.impactMs,DEFAULT_CONFIG.impactMs),
      cooldownMs:positive(config?.cooldownMs,DEFAULT_CONFIG.cooldownMs)
    });
    const markerEl=ATTACK_LAYER.createAreaMarker();
    let phase=null;
    let target=null;
    let shape=null;
    let fireAt=0;
    let finishAt=0;
    let nextAttackAt=performance.now();

    function scheduleNext(now=performance.now()){nextAttackAt=now+cfg.cooldownMs}
    function clearMarker(){ATTACK_LAYER.hideArea(markerEl)}
    function canStart(now){return phase===null&&now>=nextAttackAt}
    function start(now){
      if(!canStart(now))return false;
      const playerPos=PLAYER.getPosition();
      target={x:playerPos.x,y:playerPos.y};
      shape=RANGE.createCircle(target,cfg.radiusTiles);
      fireAt=now+cfg.telegraphMs;
      finishAt=0;
      phase='TELEGRAPH';
      ATTACK_LAYER.showAreaTelegraph(markerEl,target,shape.radiusWorld);
      return true;
    }
    function fire(now){
      if(phase!=='TELEGRAPH'||!shape)return;
      PLAYER_DAMAGE.resolveRangeHit({shape,damage:cfg.damage,sourceType:'ENEMY',sourceId:enemyId,attackId:BEHAVIOR_ID});
      ATTACK_LAYER.showAreaImpact(markerEl,target,shape.radiusWorld);
      phase='IMPACT';
      finishAt=now+cfg.impactMs;
    }
    function finish(now){
      clearMarker();
      phase=null;target=null;shape=null;fireAt=0;finishAt=0;
      scheduleNext(now);
    }
    function update(now){
      if(phase==='TELEGRAPH'&&now>=fireAt){fire(now);return}
      if(phase==='IMPACT'&&now>=finishAt)finish(now);
    }
    function cancel(now=performance.now()){
      const busy=phase!==null;
      clearMarker();
      phase=null;target=null;shape=null;fireAt=0;finishAt=0;
      if(busy)scheduleNext(now);
    }
    function destroy(){cancel();ATTACK_LAYER.destroy(markerEl)}
    function isBusy(){return phase!==null}
    function getSnapshot(){return Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,busy:isBusy(),phase,target:target?Object.freeze({...target}):null,nextAttackAt,config:cfg})}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot});
  }

  AI.registerBehavior(BEHAVIOR_ID,createController,{channel:'ATTACK'});
  window.BattleNetworkEnemyTargetAreaBehavior=Object.freeze({BEHAVIOR_ID,DEFAULT_CONFIG});
})();
'''
(root/'js/combat/enemy-behavior-target-area.js').write_text(area_behavior, encoding='utf-8')

layer_path=root/'js/combat/enemy-attack-layer.js'
layer=layer_path.read_text(encoding='utf-8')
insert_marker='  function destroy(el){el?.remove()}\n'
area_layer=r'''  function createAreaMarker(){
    const el=document.createElement('div');
    el.className='enemyTestAreaMarker';
    el.style.cssText='display:none;position:absolute;border-radius:50%;pointer-events:none;transform-origin:center;will-change:transform,opacity;contain:layout paint style;';
    layer.appendChild(el);
    return el;
  }
  function placeArea(el,center,radiusWorld){
    if(!el||!center||!Number.isFinite(radiusWorld))return false;
    const p=project(center.x,center.y);
    const radiusX=radiusWorld*Math.SQRT2*PX;
    const radiusY=radiusWorld*Math.SQRT2*PY;
    el.style.width=`${radiusX*2}px`;
    el.style.height=`${radiusY*2}px`;
    el.style.transform=`translate3d(${p.x-radiusX}px,${p.y-radiusY}px,0)`;
    return true;
  }
  function showAreaTelegraph(el,center,radiusWorld){
    if(!placeArea(el,center,radiusWorld))return;
    el.style.border='2px solid rgba(255,86,86,.95)';
    el.style.background='rgba(255,70,70,.20)';
    el.style.opacity='1';
    el.style.display='block';
  }
  function showAreaImpact(el,center,radiusWorld){
    if(!placeArea(el,center,radiusWorld))return;
    el.style.border='3px solid rgba(255,236,126,.98)';
    el.style.background='rgba(255,108,74,.62)';
    el.style.opacity='.96';
    el.style.display='block';
  }
  function hideArea(el){if(el)el.style.display='none'}

'''
if 'function createAreaMarker()' not in layer:
    if insert_marker not in layer: raise SystemExit('enemy attack layer insertion point not found')
    layer=layer.replace(insert_marker,area_layer+insert_marker,1)
old_export="window.BattleNetworkEnemyAttackLayer=Object.freeze({createTelegraph,showTelegraph,hideTelegraph,createProjectile,showProjectile,updateProjectile,hideProjectile,destroy,refreshSize});"
new_export="window.BattleNetworkEnemyAttackLayer=Object.freeze({createTelegraph,showTelegraph,hideTelegraph,createProjectile,showProjectile,updateProjectile,hideProjectile,createAreaMarker,showAreaTelegraph,showAreaImpact,hideArea,destroy,refreshSize});"
if old_export not in layer: raise SystemExit('enemy attack layer export not found')
layer=layer.replace(old_export,new_export,1)
layer_path.write_text(layer,encoding='utf-8')

wave_path=root/'js/combat/wave-system.js'
wave=wave_path.read_text(encoding='utf-8')
wave=wave.replace('// v104 test-only composition/timing/behavior assignment. These are not final enemy or Wave specifications.','// v105 test-only composition/timing/behavior assignment. These are not final enemy or Wave specifications.',1)
old_cfg="    attackBehaviorId:'PROTOTYPE_STRAIGHT_SHOT',\n"
new_cfg="    attackBehaviorIds:Object.freeze(['PROTOTYPE_STRAIGHT_SHOT','PROTOTYPE_TARGET_AREA']),\n"
if old_cfg not in wave: raise SystemExit('wave attack config not found')
wave=wave.replace(old_cfg,new_cfg,1)
old_assign="    const attack=AI.assignBehavior(enemyId,TEST_CONFIG.attackBehaviorId);\n    if(!attack.ok)throw new Error(`BattleNetworkWave: failed to assign ${TEST_CONFIG.attackBehaviorId} to enemy ${enemyId}: ${attack.reason}`);"
new_assign="    const attackBehaviorId=TEST_CONFIG.attackBehaviorIds[index%TEST_CONFIG.attackBehaviorIds.length];\n    const attack=AI.assignBehavior(enemyId,attackBehaviorId);\n    if(!attack.ok)throw new Error(`BattleNetworkWave: failed to assign ${attackBehaviorId} to enemy ${enemyId}: ${attack.reason}`);"
if old_assign not in wave: raise SystemExit('wave attack assignment not found')
wave=wave.replace(old_assign,new_assign,1)
wave_path.write_text(wave,encoding='utf-8')

index_path=root/'index.html'
index=index_path.read_text(encoding='utf-8')
index=index.replace('<script src="./js/combat/enemy-attack-layer.js?v=102"></script>','<script src="./js/combat/enemy-attack-layer.js?v=105"></script>',1)
old_scripts='<script src="./js/combat/enemy-behavior-straight-shot.js?v=104"></script>\n<script src="./js/combat/enemy-behavior-oscillate-movement.js?v=104"></script>\n<script src="./js/combat/wave-system.js?v=104"></script>'
new_scripts='<script src="./js/combat/enemy-behavior-straight-shot.js?v=104"></script>\n<script src="./js/combat/enemy-behavior-target-area.js?v=105"></script>\n<script src="./js/combat/enemy-behavior-oscillate-movement.js?v=104"></script>\n<script src="./js/combat/wave-system.js?v=105"></script>'
if old_scripts not in index: raise SystemExit('index behavior script block not found')
index=index.replace(old_scripts,new_scripts,1)
index_path.write_text(index,encoding='utf-8')

sw_path=root/'sw.js'
sw=sw_path.read_text(encoding='utf-8')
sw=sw.replace("const CACHE_NAME = 'battlenetwork-runtime-v104';","const CACHE_NAME = 'battlenetwork-runtime-v105';",1)
needle="  './js/combat/enemy-behavior-straight-shot.js',\n"
if "'./js/combat/enemy-behavior-target-area.js'" not in sw:
    if needle not in sw: raise SystemExit('sw target behavior insertion point not found')
    sw=sw.replace(needle,needle+"  './js/combat/enemy-behavior-target-area.js',\n",1)
sw_path.write_text(sw,encoding='utf-8')

status_path=root/'DEVELOPMENT_STATUS.md'
status=status_path.read_text(encoding='utf-8')
marker='## 次フェーズ: 敵AI 別Attack Behavior検証設計'
if marker not in status: raise SystemExit('development status marker not found')
prefix=status.split(marker,1)[0]
status_section='''## 次フェーズ: v105 別Attack Behavior 実機確認

v104の攻撃／移動Behavior共存は実機確認済み。同一敵に `ATTACK` と `MOVEMENT` を独立チャンネルとして同時割当し、複数敵も互いを待たずに移動・攻撃できる共通基盤は成立した。v104で使用した1マス往復・速度90 world units/sec・X方向往復は引き続き検証用で、本番敵の正式移動仕様ではない。

v105では、直線射撃以外のAttack Behaviorへ差し替え可能かを確認するため `PROTOTYPE_TARGET_AREA` を追加する。2体のテスト敵のうち1体目は従来の `PROTOTYPE_STRAIGHT_SHOT`、2体目は `PROTOTYPE_TARGET_AREA` とし、両者ともv104の検証Movementを継続する。これにより同じ `ATTACK` チャンネルでも敵ごとに異なるBehaviorを割当可能か確認する。

`PROTOTYPE_TARGET_AREA` は攻撃開始時のプレイヤーworld位置を固定し、そこへ円形予兆を表示した後に同じCIRCLE Rangeでダメージ判定を行う。検証値は半径1.1マス、予兆0.9秒、威力10、着弾表示0.14秒、クールタイム2.6秒とするが、すべて基盤成立確認用であり本番敵性能として確定しない。予兆中にプレイヤーが移動しても着弾地点は追尾しない検証仕様とする。

円形予兆／着弾表示はv102の `enemyAttackLayer` を拡張し、Behavior生成時にマーカーDOMを1個だけ生成して攻撃ごとに再利用する。巨大な `scene` への攻撃ごとのDOM追加・削除やfilter処理は行わない。ダメージ判定は既存 `BattleNetworkRangeGeometry.createCircle()` と `BattleNetworkPlayerDamage.resolveRangeHit()` を利用する。

実機確認では以下を優先する。

1. 1体目が直線射撃、2体目が円形範囲攻撃をそれぞれ独立して実行すること。
2. 円形予兆が攻撃開始時のプレイヤー位置へ出て、その後プレイヤーが動いても着弾地点が固定されていること。
3. 予兆内に残れば10ダメージ、外へ避ければダメージなしとなること。
4. 両敵ともMovementを継続し、攻撃開始・終了が移動を不必要に停止させないこと。
5. 複数の異なるAttack Behaviorが同時進行しても、v102/v103で改善した描画負荷が再発しないこと。
6. HP0の敵は新規攻撃・移動を開始せず、Wave完了・CUSTOM・次Wave再割当が従来どおり成立すること。
7. v105の円形攻撃・数値・見た目は正式敵仕様として採用確定しない。v105成立後に敵3種類の正式仕様を決める段階へ進む。
'''
status_path.write_text(prefix+status_section,encoding='utf-8')

game_path=root/'GAME_DESIGN.md'
game=game_path.read_text(encoding='utf-8')
insert='''### v105 別Attack Behavior差し替え検証

- v104で成立した `ATTACK` / `MOVEMENT` 独立チャンネル構造に対し、直線射撃とは異なる検証用Attack Behavior `PROTOTYPE_TARGET_AREA` を追加する。
- v105ではテスト敵1体を直線射撃、もう1体を円形範囲攻撃とし、敵ごとに異なるAttack Behaviorを同じ `ATTACK` チャンネルへ割当できることを確認する。両敵のMovementは独立して継続する。
- 円形範囲攻撃は攻撃開始時のプレイヤー位置を固定し、円形予兆後に同じCIRCLE Rangeでダメージ判定する。予兆中の追尾は行わない。
- 半径1.1マス、予兆0.9秒、威力10、着弾表示0.14秒、クールタイム2.6秒はすべて検証値であり、本番敵の攻撃性能・攻撃種別として確定しない。
- 予兆／着弾マーカーは `enemyAttackLayer` 上でDOMを再利用し、攻撃ごとの巨大sceneへのDOM生成を避ける。v102/v103以降の軽量描画方針を維持する。
- v105の成立確認後、共通AI基盤検証はいったん区切りとし、雑魚敵3種類の正式な見た目・移動・攻撃・HP・攻撃力・行動頻度・Wave構成を別途決定する。

'''
marker_game='---\n\n## 11. ウェーブ間強化'
if '### v105 別Attack Behavior差し替え検証' not in game:
    if marker_game not in game: raise SystemExit('GAME_DESIGN v105 insertion point not found')
    game=game.replace(marker_game,insert+marker_game,1)
game_path.write_text(game,encoding='utf-8')
