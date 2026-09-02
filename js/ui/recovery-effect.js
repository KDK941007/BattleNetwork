(()=>{
  const previous=document.getElementById('recovery10DirectEffectStyle');
  if(previous)previous.remove();

  const style=document.createElement('style');
  style.id='recovery10DirectEffectStyle';
  style.textContent=`
    .recoveryRiseRing{display:none!important}
    .healPulse,.recoveryFrontPulse{
      position:absolute!important;
      width:175px!important;
      height:220px!important;
      border:0!important;
      border-radius:0!important;
      background-color:transparent!important;
      background-repeat:no-repeat!important;
      background-position:center!important;
      background-size:175px 220px!important;
      box-shadow:none!important;
      opacity:0!important;
      will-change:opacity;
      transform:translate(-44.5px,-121px)!important;
      transform-origin:center;
      animation:recoveryRingStackBlink .95s ease-in-out forwards!important;
      filter:drop-shadow(0 0 7px rgba(83,255,143,.9));
      pointer-events:none!important;
    }
    .healPulse{
      z-index:4!important;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='175' height='220' viewBox='0 0 175 220'%3E%3Cg fill='none' stroke='%2370ff9e' stroke-width='4'%3E%3Cellipse cx='87.5' cy='200' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='178' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='156' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='134' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='112' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='90' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='68' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='46' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='24' rx='83' ry='18'/%3E%3C/g%3E%3C/svg%3E")!important;
    }
    .recoveryFrontPulse{
      z-index:6!important;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='175' height='220' viewBox='0 0 175 220'%3E%3Cg fill='none' stroke='%2370ff9e' stroke-width='4' stroke-linecap='round'%3E%3Cpath d='M4.5 200 A83 18 0 0 0 170.5 200'/%3E%3Cpath d='M4.5 178 A83 18 0 0 0 170.5 178'/%3E%3Cpath d='M4.5 156 A83 18 0 0 0 170.5 156'/%3E%3Cpath d='M4.5 134 A83 18 0 0 0 170.5 134'/%3E%3Cpath d='M4.5 112 A83 18 0 0 0 170.5 112'/%3E%3Cpath d='M4.5 90 A83 18 0 0 0 170.5 90'/%3E%3Cpath d='M4.5 68 A83 18 0 0 0 170.5 68'/%3E%3Cpath d='M4.5 46 A83 18 0 0 0 170.5 46'/%3E%3Cpath d='M4.5 24 A83 18 0 0 0 170.5 24'/%3E%3C/g%3E%3C/svg%3E")!important;
    }
    @keyframes recoveryRingStackBlink{
      0%{opacity:0}
      18%{opacity:1}
      38%{opacity:.18}
      58%{opacity:1}
      78%{opacity:.22}
      100%{opacity:0}
    }

    .player{z-index:5!important}
    .player.recoveryEffectGlow{
      isolation:isolate;
      animation:recoveryDirectPlayerGlow .95s ease-in-out both!important;
    }
    .player.recoveryEffectGlow::before,
    .player.recoveryEffectGlow::after{
      content:"";
      position:absolute;
      pointer-events:none;
      opacity:0;
      animation:recoveryPlayerAuraBlink .95s ease-in-out both!important;
    }
    .player.recoveryEffectGlow::before{
      inset:-20px;
      border-radius:54px;
      z-index:-1;
      background:radial-gradient(ellipse at center,rgba(120,255,166,.9) 0%,rgba(83,255,143,.52) 38%,rgba(83,255,143,0) 74%);
      box-shadow:0 0 24px 10px rgba(112,255,158,.9),0 0 50px 18px rgba(83,255,143,.56);
    }
    .player.recoveryEffectGlow::after{
      inset:-2px;
      border-radius:inherit;
      z-index:1;
      background:rgba(92,255,146,.38);
      box-shadow:inset 0 0 18px rgba(190,255,210,.95),0 0 20px 7px rgba(83,255,143,.78);
      mix-blend-mode:screen;
    }
    @keyframes recoveryPlayerAuraBlink{
      0%{opacity:0}
      18%{opacity:1}
      38%{opacity:.18}
      58%{opacity:1}
      78%{opacity:.2}
      100%{opacity:0}
    }
    @keyframes recoveryDirectPlayerGlow{
      0%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
      18%{filter:brightness(2.05) saturate(1.65) drop-shadow(0 0 12px rgba(112,255,158,1));box-shadow:0 0 30px rgba(120,255,158,1),0 0 58px rgba(83,255,143,.98)}
      38%{filter:brightness(1.15) saturate(1.1);box-shadow:0 0 14px rgba(83,255,143,.35)}
      58%{filter:brightness(2) saturate(1.6) drop-shadow(0 0 12px rgba(112,255,158,1));box-shadow:0 0 28px rgba(120,255,158,1),0 0 54px rgba(83,255,143,.94)}
      78%{filter:brightness(1.12) saturate(1.08);box-shadow:0 0 14px rgba(83,255,143,.28)}
      100%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
    }
  `;
  document.head.appendChild(style);

  function installRecoveryEffect(){
    const scene=document.getElementById('scene');
    const player=document.getElementById('player');
    if(!scene||!player)return;

    let glowTimer=0;
    const triggerGlow=()=>{
      clearTimeout(glowTimer);
      player.classList.remove('recoveryEffectGlow');
      void player.offsetWidth;
      player.classList.add('recoveryEffectGlow');
      glowTimer=setTimeout(()=>player.classList.remove('recoveryEffectGlow'),1000);
    };

    const addFrontArcs=source=>{
      source.style.setProperty('z-index','4','important');
      player.style.setProperty('z-index','5','important');
      const front=document.createElement('div');
      front.className='recoveryFrontPulse';
      front.style.left=source.style.left;
      front.style.top=source.style.top;
      scene.appendChild(front);
      setTimeout(()=>front.remove(),700);
    };

    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(node instanceof HTMLElement&&node.classList.contains('healPulse')){
            triggerGlow();
            addFrontArcs(node);
          }
        }
      }
    });
    observer.observe(scene,{childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installRecoveryEffect,{once:true});
  else installRecoveryEffect();
})();
