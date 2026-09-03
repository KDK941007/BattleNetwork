(()=>{
  const testTarget=window.BattleNetworkFolder?.getTestTarget?.();
  if(!testTarget?.enabled||testTarget.type!=='AIRSHOT')return;

  const battle=document.getElementById('battle');
  if(!battle)return;

  const style=document.createElement('style');
  style.id='attackEffectReviewStyle';
  style.textContent=`
    .attackEffectReview{
      position:absolute;right:8px;top:8px;z-index:76;width:min(300px,42vw);
      padding:8px;border:1px solid rgba(119,228,255,.82);border-radius:10px;
      background:rgba(4,22,31,.94);box-shadow:0 8px 24px rgba(0,0,0,.42),inset 0 0 0 1px rgba(173,244,255,.08);
      color:#effdff;pointer-events:auto;touch-action:none;
    }
    .attackEffectReviewTitle{font-size:12px;font-weight:1000;letter-spacing:.4px;color:#bff5ff;margin-bottom:6px}
    .attackEffectReviewPatterns{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:6px}
    .attackEffectReview button{min-width:0;height:34px;padding:0 6px;border:1px solid #39748a;border-radius:7px;background:#0b3040;color:#eaffff;font-size:12px;font-weight:1000;touch-action:none}
    .attackEffectReview button.active{border-color:#ffe66d;background:#59470d;color:#fff5b6;box-shadow:0 0 9px rgba(255,221,87,.42)}
    .attackEffectReviewDesc{font-size:10px;font-weight:900;color:#d8f8ff;line-height:1.4}

    .battle[data-airshot-effect] .bullet.cannon{
      overflow:visible!important;
      border:0!important;
      pointer-events:none!important;
      transform-origin:center!important;
    }

    /* A: 圧縮空気弾 */
    .battle[data-airshot-effect="A"] .bullet.cannon{
      width:88px!important;height:42px!important;border-radius:50%!important;
      background:radial-gradient(ellipse at 70% 50%,rgba(248,255,255,.98) 0 11%,rgba(178,246,255,.9) 22%,rgba(91,219,245,.7) 44%,rgba(47,177,218,.18) 68%,transparent 74%)!important;
      box-shadow:0 0 12px rgba(128,238,255,.95),0 0 25px rgba(62,203,239,.68)!important;
    }
    .battle[data-airshot-effect="A"] .bullet.cannon::before{
      content:"";position:absolute;right:70%;top:50%;width:108px;height:20px;transform:translateY(-50%);
      background:linear-gradient(90deg,transparent 0%,rgba(76,196,228,.08) 24%,rgba(119,229,250,.42) 68%,rgba(216,252,255,.88) 100%);
      clip-path:polygon(0 42%,100% 0,100% 100%,0 58%);filter:blur(.5px);
    }
    .battle[data-airshot-effect="A"] .bullet.cannon::after{
      content:"";position:absolute;left:-12px;top:50%;width:40px;height:40px;border:3px solid rgba(169,244,255,.64);border-radius:50%;
      transform:translate(-50%,-50%) scaleX(.42);box-shadow:0 0 9px rgba(93,225,255,.55);
    }

    /* B: 風刃 */
    .battle[data-airshot-effect="B"] .bullet.cannon{
      width:116px!important;height:30px!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;
      filter:drop-shadow(0 0 9px rgba(89,226,255,.95));
    }
    .battle[data-airshot-effect="B"] .bullet.cannon::before{
      content:"";position:absolute;inset:0;
      background:linear-gradient(180deg,rgba(245,255,255,.98),rgba(112,232,251,.9) 42%,rgba(30,145,200,.42));
      clip-path:polygon(0 50%,23% 10%,100% 0,76% 48%,100% 100%,23% 88%);
    }
    .battle[data-airshot-effect="B"] .bullet.cannon::after{
      content:"";position:absolute;right:78%;top:3px;width:96px;height:24px;
      background:repeating-linear-gradient(180deg,transparent 0 5px,rgba(109,225,249,.7) 5px 7px);
      clip-path:polygon(0 28%,100% 0,100% 100%,0 72%);opacity:.85;
    }

    /* C: 衝撃波 */
    .battle[data-airshot-effect="C"] .bullet.cannon{
      width:70px!important;height:70px!important;border-radius:50%!important;background:rgba(72,207,238,.05)!important;
      border:6px solid rgba(194,250,255,.94)!important;
      box-shadow:0 0 13px rgba(111,235,255,.9),inset 0 0 12px rgba(165,246,255,.56)!important;
      animation:airshotShockPulse .18s ease-out infinite alternate;
    }
    .battle[data-airshot-effect="C"] .bullet.cannon::before,
    .battle[data-airshot-effect="C"] .bullet.cannon::after{
      content:"";position:absolute;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%) scaleX(.46);
    }
    .battle[data-airshot-effect="C"] .bullet.cannon::before{width:104px;height:104px;border:4px solid rgba(126,232,255,.64)}
    .battle[data-airshot-effect="C"] .bullet.cannon::after{width:144px;height:144px;border:3px solid rgba(77,203,239,.32)}
    @keyframes airshotShockPulse{from{filter:brightness(.9)}to{filter:brightness(1.35)}}
  `;
  document.head.appendChild(style);

  const patterns=Object.freeze({A:'圧縮空気弾',B:'風刃',C:'衝撃波'});
  let selected='A';

  const panel=document.createElement('div');
  panel.className='attackEffectReview';
  panel.innerHTML=`
    <div class="attackEffectReviewTitle">エアシュート エフェクト確認</div>
    <div class="attackEffectReviewPatterns">
      <button type="button" data-pattern="A">A</button>
      <button type="button" data-pattern="B">B</button>
      <button type="button" data-pattern="C">C</button>
    </div>
    <div class="attackEffectReviewDesc"></div>`;
  battle.appendChild(panel);

  const desc=panel.querySelector('.attackEffectReviewDesc');
  function applyPattern(pattern){
    if(!patterns[pattern])return;
    selected=pattern;
    battle.dataset.airshotEffect=pattern;
    panel.querySelectorAll('[data-pattern]').forEach(button=>button.classList.toggle('active',button.dataset.pattern===pattern));
    desc.textContent=`${pattern}：${patterns[pattern]}　※次に撃つエアシュートへ反映`;
  }

  panel.addEventListener('pointerdown',event=>event.stopPropagation());
  panel.addEventListener('click',event=>{
    const button=event.target.closest('[data-pattern]');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    applyPattern(button.dataset.pattern);
  });

  applyPattern(selected);
  window.BattleNetworkAttackEffectReview=Object.freeze({
    getChip:()=> 'AIRSHOT',
    getPattern:()=>selected,
    setPattern:applyPattern
  });
})();
