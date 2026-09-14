(()=>{
  const HUD=window.BattleNetworkPlayerHud;
  const KOKORO=window.BattleNetworkKokoro;
  const MASTER=window.BattleNetworkMaster;
  const HEALTH=window.BattleNetworkPlayerHealth;
  const SAVE=window.BattleNetworkSaveData;
  if(!HUD||!KOKORO||!MASTER)throw new Error('BattleNetworkEvil: required dependency is missing.');

  const DEFAULT_MORALITY=500;
  const EVIL_THRESHOLD=469;
  const EVIL_KOKORO_VALUE=0;
  const PLAYER_ID='PLAYER_1';
  const listeners=new Set();

  let morality=DEFAULT_MORALITY;
  let moralityReady=false;
  let moralityRevision=0;
  let saveQueue=Promise.resolve();
  let active=false;
  let darkLocked=false;
  let darkUsedThisWave=false;
  let syncing=false;
  let moralityReadout=null;

  function clampMorality(value){
    const numeric=Math.round(Number(value));
    if(!Number.isFinite(numeric))return morality;
    return Math.max(0,Math.min(1000,numeric));
  }

  function renderMoralityReadout(){
    if(!moralityReadout){
      moralityReadout=document.getElementById('moralityValueReadout');
      if(!moralityReadout){
        const kokoroRow=document.querySelector('.kokoroValueReadout');
        if(kokoroRow){
          const row=document.createElement('div');
          row.className='kokoroValueReadout moralityValueReadout';
          const label=document.createTextNode('善悪度：');
          const value=document.createElement('span');
          value.id='moralityValueReadout';
          row.append(label,value);
          kokoroRow.insertAdjacentElement('afterend',row);
          moralityReadout=value;
        }
      }
    }
    if(moralityReadout)moralityReadout.textContent=String(morality);
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
      moralityReady,
      kokoroValue:HUD.getKokoroValue?.(),
      kokoroState:HUD.getKokoroState?.()
    });
  }

  function emit(reason,context={}){
    renderMoralityReadout();
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

  function persistMorality(reason='MORALITY_UPDATED'){
    if(!SAVE?.getPlayerProgress||!SAVE?.savePlayerProgress)return Promise.resolve(false);
    const value=morality;
    saveQueue=saveQueue.catch(()=>false).then(async()=>{
      await SAVE.initialize?.();
      const current=await SAVE.getPlayerProgress(PLAYER_ID);
      await SAVE.savePlayerProgress({...current,player_id:PLAYER_ID,morality:value});
      return true;
    }).catch(error=>{
      console.warn(`[BattleNetworkEvil] Failed to persist morality (${reason}).`,error);
      return false;
    });
    return saveQueue;
  }

  function updateMorality(value,reason,{persist=true}={}){
    const next=clampMorality(value);
    if(next===morality){renderMoralityReadout();return false}
    morality=next;
    moralityRevision+=1;
    renderMoralityReadout();
    if(persist)void persistMorality(reason);
    return true;
  }

  function applyDarkMoralityPenalty(){
    const before=morality;
    let after=before;
    if(before>=500)after=480;
    else if(before>=470)after=Math.max(0,before-4);
    else if(before>=1)after=before-1;
    else after=0;
    updateMorality(after,'DARK_CHIP_WAVE_PENALTY');
    return Object.freeze({before,after:morality});
  }

  function applyVictoryMoralityRecovery(amount=1){
    const before=morality;
    const recovery=Math.max(0,Math.trunc(Number(amount)||0));
    if(before<301||before>=1000||recovery===0)return Object.freeze({applied:false,before,after:before,amount:0});
    const after=Math.min(1000,before+recovery);
    updateMorality(after,'WAVE_VICTORY_RECOVERY');
    return Object.freeze({applied:after!==before,before,after:morality,amount:morality-before});
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
    if(darkUsedThisWave){
      const penalty=Object.freeze({morality:applyDarkMoralityPenalty(),health:applyDarkMaxHpPenalty()});
      emit('DARK_CHIP_WAVE_PENALTY',{penalty});
    }else{
      const recovery=applyVictoryMoralityRecovery(1);
      if(recovery.applied)emit('MORALITY_WAVE_RECOVERY',{recovery});
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

  function setMorality(value,{reevaluateNow=false,persist=true}={}){
    updateMorality(value,'MORALITY_UPDATED',{persist});
    if(reevaluateNow)return reevaluate('MORALITY_UPDATED');
    return getSnapshot();
  }

  async function initializeMorality(){
    if(!SAVE?.getPlayerProgress||!SAVE?.savePlayerProgress){
      moralityReady=true;
      renderMoralityReadout();
      emit('MORALITY_PERSISTENCE_UNAVAILABLE',{morality});
      return getSnapshot();
    }
    const revisionAtStart=moralityRevision;
    try{
      await SAVE.initialize?.();
      const progress=await SAVE.getPlayerProgress(PLAYER_ID);
      if(moralityRevision!==revisionAtStart){
        moralityReady=true;
        await persistMorality('MORALITY_LOAD_RACE');
        return reevaluate('MORALITY_READY');
      }
      const stored=Number(progress?.morality);
      if(progress&&Number.isFinite(stored)){
        morality=clampMorality(stored);
      }else{
        await SAVE.savePlayerProgress({...progress,player_id:PLAYER_ID,morality:morality});
      }
      moralityReady=true;
      renderMoralityReadout();
      return reevaluate('MORALITY_LOADED');
    }catch(error){
      moralityReady=true;
      renderMoralityReadout();
      console.warn('[BattleNetworkEvil] Failed to load persisted morality. Using the runtime value.',error);
      return emit('MORALITY_LOAD_FAILED',{morality});
    }
  }

  const unsubscribe=typeof HUD.subscribeKokoro==='function'?HUD.subscribeKokoro(()=>enforceEvil()):null;
  KOKORO.registerExclusion?.('EVIL_STATE',()=>active);
  renderMoralityReadout();
  reevaluate('INITIAL');
  void initializeMorality();

  window.BattleNetworkEvil=Object.freeze({
    DEFAULT_MORALITY,
    EVIL_THRESHOLD,
    EVIL_KOKORO_VALUE,
    isActive:()=>active,
    isDarkChip,
    canSoulUnison:()=>!active,
    getMorality:()=>morality,
    isMoralityReady:()=>moralityReady,
    getWaveStartKokoro,
    getSnapshot,
    setMorality,
    enter,
    reevaluate,
    onChipActivated,
    onWaveEnd,
    onWaveStart,
    applyVictoryMoralityRecovery,
    whenMoralitySaved:()=>saveQueue,
    subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);listener(getSnapshot(),'SUBSCRIBE',Object.freeze({}));return()=>listeners.delete(listener)},
    destroy(){if(typeof unsubscribe==='function')unsubscribe();KOKORO.unregisterExclusion?.('EVIL_STATE');listeners.clear()}
  });
})();
