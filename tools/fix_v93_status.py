from pathlib import Path
p=Path('DEVELOPMENT_STATUS.md')
text=p.read_text(encoding='utf-8')
old='v93はHP0到達・戦闘停止・仮表示の実機確認待ち。'
new='v93は実機確認で、HP0到達・戦闘停止・操作不能・敵攻撃停止・仮DELETED表示まで問題ないことを確認済み。'
if text.count(old)!=1:
    raise SystemExit(f'expected v93 pending marker once, found {text.count(old)}')
p.write_text(text.replace(old,new,1),encoding='utf-8')
print('v93 status consistency fixed')
