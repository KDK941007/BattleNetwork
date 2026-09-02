(()=>{
  const player=document.getElementById('player');
  const scene=document.getElementById('scene');
  if(!player||!scene)return;

  const style=document.createElement('style');
  style.textContent=`
    .player.recoveryGlow{animation:recoveryPlayerGlow .48s ease-out both}
    @keyframes recoveryPlayerGlow{
      0%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
      35%{filter:brightness(1.65) saturate(1.35);box-shadow:0 0 18px rgba(120,255,158,.95),0 0 36px rgba(83,255,143,.72)}
      100%{filter:brightness(1) saturate(1);box-shadow:0 0 12px #40cbff}
    }
    .healPulse{box-shadow:0 0 18px rgba(83,255,143,.7),inset 0 0 14px rgba(120,255,158,.28)}
    .healPulse::before,.healPulse::after{content:"";position:absolute;left:50%;top:50%;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%) scale(.35);opacity:0}
    .healPulse::before{width:72%;height:72%;border:3px solid rgba(186,255,207,.95);animation:recoveryRingInner .48s ease-out forwards}
    .healPulse::after{width:118%;height:118%;border:3px solid rgba(112,255,158,.72);animation:recoveryRingOuter .58s ease-out forwards}
    @keyframes recoveryRingInner{0%{transform:translate(-50%,-50%) scale(.35);opacity:1}100%{transform:translate(-50%,-50%) scale(1.35);opacity:0}}
    @keyframes recoveryRingOuter{0%{transform:translate(-50%,-50%) scale(.28);opacity:.85}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}
  `;
  document.head.appendChild(style);

  let glowTimer=null;
  function flashPlayer(){
    if(glowTimer!==null){clearTimeout(glowTimer);glowTimer=null}
    player.classList.remove('recoveryGlow');
    void player.offsetWidth;
    player.classList.add('recoveryGlow');
    glowTimer=setTimeout(()=>{player.classList.remove('recoveryGlow');glowTimer=null},520);
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
