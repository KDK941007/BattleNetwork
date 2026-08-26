from pathlib import Path

p=Path('DEVELOPMENT_STATUS.md')
text=p.read_text(encoding='utf-8')
marker='## 次フェーズ: v96 Wave / CUSTOM 表示 実機確認\n'
if marker not in text:
    raise SystemExit('v96 phase marker not found')
head=text.split(marker,1)[0]
new='''## 次フェーズ: 次Wave生成・Wave間進行 設計\n\nv96の表示調整は実機確認で問題なし。`CUSTOM` はカスタムゲージ中央に収まり、Wave表記との重なりも解消した。CUSTOMゲージの蓄積・MAX点滅、およびv95の「1体撃破では継続／全敵撃破時のみWAVE CLEAR」の判定も維持されている。\n\nただし、現在のWave表記位置（CUSTOMゲージ直下）は暫定配置とする。今後のHUD・本番Wave演出・画面構成に応じて位置を変更可能とし、Wave進行ロジックは表示位置へ依存させない。`CUSTOM` のゲージ中央配置は現状採用とする。\n\n次は、最小Wave検証を実戦フローへ拡張するため、次Wave生成API・Wave間停止／待機・チップフォルダのWave単位リセットを設計する。敵数、敵構成、出現位置、待機秒数、Wave表示演出は本番値として推測で確定しない。\n\n優先対象は以下。\n\n1. 現Wave完了後に次Waveを生成できる共通APIを設計する。\n2. Wave切替中にプレイヤー操作・敵攻撃・CUSTOMゲージをどう扱うかを確定する。\n3. 使用済み／破棄済みチップのWave単位リセット範囲を既存CUSTOM仕様と整合させる。\n4. 次Wave開始タイミングと仮表示方法を、本番演出と分離した検証値として決める。\n5. 複数Wave成立後、本番敵AI・敵構成・Wave数・ボス接続へ段階的に進む。\n6. 複数敵が同時に攻撃する実装へ進んだ段階で、v91の連続被弾防止と無敵中の弾通過を再確認する。\n'''
p.write_text(head+new,encoding='utf-8')
