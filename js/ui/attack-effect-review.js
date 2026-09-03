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
      width:104px!important;
      height:72px!important;
      border-radius:50%!important;
      background:radial-gradient(ellipse at 70% 50%,rgba(252,255,255,.99) 0 11%,rgba(196,251,255,.97) 20%,rgba(116,233,251,.88) 39%,rgba(62,198,232,.48) 61%,rgba(53,174,211,.12) 74%,transparent 80%)!important;
      box-shadow:0 0 18px rgba(166,248,255,.98),0 0 38px rgba(64,215,245,.88),0 0 62px rgba(52,189,228,.45)!important;
      filter:saturate(1.08);
    }

    /* A-1: 圧縮空気弾＋太い風の尾 */
    .battle[data-airshot-effect="A"] .bullet.cannon::before{
      content:"";position:absolute;right:62%;top:50%;width:190px;height:104px;transform:translateY(-50%);
      background:
        linear-gradient(90deg,transparent 0%,rgba(61,194,228,.10) 15%,rgba(119,229,250,.58) 58%,rgba(218,252,255,.98) 100%) 0 8px/100% 13px no-repeat,
        linear-gradient(90deg,transparent 0%,rgba(53,181,219,.08) 12%,rgba(104,219,245,.52) 54%,rgba(201,249,255,.96) 100%) 0 31px/92% 11px no-repeat,
        linear-gradient(90deg,transparent 0%,rgba(70,194,228,.08) 18%,rgba(123,226,248,.56) 62%,rgba(218,252,255,.94) 100%) 0 55px/97% 12px no-repeat,
        linear-gradient(90deg,transparent 0%,rgba(48,171,213,.06) 16%,rgba(91,208,239,.48) 58%,rgba(191,244,252,.88) 100%) 0 79px/82% 10px no-repeat;
      clip-path:polygon(0 14%,100% 0,100% 100%,0 86%);
      filter:drop-shadow(0 0 8px rgba(111,233,252,.82));
      opacity:.98;
    }
    .battle[data-airshot-effect="A"] .bullet.cannon::after{
      content:"";position:absolute;left:-8px;top:50%;width:78px;height:86px;border:7px solid rgba(202,252,255,.90);border-radius:50%;
      transform:translate(-50%,-50%) scaleX(.42);box-shadow:0 0 16px rgba(136,240,255,.88),inset 0 0 14px rgba(176,248,255,.58),0 0 30px rgba(74,209,242,.48);
    }

    /* A-2: 圧縮空気弾＋太い二重らせん風 */
    .battle[data-airshot-effect="B"] .bullet.cannon{
      box-shadow:0 0 20px rgba(175,250,255,1),0 0 42px rgba(59,214,245,.92),0 0 70px rgba(48,184,226,.48)!important;
    }
    .battle[data-airshot-effect="B"] .bullet.cannon::before,
    .battle[data-airshot-effect="B"] .bullet.cannon::after{
      content:"";position:absolute;right:53%;width:198px;height:74px;border-radius:50%;background:transparent;
      filter:drop-shadow(0 0 9px rgba(124,238,255,.92));
    }
    .battle[data-airshot-effect="B"] .bullet.cannon::before{
      top:-24px;
      border-top:10px solid rgba(226,254,255,.98);
      border-right:6px solid rgba(137,238,252,.72);
      border-left:4px solid rgba(94,217,244,.38);
      transform:rotate(7deg) scaleY(.86);
      box-shadow:0 -15px 0 -8px rgba(100,223,247,.72),0 15px 0 -8px rgba(153,244,255,.62),0 0 18px rgba(83,215,243,.38);
    }
    .battle[data-airshot-effect="B"] .bullet.cannon::after{
      bottom:-24px;
      border-bottom:10px solid rgba(169,246,255,.97);
      border-right:6px solid rgba(111,229,249,.68);
      border-left:4px solid rgba(73,202,236,.34);
      transform:rotate(-7deg) scaleY(.86);
      box-shadow:0 15px 0 -8px rgba(82,208,239,.72),0 -15px 0 -8px rgba(184,250,255,.56),0 0 18px rgba(67,202,235,.34);
    }

    /* A-3: 圧縮空気弾＋濃い霧状風圧 */
    .battle[data-airshot-effect="C"] .bullet.cannon{
      background:radial-gradient(ellipse at 68% 50%,rgba(251,255,255,.98) 0 9%,rgba(207,252,255,.92) 20%,rgba(118,231,249,.74) 42%,rgba(71,199,229,.33) 65%,transparent 80%)!important;
      box-shadow:0 0 22px rgba(177,250,255,.94),0 0 50px rgba(92,220,244,.68),0 0 78px rgba(64,185,221,.34)!important;
      filter:blur(.2px) saturate(1.05);
    }
    .battle[data-airshot-effect="C"] .bullet.cannon::before{
      content:"";position:absolute;right:48%;top:50%;width:220px;height:124px;transform:translateY(-50%);
      background:
        radial-gradient(ellipse at 90% 50%,rgba(220,253,255,.70) 0 16%,rgba(135,235,251,.42) 34%,transparent 61%),
        radial-gradient(ellipse at 66% 28%,rgba(161,242,253,.42) 0 18%,rgba(95,215,241,.20) 42%,transparent 64%),
        radial-gradient(ellipse at 48% 74%,rgba(136,232,248,.38) 0 20%,rgba(73,201,233,.18) 44%,transparent 66%),
        radial-gradient(ellipse at 22% 46%,rgba(103,216,241,.29) 0 18%,transparent 58%);
      filter:blur(8px);opacity:1;
    }
    .battle[data-airshot-effect="C"] .bullet.cannon::after{
      content:"";position:absolute;right:38%;top:50%;width:188px;height:102px;border-radius:50%;
      border-top:9px solid rgba(214,253,255,.88);
      border-bottom:9px solid rgba(126,232,251,.72);
      border-left:5px solid rgba(83,205,237,.32);
      transform:translateY(-50%) scaleY(.72);
      box-shadow:0 0 15px rgba(136,238,253,.72),inset 0 0 18px rgba(107,226,248,.28);
      opacity:.94;
    }
  `;
  document.head.appendChild(style);

  const patterns=Object.freeze({
    A:'A-1：圧縮空気弾＋太い風の尾',
    B:'A-2：圧縮空気弾＋太い二重らせん風',
    C:'A-3：圧縮空気弾＋濃い霧状風圧'
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
