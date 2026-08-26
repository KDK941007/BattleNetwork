from pathlib import Path

path = Path('DEVELOPMENT_STATUS.md')
text = path.read_text(encoding='utf-8')
marker = '## 次フェーズ: v104 攻撃／移動Behavior共存 実機確認'
if marker not in text:
    raise SystemExit('v104 status marker not found')
prefix = text.split(marker, 1)[0]
section = '''## 次フェーズ: 敵AI 別Attack Behavior検証設計

v104の攻撃／移動Behavior共存は実機確認済み。テスト敵2体がそれぞれ独立して往復移動しながら直線射撃し、移動中もHitBox・HP減少・撃破停止・Wave切替時の停止／再割当が想定どおり成立することを確認した。v102/v103で改善した予兆表示・被ダメージ時の描画負荷についても再発は確認されていない。

これにより、`BattleNetworkEnemyAI` の `INDEPENDENT_PER_ENEMY_CHANNEL` 構造で、同一敵に `ATTACK` と `MOVEMENT` を別チャンネルとして同時割当・独立更新できる共通基盤は成立したものとして扱う。敵は個体ごとに独立して行動し、同一敵の移動と攻撃も原則として独立状態で進行可能とする。

v104で使用した `PROTOTYPE_OSCILLATE_MOVEMENT` の1マス往復、速度90 world units/sec、X方向往復という具体動作はすべて検証用であり、本番敵の正式な移動仕様としては採用確定しない。

次は正式な敵3種類を決める前の最後の共通基盤確認として、直線射撃とは異なるAttack Behaviorを同じ `ATTACK` チャンネルへ差し替えて成立するかを検証候補とする。突進、範囲攻撃等は候補に留め、どれを採用するか、速度・威力・頻度・予兆・移動との排他／共存条件はまだ確定しない。

次の設計では以下を優先する。

1. 直線射撃以外のAttack Behaviorも敵個体ごとに独立して実行できること。
2. Movement継続中にAttack Behaviorが開始・終了しても、敵world座標・HitBox・表示位置が破綻しないこと。
3. Attackによって移動停止が必要な敵を将来作る場合でも、共通基盤で強制同期せず敵固有仕様として制御できること。
4. 予兆・攻撃描画はv102以降の専用レイヤー／DOM再利用方針を維持すること。
5. 検証用性能値・検証用Movementを本番敵性能として確定しないこと。
6. 別Attack Behaviorの成立確認後に、敵3種類の正式な見た目・移動・攻撃・HP・攻撃力・行動頻度・Wave構成を決定すること。
'''
path.write_text(prefix + section, encoding='utf-8')
