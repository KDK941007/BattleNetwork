(()=>{
  const META=window.BattleNetworkDarkVulcanMaster;
  const JOY=document.getElementById('joy');
  const CUSTOM_MODAL=document.getElementById('customModal');
  const SETTINGS_MODAL=document.getElementById('settingsModal');
  const BATTLE=document.getElementById('battle');
  if(!META?.CHIP_ID||!JOY)return;

  const CHIP_ID=META.CHIP_ID;
  const CONFUSION_DURATION_MS=10000;
  let confused=false;
  let remainingMs=0;
  let frameId=0;
  let lastFrameAt=performance.now();
  const listeners=new Set();

  function snapshot(){return Object.freeze({active:confused,remainingMs,chipId:CHIP_ID})}
  function emit(reason){
    const state=snapshot();
    listeners.forEach(listener=>{try{listener(state,reason)}catch(error){console.error('BattleNetworkDarkVulcan listener failed.',error)}});
    window.dispatchEvent(new CustomEvent('battlenetwork:darkvulcanbugchange',{detail:Object.freeze({reason,state})}));
    return state;
  }
  function stopLoop(){if(frameId){cancelAnimationFrame(frameId);frameId=0}}
  function waveIsActive(){return window.BattleNetworkWave?.getSnapshot?.()?.status==='ACTIVE'}
  function battleTimeRunning(){
    if(document.visibilityState==='hidden')return false;
    if(!waveIsActive())return false;
    if(CUSTOM_MODAL?.classList.contains('open'))return false;
    if(SETTINGS_MODAL?.classList.contains('open'))return false;
    if(BATTLE?.classList.contains('editMode'))return false;
    if(window.BattleNetworkAreaSteal?.isActive?.()===true)return false;
    return true;
  }
  function clearConfusion(reason='CLEARED'){
    if(!confused){remainingMs=0;stopLoop();return snapshot()}
    confused=false;
    remainingMs=0;
    stopLoop();
    return emit(reason);
  }
  function frame(now){
    frameId=0;
    const delta=Math.max(0,now-lastFrameAt);
    lastFrameAt=now;
    if(!confused)return;
    if(!waveIsActive()){clearConfusion('WAVE_END');return}
    if(battleTimeRunning()){
      remainingMs=Math.max(0,remainingMs-delta);
      if(remainingMs<=0){clearConfusion('TIMEOUT');return}
    }
    frameId=requestAnimationFrame(frame);
  }
  function activateConfusion(){
    confused=true;
    remainingMs=CONFUSION_DURATION_MS;
    lastFrameAt=performance.now();
    if(!frameId)frameId=requestAnimationFrame(frame);
    return emit('DARK_VULCAN_USED');
  }

  function mirrorPointerEvent(event){
    const rect=JOY.getBoundingClientRect();
    const centerX=rect.left+rect.width/2;
    const centerY=rect.top+rect.height/2;
    return new Proxy(event,{
      get(target,prop){
        if(prop==='clientX')return centerX-(target.clientX-centerX);
        if(prop==='clientY')return centerY-(target.clientY-centerY);
        const value=Reflect.get(target,prop,target);
        return typeof value==='function'?value.bind(target):value;
      }
    });
  }
  function wrapPointerHandler(handler){
    if(typeof handler!=='function')return handler;
    return function(event){return handler.call(this,confused?mirrorPointerEvent(event):event)};
  }

  JOY.onpointerdown=wrapPointerHandler(JOY.onpointerdown);
  JOY.onpointermove=wrapPointerHandler(JOY.onpointermove);

  window.addEventListener('battlenetwork:evilchange',event=>{
    const reason=event.detail?.reason;
    const chipId=event.detail?.context?.chipId;
    if(reason==='DARK_CHIP'&&chipId===CHIP_ID)activateConfusion();
  });

  let lastWaveStatus=null;
  const wave=window.BattleNetworkWave;
  if(wave?.subscribe){
    wave.subscribe(state=>{
      const status=state?.status??null;
      if(lastWaveStatus==='ACTIVE'&&status!=='ACTIVE')clearConfusion('WAVE_END');
      lastWaveStatus=status;
    });
  }
  document.addEventListener('visibilitychange',()=>{lastFrameAt=performance.now()});

  window.BattleNetworkDarkVulcan=Object.freeze({
    CHIP_ID,
    CONFUSION_DURATION_MS,
    isConfused:()=>confused,
    getSnapshot:snapshot,
    clear:()=>clearConfusion('CLEARED'),
    subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);listener(snapshot(),'SUBSCRIBE');return()=>listeners.delete(listener)}
  });
})();
