from pathlib import Path

path = Path('DEVELOPMENT_STATUS.md')
text = path.read_text(encoding='utf-8')
marker = '## 次フェーズ: v105 別Attack Behavior 実機確認'
if marker not in text:
    raise SystemExit(f'marker not found: {marker}')
head = text.split(marker, 1)[0].rstrip()
new_tail = r'''## 次フェーズ: 敵3種類 正式仕様設計

v105の別Attack Behavior検証は実機確認済み。1体目の直線射撃と2体目の円形範囲攻撃がそれぞれ独立して動作し、円形予兆の固定地点回避、Movementとの同時実行、被弾判定、撃破停止、Wave切替まで想定どおり成立することを確認した。v102/v103で改善した描画負荷についても再発は確認されていない。

これにより、正式な敵仕様を載せる前の敵AI共通基盤検証はいったん完了扱いとする。現時点で成立確認済みの共通構造は、敵個体ごとの独立行動、同一敵内の `ATTACK` / `MOVEMENT` 独立チャンネル、敵ごとに異なるAttack Behaviorの割当、world座標・HitBox・表示位置の同期更新、CUSTOM / WAVE CLEAR / WAVE START中のAI停止、攻撃描画の専用レイヤー化・DOM再利用である。

v104の `PROTOTYPE_OSCILLATE_MOVEMENT`、v105の `PROTOTYPE_TARGET_AREA`、従来の `PROTOTYPE_STRAIGHT_SHOT` と、それぞれの距離・速度・威力・予兆時間・頻度・見た目はすべて共通基盤検証用であり、本番敵の正式仕様として採用確定しない。

次は初期プロトタイプで使用する雑魚敵3種類について、見た目上の役割だけでなく戦い方が明確に変わるよう、各敵の正式な移動方法、攻撃内容、予兆、HP、攻撃力、行動頻度、行動中の移動継続／停止条件などを設計する。その後、決定した敵を使って通常3Waveの敵数・組み合わせ・配置・難易度進行を正式化する。

敵の正式仕様は、今回までの検証Behaviorをそのまま採用する前提では決めない。必要に応じて新しいMovement / Attack Behaviorを追加し、敵固有の挙動として構成する。'''
path.write_text(head + '\n\n' + new_tail + '\n', encoding='utf-8')
