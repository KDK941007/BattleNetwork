(()=>{
  const previous=document.getElementById('recovery10DirectEffectStyle');
  if(previous)previous.remove();

  const style=document.createElement('style');
  style.id='recovery10DirectEffectStyle';
  style.textContent=`
    .recoveryRiseRing{display:none!important}
    .healPulse{
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
      z-index:3!important;
      will-change:opacity;
      transform:translate(-44.5px,-121px)!important;
      transform-origin:center;
      animation:recoveryRingStackBlink .95s ease-in-out forwards!important;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='175' height='220' viewBox='0 0 175 220'%3E%3Cg fill='none' stroke='%2370ff9e' stroke-width='4'%3E%3Cellipse cx='87.5' cy='200' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='178' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='156' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='134' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='112' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='90' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='68' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='46' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='24' rx='83' ry='18'/%3E%3C/g%3E%3C/svg%3E")!important;
      filter:drop-shadow(0 0 7px rgba(83,255,143,.9));
      pointer-events:none!important;
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
      animation:recoveryDirectPlayerGlow .95s ease-in-out both!important;
      isolation:isolate;
    }
    .player.recoveryEffectGlow::before{
      content:"";
      position:absolute;
      inset:-18px;
      border-radius:52px;
      z-index:-1;
      pointer-events:none;
      opacity:0;
      background:radial-gradient(ellipse at center,rgba(116,255,164,.72) 0%,rgba(83,255,143,.42) 38%,rgba(83,255,143,0) 74%);
      box-shadow:0 0 20px 8px rgba(112,255,158,.78),0 0 44px 16px rgba(83,255,143,.44);
      animation:recoveryPlayerAuraBlink .95s ease-in-out both!important;
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
      0%{
        filter:brightness(1) saturate(1) drop-shadow(0 0 0 rgba(112,255,158,0));
        box-shadow:0 0 12px #40cbff;
      }
      18%{
        filter:brightness(1.9) saturate(1.55) drop-shadow(0 0 12px rgba(112,255,158,1)) drop-shadow(0 0 26px rgba(83,255,143,1));
        box-shadow:0 0 26px rgba(120,255,158,1),0 0 52px rgba(83,255,143,.95);
      }
      38%{
        filter:brightness(1.12) saturate(1.08) drop-shadow(0 0 4px rgba(112,255,158,.32));
        box-shadow:0 0 14px rgba(83,255,143,.32);
      }
      58%{
        filter:brightness(1.85) saturate(1.5) drop-shadow(0 0 12px rgba(112,255,158,1)) drop-shadow(0 0 24px rgba(83,255,143,.92));
        box-shadow:0 0 25px rgba(120,255,158,1),0 0 48px rgba(83,255,143,.9);
      }
      78%{
        filter:brightness(1.1) saturate(1.05) drop-shadow(0 0 4px rgba(112,255,158,.25));
        box-shadow:0 0 14px rgba(83,255,143,.25);
      }
      100%{
        filter:brightness(1) saturate(1) drop-shadow(0 0 0 rgba(112,255,158,0));
        box-shadow:0 0 12px #40cbff;
      }
    }
  `;
  document.head.appendChild(style);

  function installGlowTrigger(){
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

    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(node instanceof HTMLElement&&node.classList.contains('healPulse')){
            triggerGlow();
            return;
          }
        }
      }
    });
    observer.observe(scene,{childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installGlowTrigger,{once:true});
  else installGlowTrigger();
})();
