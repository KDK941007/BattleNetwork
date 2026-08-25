(()=>{
  const battle=document.getElementById('battle');
  const scene=document.getElementById('scene');
  const yButton=document.getElementById('Y');
  const field=window.BattleNetworkField;
  const playerApi=window.BattleNetworkPlayer;
  if(!battle||!scene||!yButton||!field||!playerApi)return;

  const candidates=Object.freeze([0.58,0.54,0.50]);
  const PX=.72,PY=.36,SW=field.WORLD_SIZE*PX*2,SH=field.WORLD_SIZE*PY*2,FOLLOW=.14;
  let candidateIndex=0;
  let zoom=candidates[candidateIndex];
  let cameraX=0,cameraY=0,initialized=false,lastTime=performance.now();

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const project=(x,y)=>({x:(x-y)*PX+SW/2,y:(x+y)*PY});

  const badge=document.createElement('div');
  badge.id='cameraZoomComparisonBadge';
  badge.style.cssText='position:absolute;right:8px;top:8px;z-index:34;min-width:112px;padding:5px 8px;border:1px solid rgba(133,225,255,.72);border-radius:8px;background:rgba(5,24,34,.82);color:#eaffff;font-size:11px;font-weight:900;text-align:center;pointer-events:none;box-shadow:0 0 8px rgba(67,212,255,.18);';
  battle.appendChild(badge);

  function getCameraTarget(){
    const position=playerApi.getPosition();
    const p=project(position.x,position.y);
    const viewportWidth=battle.clientWidth/zoom;
    const viewportHeight=battle.clientHeight/zoom;
    return{
      x:clamp(p.x-viewportWidth/2,0,Math.max(0,SW-viewportWidth)),
      y:clamp(p.y-viewportHeight*.58,0,Math.max(0,SH-viewportHeight))
    };
  }

  function updateBadge(){
    badge.textContent=`カメラ ${candidateIndex+1}/3  ×${zoom.toFixed(2)}`;
    yButton.setAttribute('aria-label',`カメラ倍率切替 現在${candidateIndex+1}/3 ${zoom.toFixed(2)}`);
  }

  function selectCandidate(index){
    candidateIndex=(index+candidates.length)%candidates.length;
    zoom=candidates[candidateIndex];
    const target=getCameraTarget();
    cameraX=target.x;
    cameraY=target.y;
    initialized=true;
    updateBadge();
  }

  yButton.addEventListener('pointerdown',event=>{
    if(battle.classList.contains('editMode'))return;
    if(document.getElementById('customModal')?.classList.contains('open'))return;
    if(document.getElementById('settingsModal')?.classList.contains('open'))return;
    event.preventDefault();
    event.stopPropagation();
    yButton.classList.add('pressed');
    selectCandidate(candidateIndex+1);
  });
  const releaseY=()=>yButton.classList.remove('pressed');
  yButton.addEventListener('pointerup',releaseY);
  yButton.addEventListener('pointercancel',releaseY);

  function loop(now){
    const dt=Math.min((now-lastTime)/1000,.05);
    lastTime=now;
    const target=getCameraTarget();
    if(!initialized){
      cameraX=target.x;
      cameraY=target.y;
      initialized=true;
    }else{
      const follow=1-Math.pow(1-FOLLOW,dt*60);
      cameraX+= (target.x-cameraX)*follow;
      cameraY+= (target.y-cameraY)*follow;
    }
    scene.style.transform=`scale(${zoom}) translate(${-cameraX}px,${-cameraY}px)`;
    requestAnimationFrame(loop);
  }

  selectCandidate(0);
  requestAnimationFrame(loop);

  window.BattleNetworkCameraZoomComparison=Object.freeze({
    getCandidates:()=>candidates,
    getCurrent:()=>Object.freeze({index:candidateIndex,zoom})
  });
})();
