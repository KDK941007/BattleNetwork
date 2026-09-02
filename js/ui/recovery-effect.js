(()=>{
  const previous=document.getElementById('recovery10DirectEffectStyle');
  if(previous)previous.remove();

  const style=document.createElement('style');
  style.id='recovery10DirectEffectStyle';
  style.textContent=`
    .recoveryRiseRing,.recoveryFrontPulse{display:none!important}
    .healPulse{
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

    .player{
      z-index:5!important;
      overflow:visible!important;
    }
    .recoveryPlayerGlowLayer{
      position:absolute;
      inset:-24px;
      border-radius:60px;
      z-index:10;
      pointer-events:none;
      opacity:0;
      background:radial-gradient(ellipse at center,rgba(95,255,150,.68) 0%,rgba(70,255,135,.46) 42%,rgba(83,255,143,.16) 63%,rgba(83,255,143,0) 78%);
      box-shadow:0 0 24px 10px rgba(112,255,158,.98),0 0 52px 20px rgba(83,255,143,.72);
      mix-blend-mode:screen;
      animation:recoveryPlayerGlowBlink .95s ease-in-out both;
    }
    .recoveryPlayerGlowCore{
      position:absolute;
      inset:-3px;
      border-radius:inherit;
      z-index:11;
      pointer-events:none;
      opacity:0;
      background:rgba(68,255,132,.58);
      box-shadow:inset 0 0 20px rgba(215,255,226,1),0 0 20px 7px rgba(83,255,143,.92);
      mix-blend-mode:screen;
      animation:recoveryPlayerGlowBlink .95s ease-in-out both;
    }
    @keyframes recoveryPlayerGlowBlink{
      0%{opacity:0}
      18%{opacity:1}
      38%{opacity:.18}
      58%{opacity:1}
      78%{opacity:.2}
      100%{opacity:0}
    }
  `;
  document.head.appendChild(style);

  function installRecoveryEffect(){
    const scene=document.getElementById('scene');
    const player=document.getElementById('player');
    if(!scene||!player)return;

    let cleanupTimer=0;
    const triggerPlayerGlow=()=>{
      clearTimeout(cleanupTimer);
      player.querySelectorAll('.recoveryPlayerGlowLayer,.recoveryPlayerGlowCore').forEach(el=>el.remove());

      const aura=document.createElement('div');
      aura.className='recoveryPlayerGlowLayer';
      const core=document.createElement('div');
      core.className='recoveryPlayerGlowCore';
      player.append(aura,core);

      cleanupTimer=setTimeout(()=>{
        aura.remove();
        core.remove();
      },1000);
    };

    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(node instanceof HTMLElement&&node.classList.contains('healPulse')){
            node.style.setProperty('z-index','3','important');
            player.style.setProperty('z-index','5','important');
            triggerPlayerGlow();
          }
        }
      }
    });
    observer.observe(scene,{childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installRecoveryEffect,{once:true});
  else installRecoveryEffect();
})();
