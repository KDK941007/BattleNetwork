from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'expected text not found: {path}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'css/style.css',
    ".customGauge:before{content:'CUSTOM';position:absolute;left:50%;top:20px;transform:translateX(-50%);padding:0 5px;color:#fff;font-size:15px;font-weight:1000;letter-spacing:.5px;line-height:18px;white-space:nowrap;text-shadow:-2px 0 #10151c,0 2px #10151c,2px 0 #10151c,0 -2px #10151c}",
    ".customGauge:before{content:'CUSTOM';position:absolute;left:50%;top:50%;z-index:2;transform:translate(-50%,-50%);padding:0 5px;color:#fff;font-size:clamp(9px,1.6vw,13px);font-weight:1000;letter-spacing:.5px;line-height:1;white-space:nowrap;pointer-events:none;text-shadow:-2px 0 #10151c,0 2px #10151c,2px 0 #10151c,0 -2px #10151c}"
)

replace_once('css/wave-status.css', '  top:6px;\n', '  top:28px;\n')
replace_once('css/wave-status.css', '/* v95 temporary Wave verification UI. Final Wave presentation is not decided. */', '/* v96 temporary Wave verification UI. Positioned below the CUSTOM gauge; final Wave presentation is not decided. */')

replace_once('index.html', '<link rel="stylesheet" href="./css/style.css?v=80">', '<link rel="stylesheet" href="./css/style.css?v=96">')
replace_once('index.html', '<link rel="stylesheet" href="./css/wave-status.css?v=95">', '<link rel="stylesheet" href="./css/wave-status.css?v=96">')
replace_once('sw.js', "const CACHE_NAME = 'battlenetwork-runtime-v95';", "const CACHE_NAME = 'battlenetwork-runtime-v96';")

status = Path('DEVELOPMENT_STATUS.md')
text = status.read_text(encoding='utf-8')
old = '''## 次フェーズ: v95 最小Wave 実機確認

v91〜v94までのプレイヤー／敵の基礎戦闘フローは実機確認済み。v95では敵生成の責務を `enemy-foundation.js` から `wave-system.js` へ移し、検証用として同一テスト敵2体の `WAVE 1` を生成する。1体だけの撃破ではWave継続、2体とも撃破して `getBattleState().allDefeated` が成立した時だけ `WAVE CLEAR` へ遷移する。2体という数・配置とWave表示は検証用で、本番値／本番演出ではない。次Waveの自動開始はまだ実装しない。

優先対象は以下。

1. 戦闘開始時にテスト敵が2体表示され、それぞれHP200を独立して持つことを確認する。
2. 片方だけを攻撃・撃破でき、もう片方のHP／Hit判定が独立して残ることを確認する。
3. 1体目撃破時点では上部表示が `WAVE 1` のままであることを確認する。
4. 2体とも撃破した時だけ上部表示が `WAVE CLEAR` へ変わることを確認する。
5. 撃破済みの敵がバスター／チップのHit対象へ戻らないことを複数敵状態でも再確認する。
6. v95確認後、次Wave生成API・Wave間停止／待機・チップフォルダのWave単位リセットを設計する。
7. 複数敵が同時に攻撃する実装へ進んだ段階で、v91の連続被弾防止と無敵中の弾通過を再確認する。'''
new = '''## 次フェーズ: v96 Wave / CUSTOM 表示 実機確認

v95の最小Waveについて、テスト敵2体の独立撃破、1体撃破時のWave継続、全敵撃破時のみ `WAVE CLEAR` へ遷移する動作は実機確認で問題なし。表示面では `WAVE 1` がCUSTOMゲージ下の `CUSTOM` 文字列と重なることを確認したため、v96でレイアウトのみ修正した。`CUSTOM` はゲージ中央へ埋め込み、Wave表記はゲージ直下へ分離する。CUSTOMゲージのサイズ・蓄積・MAX点滅、Wave判定・戦闘処理は変更しない。

優先対象は以下。

1. `CUSTOM` がカスタムゲージ中央に収まり、ゲージ外へはみ出さないことを確認する。
2. `WAVE 1` がCUSTOMゲージ／`CUSTOM` 文字列と重ならないことを確認する。
3. CUSTOMゲージの蓄積表示とMAX時の軽量点滅が従来どおり動作することを確認する。
4. 1体撃破では `WAVE 1`、2体撃破後のみ `WAVE CLEAR` となるv95のWave判定が変わっていないことを確認する。
5. v96確認後、次Wave生成API・Wave間停止／待機・チップフォルダのWave単位リセット設計へ進む。
6. 複数敵が同時に攻撃する実装へ進んだ段階で、v91の連続被弾防止と無敵中の弾通過を再確認する。'''
if old not in text:
    raise SystemExit('v95 phase block not found')
status.write_text(text.replace(old, new, 1), encoding='utf-8')

print('v96 Wave/CUSTOM layout applied')
