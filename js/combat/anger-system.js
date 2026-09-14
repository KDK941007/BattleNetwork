(()=>{
  const HUD=window.BattleNetworkPlayerHud;
  const KOKORO=window.BattleNetworkKokoro;
  const MASTER=window.BattleNetworkMaster;
  const PLAYER=window.BattleNetworkPlayer;
  const PLAYER_EL=document.getElementById('player');
  const CUSTOM_MODAL=document.getElementById('customModal');
  const SETTINGS_MODAL=document.getElementById('settingsModal');
  const BATTLE=document.getElementById('battle');
  if(!HUD||!KOKORO||!MASTER||!PLAYER||!PLAYER_EL)throw new Error('BattleNetworkAnger: required dependency is missing.');

  const KOKORO_VALUE=128;
  const INCAPACITATED_TRIGGER_SECONDS=2;
  const HEAVY_DAMAGE_THRESHOLD=300;
  const DURATION_SECONDS=10;

  let active=false;
  let activeElapsed=0;
  let incapacitatedElapsed=0;
  let incapacitationConsumed=false;
  let trackingPlayerIncapacitation=false;
  const externalIncapacitationSources=new Set();
  let frameId=0;
  let lastFrameAt=performance.now();
  const listeners=new Set();

  function getState(){return HUD.getKokoroState?.()||'NORMAL'}
  function isSoulActive(){return window.BattleNetworkSoulUnison?.isActive?.()===true}
  function isBlockedState(){const state=getState();return state==='EVIL'||isSoulActive()}
  function isDarkChip(chip){
    const chipId=chip?.chipId??chip?.sourceId??null;
    if(!chipId)return false;
    return MASTER.getChipSpecialTypes?.(chipId)?.some(row=>row?.specialTypeId==='DARK')===true;
  }
  function isAttackChip(chip){const power=Number(chip?.power);return Number.isFinite(power)&&power>0}
  function getSnapshot(){return Object.freeze({active,activeElapsed,remainingSeconds:active?Math.max(0,DURATION_SECONDS-activeElapsed):0,incapacitatedElapsed,incapacitationConsumed,kokoroValue:HUD.getKokoroValue?.(),kokoroState:getState()})}
  function emit(reason){const snapshot=getSnapshot();listeners.forEach(listener=>{try{listener(snapshot,reason)}catch(error){console.error('BattleNetworkAnger listener failed.',error)}});window.dispatchEvent(new CustomEvent('battlenetwork:angerchange',{detail:Object.freeze({reason,snapshot})}));return snapshot}
  function syncVisual(){PLAYER_EL.classList.toggle('angry',active)}
  function restoreKokoroState(){if(getState()==='ANGRY')HUD.setKokoroValue(KOKORO_VALUE)}
  function shouldRunLoop(){return active||trackingPlayerIncapacitation||externalIncapacitationSources.size>0}
  function stopLoop(){if(frameId){cancelAnimationFrame(frameId);frameId=0}}
  function ensureLoop(){if(frameId||!shouldRunLoop())return;lastFrameAt=performance.now();frameId=requestAnimationFrame(frame)}
  function waveIsActive(){const wave=window.BattleNetworkWave?.getSnapshot?.();return !wave||wave.status==='ACTIVE'}
  function battleTimeRunning(){
    if(document.visibilityState==='hidden')return false;
    if(PLAYER.isDefeated?.())return false;
    if(!waveIsActive())return false;
    if(CUSTOM_MODAL?.classList.contains('open'))return false;
    if(SETTINGS_MODAL?.classList.contains('open'))return false;
    if(BATTLE?.classList.contains('editMode'))return false;
    if(window.BattleNetworkAreaSteal?.isActive?.()===true)return false;
    return true;
  }
  function playerIsIncapacitated(now=performance.now()){
    return PLAYER.isHitStunned?.(now)===true||externalIncapacitationSources.size>0;
  }
  function resetIncapacitationEpisode(){
    incapacitatedElapsed=0;
    incapacitationConsumed=false;
  }

  function trigger(reason='INCAPACITATED',context={}){
    if(active)return Object.freeze({applied:false,reason:'ALREADY_ACTIVE',snapshot:getSnapshot()});
    if(isBlockedState())return Object.freeze({applied:false,reason:'BLOCKED_STATE',snapshot:getSnapshot()});
    active=true;
    activeElapsed=0;
    if(reason==='CONTINUOUS_INCAPACITATION')incapacitationConsumed=true;
    HUD.setKokoroValue(KOKORO_VALUE);
    HUD.setKokoroState('ANGRY');
    syncVisual();
    ensureLoop();
    return Object.freeze({applied:true,reason,context:Object.freeze({...context}),snapshot:emit(reason)});
  }

  function release(reason='RELEASED'){
    if(!active)return Object.freeze({applied:false,reason:'NOT_ACTIVE',snapshot:getSnapshot()});
    active=false;
    activeElapsed=0;
    syncVisual();
    restoreKokoroState();
    if(!playerIsIncapacitated()){
      trackingPlayerIncapacitation=false;
      resetIncapacitationEpisode();
    }
    const snapshot=emit(reason);
    if(!shouldRunLoop())stopLoop();
    return Object.freeze({applied:true,reason,snapshot});
  }

  function noteEnemyDamage(appliedDamage,context={}){
    const damage=Number(appliedDamage);
    if(!Number.isFinite(damage)||damage<HEAVY_DAMAGE_THRESHOLD)return Object.freeze({applied:false,reason:'BELOW_THRESHOLD',damage:Number.isFinite(damage)?damage:null,snapshot:getSnapshot()});
    return trigger('HEAVY_DAMAGE',{...context,appliedDamage:damage});
  }

  function trackPlayerIncapacitation(){
    const wasIncapacitated=playerIsIncapacitated();
    if(!wasIncapacitated)resetIncapacitationEpisode();
    trackingPlayerIncapacitation=true;
    ensureLoop();
    return getSnapshot();
  }
  function setIncapacitated(sourceId,value=true){
    const key=String(sourceId||'EXTERNAL').trim()||'EXTERNAL';
    const wasIncapacitated=playerIsIncapacitated();
    if(value){
      if(!wasIncapacitated)resetIncapacitationEpisode();
      externalIncapacitationSources.add(key);
      ensureLoop();
    }else{
      externalIncapacitationSources.delete(key);
      if(!playerIsIncapacitated()){
        trackingPlayerIncapacitation=false;
        resetIncapacitationEpisode();
      }
    }
    return getSnapshot();
  }

  function applyToChip(chip){
    const beforePower=Number(chip?.power);
    if(!active||!isAttackChip(chip))return Object.freeze({chip,applied:false,reason:active?'NO_ATTACK_POWER':'NOT_ACTIVE',beforePower:Number.isFinite(beforePower)?beforePower:null,afterPower:Number.isFinite(beforePower)?beforePower:null});
    if(isDarkChip(chip)){
      release('DARK_CHIP');
      return Object.freeze({chip,applied:false,reason:'DARK_CHIP',beforePower,afterPower:beforePower});
    }
    const afterPower=beforePower*2;
    const powered=Object.freeze({...chip,power:afterPower,angerApplied:true,angerBasePower:beforePower});
    release('ATTACK_CHIP');
    return Object.freeze({chip:powered,applied:true,reason:null,beforePower,afterPower});
  }

  function onSoulUnisonStart(){return release('SOUL_UNISON')}
  function onDarkChipUsed(){return release('DARK_CHIP')}
  function resetWave(reason='WAVE_END'){
    const wasActive=active;
    active=false;
    activeElapsed=0;
    resetIncapacitationEpisode();
    trackingPlayerIncapacitation=false;
    externalIncapacitationSources.clear();
    syncVisual();
    if(wasActive)restoreKokoroState();
    stopLoop();
    return emit(reason);
  }

  function updateContinuousIncapacitation(delta,incapacitated){
    if(!incapacitated){
      resetIncapacitationEpisode();
      trackingPlayerIncapacitation=false;
      return;
    }
    if(active){incapacitationConsumed=true;return}
    if(incapacitationConsumed||isBlockedState())return;
    incapacitatedElapsed+=delta;
    if(incapacitatedElapsed>=INCAPACITATED_TRIGGER_SECONDS)trigger('CONTINUOUS_INCAPACITATION',{seconds:incapacitatedElapsed});
  }

  function frame(now){
    frameId=0;
    const delta=Math.max(0,(now-lastFrameAt)/1000);
    lastFrameAt=now;

    if(!waveIsActive()){
      resetWave('WAVE_END');
      return;
    }
    if(active&&isBlockedState())release(isSoulActive()?'SOUL_UNISON':'EVIL');

    const running=battleTimeRunning();
    const incapacitated=playerIsIncapacitated(now);
    if(running){
      updateContinuousIncapacitation(delta,incapacitated);
      if(active){
        activeElapsed+=delta;
        if(activeElapsed>=DURATION_SECONDS)release('TIMEOUT');
      }
    }

    if(trackingPlayerIncapacitation&&!incapacitated&&running){
      trackingPlayerIncapacitation=false;
      resetIncapacitationEpisode();
    }
    if(shouldRunLoop())frameId=requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange',()=>{lastFrameAt=performance.now()});
  KOKORO.registerExclusion?.('ANGER_STATE',()=>active);
  syncVisual();

  window.BattleNetworkAnger=Object.freeze({
    KOKORO_VALUE,
    INCAPACITATED_TRIGGER_SECONDS,
    HEAVY_DAMAGE_THRESHOLD,
    DURATION_SECONDS,
    isActive:()=>active,
    isSuperArmorActive:()=>active,
    isDarkChip,
    isAttackChip,
    getSnapshot,
    trigger,
    release,
    noteEnemyDamage,
    trackPlayerIncapacitation,
    setIncapacitated,
    applyToChip,
    onSoulUnisonStart,
    onDarkChipUsed,
    resetWave,
    subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);listener(getSnapshot(),'SUBSCRIBE');return()=>listeners.delete(listener)}
  });
})();
