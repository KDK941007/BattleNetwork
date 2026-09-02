(()=>{
  const previous=document.getElementById('recovery10DirectEffectStyle');
  if(previous)previous.remove();

  const style=document.createElement('style');
  style.id='recovery10DirectEffectStyle';
  style.textContent=`
    .healPulse,.recoveryRiseRing,.recoveryFrontPulse{display:none!important}

    .player.recoverySparkGlow{
      overflow:visible!important;
      animation:recoveryPlayerFlash .9s ease-in-out both!important;
    }
    .player.recoverySparkGlow::after{
      content:"";
      position:absolute;
      inset:-2px;
      border-radius:inherit;
      z-index:13;
      pointer-events:none;
      opacity:0;
      background:rgba(46,255,104,.46);
      box-shadow:inset 0 0 24px rgba(102,255,145,.92),0 0 26px 9px rgba(48,255,104,.88);
      animation:recoveryPlayerTint .9s ease-in-out both;
    }
    .recoverySparkParticle{
      position:absolute;
      width:13px;
      height:13px;
      z-index:14;
      pointer-events:none;
      opacity:0;
      border-radius:2px;
      background:#78ff9d;
      box-shadow:0 0 8px 3px rgba(92,255,136,1),0 0 17px 7px rgba(38,255,98,.9);
      transform:translate(-50%,-50%) rotate(45deg) scale(calc(.5 * var(--spark-scale,1)));
      animation:recoverySparkBlink .9s ease-in-out both;
    }
    .recoverySparkParticle::before,
    .recoverySparkParticle::after{
      content:"";
      position:absolute;
      left:50%;
      top:50%;
      border-radius:3px;
      background:#a7ffbd;
      box-shadow:0 0 7px rgba(72,255,121,1);
      transform:translate(-50%,-50%) rotate(-45deg);
    }
    .recoverySparkParticle::before{width:3px;height:21px}
    .recoverySparkParticle::after{width:21px;height:3px}

    @keyframes recoveryPlayerFlash{
      0%{filter:brightness(1) saturate(1);box-shadow:0 0 12px rgba(48,255,104,.16)}
      18%{filter:brightness(1.72) saturate(1.42);box-shadow:0 0 0 4px rgba(92,255,136,.98),0 0 36px 15px rgba(38,255,98,.96)}
      38%{filter:brightness(1.08) saturate(1.05);box-shadow:0 0 15px rgba(38,255,98,.3)}
      58%{filter:brightness(1.66) saturate(1.38);box-shadow:0 0 0 4px rgba(92,255,136,.96),0 0 34px 14px rgba(38,255,98,.92)}
      78%{filter:brightness(1.06) saturate(1.04);box-shadow:0 0 14px rgba(38,255,98,.28)}
      100%{filter:brightness(1) saturate(1);box-shadow:0 0 12px rgba(48,255,104,.16)}
    }
    @keyframes recoveryPlayerTint{
      0%{opacity:0}
      18%{opacity:.92}
      38%{opacity:.1}
      58%{opacity:.86}
      78%{opacity:.08}
      100%{opacity:0}
    }
    @keyframes recoverySparkBlink{
      0%{opacity:0;transform:translate(-50%,-50%) rotate(45deg) scale(calc(.38 * var(--spark-scale,1)))}
      18%{opacity:1;transform:translate(-50%,-50%) rotate(45deg) scale(calc(1.12 * var(--spark-scale,1)))}
      38%{opacity:.12;transform:translate(-50%,-50%) rotate(45deg) scale(calc(.62 * var(--spark-scale,1)))}
      58%{opacity:1;transform:translate(-50%,-50%) rotate(45deg) scale(calc(1.02 * var(--spark-scale,1)))}
      78%{opacity:.1;transform:translate(-50%,-50%) rotate(45deg) scale(calc(.56 * var(--spark-scale,1)))}
      100%{opacity:0;transform:translate(-50%,-50%) rotate(45deg) scale(calc(.38 * var(--spark-scale,1)))}
    }
  `;
  document.head.appendChild(style);

  const sparks=[
    {x:-28,y:18,scale:.78,delay:42},
    {x:14,y:-24,scale:1.02,delay:6},
    {x:76,y:-32,scale:.72,delay:138},
    {x:132,y:4,scale:1.12,delay:72},
    {x:106,y:32,scale:.68,delay:188},
    {x:146,y:57,scale:.94,delay:24},
    {x:124,y:101,scale:.8,delay:126},
    {x:74,y:128,scale:1.08,delay:58},
    {x:18,y:114,scale:.7,delay:174},
    {x:-32,y:94,scale:1,delay:92},
    {x:-8,y:61,scale:.76,delay:214},
    {x:-46,y:36,scale:.9,delay:148}
  ];
  let cleanupTimer=0;

  function clearEffect(){
    const player=document.getElementById('player');
    clearTimeout(cleanupTimer);
    if(!player)return;
    player.classList.remove('recoverySparkGlow');
    player.querySelectorAll('.recoverySparkParticle').forEach(el=>el.remove());
  }

  function triggerEffect(){
    const player=document.getElementById('player');
    if(!player)return false;

    clearEffect();
    void player.offsetWidth;
    player.classList.add('recoverySparkGlow');

    sparks.forEach(({x,y,scale,delay})=>{
      const particle=document.createElement('span');
      particle.className='recoverySparkParticle';
      particle.style.left=`${x}%`;
      particle.style.top=`${y}%`;
      particle.style.setProperty('--spark-scale',String(scale));
      particle.style.animationDelay=`${delay}ms`;
      player.appendChild(particle);
    });

    cleanupTimer=setTimeout(clearEffect,1250);
    return true;
  }

  window.BattleNetworkRecoveryEffect=Object.freeze({trigger:triggerEffect,clear:clearEffect});
})();
