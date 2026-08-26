from pathlib import Path

path = Path('DEVELOPMENT_STATUS.md')
text = path.read_text(encoding='utf-8')
old = '''## 次フェーズ: v99 Wave切替演出 実機確認

v98のWave切替テンポは、CLEAR／STARTの間をさらに取り、切替自体にも演出が欲しいという実機確認結果を受けてv99へ調整した。`WAVE CLEAR` と `WAVE n START` は切替時のみ画面中央へ大きく展開し、軽量な拡大・収束・フェード演出を行う。CLEARは暖色、STARTは寒色の仮テーマとする。表示時間は両方とも1.0秒から1.5秒へ延長し、本番値ではなく実機調整値として管理する。通常のWave表示位置は引き続き暫定で、Wave進行ロジックは表示位置や演出へ依存させない。

優先対象は以下。

1. 全敵撃破時、`WAVE CLEAR` が画面中央へ大きく表示され、約1.5秒の演出後にCUSTOMが開くことを確認する。
2. CLEAR演出中はプレイヤー操作・攻撃・CUSTOMゲージ進行が停止したままであることを確認する。
3. CUSTOM決定後、`WAVE 2 START` 等が画面中央へ大きく表示され、約1.5秒の演出後に敵生成・戦闘開始となることを確認する。
4. 初回WAVE 1も `WAVE 1 START` 演出を経由することを確認する。
5. CLEAR／START演出の大きさ・見やすさと1.5秒の間が実機感覚として適切か確認する。長短や強弱は本番演出確定までは調整可能とする。
6. v97からのチップ0枚決定、Wave単位チップリセット、プレイヤーHP／位置引継ぎが維持されていることを確認する。
7. v99確認後、本番敵AI・敵構成／Wave数・ウェーブ間強化の採否・本番Wave演出／SEへ段階的に進む。'''
new = '''## 次フェーズ: 本番敵AI・Wave構成設計

v99のWave切替演出は実機確認で、`WAVE CLEAR`／`WAVE n START` の中央演出、約1.5秒の間、CLEAR中／START中の戦闘停止、CUSTOMへの遷移、次Wave開始まで問題ないことを確認済み。現時点ではこの演出とテンポを採用する。

ただし、CLEAR／STARTの演出内容・色・表示時間1.5秒、および通常Wave表記位置は最終確定ではない。本番Wave演出やSE、HUD全体の仕上げ段階で再調整可能とし、Wave進行ロジックは表示位置や演出へ依存させない。

次は、本番敵AI・敵構成／Wave数を設計し、現在の検証用2体構成から実ゲーム用Waveへ段階的に移行する。ウェーブ間強化の採否、本番Wave演出／SE、ボス接続は関連設計と合わせて後続で確定する。'''
if old not in text:
    raise SystemExit('target block not found')
path.write_text(text.replace(old, new), encoding='utf-8')
