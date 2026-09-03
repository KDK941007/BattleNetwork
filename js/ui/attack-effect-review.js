(()=>{
  const testTarget=window.BattleNetworkFolder?.getTestTarget?.();
  if(!testTarget?.enabled||testTarget.type!=='AIRSHOT')return;

  const battle=document.getElementById('battle');
  if(!battle)return;

  const style=document.createElement('style');
  style.id='attackEffectReviewStyle';
  style.textContent=`
    .attackEffectReview{
      position:absolute;right:8px;top:8px;z-index:76;width:min(310px,44vw);
      padding:8px;border:1px solid rgba(119,228,255,.82);border-radius:10px;
      background:rgba(4,22,31,.94);box-shadow:0 8px 24px rgba(0,0,0,.42),inset 0 0 0 1px rgba(173,244,255,.08);
      color:#effdff;pointer-events:auto;touch-action:none;
    }
    .attackEffectReviewTitle{font-size:12px;font-weight:1000;letter-spacing:.4px;color:#bff5ff;margin-bottom:6px}
    .attackEffectReviewPatterns{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:6px}
    .attackEffectReview button{min-width:0;height:34px;padding:0 6px;border:1px solid #39748a;border-radius:7px;background:#0b3040;color:#eaffff;font-size:11px;font-weight:1000;touch-action:none}
    .attackEffectReview button.active{border-color:#ffe66d;background:#59470d;color:#fff5b6;box-shadow:0 0 9px rgba(255,221,87,.42)}
    .attackEffectReviewDesc{font-size:10px;font-weight:900;color:#d8f8ff;line-height:1.4}

    .battle[data-airshot-effect] .bullet.cannon{
      overflow:visible!important;
      border:0!important;
      pointer-events:none!important;
      transform-origin:center!important;
      width:86px!important;
      height:40px!important;
      border-radius:50%!important;
      background:radial-gradient(ellipse at 70% 50%,rgba(249,255,255,.99) 0 10%,rgba(188,248,255,.94) 19%,rgba(103,226,247,.78) 38%,rgba(54,188,224,.26) 62%,transparent 73%)!important;
      box-shadow:0 0 12px rgba(134,241,255,.95),0 0 25px rgba(64,207,239,.66)!important;
    }

    /* A-1: 圧縮空気弾＋細い風の尾 */
    .battle[data-airshot-effect="A"] .bullet.cannon::before{
      content:"";position:absolute;right:66%;top:50%;width:132px;height:44px;transform:translateY(-50%);
      background:
        linear-gradient(90deg,transparent 0%,rgba(89,211,239,.10) 26%,rgba(150,239,255,.78) 77%,rgba(231,255,255,.96) 100%) 0 7px/100% 5px no-repeat,
        linear-gradient(90deg,transparent 0%,rgba(69,195,228,.07) 18%,rgba(117,225,247,.58) 70%,rgba(208,251,255,.90) 100%) 0 19px/88% 4px no-repeat,
        linear-gradient(90deg,transparent 0%,rgba(79,201,231,.05) 30%,rgba(109,218,243,.48) 75%,rgba(194,246,255,.82) 100%) 0 31px/74% 4px no-repeat;
      clip-path:polygon(0 24%,100% 0,100% 100%,0 76%);
      filter:drop-shadow(0 0 4px rgba(93,225,250,.45));
    }
    .battle[data-airshot-effect="A"] .bullet.cannon::after{
      content:"";position:absolute;left:-8px;top:50%;width:40px;height:40px;border:3px solid rgba(176,247,255,.72);border-radius:50%;
      transform:translate(-50%,-50%) scaleX(.40);box-shadow:0 0 10px rgba(101,231,255,.58),inset 0 0 8px rgba(168,245,255,.35);
    }

    /* A-2: 圧縮空気弾＋二重らせん風 */
    .battle[data-airshot-effect="B"] .bullet.cannon{
      box-shadow:0 0 14px rgba(145,244,255,.98),0 0 30px rgba(59,205,239,.74)!important;
    }
    .battle[data-airshot-effect="B"] .bullet.cannon::before,
    .battle[data-airshot-effect="B"] .bullet.cannon::after{
      content:"";position:absolute;right:58%;width:138px;height:34px;border-radius:50%;background:transparent;
      filter:drop-shadow(0 0 5px rgba(108,230,250,.72));
    }
    .battle[data-airshot-effect="B"] .bullet.cannon::before{
      top:-6px;border-top:4px solid rgba(209,252,255,.94);border-right:2px solid rgba(119,230,249,.42);
      transform:rotate(6deg) scaleY(.74);
      box-shadow:0 -7px 0 -4px rgba(93,211,240,.42),0 7px 0 -4px rgba(123,236,252,.36);
    }
    .battle[data-airshot-effect="B"] .bullet.cannon::after{
      bottom:-6px;border-bottom:4px solid rgba(141,239,255,.9);border-right:2px solid rgba(98,218,244,.38);
      transform:rotate(-6deg) scaleY(.74);
      box-shadow:0 7px 0 -4px rgba(70,196,232,.42),0 -7px 0 -4px rgba(168,246,255,.32);
    }

    /* A-3: 圧縮空気弾＋霧状の風圧 */
    .battle[data-airshot-effect="C"] .bullet.cannon{
      background:radial-gradient(ellipse at 68% 50%,rgba(248,255,255,.93) 0 8%,rgba(188,247,255,.76) 20%,rgba(93,219,244,.42) 43%,rgba(65,188,220,.12) 66%,transparent 76%)!important;
      box-shadow:0 0 14px rgba(159,245,255,.76),0 0 34px rgba(84,207,235,.45)!important;
      filter:blur(.15px);
    }
    .battle[data-airshot-effect="C"] .bullet.cannon::before{
      content:"";position:absolute;right:58%;top:50%;width:152px;height:58px;transform:translateY(-50%);
      background:
        radial-gradient(ellipse at 88% 50%,rgba(196,248,255,.48) 0 12%,rgba(112,226,246,.28) 28%,transparent 55%),
        radial-gradient(ellipse at 54% 35%,rgba(141,235,250,.26) 0 15%,transparent 50%),
        radial-gradient(ellipse at 28% 67%,rgba(104,214,239,.19) 0 17%,transparent 54%);
      filter:blur(5px);opacity:.9;
    }
    .battle[data-airshot-effect="C"] .bullet.cannon::after{
      content:"";position:absolute;left:50%;top:50%;width:108px;height:58px;border:3px solid rgba(181,247,255,.48);border-radius:50%;
      transform:translate(-50%,-50%) scaleX(.48);box-shadow:0 0 13px rgba(119,231,250,.45);opacity:.78;
    }
  `;
  document.head.appendChild(style);

  const patterns=Object.freeze({
    A:'A-1：圧縮空気弾＋細い風の尾',
    B:'A-2：圧縮空気弾＋二重らせん風',
    C:'A-3：圧縮空気弾＋霧状の風圧'
  });
  let selected='A';

  const panel=document.createElement('div');
  panel.className='attackEffectReview';
  panel.innerHTML=`
    <div class="attackEffectReviewTitle">エアシュート 風エフェクト比較</div>
    <div class="attackEffectReviewPatterns">
      <button type="button" data-pattern="A">A-1</button>
      <button type="button" data-pattern="B">A-2</button>
      <button type="button" data-pattern="C">A-3</button>
    </div>
    <div class="attackEffectReviewDesc"></div>`;
  battle.appendChild(panel);

  const desc=panel.querySelector('.attackEffectReviewDesc');
  function applyPattern(pattern){
    if(!patterns[pattern])return;
    selected=pattern;
    battle.dataset.airshotEffect=pattern;
    panel.querySelectorAll('[data-pattern]').forEach(button=>button.classList.toggle('active',button.dataset.pattern===pattern));
    desc.textContent=`${patterns[pattern]}　※次に撃つエアシュートへ反映`;
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
