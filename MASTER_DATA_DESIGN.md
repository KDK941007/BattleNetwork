# BattleNetwork マスタ・セーブデータ設計

最終更新: 2026-08-24

このドキュメントは、バトルチップの固定定義とユーザーごとに変化するセーブデータの Source of Truth とする。
チップ追加・フォルダ機能・レギュラーチップ・ガチャ/報酬・セーブ機能を実装する際は、本設計を基準にする。

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
| image_path | チップ固有イラストのパス |
| capacity_mb | レギュラーチップ判定等に使用する容量 |
| class_id | M_CHIP_CLASSへの参照 |
| rarity | 1～5。排出率とは分離 |
| range_type_id | M_RANGE_TYPEへの参照 |
| behavior_id | M_BEHAVIORへの参照 |
| description | チップ内容の説明 |
| range_description | チップ詳細に表示する範囲説明 |

`chip_id` と `library_no` は分離する。ライブラリ表示順を変更しても内部参照を壊さないため、ゲーム処理は `chip_id` を使用する。

画像素材全般を管理する Asset Master は現時点では作らない。チップ固有画像は `M_CHIP.image_path`、属性・系統アイコンは `M_CHIP_ATTRIBUTE.icon_path` に保持する。

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

### M_RANGE_TYPE

`range_type_id / range_name / display_category / display_direction / sort_order` を持つ。

初期候補:

- `LINE_FORWARD`
- `FRONT_RECT`
- `THROW_AOE`
- `SELF`

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

### R_CHIP_RANGE_PARAM

チップごとのRangeパラメータ値を保持する。

| 項目 | 内容 |
| --- | --- |
| chip_id | FK |
| param_id | Range Param ID |
| param_value | 値 |

PKは `(chip_id, param_id)`。

Range数値はゲーム内ワールド座標単位で統一し、各レコードに単位列は持たせない。
`SELF` のようにパラメータ不要なRangeは関連レコード0件でよい。

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

- Range: どこに届くか。
- Value: どれだけの効果か。
- Behavior: 何をするか。
- Behavior Parameter: どう動くか。例: 行動硬直、弾速、爆発までの時間。

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
├─ game.js
└─ service-worker-register.js
```

正規化されたマスタ構造とファイル数は同義ではない。複数の小規模な定義マスタは `chip-definitions.js` にまとめ、関連データは `chip-relations.js` にまとめる。

画面・ゲーム処理からマスタ配列やIndexedDBを直接操作せず、`chip-service.js` / `save-data.js` を経由する。

## 13. 現行5チップの移行方針

対象:

1. キャノン
2. ソード
3. ワイドソード
4. ミニボム
5. リカバリー10

現行プロトタイプに存在する威力・回復量・範囲・硬直・弾速・爆発遅延等を新マスタへ移す。
`library_no / capacity_mb / rarity` は原作確認前に推測で埋めず、現時点では `null` とする。

現在の30枚プロトタイプフォルダで使用中のコードは移行するが、正式な原作準拠コード値は別途確認して確定する。

## 14. 移行中の互換性

既存ゲーム挙動を壊さないため、初期移行では `chip-service.js` に互換変換層を置く。
正規化マスタから現行 `game.js` が必要とする `name / type / attr / power / heal / range / width / radius / lock / image / detail / rangeText / viz` を生成する。

新規機能は正規化マスタAPIを利用し、既存ロジックは段階的に互換層から直接マスタ参照へ移行する。
互換層は永久仕様ではなく、安全な段階移行のための一時的な境界とする。
