from pathlib import Path

path=Path('DEVELOPMENT_STATUS.md')
text=path.read_text(encoding='utf-8')
marker='## 次フェーズ: v103 敵被ダメージ描画負荷 実機確認'
if marker not in text:
    raise SystemExit('v103 status marker not found')
prefix=text.split(marker,1)[0]
section='''## 次フェーズ: 敵AI 別Behavior検証設計

v103の敵被ダメージ描画負荷対策は実機確認済み。バスター／チップで敵へダメージを与えた際の引っかかりは改善し、HP更新・軽量ヒット発光・HP0時のDELETED表示・撃破判定・Wave完了判定も想定どおり動作することを確認した。v102の敵攻撃予兆負荷改善、およびv101の敵ごとの独立行動も継続して問題なし。

これにより、現在確認できていた「敵攻撃予兆表示直前」と「敵へダメージを与えた瞬間」の主要な描画負荷対応はいったん完了扱いとする。今後、敵数や攻撃表現を増やしたことで再度負荷が顕在化した場合は、専用レイヤー化・DOM再利用・軽量オーバーレイを基本方針として再調査する。

次は、正式な敵3種類の内容を確定する前に、現在の `BattleNetworkEnemyAI` / Behavior分離構造が直線射撃以外でも成立するかを検証する。候補は移動、突進、範囲攻撃等だが、どのBehaviorを次に採用するか、具体的な速度・威力・頻度・移動方法等はまだ確定しない。敵は原則として個体ごとに独立して行動する共通ルールを維持する。

次の設計では以下を優先する。

1. 直線射撃以外のBehaviorでも個体ごとに独立して更新できることを確認する。
2. 攻撃Behaviorと移動Behaviorを同一敵でどのように共存させるかを決める。
3. 予兆・攻撃・移動の描画は巨大なsceneへ高負荷なDOM生成を繰り返さない構造を前提とする。
4. 検証用のBehavior性能値は本番敵性能として確定しない。
5. 共通基盤の成立確認後に、敵3種類の正式な見た目・移動・攻撃・HP・攻撃力・行動頻度・Wave構成を決定する。
'''
path.write_text(prefix+section,encoding='utf-8')
