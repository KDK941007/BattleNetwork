from pathlib import Path


def replace_exact(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'expected text not found in {path}: {old[:80]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

# Wave timing: tuning values only, not final production timing.
replace_exact(
    'js/combat/wave-system.js',
    '// v98 test-only composition/timing. Count/positions/HP/timing are not final game-balance values.',
    '// v99 test-only composition/timing/presentation. Count/positions/HP/timing are not final game-balance values.'
)
replace_exact('js/combat/wave-system.js', 'clearNoticeMs:1000,', 'clearNoticeMs:1500,')
replace_exact('js/combat/wave-system.js', 'startNoticeMs:1000,', 'startNoticeMs:1500,')

Path('css/wave-status.css').write_text(r'''/* v99 temporary Wave verification UI. Normal Wave position is provisional; CLEAR/START use a centered lightweight transition effect. */
.waveStatusNotice{
  position:absolute;
  left:50%;
  top:28px;
  transform:translateX(-50%);
  z-index:24;
  pointer-events:none;
  min-width:96px;
  padding:5px 12px;
  border:2px solid rgba(255,225,120,.9);
  border-radius:7px;
  background:rgba(16,19,28,.82);
  color:#fff0b0;
  font-family:Orbitron,var(--bn-ui-font),system-ui,sans-serif;
  font-size:clamp(12px,2.5vw,19px);
  font-weight:900;
  line-height:1;
  letter-spacing:.08em;
  text-align:center;
  white-space:nowrap;
}

/* CLEAR / START are transition-only presentations. Keep effects to transform/opacity/box-shadow. */
.waveStatusNotice[data-status="CLEARING"],
.waveStatusNotice[data-status="STARTING"]{
  top:50%;
  z-index:45;
  min-width:min(480px,78vw);
  padding:15px 30px;
  border-width:3px;
  border-radius:10px;
  font-size:clamp(26px,6vw,48px);
  line-height:1.05;
  letter-spacing:.12em;
  background:rgba(8,14,24,.9);
  will-change:transform,opacity;
}
.waveStatusNotice[data-status="CLEARING"]{
  border-color:rgba(255,226,112,.98);
  color:#fff3b0;
  box-shadow:0 0 0 2px rgba(255,245,190,.16) inset,0 0 24px rgba(255,211,82,.42);
  animation:waveClearBurst 1.5s cubic-bezier(.2,.72,.2,1) both;
}
.waveStatusNotice[data-status="STARTING"]{
  border-color:rgba(125,232,255,.98);
  color:#d9faff;
  box-shadow:0 0 0 2px rgba(205,250,255,.14) inset,0 0 24px rgba(72,211,255,.42);
  animation:waveStartBurst 1.5s cubic-bezier(.2,.72,.2,1) both;
}

@keyframes waveClearBurst{
  0%{opacity:0;transform:translate(-50%,-50%) scale(.72);letter-spacing:.24em}
  18%{opacity:1;transform:translate(-50%,-50%) scale(1.08);letter-spacing:.14em}
  38%{opacity:1;transform:translate(-50%,-50%) scale(1);letter-spacing:.12em}
  82%{opacity:1;transform:translate(-50%,-50%) scale(1)}
  100%{opacity:.12;transform:translate(-50%,-50%) scale(1.02)}
}
@keyframes waveStartBurst{
  0%{opacity:0;transform:translate(-50%,-50%) scaleX(.58) scaleY(.86);letter-spacing:.24em}
  20%{opacity:1;transform:translate(-50%,-50%) scaleX(1.06) scaleY(1.03);letter-spacing:.14em}
  40%{opacity:1;transform:translate(-50%,-50%) scale(1);letter-spacing:.12em}
  82%{opacity:1;transform:translate(-50%,-50%) scale(1)}
  100%{opacity:.12;transform:translate(-50%,-50%) scale(1.02)}
}
''', encoding='utf-8')

replace_exact('index.html', './css/wave-status.css?v=96', './css/wave-status.css?v=99')
replace_exact('index.html', './js/combat/wave-system.js?v=98', './js/combat/wave-system.js?v=99')
replace_exact('sw.js', "const CACHE_NAME = 'battlenetwork-runtime-v98';", "const CACHE_NAME = 'battlenetwork-runtime-v99';")

# Preserve v98 history and add the new presentation/timing refinement.
game_design_marker = '''### v98 Wave切替テンポ\n\n- 全敵撃破直後は戦闘を停止し、`WAVE CLEAR` を一定時間表示してからCUSTOMを開く。CLEAR表示中はプレイヤー操作・CUSTOMゲージ進行・プレイヤー側の発射済み弾を継続させない。\n- CUSTOM決定が新Wave開始に該当する場合、CUSTOMを閉じた直後に `WAVE n START` を表示し、その表示中は戦闘停止を維持する。表示時間経過後に敵を生成して戦闘を開始する。\n- 最初のWAVE 1も `CUSTOM決定 → WAVE 1 START → 戦闘開始` の同じ流れへ統一する。\n- v98のCLEAR表示時間とSTART表示時間はともに `1.0秒` を実機テンポ確認用の調整値として使用する。本番確定値ではなく、実機確認結果に応じて変更可能とする。\n'''
game_design_v99 = game_design_marker + '''\n### v99 Wave切替演出調整\n\n- `WAVE CLEAR` と `WAVE n START` は通常のWave表記とは分離し、切替時のみ画面中央へ大きく表示する仮演出を使用する。\n- CLEARは暖色、STARTは寒色の枠・発光とし、拡大／収束／フェードをCSSの `transform / opacity / box-shadow` 中心で表現する。ゲームループへ高負荷な描画処理は追加しない。\n- CLEAR／STARTの表示時間はともに `1.5秒` へ延長する。これは「一呼吸」の実機感覚を確認するための調整値であり、本番確定値ではない。\n- 通常時のWave表示位置、およびCLEAR／STARTの最終デザイン・SE等は引き続き本番演出確定時に変更可能とする。\n'''
replace_exact('GAME_DESIGN.md', game_design_marker, game_design_v99)

dev = Path('DEVELOPMENT_STATUS.md')
text = dev.read_text(encoding='utf-8')
old_heading = '## 次フェーズ: v98 Wave切替テンポ 実機確認'
pos = text.find(old_heading)
if pos < 0:
    raise SystemExit('v98 next-phase heading not found in DEVELOPMENT_STATUS.md')
new_tail = '''## 次フェーズ: v99 Wave切替演出 実機確認\n\nv98のWave切替テンポは、CLEAR／STARTの間をさらに取り、切替自体にも演出が欲しいという実機確認結果を受けてv99へ調整した。`WAVE CLEAR` と `WAVE n START` は切替時のみ画面中央へ大きく展開し、軽量な拡大・収束・フェード演出を行う。CLEARは暖色、STARTは寒色の仮テーマとする。表示時間は両方とも1.0秒から1.5秒へ延長し、本番値ではなく実機調整値として管理する。通常のWave表示位置は引き続き暫定で、Wave進行ロジックは表示位置や演出へ依存させない。\n\n優先対象は以下。\n\n1. 全敵撃破時、`WAVE CLEAR` が画面中央へ大きく表示され、約1.5秒の演出後にCUSTOMが開くことを確認する。\n2. CLEAR演出中はプレイヤー操作・攻撃・CUSTOMゲージ進行が停止したままであることを確認する。\n3. CUSTOM決定後、`WAVE 2 START` 等が画面中央へ大きく表示され、約1.5秒の演出後に敵生成・戦闘開始となることを確認する。\n4. 初回WAVE 1も `WAVE 1 START` 演出を経由することを確認する。\n5. CLEAR／START演出の大きさ・見やすさと1.5秒の間が実機感覚として適切か確認する。長短や強弱は本番演出確定までは調整可能とする。\n6. v97からのチップ0枚決定、Wave単位チップリセット、プレイヤーHP／位置引継ぎが維持されていることを確認する。\n7. v99確認後、本番敵AI・敵構成／Wave数・ウェーブ間強化の採否・本番Wave演出／SEへ段階的に進む。\n'''
dev.write_text(text[:pos] + new_tail, encoding='utf-8')
