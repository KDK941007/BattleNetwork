from pathlib import Path


def replace(path, old, new, count=1):
    p = Path(path)
    text = p.read_text()
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f'{path}: expected {count} occurrence(s), found {actual}: {old[:100]!r}')
    p.write_text(text.replace(old, new, count))


# enemy HP display + test HP 200
replace(
    'js/combat/enemy-foundation.js',
    "  function spawn(config={}){",
    "  function renderHealth(enemy){\n    if(!enemy.hpEl)return;\n    if(!hasHealth(enemy)){enemy.hpEl.style.display='none';return}\n    enemy.hpEl.style.display='block';\n    enemy.hpEl.textContent=`HP ${Math.ceil(enemy.hp)} / ${Math.ceil(enemy.maxHp)}`;\n  }\n  function spawn(config={}){",
)
replace(
    'js/combat/enemy-foundation.js',
    "    el.style.cssText='position:absolute;border:3px solid #ff5b67;border-radius:18px;background:rgba(96,10,24,.88);box-shadow:0 0 0 3px rgba(255,255,255,.18) inset,0 0 20px rgba(255,70,90,.55);z-index:7;pointer-events:none;';\n    const health=normalizeHealth(config.health);\n    const enemy={id:nextId++,x,y,visual:normalizeVisual(config.visual),hitBox:normalizeHitBox(config.hitBox),maxHp:health.maxHp,hp:health.hp,el,flashToken:0};\n    scene.appendChild(el);enemies.push(enemy);render(enemy);",
    "    el.style.cssText='position:absolute;border:3px solid #ff5b67;border-radius:18px;background:rgba(96,10,24,.88);box-shadow:0 0 0 3px rgba(255,255,255,.18) inset,0 0 20px rgba(255,70,90,.55);z-index:7;pointer-events:none;';\n    const hpEl=document.createElement('div');\n    hpEl.className='enemyPrototypeHp';\n    hpEl.style.cssText='position:absolute;left:50%;top:-29px;transform:translateX(-50%);min-width:92px;padding:3px 8px;border:2px solid rgba(255,255,255,.78);border-radius:12px;background:rgba(16,8,18,.88);color:#fff7d0;font:900 13px/1.2 system-ui,sans-serif;text-align:center;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.45);';\n    el.appendChild(hpEl);\n    const health=normalizeHealth(config.health);\n    const enemy={id:nextId++,x,y,visual:normalizeVisual(config.visual),hitBox:normalizeHitBox(config.hitBox),maxHp:health.maxHp,hp:health.hp,el,hpEl,flashToken:0};\n    scene.appendChild(el);enemies.push(enemy);renderHealth(enemy);render(enemy);",
)
replace(
    'js/combat/enemy-foundation.js',
    "    enemy.maxHp=normalized.maxHp;enemy.hp=normalized.hp;\n    return Object.freeze({applied:true,reason:null,enemy:getSnapshot(enemy)});",
    "    enemy.maxHp=normalized.maxHp;enemy.hp=normalized.hp;renderHealth(enemy);\n    return Object.freeze({applied:true,reason:null,enemy:getSnapshot(enemy)});",
)
replace(
    'js/combat/enemy-foundation.js',
    "    enemy.hp=Math.max(0,before-damage);\n    const applied=before-enemy.hp;",
    "    enemy.hp=Math.max(0,before-damage);renderHealth(enemy);\n    const applied=before-enemy.hp;",
)
replace(
    'js/combat/enemy-foundation.js',
    "  if(testCenter)spawn({x:testCenter.x,y:testCenter.y});",
    "  if(testCenter)spawn({x:testCenter.x,y:testCenter.y,health:{maxHp:200}});",
)


# combat hit timing -> real chip damage
Path('js/combat/combat-hit-test.js').write_text(r'''(()=>{
  const RANGE=window.BattleNetworkRangeGeometry;
  const ENEMY=window.BattleNetworkEnemy;
  const DATA=window.BattleNetworkData;
  if(!RANGE)throw new Error('BattleNetworkCombatHitTest: range geometry is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkCombatHitTest: enemy foundation is not loaded.');
  if(!DATA)throw new Error('BattleNetworkCombatHitTest: master data is not loaded.');

  let lastObservedAttack=null;

  function behaviorParam(behaviorId,paramId,fallback){
    const row=DATA.BEHAVIOR_PARAM_MASTER?.find(item=>item.behaviorId===behaviorId&&item.paramId===paramId);
    const value=Number(row?.defaultValue);
    return Number.isFinite(value)?value:fallback;
  }

  function testRange(shape){return ENEMY.getHitEnemies(shape)}

  function damageAndFlash(enemy,damage){
    const value=Number(damage);
    if(Number.isFinite(value)&&value>0)ENEMY.applyDamage(enemy.id,value);
    ENEMY.debugFlash(enemy.id);
  }

  function flashHits(shape,damage=null){
    const hits=testRange(shape);
    hits.forEach(enemy=>damageAndFlash(enemy,damage));
    return hits;
  }

  function rayEntryDistance(origin,direction,bounds,padding=0){
    const left=bounds.left-padding,right=bounds.right+padding,top=bounds.top-padding,bottom=bounds.bottom+padding;
    let near=0,far=Infinity;
    for(const [o,d,min,max] of [[origin.x,direction.x,left,right],[origin.y,direction.y,top,bottom]]){
      if(Math.abs(d)<1e-9){if(o<min||o>max)return null;continue}
      let a=(min-o)/d,b=(max-o)/d;
      if(a>b)[a,b]=[b,a];
      near=Math.max(near,a);far=Math.min(far,b);
      if(near>far)return null;
    }
    return far>=0?Math.max(0,near):null;
  }

  function scheduleCannon(attack){
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

  function scheduleBomb(attack){
    const delay=behaviorParam('BOMB_THROW','EXPLOSION_DELAY',.28);
    setTimeout(()=>flashHits(attack.shape,attack.damage),Math.max(0,delay)*1000);
  }

  function resolveBehavior(input){
    if(!input)return;
    const attack=input.shape?input:{shape:input,damage:null};
    const shape=attack.shape;
    if(!shape)return;
    if(shape.rangeTypeId==='LINE'){scheduleCannon(attack);return}
    if(shape.rangeTypeId==='RECT'){flashHits(shape,attack.damage);return}
    if(shape.rangeTypeId==='CIRCLE')scheduleBomb(attack);
  }

  function observeAttackRange(){
    const combatRange=window.BattleNetworkCombatRange;
    const attack=combatRange?.getLastAttackContext?.()||null;
    if(attack&&attack!==lastObservedAttack){
      lastObservedAttack=attack;
      resolveBehavior(attack);
    }
    requestAnimationFrame(observeAttackRange);
  }

  window.BattleNetworkCombatHitTest=Object.freeze({testRange,flashHits,resolveBehavior});
  requestAnimationFrame(observeAttackRange);
})();
''')


# game: B attack profile + chip/B damage metadata
replace(
    'js/game.js',
    "const FIELD=window.BattleNetworkField,RANGE=window.BattleNetworkRangeGeometry,RANGE_PREVIEW=window.BattleNetworkRangePreview,BOMB_PREVIEW=window.BattleNetworkBombPreview;\nif(!FIELD)throw new Error('BattleNetwork: logical field grid is not loaded.');\nif(!RANGE||!RANGE_PREVIEW||!BOMB_PREVIEW)throw new Error('BattleNetwork: combat range system is not loaded.');",
    "const FIELD=window.BattleNetworkField,RANGE=window.BattleNetworkRangeGeometry,RANGE_PREVIEW=window.BattleNetworkRangePreview,BOMB_PREVIEW=window.BattleNetworkBombPreview,B_ATTACK=window.BattleNetworkBAttack;\nif(!FIELD)throw new Error('BattleNetwork: logical field grid is not loaded.');\nif(!RANGE||!RANGE_PREVIEW||!BOMB_PREVIEW)throw new Error('BattleNetwork: combat range system is not loaded.');\nif(!B_ATTACK)throw new Error('BattleNetwork: B attack system is not loaded.');",
)
replace(
    'js/game.js',
    "const WORLD=FIELD.WORLD_SIZE,PX=.72,PY=.36,SW=WORLD*PX*2,SH=WORLD*PY*2,SPEED=260,DEAD=.12,FOLLOW=.14,CAMERA_ZOOM=.62,DASH_DIST=180,DASH_TIME=.13,DASH_CD=.65,BUSTER_RANGE=750,BUSTER_SPEED=1050,CHARGE=.85,FIRE=.67,CUSTOM_TIME=10,LONG_PRESS_MS=520;",
    "const WORLD=FIELD.WORLD_SIZE,PX=.72,PY=.36,SW=WORLD*PX*2,SH=WORLD*PY*2,SPEED=260,DEAD=.12,FOLLOW=.14,CAMERA_ZOOM=.62,DASH_DIST=180,DASH_TIME=.13,DASH_CD=.65,CUSTOM_TIME=10,LONG_PRESS_MS=520;",
)
replace('js/game.js', "lastAttackRange:null,last:performance.now()", "lastAttackRange:null,lastAttackContext:null,last:performance.now()")
replace('js/game.js', "bHeld:false,bAt:0,charged:false,lastShot", "bHeld:false,bAt:0,charged:false,bTapAction:null,bHoldAction:null,bChargeTime:0,lastShot")
replace(
    'js/game.js',
    "function spawn(kind,range=BUSTER_RANGE,speed=BUSTER_SPEED,direction={x:s.dx,y:s.dy}){let d={x:direction.x,y:direction.y},l=Math.hypot(d.x,d.y)||1;d.x/=l;d.y/=l;let b={x:s.x,y:s.y,dx:d.x,dy:d.y,dist:0,range,speed,kind,hitEnemyIds:new Set(),el:document.createElement('div')};b.el.className='bullet '+kind;scene.appendChild(b.el);bullets.push(b)}\nfunction hitBusterEnemy(b){let enemyApi=window.BattleNetworkEnemy;if(!enemyApi)return false;for(const enemy of enemyApi.getEnemies()){if(b.hitEnemyIds.has(enemy.id))continue;if(!enemyApi.containsPoint(enemy.id,b.x,b.y))continue;b.hitEnemyIds.add(enemy.id);enemyApi.debugFlash(enemy.id);return true}return false}",
    "function spawn(kind,range,speed,direction={x:s.dx,y:s.dy},damage=null,attackId=null){range=Number(range);speed=Number(speed);if(!(range>0)||!(speed>0))return;let d={x:direction.x,y:direction.y},l=Math.hypot(d.x,d.y)||1;d.x/=l;d.y/=l;let numericDamage=Number(damage),b={x:s.x,y:s.y,dx:d.x,dy:d.y,dist:0,range,speed,kind,damage:Number.isFinite(numericDamage)?numericDamage:null,attackId,hitEnemyIds:new Set(),el:document.createElement('div')};b.el.className='bullet '+kind;scene.appendChild(b.el);bullets.push(b)}\nfunction hitBusterEnemy(b){let enemyApi=window.BattleNetworkEnemy;if(!enemyApi)return false;for(const enemy of enemyApi.getEnemies()){if(b.hitEnemyIds.has(enemy.id))continue;if(!enemyApi.containsPoint(enemy.id,b.x,b.y))continue;b.hitEnemyIds.add(enemy.id);if(Number.isFinite(b.damage)&&b.damage>0)enemyApi.applyDamage(enemy.id,b.damage);enemyApi.debugFlash(enemy.id);return true}return false}",
)
replace(
    'js/game.js',
    "s.lastAttackRange=attackShape;let p=proj(s.x,s.y)",
    "s.lastAttackRange=attackShape;s.lastAttackContext=Object.freeze({shape:attackShape,sourceType:'CHIP',sourceId:c.chipId,damage:Number.isFinite(Number(c.power))?Number(c.power):null});let p=proj(s.x,s.y)",
)
replace(
    'js/game.js',
    "if(c.type==='cannon')spawn('cannon',attackShape?.lengthWorld??c.range,c.projectileSpeed||900,attackDirection);",
    "if(c.type==='cannon')spawn('cannon',attackShape?.lengthWorld??c.range,c.projectileSpeed||900,attackDirection,null,`CHIP:${c.chipId}`);",
)
replace(
    'js/game.js',
    "function clearCharge(){s.bHeld=false;s.charged=false;B.classList.remove('pressed');arrow.classList.remove('charging','ready')}\nfunction bDown(e){if(editMode||s.paused||s.dash>0||s.lock>0)return;e.preventDefault();s.bHeld=true;s.bAt=performance.now();s.charged=false;B.classList.add('pressed');arrow.classList.add('charging')}\nfunction bUp(){if(editMode||!s.bHeld)return;if(s.dash>0){clearCharge();return}let charged=(performance.now()-s.bAt)/1000>=CHARGE;clearCharge();let now=performance.now()/1000;if(!charged&&now-s.lastShot<FIRE)return;if(!charged)s.lastShot=now;spawn(charged?'charged':'normal',BUSTER_RANGE,charged?820:BUSTER_SPEED)}",
    "function clearCharge(){s.bHeld=false;s.charged=false;s.bTapAction=null;s.bHoldAction=null;s.bChargeTime=0;B.classList.remove('pressed');arrow.classList.remove('charging','ready')}\nfunction bDown(e){if(editMode||s.paused||s.dash>0||s.lock>0)return;let tap=B_ATTACK.getAction('tap'),hold=B_ATTACK.getAction('hold');if(!tap&&!hold)return;e.preventDefault();s.bHeld=true;s.bAt=performance.now();s.charged=false;s.bTapAction=tap;s.bHoldAction=hold;s.bChargeTime=Number(hold?.chargeTime)||0;B.classList.add('pressed');if(hold&&s.bChargeTime>0)arrow.classList.add('charging')}\nfunction executeBAttack(action){if(!action)return false;if(action.actionType==='PROJECTILE'){spawn(action.projectileKind||'normal',action.rangeWorld,action.speed,{x:s.dx,y:s.dy},action.damage,action.actionId);return true}console.warn('BattleNetwork: unsupported B attack actionType',action.actionType);return false}\nfunction bUp(){if(editMode||!s.bHeld)return;if(s.dash>0){clearCharge();return}let tap=s.bTapAction,hold=s.bHoldAction,chargeTime=s.bChargeTime,charged=!!hold&&chargeTime>0&&(performance.now()-s.bAt)/1000>=chargeTime,action=charged?hold:tap;clearCharge();if(!action)return;let now=performance.now()/1000,fireInterval=Number(tap?.fireInterval)||0;if(!charged&&fireInterval>0&&now-s.lastShot<fireInterval)return;if(!charged)s.lastShot=now;executeBAttack(action)}",
)
replace(
    'js/game.js',
    "if(s.bHeld&&!s.charged&&(t-s.bAt)/1000>=CHARGE){",
    "if(s.bHeld&&!s.charged&&s.bHoldAction&&s.bChargeTime>0&&(t-s.bAt)/1000>=s.bChargeTime){",
)
replace(
    'js/game.js',
    "if((b.kind==='normal'||b.kind==='charged')&&hitBusterEnemy(b)){",
    "if(Number.isFinite(b.damage)&&b.damage>0&&hitBusterEnemy(b)){",
)
replace(
    'js/game.js',
    "window.BattleNetworkCombatRange=Object.freeze({getLastAttackRange:()=>s.lastAttackRange,containsPoint:(x,y)=>RANGE.containsPoint(s.lastAttackRange,x,y),getTilesByCenter:()=>RANGE.getTilesByCenter(s.lastAttackRange),getBombRangeConfig:()=>({radiusTiles:CHIP.BOMB.radiusTiles,throwDistanceTiles:CHIP.BOMB.throwDistanceTiles})});",
    "window.BattleNetworkCombatRange=Object.freeze({getLastAttackRange:()=>s.lastAttackRange,getLastAttackContext:()=>s.lastAttackContext,containsPoint:(x,y)=>RANGE.containsPoint(s.lastAttackRange,x,y),getTilesByCenter:()=>RANGE.getTilesByCenter(s.lastAttackRange),getBombRangeConfig:()=>({radiusTiles:CHIP.BOMB.radiusTiles,throwDistanceTiles:CHIP.BOMB.throwDistanceTiles})});",
)


# HTML loading versions/order
replace('index.html', '<script src="./js/combat/enemy-foundation.js?v=72"></script>', '<script src="./js/combat/enemy-foundation.js?v=73"></script>')
replace(
    'index.html',
    '<script src="./js/combat/projectile-shadow-renderer.js?v=60"></script>\n<script src="./js/game.js?v=65"></script>',
    '<script src="./js/combat/projectile-shadow-renderer.js?v=60"></script>\n<script src="./js/combat/b-attack-system.js?v=73"></script>\n<script src="./js/game.js?v=73"></script>',
)
replace('index.html', '<script src="./js/combat/combat-hit-test.js?v=2"></script>', '<script src="./js/combat/combat-hit-test.js?v=73"></script>')


# SW v73 + new module
replace('sw.js', "const CACHE_NAME = 'battlenetwork-runtime-v72';", "const CACHE_NAME = 'battlenetwork-runtime-v73';")
replace(
    'sw.js',
    "  './js/combat/projectile-shadow-renderer.js',\n  './js/combat/combat-hit-test.js',",
    "  './js/combat/projectile-shadow-renderer.js',\n  './js/combat/b-attack-system.js',\n  './js/combat/combat-hit-test.js',",
)


# Game design
replace(
    'GAME_DESIGN.md',
    '- B: ロックバスター。通常射撃と長押しチャージショット',
    '- B: B攻撃。デフォルトはロックバスター。タップ攻撃と長押し攻撃は状態・構成に応じて差し替え可能',
)
replace(
    'GAME_DESIGN.md',
    "## 5. バスター\n\nバスターは常時使用可能な基本攻撃とする。\n\n### 基本案\n\n- ボタン入力で射撃\n- 一定間隔で連射可能\n- 長押しによるチャージショットを実装候補とする\n- 威力、連射速度、チャージ速度などを強化可能にする\n\nバスターのみでも最低限戦えるが、強敵やボスを効率よく倒すにはバトルチップの活用が重要となるバランスを目指す。",
    "## 5. B攻撃\n\nBボタンは常時使用可能な基本攻撃枠とし、BタップとB長押しにそれぞれ攻撃方法を設定できる構成とする。\n\n### デフォルト: ロックバスター\n\n- Bタップ: 通常バスター。基礎攻撃力は `1`。一定間隔で連射可能。\n- B長押し: チャージショット。攻撃力は通常バスターの `10倍` とし、デフォルトでは `10`。\n- チャージ威力は固定10ではなく通常バスター威力に倍率10を掛けるルールとする。\n- 威力、連射速度、チャージ速度などは将来の強化対象とする。\n\n### B攻撃の差し替え\n\nB攻撃はロックバスター専用処理に固定しない。ソウルユニゾンではソウルごとにBタップ／B長押しの攻撃を設定できるようにし、将来的なスタイルチェンジや改造要素でもB攻撃構成を変更可能とする。\n\n各システムが競合した場合の優先順位は現時点では未確定とし、推測で固定しない。現在有効なB攻撃プロファイルを切り替える共通基盤を用意し、各システムは後からその基盤へ接続する。\n\nデフォルトのロックバスターのみでも最低限戦えるが、強敵やボスを効率よく倒すにはバトルチップやB攻撃差し替え要素の活用が重要となるバランスを目指す。",
)


# Development status
replace(
    'DEVELOPMENT_STATUS.md',
    "v72で敵HPの最小基盤を `js/combat/enemy-foundation.js` に追加した。敵ごとに `maxHp / hp / isDefeated` を保持でき、`configureHealth()` で既存敵へHPを設定、`applyDamage()` でダメージ減算と0到達判定を行える。テスト敵の最大HPは未決定のため推測値を設定せず、未設定時はHP判定を行わない。撃破削除・HP表示・ダメージ接続は後続フェーズとする。v72はリポジトリ確認済み、実機確認対象の見た目変更はなし。",
    "v72で敵HPの最小基盤を `js/combat/enemy-foundation.js` に追加した。敵ごとに `maxHp / hp / isDefeated` を保持でき、`configureHealth()` で既存敵へHPを設定、`applyDamage()` でダメージ減算と0到達判定を行える。テスト敵の最大HPは未決定のため推測値を設定せず、未設定時はHP判定を行わない。撃破削除・HP表示・ダメージ接続は後続フェーズとする。v72はリポジトリ確認済み、実機確認対象の見た目変更はなし。\nv73でテスト敵の最大HPを `200` に確定し、敵頭上へ `HP 現在値 / 最大値` の簡易表示を追加した。既存チップマスタの固定威力（キャノン40 / ソード80 / ワイドソード80 / ミニボム50）をv54で確定済みの命中タイミングへ接続し、敵HPを実際に減算する。B攻撃は `js/combat/b-attack-system.js` へ分離し、デフォルトプロファイルをロックバスター、Bタップ威力 `1`、B長押しチャージを通常威力の `10倍`（現行10）として定義した。Bタップ／長押しは別Actionとして保持し、`setActiveProfile()` で将来ソウルユニゾン・スタイルチェンジ・改造等から差し替え可能とした。競合時の優先順位は未確定のため実装していない。撃破削除はまだ行わず、HP0到達判定までとする。v73は実機確認待ち。",
)
replace(
    'DEVELOPMENT_STATUS.md',
    '- B: ロックバスター。通常射撃とチャージショットを実装済み。',
    '- B: 差し替え可能なB攻撃スロット。デフォルトはロックバスター（通常1 / チャージ=通常×10）。',
)
replace(
    'DEVELOPMENT_STATUS.md',
    '### 敵HitBox基盤',
    "### B攻撃基盤\n\n- `js/combat/b-attack-system.js` を追加。\n- BタップとB長押しを独立したActionとして持つB攻撃プロファイル方式。\n- デフォルトプロファイルはロックバスター。通常威力1、チャージ威力は通常×10。\n- `setActiveProfile()` / `resetToDefault()` を公開し、将来のソウルユニゾン・スタイルチェンジ・改造から現在のB攻撃を差し替え可能。\n- 差し替え要素同士の優先順位は未確定で、現時点では決めない。\n\n### 敵HitBox基盤",
)
replace(
    'DEVELOPMENT_STATUS.md',
    "- v62のテスト敵既定表示は116×140px、既定HitBoxは `1.32マス × 1.32マス`。表示サイズは実機確認済み。\n- 本番キャラの具体的な表示サイズ・HitBox値は未確定で、個別設定可能な構造を維持する。",
    "- v62のテスト敵既定表示は116×140px、既定HitBoxは `1.32マス × 1.32マス`。表示サイズは実機確認済み。\n- v73のテスト敵最大HPは200。頭上に現在HP / 最大HPを表示し、`applyDamage()` により実ダメージを反映する。\n- 本番キャラの具体的な表示サイズ・HitBox値は未確定で、個別設定可能な構造を維持する。",
)
replace(
    'DEVELOPMENT_STATUS.md',
    '- 敵HPの具体値・表示UI・ダメージ接続。\n- ダメージ計算。',
    '- 属性相性・倍率・防御等を含む本格ダメージ計算。',
)
replace(
    'DEVELOPMENT_STATUS.md',
    "## 次フェーズ: 詳細Range図確認 → 敵HP・ダメージ基盤\n\nv62のプレイヤー／敵表示サイズは実機確認済み。\nv66のカメラ倍率下限0.20とワイドソード画像修正は実機確認済み。\nv68で非投擲系の範囲図をマス境界へ一致させ、実機確認済み。\nv70でチップ名ベース画像解決の実機確認も完了した。\nv71でPを中央優先・見切れ時のみ自動補正する表示へ更新し、実機確認済み。次は敵HP・ダメージ処理の最小基盤へ進む。\n\n優先対象は以下。\n\n1. 配置編集バーとY方向固定のv65確認が未完なら合わせて確認する。\n2. 敵HPの最小基盤を追加する。\n3. バトルチップ / ロックバスターのダメージ処理を接続する。\n4. プレイヤーHPへ進む。\n5. その後、敵AI・被弾・撃破・Wave進行へ拡張する。",
    "## 次フェーズ: 実ダメージ確認 → プレイヤーHP\n\nv71までのチップ詳細Range図は実機確認済み。v72で敵HP基盤、v73でテスト敵HP200・HP表示・チップ/B攻撃の実ダメージ接続と差し替え可能なB攻撃基盤を追加した。まずv73のダメージ値とHP表示を実機確認し、問題なければプレイヤーHPへ進む。\n\n優先対象は以下。\n\n1. キャノン40 / ソード80 / ワイドソード80 / ミニボム50でHP200から正しく減算されることを確認する。\n2. デフォルトロックバスターのBタップが1、チャージが10ダメージになることを確認する。\n3. 敵頭上のHP表示が現在HP / 最大HPとして更新されることを確認する。\n4. 配置編集バーとY方向固定のv65確認が未完なら合わせて確認する。\n5. プレイヤーHPへ進む。\n6. その後、敵AI・被弾・撃破・Wave進行へ拡張する。",
)
