(()=>{
  const battle=document.getElementById('battle');
  const scene=document.getElementById('scene');
  const editTopBar=document.getElementById('editTopBar');
  const resetButton=document.getElementById('resetSettings');
  const field=window.BattleNetworkField;
  const playerApi=window.BattleNetworkPlayer;
  if(!battle||!scene||!editTopBar||!field||!playerApi)return;

  const STORAGE_KEY='battleNetworkCameraZoomV1';
  const MIN_ZOOM=.20;
  const MAX_ZOOM=.62;
  const DEFAULT_ZOOM=.58;
  const PX=.72,PY=.36,SW=field.WORLD_SIZE*PX*2,SH=field.WORLD_SIZE*PY*2,FOLLOW=.14;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const project=(x,y)=>({x:(x-y)*PX+SW/2,y:(x+y)*PY});

  function loadZoom(){
    const value=Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value)?clamp(value,MIN_ZOOM,MAX_ZOOM):DEFAULT_ZOOM;
  }

  let zoom=loadZoom();
  let cameraX=0,cameraY=0,initialized=false,lastTime=performance.now();

  const control=document.createElement('label');
  control.id='cameraZoomControl';
  control.innerHTML='<span class="cameraZoomLabel">カメラ倍率</span><input id="cameraZoomSlider" type="range" min="20" max="62" step="1"><span id="cameraZoomValue"></span>';
  editTopBar.insertBefore(control,resetButton||null);

  const slider=control.querySelector('#cameraZoomSlider');
  const valueLabel=control.querySelector('#cameraZoomValue');

  function updateUi(){
    slider.value=String(Math.round(zoom*100));
    valueLabel.textContent=`×${zoom.toFixed(2)}`;
  }

  function saveZoom(){localStorage.setItem(STORAGE_KEY,String(zoom))}

  function setZoom(value,save=true){
    const next=clamp(Number(value),MIN_ZOOM,MAX_ZOOM);
    if(!Number.isFinite(next))return;
    zoom=next;
    initialized=false;
    updateUi();
    if(save)saveZoom();
  }

  slider.addEventListener('input',()=>setZoom(Number(slider.value)/100,true));
  slider.addEventListener('pointerdown',event=>event.stopPropagation());
  slider.addEventListener('pointermove',event=>event.stopPropagation());
  slider.addEventListener('click',event=>event.stopPropagation());

  if(resetButton){
    resetButton.addEventListener('click',()=>setZoom(DEFAULT_ZOOM,true));
  }

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
      cameraX+=(target.x-cameraX)*follow;
      cameraY+=(target.y-cameraY)*follow;
    }
    scene.style.transform=`scale(${zoom}) translate(${-cameraX}px,${-cameraY}px)`;
    requestAnimationFrame(loop);
  }

  updateUi();
  requestAnimationFrame(loop);

  window.BattleNetworkCameraZoomSettings=Object.freeze({
    get:()=>zoom,
    set:value=>setZoom(value,true),
    getRange:()=>Object.freeze({min:MIN_ZOOM,max:MAX_ZOOM,step:.01,default:DEFAULT_ZOOM})
  });
})();
