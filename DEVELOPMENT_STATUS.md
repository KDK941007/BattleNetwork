# BattleNetwork 開発状況

最終更新: 2026-08-25

このドキュメントは、現在の実装状況と直近の開発方針を管理する。
ゲーム全体の構想は `GAME_DESIGN.md`、詳細な実装・設計メモは `DESIGN_NOTES.md`、チップマスタとセーブデータの正式設計は `MASTER_DATA_DESIGN.md` を参照する。
フィールドの論理マス・地形・自由移動と攻撃範囲の正式設計は `FIELD_COMBAT_DESIGN.md` を参照する。

## 現在のフェーズ

基礎操作とCUSTOM画面のプロトタイプが成立し、初期5種類のバトルチップについてCUSTOM画面で正式イラストを表示できる状態まで完了した。

2026-08-24に、チップ増加・フォルダ編集・レギュラーチップ・ガチャ/報酬・セーブデータを見据え、チップ固定情報のJSマスタ化とIndexedDB v1の基盤を追加した。
同日にチップ詳細上半分もマスタ参照へ接続し、基本情報・複数主要値・複数属性/系統を固定枠内で表示できる構成へ更新した。

2026-08-24に、フィールドを単なる装飾模様ではなく20×20の論理マスとして定義し、360度自由移動・自由方向攻撃を維持したまま、射程や幅をマス数で設計する方針を確定した。
2026-08-25に、Rangeを純粋な形状、Behaviorを効果の届け方として分離し、`LINE / RECT / CIRCLE / SECTOR / RING / SELF` の基本Range Typeと各Parameterを確定した。

同日、`js/field/field-grid.js` を追加し、20×20論理グリッドの内部基盤を実装した。
さらに `js/field/field-grid-renderer.js` と `css/field-grid.css` を追加し、従来の装飾用繰り返し模様を廃止して、20×20の論理マス境界から生成する床グリッド表示へ切り替えた。
床表示は実機確認で良好と判断し、現行サイズ `TILE_SIZE=180` を継続する。将来の調整余地は残す。

同日、プレイヤーの足元ワールド座標 `s.x / s.y` を論理グリッドへ接続し、移動中の所属マス `row / col` と現在地形をゲームループ内で追跡する処理を実装した。

さらに、キャノン・ソード・ワイドソードのRangeマスタをマス単位へ移行し、`js/combat/range-geometry.js` で360度自由方向のRange形状をworld座標上に生成する共通基盤を追加した。
`js/combat/range-preview-renderer.js` と `css/range-preview.css` により、同じRange形状を現在の斜め投影へ変換してプレビュー表示する方式へ切り替えた。
初回プレビューは描画中の操作負荷が大きかったが、v43でSceneサイズ・投影係数のキャッシュ等を実施し、実機で改善済み。

ミニボムはv44で `0.5 / 0.75 / 1.0マス` の3候補を比較し、360度自由移動環境での当てやすさを考慮して `radius_tiles=0.75` を正式採用した。
v46で比較用Y操作と表示を削除し、投擲距離を原作イメージに合わせて `3マス` に変更した。投擲予告線は直線から放物線へ変更した。
同時にCIRCLEプレビューを多頂点ポリゴンではなく投影後のSVG楕円で描画し、カスタムゲージ更新時の二重Range描画も解消した。実機確認では半径0.75マス、3マス投擲、放物線の見た目は問題なし。ただしミニボムおよびキャノンのRange表示中は、移動・旋回時の負荷が改善しきらず、ちょくちょく重くなる状態を確認した。
v47で `joyMove()` 内の `renderPreview()` を削除し、スティック操作イベントとゲームループの双方からRange描画していた重複を解消した。Range描画はゲームループ側の1回/フレームへ統一した。
実機再確認ではミニボムは若干改善したが断続的な重さが残り、キャノンは依然として重さが目立つことを確認した。またCUSTOMゲージMAX後、初回タップではCUSTOM画面が開かず2回目以降で開くように見える事象を確認した。
v48で毎フレーム実行していた `battle.getBoundingClientRect()` を廃止し、battleサイズは初期化時とresize時だけ取得するよう変更した。スティックもpointermoveごとの `joy.getBoundingClientRect()` を廃止し、pointerdown時に取得した矩形をドラッグ中に再利用する。所属マスの `data-*` 属性更新もrow/col/terrainが変化した時だけ実施する。CUSTOMゲージは共通ハンドラを `pointerdown` と `click` の双方へ接続し、二重発火を防ぎつつ初回タップの取りこぼしを補完した。
v48実機確認でもRange表示中の移動・旋回負荷は改善せず、CUSTOMゲージも1回目で開く場合はあるものの2回目以降で開くことの方が多い状態を確認した。
v49ではRangeプレビューのSVG座標更新を最大約30fpsへ制限し、ゲーム本体の60fps相当ループやA押下時の正式Range Geometryとは分離した。キャノンのpolygonとミニボムのellipse／放物線pathのDOM更新頻度を抑えた。CUSTOMゲージは `div role=button` からネイティブの `button` 要素へ変更した。
v49実機確認でもRange表示中の移動・旋回負荷とCUSTOMゲージの初回タップ問題は改善しなかった。さらにCUSTOMゲージ内部を `span` へ変更した影響で、ゲージが溜まる幅アニメーションが表示されない退行を確認した。
v50では30fps制限を撤回し、LINE / RECTはローカル座標のpolygonを固定したままSVG `matrix()` transformで位置・向きを更新する方式へ変更した。CIRCLEは半径形状を固定し、中心位置のみtranslateで更新する。ミニボム放物線もローカルpathとtranslateを分離し、移動時のpath再生成を抑える。CUSTOMゲージはFillをblock表示へ戻して幅アニメーションを復旧し、見た目を変えずに疑似要素でタップ領域だけを上下左右へ拡張した。
v50実機確認では、CUSTOMゲージMAX後の初回タップと蓄積アニメーションは改善済み。Range表示中の移動・旋回も多少改善したが、まだところどころで重くなる状態が残る。
v51ではRange SVGを床・プレイヤー・弾と同じ巨大 `scene` から分離し、`battle` 直下の専用 `combatPreviewLayer` へ移した。専用レイヤーは `scene.style.transform` のみ同期し、Range描画とゲーム本体DOMツリーの再描画を分離する。Range Geometry、攻撃判定値、見た目のRange値は変更しない。
v51実機確認では、稀に重くなることは残るものの大幅に改善され、現時点では実用上許容としてこの負荷対応を完了扱いとする。将来、戦闘要素追加後に再び負荷が顕在化した場合は再調査する。

2026-08-25に敵HitBox基盤へ着手し、`js/combat/enemy-foundation.js` に簡易テスト敵、world座標、矩形HitBox、HitBox境界取得・点判定の最小基盤を追加した。
敵は表示とHitBoxを分離し、`visual.width / visual.height / visual.offsetX / visual.offsetY` と `hitBox.width / hitBox.height / hitBox.offsetX / hitBox.offsetY` を独立して持つ。具体値は本番キャラ素材に合わせて個別調整し、表示サイズからHitBoxを自動決定しない。プレイヤー側も将来同じ分離方針へ揃える。

v53で `BattleNetworkRangeGeometry.intersectsBounds()` を追加し、LINE / RECTは斜め向きRange矩形と敵の軸平行矩形HitBoxをSATで交差判定、CIRCLEは円と矩形の最短距離で交差判定できるようにした。
`BattleNetworkEnemy.getHitEnemies(shape)` を追加し、正式Range Geometryと敵HitBoxの幾何交差を共通取得できるようにした。キャノン / ソード / ワイドソード / ミニボムで実機確認し、想定どおり命中可視化されることを確認済み。
v54でBehaviorと命中タイミングを接続し、キャノンは弾の到達時、ソード / ワイドソードは発動時、ミニボムは爆発遅延後に敵HitBoxへ命中可視化する構成へ変更。実機確認済み。
v55で通常ロックバスター / チャージショットも飛翔中のworld座標と敵HitBoxを接続し、命中時に発光・弾消滅する構成へ変更。実機確認済み。
v56でキャノン / 通常バスター / チャージショットへ床面上の正式world座標を示す影を追加した。
v57で視認性確認用として通常バスターを30×15px、チャージショットを52×26px、キャノンを44×22pxへ拡大し、影も拡大。実機で良好と確認済み。
v58でキャノンをさらに88×44pxへ倍化し、影を76×26pxへ拡大。同時に見た目と正式判定を揃えるため、キャノンRangeを `LINE(5×0.5)`、幅90 world unitsへ変更した。射程5マス、弾速、攻撃力は変更していない。v58は実機確認待ち。

新規チップ追加は一旦止め、既存5種類を使用してバトル側の基礎システムを作り込む方針は継続する。

## 実装済み

### フィールド・操作

- 横画面前提。
- 斜め上視点を考慮した正方形フィールド。
- 左スティックによる360度自由移動。
- カメラ追従。
- A: バトルチップ使用。
- B: ロックバスター。通常射撃とチャージショットを実装済み。
- X: 緊急回避ダッシュを実装済み。
- Y: 将来機能用として未使用。
- `js/field/field-grid.js` に論理フィールド基盤を分離して追加。
- 論理フィールドは `WORLD_SIZE=3600 / TILE_SIZE=180 / 20×20 / 400マス`。
- 各マスは `row / col / baseTerrain / currentTerrain / walkable` を持ち、初期状態は `NORMAL / walkable=true`。
- `worldToTile / getTile / getTileAtWorld / tileToWorldBounds / tileToWorldCenter / toWorldDistance / forEachTile` の共通APIを追加。
- 地形種別として `NORMAL / POISON / MAGMA / HOLE / ICE / GRASS` を定義済み。個別効果は未実装。
- `js/field/field-grid-renderer.js` が論理グリッド境界を現在の斜め投影へ変換し、20×20の見えるマスをSVGラインで描画する。
- `css/field-grid.css` で従来の繰り返しグリッド模様を無効化し、論理グリッド由来のラインだけを床上へ表示する。
- 見た目の1マスと内部の1マスを1対1で一致させる構成を実装済み。現行180 world unitsのマスサイズは実機確認で良好。
- `game.js` は `BattleNetworkField.WORLD_SIZE` を参照し、フィールドサイズの二重定義を避ける構成へ変更。
- プレイヤーの足元座標 `s.x / s.y` を `getTileAtWorld()` へ渡し、毎フレーム所属マスを更新する。
- ゲーム状態に `tileRow / tileCol / currentTile / currentTerrain` を保持し、将来の床効果判定から利用できる基盤を追加。
- プレイヤーDOMの `data-tile-row / data-tile-col / data-terrain` は所属マスまたは地形が変化した時だけ更新する。画面表示には影響しない。
- v48でbattleの表示サイズを初期化時・resize時にキャッシュし、カメラ計算時の毎フレームレイアウト計測を廃止。
- v48でスティック矩形をpointerdown時にキャッシュし、pointermove中のレイアウト計測を廃止。

### 敵HitBox基盤

- `js/combat/enemy-foundation.js` を追加。
- テスト用簡易敵を1体配置。
- 敵位置はworld座標で保持。
- 表示サイズ・表示位置補正とHitBoxサイズ・HitBox位置補正を独立定義可能。
- `getEnemy / getEnemies` からworld座標上のHitBox境界を取得可能。
- `containsPoint` でworld座標上の点が敵HitBox内か判定可能。
- `intersectsRange / getHitEnemies` でRange Geometryと矩形HitBoxの交差判定が可能。
- 本番キャラの具体的な表示サイズ・HitBox値は未確定。
- プレイヤー側も将来、表示とHitBoxを同様に分離する。

### 攻撃Range共通基盤

- `js/combat/range-geometry.js` を追加。
- `LINE / RECT` は、発動位置・360度自由方向・長さ・幅からworld座標上の四角形を生成する。
- `CIRCLE` は指定中心と半径を保持し、点判定・地形判定では連続座標の円として扱う。
- CIRCLEはプレビュー用の多頂点生成を必須とせず、必要な場合だけ任意のsegmentsでポリゴン点を生成できる。
- `containsPoint(shape, x, y)` を実装し、点判定からプレビューと同一Rangeを利用できる構成にした。
- `intersectsBounds(shape, bounds)` を実装し、LINE / RECT / CIRCLEと矩形HitBoxの幾何交差を判定できる。
- `getTilesByCenter(shape)` を実装し、地形変更時にマス中心点ルールで対象マスを取得できる構成にした。
- A押下時にはその時点の向きを正規化して固定し、`lastAttackRange` として同一Range形状を保持する。
- `BattleNetworkCombatRange` から直近攻撃Range・点判定・対象マス取得を参照可能。

### 攻撃範囲プレビュー

- `js/combat/range-preview-renderer.js` を追加。
- `css/range-preview.css` を追加。
- world座標上のRange形状を現在の斜め投影へ変換して表示する。
- LINE / RECTはSVGポリゴン、CIRCLEは投影後のSVG楕円として描画する。
- キャノン・ソード・ワイドソードは旧CSS長方形の回転表示ではなく、新Range形状そのものをプレビューする方式へ移行済み。
- 表示とHit判定で `BattleNetworkRangeGeometry` を共通利用する構成。
- キャノンはv58で `5×0.5`、ソード `1×1`、ワイドソード `1×3`。
- ミニボムは `CIRCLE(radius_tiles=0.75)` を正式採用。
- `js/combat/bomb-preview-renderer.js` を追加し、プレイヤー足元から3マス先の着弾地点までを放物線の投擲予告線として描画する。
- v51でRange SVGを `scene` から分離し、`battle` 直下の専用 `combatPreviewLayer` で描画する構成へ変更。
- v51実機確認で、稀な引っかかりは残るが大幅に改善し、現時点では許容としてRange負荷対応を完了扱いとした。

### CUSTOM

- 戦闘開始時にCUSTOM画面を表示。
- CUSTOM表示中は戦闘停止。
- 5枚を抽選し、画面上には5×2の10枠を表示。
- チップを1回タップで選択、選択済みチップを再タップでキャンセル。
- 決定ボタンとソウルユニゾン用ボタン枠を実装。
- ソウルユニゾンは現時点では未実装。
- カスタムゲージは10秒でMAX。
- v50実機確認で、CUSTOMゲージMAX後の初回タップと蓄積アニメーションの両方を改善済みと確認。
- チップコードを表示し、同一チップまたは同一コードを基準とした複数選択制御を実装。
- `*` コードをワイルドカードとして扱う。
- 属性アイコンは属性ごとの画像素材を共通利用する方式で実装。
- 使用済み・破棄済みチップをWave中に再登場させない管理を実装。

### 現在使用しているバトルチップ

1. キャノン
2. ソード
3. ワイドソード
4. ミニボム
5. リカバリー10

CUSTOM画面には各チップの正式イラストを表示済み。

### チップ画像

現在Git管理されている画像:

- `assets/chips/cannon.png`
- `assets/chips/sword.png`
- `assets/chips/WideSwordpng.png`
- `assets/chips/MiniBomb.png`
- `assets/chips/Recovery_10.png`
- `assets/chips/common/chip_background_standard.jpg`

### チップ使用プロトタイプ

- キャノン: 前方への直進弾。
- ソード: 前方近距離の狭い攻撃範囲。
- ワイドソード: ソードと同程度の射程で横幅を広くした攻撃範囲。
- ミニボム: 前方3マス先へ投擲し、着弾地点を中心に半径0.75マスの円形爆発。
- リカバリー: 回復エフェクトを表示。
- キャノンは `LINE(5×0.5)`、ソードは `RECT(1×1)`、ワイドソードは `RECT(1×3)` のマス単位Range。
- ミニボム投擲距離は `BOMB_THROW.THROW_DISTANCE_TILES=3`。
- ミニボム爆発半径は `CIRCLE / RADIUS_TILES=0.75`。
- キャノン / 通常ロックバスター / チャージショットは床面world座標を示す影を表示する。

### IndexedDB v1

- DB名: `BattleNetworkDB`
- DB Version: `1`
- `save_meta`
- `player_progress`
- `owned_chips`
- `folders`
- `folder_chips`

を作成する基盤を実装。

## 設計確定・段階実装中: 論理フィールドと攻撃範囲

詳細は `FIELD_COMBAT_DESIGN.md` をSource of Truthとする。

確定事項:

- ゲームワールドは `3600 × 3600 world units` の正方形を維持する。
- `TILE_SIZE = 180` とし、20×20、合計400マスの論理グリッドを定義する。
- 見た目の1マスと内部の論理マスを1対1で一致させる。
- プレイヤーはマス移動へ変更せず、360度自由移動を維持する。
- プレイヤーの所属マスは足元中央点を基準とする。
- 毒・マグマ等の床効果は所属マスを基準にする。
- 穴等の侵入不可地形は所属マス判定とは分離し、移動HitBoxで判定する。
- 攻撃方向は東西南北／8方向へスナップせず、向いている360度自由方向を使用する。
- 攻撃開始時の向きをその攻撃中は固定する。
- 射程・幅・半径等は「何マス分」を設計単位とし、実行時にworld unitsへ変換する。
- 敵へのHit判定はマス単位ではなく連続座標上の攻撃範囲とHitBoxで行う。
- 地形変更対象マスは原則としてマス中心点が攻撃範囲内かで判定する。
- Rangeは形状、Behaviorは効果の届け方・発生方法として責務分離する。
- 基本Range Typeは `LINE / RECT / CIRCLE / SECTOR / RING / SELF`。
- 距離系Range Parameterは整数限定にせず小数マスを許可する。
- キャノンは `LINE(5×0.5)`、ソードは `RECT(1×1)`、ワイドソードは `RECT(1×3)`、ミニボムは `CIRCLE(0.75)`、リカバリー10は `SELF` とする。
- ミニボムの投擲距離はRangeではなく `BOMB_THROW` のBehavior Parameterとし、3マスとする。

## 現時点で未実装・未確定

- v58キャノン表示サイズ・影・Range幅の実機確認。
- 特殊地形の実ゲーム処理。
- 穴等の侵入不可地形に対する移動HitBox判定。
- 敵AI。
- プレイヤーHP。
- 敵HP。
- ダメージ計算。
- 被弾処理。
- 敵攻撃と攻撃予兆。
- 撃破処理。
- Wave進行の実戦フロー。
- ボス。
- リカバリー10の実HP回復処理。
- Yボタンの正式用途。
- ソウルユニゾン。
- 本格的なプレイヤー・敵・ステージのビジュアル。
- 所持チップ・フォルダ・レギュラーチップとIndexedDBの実ゲーム接続。
- `library_no / capacity_mb / rarity` の正式な原作値確認とマスタ反映。

## 次フェーズ: 敵HP・ダメージ基盤

敵HitBox、バトルチップBehavior命中タイミング、通常/チャージロックバスターの敵HitBox接続まで実機確認済み。
まずv58のキャノン表示サイズとRange幅を実機確認し、問題なければ敵HP・ダメージ処理の最小基盤へ進む。

優先対象は以下。

1. v58キャノンの表示サイズ88×44px、影76×26px、Range `5×0.5` の見た目と命中感を実機確認する。
2. 敵HPの最小基盤を追加する。
3. バトルチップ / ロックバスターのダメージ処理を接続する。
4. プレイヤー表示 / HitBox分離とプレイヤーHPへ進む。
5. その後、敵AI・被弾・撃破・Wave進行へ拡張する。