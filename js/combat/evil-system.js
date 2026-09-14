(()=>{
  const HUD=window.BattleNetworkPlayerHud;
  const KOKORO=window.BattleNetworkKokoro;
  const MASTER=window.BattleNetworkMaster;
  const HEALTH=window.BattleNetworkPlayerHealth;
  if(!HUD||!KOKORO||!MASTER)throw new Error('BattleNetworkEvil: required dependency is missing.');

  const DEFAULT_MORALITY=500;
  const EVIL_THRESHOLD=469;
  const EVIL_KOKORO_VALUE=0;
  const listeners=new Set();

  let morality=DEFAULT_MORALITY;
  let active=false;
  let darkLocked=false;
  let darkUsedThisWave=false;
  let syncing=false;

  function clampMorality(value){
    const numeric=Math.round(Number(value));
    if(!Number.isFinite(numeric))return morality;
    return Math.max(0,Math.min(1000,numeric));
  }

  function getWaveStartKokoro(value=morality){
    const current=clampMorality(value);
    if(current<=EVIL_THRESHOLD)return EVIL_KOKORO_VALUE;
    if(current===1000)return 190;
    return 128+Math.floor(current/20);
  }

  function isDarkChip(chip){
    const chipId=chip?.chipId??chip?.sourceId??null;
    if(!chipId)return false;
    return MASTER.getChipSpecialTypes?.(chipId)?.some(row=>row?.specialTypeId==='DARK')===true;
  }

  function getSnapshot(){
    return Object.freeze({
      active,
      darkLocked,
      darkUsedThisWave,
      morality,
      kokoroValue:HUD.getKokoroValue?.(),
      kokoroState:HUD.getKokoroState?.()
    });
  }

  function emit(reason,context={}){
    const snapshot=getSnapshot();
    const detail=Object.freeze({reason,context:Object.freeze({...context}),snapshot});
    listeners.forEach(listener=>{try{listener(snapshot,reason,detail.context)}catch(error){console.error('BattleNetworkEvil listener failed.',error)}});
    window.dispatchEvent(new CustomEvent('battlenetwork:evilchange',{detail}));
    return snapshot;
  }

  function enforceEvil(){
    if(!active||syncing)return;
    const value=HUD.getKokoroValue?.();
    const state=HUD.getKokoroState?.();
    if(value===EVIL_KOKORO_VALUE&&state==='EVIL')return;
    syncing=true;
    if(value!==EVIL_KOKORO_VALUE)HUD.setKokoroValue(EVIL_KOKORO_VALUE);
    if(HUD.getKokoroState?.()!=='EVIL')HUD.setKokoroState('EVIL');
    syncing=false;
  }

  function enter(reason='MORALITY',context={}){
    if(reason==='DARK_CHIP')darkLocked=true;
    if(reason==='DARK_CHIP')window.BattleNetworkAnger?.onDarkChipUsed?.();
    active=true;
    enforceEvil();
    return Object.freeze({applied:true,reason,context:Object.freeze({...context}),snapshot:emit(reason,context)});
  }

  function applyNonEvilWaveState(reason='REEVALUATE'){
    active=false;
    syncing=true;
    HUD.setKokoroValue(getWaveStartKokoro());
    syncing=false;
    return emit(reason,{morality});
  }

  function reevaluate(reason='REEVALUATE'){
    if(darkLocked)return enter('DARK_CHIP_LOCK',{sourceReason:reason});
    if(morality<=EVIL_THRESHOLD)return enter('MORALITY',{sourceReason:reason,morality});
    return applyNonEvilWaveState(reason);
  }

  function onChipActivated(chip){
    if(!isDarkChip(chip))return Object.freeze({applied:false,reason:'NOT_DARK_CHIP',snapshot:getSnapshot()});
    const chipId=chip?.chipId??chip?.sourceId??null;
    darkUsedThisWave=true;
    darkLocked=true;
    return enter('DARK_CHIP',{chipId});
  }

  function applyDarkMoralityPenalty(){
    const before=morality;
    if(before>=500)morality=480;
    else if(before>=470)morality=Math.max(0,before-4);
    else if(before>=1)morality=before-1;
    else morality=0;
    return Object.freeze({before,after:morality});
  }

  function applyDarkMaxHpPenalty(){
    const before=HEALTH?.getSnapshot?.();
    if(!before?.isConfigured||!(Number(before.maxHp)>1))return Object.freeze({applied:false,beforeMaxHp:before?.maxHp??null,afterMaxHp:before?.maxHp??null});
    const nextMaxHp=before.maxHp-1;
    const nextHp=Math.min(before.hp,nextMaxHp);
    const result=HEALTH.configureHealth({maxHp:nextMaxHp,hp:nextHp});
    return Object.freeze({applied:result?.ok===true,beforeMaxHp:before.maxHp,afterMaxHp:result?.maxHp??before.maxHp,beforeHp:before.hp,afterHp:result?.hp??before.hp});
  }

  function onWaveEnd(){
    let penalty=null;
    if(darkUsedThisWave){
      penalty=Object.freeze({morality:applyDarkMoralityPenalty(),health:applyDarkMaxHpPenalty()});
      emit('DARK_CHIP_WAVE_PENALTY',{penalty});
    }
    darkUsedThisWave=false;
    darkLocked=false;
    return reevaluate('WAVE_END');
  }

  function onWaveStart(){
    darkUsedThisWave=false;
    darkLocked=false;
    return reevaluate('WAVE_START');
  }

  function setMorality(value,{reevaluateNow=false}={}){
    morality=clampMorality(value);
    if(reevaluateNow)return reevaluate('MORALITY_UPDATED');
    return getSnapshot();
  }

  const unsubscribe=typeof HUD.subscribeKokoro==='function'?HUD.subscribeKokoro(()=>enforceEvil()):null;
  KOKORO.registerExclusion?.('EVIL_STATE',()=>active);
  reevaluate('INITIAL');

  window.BattleNetworkEvil=Object.freeze({
    DEFAULT_MORALITY,
    EVIL_THRESHOLD,
    EVIL_KOKORO_VALUE,
    isActive:()=>active,
    isDarkChip,
    canSoulUnison:()=>!active,
    getMorality:()=>morality,
    getWaveStartKokoro,
    getSnapshot,
    setMorality,
    enter,
    reevaluate,
    onChipActivated,
    onWaveEnd,
    onWaveStart,
    subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);listener(getSnapshot(),'SUBSCRIBE',Object.freeze({}));return()=>listeners.delete(listener)},
    destroy(){if(typeof unsubscribe==='function')unsubscribe();KOKORO.unregisterExclusion?.('EVIL_STATE');listeners.clear()}
  });
})();
