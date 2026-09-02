(()=>{
  const player=document.getElementById('player');
  const scene=document.getElementById('scene');
  if(!player||!scene)return;

  const style=document.createElement('style');
  style.textContent=`
    .player.recoveryGlow{animation:recoveryPlayerGlow .5s ease-out both}
    @keyframes recoveryPlayerGlow{
      0%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
      32%{filter:brightness(1.65) saturate(1.35);box-shadow:0 0 18px rgba(120,255,158,.95),0 0 34px rgba(83,255,143,.68)}
      100%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
    }

    /* Recovery10: character-sized rings rise upward without changing diameter. */
    .healPulse{
      width:70px!important;
      height:70px!important;
      margin-left:8px;
      margin-top:8px;
      border:3px solid rgba(112,255,158,.96)!important;
      background:transparent!important;
      box-shadow:0 0 12px rgba(83,255,143,.72),inset 0 0 8px rgba(120,255,158,.22);
      animation:recoveryRingRiseA .62s ease-out forwards!important;
      transform:scaleY(.34);
      transform-origin:center;
      will-change:transform,opacity;
    }
    .healPulse::before,.healPulse::after{
      content:"";
      position:absolute;
      left:50%;top:50%;
      width:100%;height:100%;
      border-radius:50%;
      border:3px solid rgba(165,255,192,.92);
      background:transparent;
      box-shadow:0 0 10px rgba(83,255,143,.6);
      pointer-events:none;
      transform:translate(-50%,-50%) scaleY(1);
      opacity:0;
      will-change:transform,opacity;
    }
    .healPulse::before{animation:recoveryRingRiseB .62s .08s ease-out forwards}
    .healPulse::after{animation:recoveryRingRiseC .62s .16s ease-out forwards}

    @keyframes recoveryRingRiseA{
      0%{transform:translateY(18px) scaleY(.34);opacity:1}
      78%{opacity:.88}
      100%{transform:translateY(-96px) scaleY(.34);opacity:0}
    }
    @keyframes recoveryRingRiseB{
      0%{transform:translate(-50%,calc(-50% + 18px)) scaleY(1);opacity:0}
      10%{opacity:1}
      78%{opacity:.82}
      100%{transform:translate(-50%,calc(-50% - 96px)) scaleY(1);opacity:0}
    }
    @keyframes recoveryRingRiseC{
      0%{transform:translate(-50%,calc(-50% + 18px)) scaleY(1);opacity:0}
      10%{opacity:.9}
      78%{opacity:.72}
      100%{transform:translate(-50%,calc(-50% - 96px)) scaleY(1);opacity:0}
    }
  `;
  document.head.appendChild(style);

  let glowTimer=null;
  function flashPlayer(){
    if(glowTimer!==null){clearTimeout(glowTimer);glowTimer=null}
    player.classList.remove('recoveryGlow');
    void player.offsetWidth;
    player.classList.add('recoveryGlow');
    glowTimer=setTimeout(()=>{player.classList.remove('recoveryGlow');glowTimer=null},540);
  }

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType===1&&node.classList?.contains('healPulse')){flashPlayer();return}
      }
    }
  });
  observer.observe(scene,{childList:true});
})();
