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
      background:rgba(74,255,135,.72);
      box-shadow:inset 0 0 26px rgba(235,255,241,1),0 0 24px 8px rgba(83,255,143,.88);
      mix-blend-mode:screen;
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
      background:#d5ffdf;
      box-shadow:0 0 8px 3px rgba(185,255,204,1),0 0 17px 7px rgba(83,255,143,.9);
      transform:translate(-50%,-50%) rotate(45deg) scale(.5);
      animation:recoverySparkBlink .9s ease-in-out both;
    }
    .recoverySparkParticle::before,
    .recoverySparkParticle::after{
      content:"";
      position:absolute;
      left:50%;
      top:50%;
      border-radius:3px;
      background:#f1fff4;
      box-shadow:0 0 7px rgba(225,255,234,1);
      transform:translate(-50%,-50%) rotate(-45deg);
    }
    .recoverySparkParticle::before{width:3px;height:21px}
    .recoverySparkParticle::after{width:21px;height:3px}

    @keyframes recoveryPlayerFlash{
      0%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
      18%{filter:brightness(2.05) saturate(1.7);box-shadow:0 0 0 4px rgba(185,255,204,1),0 0 36px 15px rgba(83,255,143,.98)}
      38%{filter:brightness(1.12) saturate(1.1);box-shadow:0 0 15px rgba(83,255,143,.34)}
      58%{filter:brightness(1.95) saturate(1.65);box-shadow:0 0 0 4px rgba(185,255,204,.98),0 0 34px 14px rgba(83,255,143,.94)}
      78%{filter:brightness(1.1) saturate(1.08);box-shadow:0 0 14px rgba(83,255,143,.3)}
      100%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
    }
    @keyframes recoveryPlayerTint{
      0%{opacity:0}
      18%{opacity:1}
      38%{opacity:.16}
      58%{opacity:.95}
      78%{opacity:.14}
      100%{opacity:0}
    }
    @keyframes recoverySparkBlink{
      0%{opacity:0;transform:translate(-50%,-50%) rotate(45deg) scale(.4)}
      18%{opacity:1;transform:translate(-50%,-50%) rotate(45deg) scale(1.15)}
      38%{opacity:.14;transform:translate(-50%,-50%) rotate(45deg) scale(.65)}
      58%{opacity:1;transform:translate(-50%,-50%) rotate(45deg) scale(1.05)}
      78%{opacity:.12;transform:translate(-50%,-50%) rotate(45deg) scale(.6)}
      100%{opacity:0;transform:translate(-50%,-50%) rotate(45deg) scale(.4)}
    }
  `;
  document.head.appendChild(style);

  const points=[
    [-12,10],[16,-8],[50,-16],[84,-8],[112,10],[120,38],
    [116,72],[88,106],[50,116],[12,106],[-16,72],[-20,38]
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

    points.forEach(([x,y],index)=>{
      const particle=document.createElement('span');
      particle.className='recoverySparkParticle';
      particle.style.left=`${x}%`;
      particle.style.top=`${y}%`;
      particle.style.animationDelay=`${index*18}ms`;
      player.appendChild(particle);
    });

    cleanupTimer=setTimeout(clearEffect,1200);
    return true;
  }

  window.BattleNetworkRecoveryEffect=Object.freeze({trigger:triggerEffect,clear:clearEffect});
})();
