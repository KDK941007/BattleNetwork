(()=>{
  const RUNTIME=window.BattleNetworkEnemy1Runtime,battle=document.getElementById('battle');
  if(!RUNTIME||!battle)throw new Error('BattleNetworkEnemy1PatternTestUI: required dependency is missing.');
  const wrap=document.createElement('div'),button=document.createElement('button'),detail=document.createElement('span');
  wrap.dataset.testOnly='enemy1-pattern';
  wrap.style.cssText='position:absolute;right:10px;top:10px;z-index:40;display:flex;align-items:center;gap:7px;padding:5px 7px;border:1px solid rgba(255,255,255,.5);border-radius:8px;background:rgba(8,12,20,.78);color:#fff;font:700 11px/1.2 system-ui,sans-serif;pointer-events:auto;';
  button.type='button';button.style.cssText='min-width:86px;min-height:34px;border:1px solid #ffe27a;border-radius:6px;background:#30270d;color:#fff7c9;font-weight:900;';
  detail.style.cssText='white-space:nowrap;font-variant-numeric:tabular-nums;';
  function render(){const p=RUNTIME.getPattern();button.textContent=`PATTERN ${p.id}`;detail.textContent=`SPD ${p.moveSpeedWorld} / RNG ${p.maxRangeTiles} / CT ${p.cooldownMs}`}
  button.addEventListener('click',()=>{RUNTIME.cyclePattern();render()});
  wrap.append(button,detail);battle.appendChild(wrap);render();
})();
