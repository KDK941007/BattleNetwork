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
      inset:-1px;
      border-radius:inherit;
      z-index:1;
      pointer-events:none;
      opacity:0;
      background:rgba(74,255,135,.55);
      box-shadow:inset 0 0 22px rgba(220,255,230,1);
      mix-blend-mode:screen;
      animation:recoveryPlayerTint .9s ease-in-out both;
    }
    .recoverySparkParticle{
      position:absolute;
      width:11px;
      height:11px;
      z-index:12;
      pointer-events:none;
      opacity:0;
      border-radius:2px;
      background:#baffc9;
      box-shadow:0 0 6px 2px rgba(170,255,194,.95),0 0 13px 5px rgba(83,255,143,.72);
      transform:translate(-50%,-50%) rotate(45deg) scale(.55);
      animation:recoverySparkBlink .9s ease-in-out both;
    }
    .recoverySparkParticle::after{
      content:"";
      position:absolute;
      left:50%;
      top:50%;
      width:3px;
      height:17px;
      border-radius:3px;
      background:#eaffef;
      transform:translate(-50%,-50%) rotate(-45deg);
      box-shadow:0 0 6px rgba(210,255,224,.95);
    }
    @keyframes recoveryPlayerFlash{
      0%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
      18%{filter:brightness(1.85) saturate(1.55);box-shadow:0 0 0 3px rgba(165,255,190,.98),0 0 30px 12px rgba(83,255,143,.9)}
      38%{filter:brightness(1.08) saturate(1.06);box-shadow:0 0 14px rgba(83,255,143,.3)}
      58%{filter:brightness(1.8) saturate(1.5);box-shadow:0 0 0 3px rgba(165,255,190,.95),0 0 28px 11px rgba(83,255,143,.86)}
      78%{filter:brightness(1.08) saturate(1.06);box-shadow:0 0 14px rgba(83,255,143,.28)}
      100%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
    }
    @keyframes recoveryPlayerTint{
      0%{opacity:0}
      18%{opacity:.9}
      38%{opacity:.14}
      58%{opacity:.82}
      78%{opacity:.12}
      100%{opacity:0}
    }
    @keyframes recoverySparkBlink{
      0%{opacity:0;transform:translate(-50%,-50%) rotate(45deg) scale(.45)}
      18%{opacity:1;transform:translate(-50%,-50%) rotate(45deg) scale(1)}
      38%{opacity:.12;transform:translate(-50%,-50%) rotate(45deg) scale(.65)}
      58%{opacity:1;transform:translate(-50%,-50%) rotate(45deg) scale(.95)}
      78%{opacity:.1;transform:translate(-50%,-50%) rotate(45deg) scale(.6)}
      100%{opacity:0;transform:translate(-50%,-50%) rotate(45deg) scale(.45)}
    }
  `;
  document.head.appendChild(style);

  function installRecoveryEffect(){
    const scene=document.getElementById('scene');
    const player=document.getElementById('player');
    if(!scene||!player)return;

    const points=[
      [-18,8],[18,-12],[50,-18],[82,-12],[118,8],[122,38],
      [120,72],[88,110],[50,118],[12,110],[-20,72],[-22,38]
    ];
    let cleanupTimer=0;

    const clearEffect=()=>{
      clearTimeout(cleanupTimer);
      player.classList.remove('recoverySparkGlow');
      player.querySelectorAll('.recoverySparkParticle').forEach(el=>el.remove());
    };

    const triggerEffect=()=>{
      clearEffect();
      void player.offsetWidth;
      player.classList.add('recoverySparkGlow');

      points.forEach(([x,y],index)=>{
        const particle=document.createElement('span');
        particle.className='recoverySparkParticle';
        particle.style.left=`${x}%`;
        particle.style.top=`${y}%`;
        particle.style.animationDelay=`${index*22}ms`;
        player.appendChild(particle);
      });

      cleanupTimer=setTimeout(clearEffect,1200);
    };

    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(node instanceof HTMLElement&&node.classList.contains('healPulse')){
            triggerEffect();
            return;
          }
        }
      }
    });
    observer.observe(scene,{childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installRecoveryEffect,{once:true});
  else installRecoveryEffect();
})();
