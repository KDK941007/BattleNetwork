(()=>{
  const player=document.getElementById('player');
  const scene=document.getElementById('scene');
  if(!player||!scene)return;

  const style=document.createElement('style');
  style.textContent=`
    .player.recoveryGlow{animation:recoveryPlayerGlow .82s ease-out both}
    @keyframes recoveryPlayerGlow{
      0%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
      28%{filter:brightness(1.65) saturate(1.35);box-shadow:0 0 18px rgba(120,255,158,.95),0 0 34px rgba(83,255,143,.68)}
      100%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
    }
    .healPulse{opacity:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
    .recoveryRiseRing{
      position:absolute;
      z-index:9;
      width:175px;
      height:175px;
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
      8%{opacity:1}
      80%{opacity:.88}
      100%{transform:translateY(-128px) scaleY(.34);opacity:0}
    }
  `;
  document.head.appendChild(style);

  const RING_SIZE=175;
  const RING_COUNT=9;
  const RING_INTERVAL_MS=55;
  const RING_DURATION_MS=720;
  let glowTimer=null;

  function flashPlayer(){
    if(glowTimer!==null){clearTimeout(glowTimer);glowTimer=null}
    player.classList.remove('recoveryGlow');
    void player.offsetWidth;
    player.classList.add('recoveryGlow');
    glowTimer=setTimeout(()=>{player.classList.remove('recoveryGlow');glowTimer=null},860);
  }

  function emitRings(source){
    const left=parseFloat(source.style.left);
    const top=parseFloat(source.style.top);
    const sourceWidth=parseFloat(source.style.width);
    const sourceHeight=parseFloat(source.style.height);
    if(!Number.isFinite(left)||!Number.isFinite(top)||!Number.isFinite(sourceWidth)||!Number.isFinite(sourceHeight))return;
    const centerX=left+sourceWidth/2;
    const centerY=top+sourceHeight/2;
    for(let i=0;i<RING_COUNT;i++){
      const ring=document.createElement('span');
      ring.className='recoveryRiseRing';
      ring.style.left=`${centerX-RING_SIZE/2}px`;
      ring.style.top=`${centerY-RING_SIZE/2}px`;
      ring.style.animationDelay=`${i*RING_INTERVAL_MS}ms`;
      scene.appendChild(ring);
      setTimeout(()=>ring.remove(),RING_DURATION_MS+i*RING_INTERVAL_MS+80);
    }
  }

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType===1&&node.classList?.contains('healPulse')){
          emitRings(node);
          flashPlayer();
        }
      }
    }
  });
  observer.observe(scene,{childList:true});
})();
