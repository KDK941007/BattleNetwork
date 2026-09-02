(()=>{
  const player=document.getElementById('player');
  const scene=document.getElementById('scene');
  if(!player||!scene)return;

  const style=document.createElement('style');
  style.textContent=`
    .player.recoveryGlow{animation:recoveryPlayerGlow .9s ease-out both}
    @keyframes recoveryPlayerGlow{
      0%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
      28%{filter:brightness(1.65) saturate(1.35);box-shadow:0 0 18px rgba(120,255,158,.95),0 0 34px rgba(83,255,143,.68)}
      100%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
    }
    .healPulse{opacity:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
    .recoveryRiseRing{
      position:absolute;
      z-index:12;
      width:175px;
      height:175px;
      border:4px solid rgba(112,255,158,.98);
      border-radius:50%;
      background:transparent;
      box-shadow:0 0 16px rgba(83,255,143,.82),inset 0 0 10px rgba(120,255,158,.22);
      pointer-events:none;
      transform-origin:center;
      will-change:transform,opacity;
    }
  `;
  document.head.appendChild(style);

  const RING_SIZE=175;
  const RING_COUNT=9;
  const RING_INTERVAL_MS=55;
  const RING_DURATION_MS=720;
  const START_Y=38;
  const END_Y=-128;
  let glowTimer=null;

  function flashPlayer(){
    if(glowTimer!==null)clearTimeout(glowTimer);
    player.classList.remove('recoveryGlow');
    void player.offsetWidth;
    player.classList.add('recoveryGlow');
    glowTimer=setTimeout(()=>{
      player.classList.remove('recoveryGlow');
      glowTimer=null;
    },940);
  }

  function createRing(centerX,centerY){
    const ring=document.createElement('span');
    ring.className='recoveryRiseRing';
    ring.style.left=`${centerX-RING_SIZE/2}px`;
    ring.style.top=`${centerY-RING_SIZE/2}px`;
    ring.style.opacity='1';
    ring.style.transform=`translateY(${START_Y}px) scaleY(.34)`;
    ring.style.transition=`transform ${RING_DURATION_MS}ms ease-out, opacity ${RING_DURATION_MS}ms ease-out`;
    scene.appendChild(ring);

    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      ring.style.transform=`translateY(${END_Y}px) scaleY(.34)`;
      ring.style.opacity='0';
    }));
    setTimeout(()=>ring.remove(),RING_DURATION_MS+80);
  }

  function emitRings(source){
    const left=parseFloat(source.style.left);
    const top=parseFloat(source.style.top);
    const sourceWidth=parseFloat(source.style.width);
    const sourceHeight=parseFloat(source.style.height);
    if(!Number.isFinite(left)||!Number.isFinite(top)||!Number.isFinite(sourceWidth)||!Number.isFinite(sourceHeight)){
      console.error('BattleNetwork Recovery10: healPulse position is invalid.');
      return;
    }
    const centerX=left+sourceWidth/2;
    const centerY=top+sourceHeight/2;
    for(let i=0;i<RING_COUNT;i++)setTimeout(()=>createRing(centerX,centerY),i*RING_INTERVAL_MS);
    flashPlayer();
  }

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType===1&&node.classList?.contains('healPulse'))emitRings(node);
      }
    }
  });
  observer.observe(scene,{childList:true});
})();
