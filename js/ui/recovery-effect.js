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
      z-index:4!important;
      will-change:opacity;
      transform:translate(-44.5px,-121px)!important;
      transform-origin:center;
      animation:recoveryRingStackBlink .95s ease-in-out forwards!important;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='175' height='220' viewBox='0 0 175 220'%3E%3Cg fill='none' stroke='%2370ff9e' stroke-width='4'%3E%3Cellipse cx='87.5' cy='200' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='178' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='156' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='134' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='112' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='90' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='68' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='46' rx='83' ry='18'/%3E%3Cellipse cx='87.5' cy='24' rx='83' ry='18'/%3E%3C/g%3E%3C/svg%3E")!important;
      filter:drop-shadow(0 0 7px rgba(83,255,143,.9));
    }
    @keyframes recoveryRingStackBlink{
      0%{opacity:0}
      18%{opacity:1}
      38%{opacity:.18}
      58%{opacity:1}
      78%{opacity:.22}
      100%{opacity:0}
    }
    .player.recoveryEffectGlow{
      animation:recoveryDirectPlayerGlow .95s ease-in-out both!important;
    }
    @keyframes recoveryDirectPlayerGlow{
      0%{
        filter:brightness(1) saturate(1) drop-shadow(0 0 0 rgba(112,255,158,0));
        box-shadow:0 0 12px #40cbff;
      }
      18%{
        filter:brightness(1.75) saturate(1.45) drop-shadow(0 0 10px rgba(112,255,158,1)) drop-shadow(0 0 22px rgba(83,255,143,.9));
        box-shadow:0 0 22px rgba(120,255,158,1),0 0 44px rgba(83,255,143,.9);
      }
      38%{
        filter:brightness(1.12) saturate(1.08) drop-shadow(0 0 4px rgba(112,255,158,.32));
        box-shadow:0 0 14px rgba(83,255,143,.32);
      }
      58%{
        filter:brightness(1.7) saturate(1.4) drop-shadow(0 0 10px rgba(112,255,158,.95)) drop-shadow(0 0 20px rgba(83,255,143,.82));
        box-shadow:0 0 21px rgba(120,255,158,.95),0 0 40px rgba(83,255,143,.82);
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
