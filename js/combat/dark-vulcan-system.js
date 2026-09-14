(()=>{
  const META=window.BattleNetworkDarkVulcanMaster;
  const JOY=document.getElementById('joy');
  if(!META?.CHIP_ID||!JOY)return;

  const CHIP_ID=META.CHIP_ID;
  let confused=false;
  const listeners=new Set();

  function snapshot(){return Object.freeze({active:confused,chipId:CHIP_ID})}
  function emit(reason){
    const state=snapshot();
    listeners.forEach(listener=>{try{listener(state,reason)}catch(error){console.error('BattleNetworkDarkVulcan listener failed.',error)}});
    window.dispatchEvent(new CustomEvent('battlenetwork:darkvulcanbugchange',{detail:Object.freeze({reason,state})}));
    return state;
  }
  function setConfused(value,reason='SET'){
    const next=!!value;
    if(confused===next)return snapshot();
    confused=next;
    return emit(reason);
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
    if(reason==='DARK_CHIP'&&chipId===CHIP_ID)setConfused(true,'DARK_VULCAN_USED');
  });

  let lastWaveStatus=null;
  const wave=window.BattleNetworkWave;
  if(wave?.subscribe){
    wave.subscribe(state=>{
      const status=state?.status??null;
      if(lastWaveStatus==='ACTIVE'&&status!=='ACTIVE')setConfused(false,'WAVE_END');
      lastWaveStatus=status;
    });
  }

  window.BattleNetworkDarkVulcan=Object.freeze({
    CHIP_ID,
    isConfused:()=>confused,
    getSnapshot:snapshot,
    clear:()=>setConfused(false,'CLEARED'),
    subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);listener(snapshot(),'SUBSCRIBE');return()=>listeners.delete(listener)}
  });
})();
