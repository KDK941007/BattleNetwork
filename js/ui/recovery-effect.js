(()=>{
  const player=document.getElementById('player');
  const scene=document.getElementById('scene');
  const aButton=document.getElementById('A');
  const queue=document.getElementById('queue');
  if(!player||!scene)return;

  const style=document.createElement('style');
  style.textContent=`
    .player.recoveryGlow{animation:recoveryPlayerGlow .9s ease-out both}
    @keyframes recoveryPlayerGlow{
      0%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
      28%{filter:brightness(1.65) saturate(1.35);box-shadow:0 0 18px rgba(120,255,158,.95),0 0 34px rgba(83,255,143,.68)}
      100%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
    }
    .recoveryRiseRing{
      position:absolute;
      z-index:30;
      left:-33.5px;
      top:92px;
      width:175px;
      height:175px;
      border:4px solid rgba(112,255,158,.98);
      border-radius:50%;
      background:transparent;
      box-shadow:0 0 16px rgba(83,255,143,.88),inset 0 0 10px rgba(120,255,158,.24);
      pointer-events:none;
      opacity:0;
      transform:translateY(28px) scaleY(.34);
      transform-origin:center;
      will-change:transform,opacity;
    }
  `;
  document.head.appendChild(style);

  const RING_COUNT=9;
  const RING_INTERVAL_MS=55;
  const RING_DURATION_MS=720;
  const START_Y=28;
  const END_Y=-155;
  const STARTUP_MS=100;
  let glowTimer=null;
  let lastPlayAt=-Infinity;

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

  function createRing(delayMs){
    setTimeout(()=>{
      const ring=document.createElement('span');
      ring.className='recoveryRiseRing';
      player.appendChild(ring);

      const animation=ring.animate([
        {transform:`translateY(${START_Y}px) scaleY(.34)`,opacity:0},
        {transform:`translateY(${START_Y-8}px) scaleY(.34)`,opacity:1,offset:.08},
        {transform:`translateY(${END_Y+28}px) scaleY(.34)`,opacity:.9,offset:.78},
        {transform:`translateY(${END_Y}px) scaleY(.34)`,opacity:0}
      ],{duration:RING_DURATION_MS,easing:'ease-out',fill:'forwards'});
      animation.onfinish=()=>ring.remove();
      setTimeout(()=>ring.remove(),RING_DURATION_MS+120);
    },delayMs);
  }

  function play(){
    const now=performance.now();
    if(now-lastPlayAt<180)return false;
    lastPlayAt=now;
    flashPlayer();
    for(let i=0;i<RING_COUNT;i++)createRing(i*RING_INTERVAL_MS);
    return true;
  }

  // Primary trigger for the current battle: capture the A press before game.js consumes
  // the first queue entry, then play at the confirmed common Recovery startup timing.
  if(aButton&&queue){
    aButton.addEventListener('pointerdown',()=>{
      const first=queue.querySelector('.q:first-child:not(.empty)');
      const label=first?.textContent||'';
      if(!label.includes('リカバリー'))return;
      if(document.getElementById('customModal')?.classList.contains('open'))return;
      if(document.getElementById('settingsModal')?.classList.contains('open'))return;
      setTimeout(play,STARTUP_MS);
    },true);
  }

  // Fallback for any existing code path that still emits the legacy healPulse node.
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType===1&&node.classList?.contains('healPulse'))play();
      }
    }
  });
  observer.observe(scene,{childList:true});

  window.BattleNetworkRecoveryEffect=Object.freeze({play});
})();
