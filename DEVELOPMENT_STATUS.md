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

ミニボムは正式な爆発半径を決めるため、v44で `0.5 / 0.75 / 1.0マス` の3候補を実機比較できる一時モードを追加した。ミニボムが先頭チップのときだけYボタンで候補を切り替える。正式値決定後に比較モードは削除する。

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
- Y: 本来用途は未定。v44ではミニボム半径比較時のみ一時的に候補切替へ使用。
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
- ゲーム状態に `tileRow / tileCol / currentTile` を保持し、将来の床効果判定から利用できる基盤を追加。
- プレイヤーDOMの `data-tile-row / data-tile-col / data-terrain` に現在値を反映し、デバッグ確認可能にした。画面表示には影響しない。

### 攻撃Range共通基盤

- `js/combat/range-geometry.js` を追加。
- `LINE / RECT` は、発動位置・360度自由方向・長さ・幅からworld座標上の四角形を生成する。
- `CIRCLE` は指定中心と半径からworld座標上の円形ポリゴンを生成できる基盤を追加。
- `containsPoint(shape, x, y)` を実装し、将来の敵HitBox判定からプレビューと同一Rangeを利用できる構成にした。
- `getTilesByCenter(shape)` を実装し、地形変更時にマス中心点ルールで対象マスを取得できる構成にした。
- A押下時にはその時点の向きを正規化して固定し、`lastAttackRange` として同一Range形状を保持する。
- `BattleNetworkCombatRange` から直近攻撃Range・点判定・対象マス取得を参照可能。

### 攻撃範囲プレビュー

- `js/combat/range-preview-renderer.js` を追加。
- `css/range-preview.css` を追加。
- world座標上のRange形状を現在の斜め投影へ変換し、SVGポリゴンとして表示する。
- キャノン・ソード・ワイドソードは旧CSS長方形の回転表示ではなく、新Range形状そのものをプレビューする方式へ移行済み。
- 表示と将来のHit判定で `BattleNetworkRangeGeometry` を共通利用する構成。
- キャノン `5×0.25`、ソード `1×1`、ワイドソード `1×3` の描画は実機確認済み。
- v43でSceneサイズ・投影係数のキャッシュ、不要なhide/show抑制、同一属性更新のスキップを実施し、プレビュー表示中の操作負荷改善を実機確認済み。
- v44でミニボムの投擲先を中心に、半径 `0.5 / 0.75 / 1.0マス` の候補CIRCLEを同じ共通プレビューへ接続した。
- ミニボム候補値は比較用であり、正式マスタ値ではない。

### CUSTOM

- 戦闘開始時にCUSTOM画面を表示。
- CUSTOM表示中は戦闘停止。
- 5枚を抽選し、画面上には5×2の10枠を表示。
- チップを1回タップで選択、選択済みチップを再タップでキャンセル。
- 決定ボタンとソウルユニゾン用ボタン枠を実装。
- ソウルユニゾンは現時点では未実装。
- カスタムゲージは10秒でMAX。
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

共通方針:

- チップ名、コード、属性、攻撃力等は画像素材内に描かずCUSTOM側UIで表示する。
- チップイラストの背景は `chip_background_standard.jpg` を標準背景とする。
- リカバリーは現在「リカバリー10」のイラストを正式採用している。
- チップ画像はService Workerのオフラインキャッシュ対象に追加済み。

### チップ詳細

- チップ詳細の外枠はチップごとの情報量で変動させない方針。
- 左側はチップイラストをアスペクト比を維持して表示し、その下に基本情報を2×2で固定表示。
- 基本情報は `No. / CLASS / MB / RARITY`。
- `CLASS` はマスタの `class_initial` を使用して `S / M / G` で表示。
- `No. / MB / RARITY` は正式値未確定の場合 `--` 表示とし、推測値を入れない。
- 右側は `チップの内容 / 主要値 / 属性・系統` の固定高構成。
- 主要値は `R_CHIP_VALUE` から複数件を横並び表示。
- 属性・系統は `R_CHIP_ATTRIBUTE` から複数件をアイコン付きで横並び表示。
- 主要値・属性/系統が固定幅に収まらない場合、その領域だけ横スクロールする。
- 範囲表示のレイアウトと既存の範囲イメージは維持。
- チップ詳細のマスタ描画処理は `js/ui/chip-detail-ui.js` に分離。

### チップ使用プロトタイプ

- キャノン: 前方への直進弾。
- ソード: 前方近距離の狭い攻撃範囲。
- ワイドソード: ソードと同程度の射程で横幅を広くした攻撃範囲。
- ミニボム: 前方へ投擲し着弾地点で円形爆発。
- リカバリー: 回復エフェクトを表示。
- 現在セットされている次チップの攻撃範囲プレビューを表示。
- キャノンは `LINE(5×0.25)`、ソードは `RECT(1×1)`、ワイドソードは `RECT(1×3)` のマス単位Rangeへ移行済み。
- 実行時は `BattleNetworkField.toWorldDistance()` でworld unitsへ変換する。
- ミニボム投擲距離は `BOMB_THROW.THROW_DISTANCE_TILES` に移行済み。既存430 world unitsを維持するため約2.3889マスとしている。
- ミニボム爆発半径は正式値未確定。マスタ上は既存115 world unitsの互換値を維持し、v44の比較モードだけ `0.5 / 0.75 / 1.0マス` の候補Rangeを生成する。
- 比較モード中にAでミニボムを使用した場合、`lastAttackRange` と爆発エフェクトサイズも現在選択中の候補半径を使用する。

### チップマスタ基盤

- `MASTER_DATA_DESIGN.md` をチップマスタ・Range/Behavior・セーブデータ設計のSource of Truthとして追加。
- `js/master/chip-definitions.js` に属性・コード・クラス・主要値種別・Range・Behavior等の共通定義を追加。
- Range Typeとして `LINE / RECT / CIRCLE / SECTOR / RING / SELF` を定義済み。
- ミニボム移行完了まで `THROW_AOE` を互換Range Typeとして一時的に残す。
- `js/master/chip-master.js` に現行5チップの基本情報を移行。
- `js/master/chip-relations.js` に属性/系統、コード、主要値、Range Parameter、Behavior Parameterの関連を追加。
- `js/master/chip-service.js` にマスタ参照API、整合性チェック、マス単位Rangeからworld unitsへの互換変換を追加。
- 現行 `game.js` のチップ定義はマスタ互換層から取得する方式へ変更し、チップ基本情報の二重定義を廃止。
- キャノンの弾速、各チップの行動硬直、ミニボムの爆発遅延もBehavior Parameterから取得可能な構成へ移行。
- `library_no / capacity_mb / rarity` は原作確認前に推測で設定せず `null` のままとする。
- 現行30枚プロトタイプフォルダのコード値はマスタへ移したが、正式な原作準拠値は別途確認対象。

### IndexedDB v1

- DB名: `BattleNetworkDB`
- DB Version: `1`
- `save_meta`
- `player_progress`
- `owned_chips`
- `folders`
- `folder_chips`

を作成する基盤を実装。

`js/data/database.js` がIndexedDBスキーマと基本アクセスを担当し、`js/data/save-data.js` がゲーム側から利用するセーブデータAPIを担当する。
IndexedDBが利用できない環境ではゲーム本体を停止させず、セーブデータ永続化のみ失敗扱いとする。

現時点のプロトタイプフォルダはまだIndexedDBから読み込んでいない。フォルダ編集機能を実装する段階で `folders / folder_chips / owned_chips` へ接続する。

### 端末設定

コントローラー配置・サイズ・透明度は引き続きlocalStorageで管理する。
ゲーム共通固定データ、ユーザーセーブデータ、端末設定の責務を分離する。

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
- キャノンは `LINE(5×0.25)`、ソードは `RECT(1×1)`、ワイドソードは `RECT(1×3)`、ミニボムは `CIRCLE`、リカバリー10は `SELF` とする。
- ミニボムの投擲距離はRangeではなく `BOMB_THROW` のBehavior Parameterとする。

## 現時点で未実装・未確定

- ミニボムの正式な `radius_tiles` 値と `CIRCLE` への完全移行。
- ミニボム半径比較完了後の一時Y操作・比較表示の削除。
- 特殊地形の実ゲーム処理。
- 穴等の侵入不可地形に対する移動HitBox判定。
- 敵キャラクター。
- 敵AI。
- プレイヤーHP。
- 敵HP。
- ダメージ計算。
- 敵HitBoxと `BattleNetworkRangeGeometry.containsPoint()` 等の正式接続。
- 被弾処理。
- 敵攻撃と攻撃予兆。
- 撃破処理。
- Wave進行の実戦フロー。
- ボス。
- リカバリー10はマスタ上 `RECOVERY=10` だが、プレイヤーHP未実装のため実HP回復処理は未接続。
- Yボタンの正式用途。
- ソウルユニゾン。
- 本格的なプレイヤー・敵・ステージのビジュアル。
- 所持チップ・フォルダ・レギュラーチップとIndexedDBの実ゲーム接続。
- `library_no / capacity_mb / rarity` の正式な原作値確認とマスタ反映。

## 直近の開発方針

### 新規チップ追加は後回し

チップ1種類ごとにイラスト制作・調整の工数が大きいため、当面は新しいチップを追加しない。
現在完成している5種類を使用して戦闘システムを成立させることを優先する。

新規チップ制作は、基礎戦闘が成立した後にまとめて行う。

## 次フェーズ: ミニボム半径確定

キャノン・ソード・ワイドソードの新Range描画とv43軽量化は実機確認済み。
次はミニボムの正式爆発半径を決める。

優先対象は以下。

1. ミニボムを先頭チップにし、Yボタンで `0.5 / 0.75 / 1.0マス` を切り替えて実機比較する。
2. 採用半径を決定する。
3. 決定値を `CIRCLE / RADIUS_TILES` としてマスタへ正式反映する。
4. 比較用Y操作・比較表示・旧 `THROW_AOE` 互換Rangeを削除する。
5. その後、共通Range形状を敵HitBox判定へ接続するための基礎を作り、HP・ダメージ計算へ進む。

フォルダ編集/所持チップ機能は、必要なタイミングで `MASTER_DATA_DESIGN.md` に従ってIndexedDBへ接続する。

この段階では敵やステージの本格的なイラスト制作より、当たり判定・テンポ・操作感・視認性を優先する。

## 開発上のルール

- 推測で仕様を確定しない。
- 決定済み事項を勝手に変更しない。
- 実装前にGitHub上の最新ドキュメントとコードを確認する。
- フィールド・地形・攻撃範囲の仕様は `FIELD_COMBAT_DESIGN.md` をSource of Truthとする。
- チップ・Range・Behavior・IndexedDBの仕様は `MASTER_DATA_DESIGN.md` をSource of Truthとする。
- 既存機能を壊さず、小さい単位で実装・実機確認を行う。
- 共通利用できる処理・UIは共通層へ寄せ、画面固有コードとの重複を避ける。
- 新規チップ追加は当面行わない。
- 基礎戦闘が成立してからコンテンツ量を増やす。
