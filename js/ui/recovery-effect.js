(()=>{
  const player=document.getElementById('player');
  const scene=document.getElementById('scene');
  if(!player||!scene)return;

  const style=document.createElement('style');
  style.textContent=`
    .player.recoveryGlow{animation:recoveryPlayerGlow .78s ease-out both}
    @keyframes recoveryPlayerGlow{
      0%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
      28%{filter:brightness(1.65) saturate(1.35);box-shadow:0 0 18px rgba(120,255,158,.95),0 0 34px rgba(83,255,143,.68)}
      100%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
    }

    /* Recovery10: many large rings rise upward at a fixed diameter. */
    .healPulse{
      width:175px!important;
      height:175px!important;
      margin-left:-44.5px;
      margin-top:-44.5px;
      border:0!important;
      background:transparent!important;
      box-shadow:none!important;
      animation:none!important;
      pointer-events:none;
      overflow:visible;
    }
    .healPulse::before,.healPulse::after{display:none!important}
    .recoveryRiseRing{
      position:absolute;
      left:50%;top:50%;
      width:175px;height:175px;
      margin-left:-87.5px;margin-top:-87.5px;
      border:3px solid rgba(112,255,158,.96);
      border-radius:50%;
      background:transparent;
      box-shadow:0 0 12px rgba(83,255,143,.72),inset 0 0 8px rgba(120,255,158,.18);
      transform:translateY(38px) scaleY(.34);
      transform-origin:center;
      opacity:0;
      pointer-events:none;
      will-change:transform,opacity;
      animation:recoveryRingRise .72s ease-out forwards;
    }
    @keyframes recoveryRingRise{
      0%{transform:translateY(38px) scaleY(.34);opacity:0}
      9%{opacity:1}
      78%{opacity:.86}
      100%{transform:translateY(-128px) scaleY(.34);opacity:0}
    }
  `;
  document.head.appendChild(style);

  const RING_COUNT=9;
  const RING_INTERVAL_MS=55;
  let glowTimer=null;
  function flashPlayer(){
    if(glowTimer!==null){clearTimeout(glowTimer);glowTimer=null}
    player.classList.remove('recoveryGlow');
    void player.offsetWidth;
    player.classList.add('recoveryGlow');
    glowTimer=setTimeout(()=>{player.classList.remove('recoveryGlow');glowTimer=null},820);
  }
  function addRings(host){
    for(let i=0;i<RING_COUNT;i++){
      const ring=document.createElement('span');
      ring.className='recoveryRiseRing';
      ring.style.animationDelay=`${i*RING_INTERVAL_MS}ms`;
      host.appendChild(ring);
    }
  }

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType===1&&node.classList?.contains('healPulse')){
          addRings(node);
          flashPlayer();
          return;
        }
      }
    }
  });
  observer.observe(scene,{childList:true});
})();
