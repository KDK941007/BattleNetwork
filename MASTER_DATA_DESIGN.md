# BattleNetwork マスタ・セーブデータ設計

最終更新: 2026-08-25

このドキュメントは、バトルチップの固定定義とユーザーごとに変化するセーブデータの Source of Truth とする。
チップ追加・フォルダ機能・レギュラーチップ・ガチャ/報酬・セーブ機能を実装する際は、本設計を基準にする。
フィールドの論理マス、自由移動、360度攻撃範囲の基準は `FIELD_COMBAT_DESIGN.md` を参照する。

## 1. 基本方針

データは次の3層に分ける。

1. JS Master: 全ユーザー共通の固定データ。
2. IndexedDB: 所持チップ、フォルダ、進行状況などユーザー依存データ。
3. localStorage: コントローラー配置・サイズ・透明度など端末固有の軽量設定。

同じ情報を複数の保存先に重複保持しない。
例えば IndexedDB の所持チップには `chip_id / code_id / quantity` のみを保存し、チップ名・イラスト・威力などは JS Master から取得する。

## 2. M_CHIP

チップ本体の固定情報。

| 項目 | 内容 |
| --- | --- |
| chip_id | PK。内部参照用の不変ID |
| library_no | UNIQUE。ライブラリ表示No.。通常ライブラリ対象外を考慮しNULL可 |
| chip_name | チップ名 |
| capacity_mb | レギュラーチップ判定等に使用する容量 |
| class_id | M_CHIP_CLASSへの参照 |
| rarity | 1～5。排出率とは分離 |
| range_type_id | M_RANGE_TYPEへの参照 |
| behavior_id | M_BEHAVIORへの参照 |
| description | チップ内容の説明 |
| range_description | チップ詳細に表示する範囲説明 |

`chip_id` と `library_no` は分離する。ライブラリ表示順を変更しても内部参照を壊さないため、ゲーム処理は `chip_id` を使用する。

画像素材全般を管理する Asset Master は現時点では作らない。チップ固有画像のパスは `M_CHIP` に保持せず、正式な命名規約 `assets/chips/{chip_name}.png` からサービス層で生成する。したがって正式チップの画像ファイル名はチップ名と完全一致する日本語名とし、拡張子は原則 `.png` とする。`chip_name` は画像キーを兼ねるため重複不可とし、チップ名を変更する場合は対応する画像ファイル名も同時に変更する。属性・系統アイコンは引き続き `M_CHIP_ATTRIBUTE.icon_path` に保持する。テスト専用チップの画像流用は正式マスタへ画像パスを追加せず、サービス層のテスト互換定義で扱う。

## 3. 属性・系統

1チップが「炎＋ソード」のように複数の属性・系統を持てることを前提とする。

### M_CHIP_ATTRIBUTE

| 項目 | 内容 |
| --- | --- |
| attribute_id | PK |
| attribute_type | `ELEMENT` / `SYSTEM` |
| attribute_name | 表示名 |
| icon_path | アイコン画像パス |
| sort_order | 基本表示順 |

### R_CHIP_ATTRIBUTE

| 項目 | 内容 |
| --- | --- |
| chip_id | FK |
| attribute_id | FK |
| display_priority | チップ内での表示優先順位 |
| primary_flg | CUSTOM等で代表1件を表示するためのフラグ |

PKは `(chip_id, attribute_id)`。

UIルール:

- CUSTOM一覧: `primary_flg=true` の1件のみ表示。
- チップ詳細: 関連する属性・系統を全件横並び表示。
- チップ詳細の外枠サイズは変えない。
- 収まらない場合は属性・系統エリア内部のみ横スクロール可能にする。

## 4. チップコード

カンマ区切り文字列では保持しない。

### M_CHIP_CODE

| 項目 | 内容 |
| --- | --- |
| code_id | PK |
| code_value | `A`～`Z` / `*` |
| sort_order | 表示順 |

### R_CHIP_CODE

| 項目 | 内容 |
| --- | --- |
| chip_id | FK |
| code_id | FK |

PKは `(chip_id, code_id)`。

## 5. 主要値

ロールのような「攻撃＋回復」や、同種の主要値を複数持つチップを想定し、1チップ:複数主要値とする。

### M_VALUE_TYPE

| 項目 | 内容 |
| --- | --- |
| value_type_id | PK |
| value_name | 内部名称 |
| display_label | `攻撃力`、`回復量` 等 |
| unit | 必要な場合の単位 |

初期候補: `DAMAGE / RECOVERY / BARRIER_HP / ADD_DAMAGE`。

### R_CHIP_VALUE

| 項目 | 内容 |
| --- | --- |
| chip_id | FK |
| value_no | チップ内連番 |
| value_type_id | FK |
| value | 数値。可変値の場合NULL可 |
| value_mode | `FIXED` / `VARIABLE` |
| display_order | 表示順 |
| display_flg | 主要値エリアへ表示するか |
| label_override | 同一value_typeを複数表示する場合等のラベル上書き。NULL可 |

PKは `(chip_id, value_no)`。

UIでは `主要値` エリアに横並び表示し、外枠サイズは固定。収まらない場合は主要値エリア内部のみ横スクロール可能にする。

戦闘処理で使用する全パラメータを `R_CHIP_VALUE` に押し込まない。主要表示値とBehavior固有パラメータを分離する。

## 6. クラス・特殊タイプ・レア度

### M_CHIP_CLASS

| class_id | class_name | class_initial |
| --- | --- | --- |
| STANDARD | スタンダード | S |
| MEGA | メガ | M |
| GIGA | ギガ | G |

チップ詳細の基本情報では `CLASS S` のようにイニシャル表示する。

### M_CHIP_SPECIAL_TYPE / R_CHIP_SPECIAL_TYPE

ダーク等はクラスとは分離し、必要に応じて複数付与できるよう多対多とする。

`M_CHIP_SPECIAL_TYPE` は `special_type_id / special_type_name` を持つ。
`R_CHIP_SPECIAL_TYPE` のPKは `(chip_id, special_type_id)`。

初期候補は `DARK`。イベント限定等は必要になった時点で追加する。

### レア度

現段階では `M_CHIP.rarity` に1～5の数値を保持する。
ガチャ・敵ドロップ等の排出率は別データとして管理し、レア度から直接決定しない。

## 7. 効果範囲

役割: 「どこに効果が届くか」。

フィールド・攻撃範囲の基本ルールは `FIELD_COMBAT_DESIGN.md` をSource of Truthとする。
プレイヤーの攻撃方向は360度自由方向を維持し、Rangeは方向をマス方向へスナップするためには使用しない。
Rangeは純粋に効果範囲の形状を表し、投擲・弾速・貫通・発生地点等はBehaviorへ分離する。

### M_RANGE_TYPE

`range_type_id / range_name / display_category / display_direction / sort_order` を持つ。

正式な基本Range Type:

- `LINE`
- `RECT`
- `CIRCLE`
- `SECTOR`
- `RING`
- `SELF`

既存5チップで当面使用するのは `LINE / RECT / CIRCLE / SELF`。
`SECTOR / RING` は将来拡張用として保持する。

旧 `LINE_FORWARD / FRONT_RECT / THROW_AOE` は互換定義として残してよいが、新規設計および既存5チップの正式マスタでは使用しない。

### M_RANGE_PARAM

Range Typeごとに使用可能なパラメータを定義する。

| 項目 | 内容 |
| --- | --- |
| range_type_id | FK |
| param_id | パラメータID |
| param_name | 内部名称 |
| data_type | データ型 |
| default_value | デフォルト値 |
| required_flg | 必須フラグ |
| display_label | 表示用ラベル |
| display_order | 表示順 |

PKは `(range_type_id, param_id)`。

正式なRange Parameter:

| Range Type | param_id | 内容 |
| --- | --- | --- |
| `LINE` | `length_tiles` | 前方射程。マス単位 |
| `LINE` | `width_tiles` | 射線幅。マス単位 |
| `RECT` | `length_tiles` | 前方方向の長さ。マス単位 |
| `RECT` | `width_tiles` | 左右均等に広がる幅。マス単位 |
| `CIRCLE` | `radius_tiles` | 円半径。マス単位 |
| `SECTOR` | `radius_tiles` | 扇形半径。マス単位 |
| `SECTOR` | `angle_deg` | 扇形の開き角度。度 |
| `RING` | `inner_radius_tiles` | 円環内側半径。マス単位 |
| `RING` | `outer_radius_tiles` | 円環外側半径。マス単位 |
| `SELF` | - | パラメータなし |

距離系パラメータは整数に限定せず小数マスを許可する。

### R_CHIP_RANGE_PARAM

チップごとのRangeパラメータ値を保持する。

| 項目 | 内容 |
| --- | --- |
| chip_id | FK |
| param_id | Range Param ID |
| param_value | 値 |

PKは `(chip_id, param_id)`。

### Range数値の単位

射程、幅、半径等の「距離」を表すRange Parameterは、正式移行後は**論理マス数を設計単位**とする。

```text
worldDistance = tileDistance × TILE_SIZE
TILE_SIZE = 180 world units
```

例: キャノン射程5マスは実行時に900 world unitsへ変換する。

敵へのHit判定はマス単位へ離散化せず、変換後の連続ワールド座標上の攻撃形状とHitBoxで判定する。
地形変更系チップでは、連続座標上の攻撃形状から対象論理マスを取得する。基本の対象マス判定はマス中心点が攻撃範囲内に入っているかで行う。

`SELF` のように距離パラメータ不要なRangeは関連レコード0件でよい。

2026-08-25に既存5チップのRangeマスタを論理マス単位へ移行した。
既存ゲーム互換層が必要とする `range / width / radius` は、`chip-service.js` がマス単位Parameterからworld unitsへ変換して返す。

### 既存5チップの正式Range割当

| チップ | Range Type | Range Parameter |
| --- | --- | --- |
| キャノン | `LINE` | `length_tiles=5`, `width_tiles=0.25` |
| ソード | `RECT` | `length_tiles=1`, `width_tiles=1` |
| ワイドソード | `RECT` | `length_tiles=1`, `width_tiles=3` |
| ミニボム | `CIRCLE` | `radius_tiles=0.75` |
| リカバリー10 | `SELF` | なし |

## 8. Behavior

役割: 「何をするか」「どういう動きで効果を発生させるか」。

### M_BEHAVIOR

| 項目 | 内容 |
| --- | --- |
| behavior_id | PK |
| behavior_name | 表示/管理名称 |
| handler_key | JavaScript側の処理キー |

初期候補:

- `CANNON_SHOT`
- `SWORD_SLASH`
- `BOMB_THROW`
- `RECOVER_HP`

1チップ=1 behaviorを基本とし、複合効果は専用BehaviorまたはBehavior内部の共通処理で実現する。単純な複数Behavior連結は、命中条件等を扱いづらいため現段階では採用しない。

### M_BEHAVIOR_PARAM

Behaviorごとに使用可能なパラメータを定義する。

| 項目 | 内容 |
| --- | --- |
| behavior_id | FK |
| param_id | パラメータID |
| param_name | 内部名称 |
| data_type | データ型 |
| default_value | デフォルト値 |
| required_flg | 必須フラグ |

PKは `(behavior_id, param_id)`。

### R_CHIP_BEHAVIOR_PARAM

Behaviorデフォルト値から差分があるチップのみ上書き値を持つ。

| 項目 | 内容 |
| --- | --- |
| chip_id | FK |
| param_id | Behavior Param ID |
| param_value | 上書き値 |

PKは `(chip_id, param_id)`。

責務は次の通り。

- Range: どこに届くか、どの形に届くか。
- Value: どれだけの効果か。
- Behavior: 何をするか、どこをRangeの発生中心にするか、どう届けるか。
- Behavior Parameter: どう動くか。例: 行動硬直、弾速、爆発までの時間、投擲距離。

フィールド上の距離を表すBehavior Parameterも、論理マス数を設計単位とする。
ミニボムは投擲距離をRangeに持たせず、`BOMB_THROW.THROW_DISTANCE_TILES=3` とする。
`TILE_SIZE=180` のため実行時の投擲距離は540 world units。
投擲経路の放物線表示もRangeではなく、BOMB_THROWのBehavior可視化として扱う。

## 9. チップ詳細UI

チップ詳細の主要外枠はチップごとに変動させない。

上半分の正式候補:

```text
┌─────────────────────────────────────┐
│ チップ名                         × │
├──────────────┬──────────────────────┤
│              │ チップの内容         │
│   イラスト   │ 説明                 │
│              │                      │
├──────────────┤ 主要値               │
│ No.          │ [攻撃力] [回復量] →  │
│ CLASS        │                      │
│ MB           │ 属性・系統           │
│ RARITY       │ [炎] [ソード] →      │
└──────────────┴──────────────────────┘
```

左下の空白には基本情報 `No. / CLASS / MB / RARITY` を表示し、チップイラストは残す。
主要値と属性・系統はそれぞれ固定サイズ領域内の横スクロールを許可する。

## 10. IndexedDB v1

DB名: `BattleNetworkDB`
DB Version: `1`

初期Object Store:

### save_meta

- key: `key`
- 値例: `save_version / master_version / created_at / last_saved_at`

### player_progress

- keyPath: `player_id`
- ストーリー・所持金・HP等は必要になった時点で段階的に追加する。

### owned_chips

- keyPath: `[chip_id, code_id]`
- `quantity` を保持。
- チップ名等の固定情報は保存しない。

### folders

- keyPath: `folder_id`
- `folder_name / is_active / regular_slot_no / created_at / updated_at` を保持。

### folder_chips

- keyPath: `[folder_id, slot_no]`
- `chip_id / code_id` を保持。

フォルダ基本ルールは当面 EXE4 準拠とする。
複数フォルダ間では所持チップを共有できる方式とし、所持数チェックは各フォルダ内で行う。

## 11. localStorage

コントローラー配置・サイズ・透明度など、端末固有かつ小規模な設定のみを保持する。
現在のコントローラー設定はlocalStorageを継続利用する。

## 12. JSファイル構成

初期実装は次の構成とする。

```text
js/
├─ master/
│  ├─ chip-definitions.js
│  ├─ chip-master.js
│  ├─ chip-relations.js
│  └─ chip-service.js
├─ data/
│  ├─ database.js
│  └─ save-data.js
├─ combat/
│  ├─ range-geometry.js
│  ├─ range-preview-renderer.js
│  └─ bomb-preview-renderer.js
├─ game.js
└─ service-worker-register.js
```

正規化されたマスタ構造とファイル数は同義ではない。複数の小規模な定義マスタは `chip-definitions.js` にまとめ、関連データは `chip-relations.js` にまとめる。

画面・ゲーム処理からマスタ配列やIndexedDBを直接操作せず、`chip-service.js` / `save-data.js` を経由する。

## 13. 現行5チップの移行状況

対象:

1. キャノン
2. ソード
3. ワイドソード
4. ミニボム
5. リカバリー10

威力・回復量・範囲・硬直・弾速・爆発遅延等を新マスタへ移行済み。
`library_no / capacity_mb / rarity` は原作確認前に推測で埋めず、現時点では `null` とする。

現在の30枚プロトタイプフォルダで使用中のコードは移行済みだが、正式な原作準拠コード値は別途確認して確定する。

Rangeは `FIELD_COMBAT_DESIGN.md` に従いマス単位へ移行済み。
ミニボムは `CIRCLE / RADIUS_TILES=0.75`、投擲距離は `BOMB_THROW.THROW_DISTANCE_TILES=3` とする。

## 14. 移行中の互換性

既存ゲーム挙動を壊さないため、`chip-service.js` に互換変換層を置く。
正規化マスタから現行 `game.js` が必要とする `name / type / attr / power / heal / range / width / radius / lock / image / detail / rangeText / viz` を生成する。

新規機能は正規化マスタAPIを利用し、既存ロジックは段階的に互換層から直接マスタ参照へ移行する。
互換層は永久仕様ではなく、安全な段階移行のための一時的な境界とする。

現在の互換層は、`rangeTiles / widthTiles / radiusTiles / throwDistanceTiles` を保持しつつ、既存処理向けの `range / width / radius` を `BattleNetworkField.toWorldDistance()` でworld unitsへ変換して返す。
同一フィールド名の意味を暗黙に変更せず、マスタ上の単位と実行時のworld unitsを明確に分離する。
