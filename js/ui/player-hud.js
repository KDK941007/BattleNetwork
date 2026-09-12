(()=>{
  const HEALTH=window.BattleNetworkPlayerHealth;
  const hud=document.getElementById('playerStatusHud');
  const hpWindow=document.getElementById('playerHpWindow');
  const hpValue=document.getElementById('playerHpValue');
  const kokoro=document.getElementById('kokoroWindow');
  if(!HEALTH||!hud||!hpWindow||!hpValue||!kokoro)throw new Error('BattleNetworkPlayerHud: required dependency is missing.');

  let kokoroState='NORMAL';
  let kokoroValue=128;
  const kokoroListeners=new Set();

  function renderHealth(snapshot=HEALTH.getSnapshot()){
    if(snapshot?.isConfigured){
      hpValue.textContent=String(Math.max(0,Math.floor(snapshot.hp)));
      hpWindow.classList.remove('unconfigured');
      hpWindow.dataset.defeated=snapshot.isDefeated?'true':'false';
    }else{
      hpValue.textContent='---';
      hpWindow.classList.add('unconfigured');
      hpWindow.dataset.defeated='false';
    }
  }

  function getKokoroSnapshot(){return Object.freeze({value:kokoroValue,state:kokoroState})}
  function emitKokoro(){const snapshot=getKokoroSnapshot();kokoroListeners.forEach(listener=>{try{listener(snapshot)}catch(error){console.error('BattleNetworkPlayerHud kokoro listener failed.',error)}});return snapshot}
  function setStateRaw(next){kokoroState=next;kokoro.dataset.state=next}

  function setKokoroState(state){
    const next=String(state||'NORMAL').toUpperCase();
    if(next===kokoroState)return kokoroState;
    setStateRaw(next);
    emitKokoro();
    return kokoroState;
  }

  function getKokoroState(){return kokoroState}

  function stateFromValue(value){
    if(value===255)return 'FULL_SYNCHRO';
    if(value>=1&&value<=64)return 'ANXIOUS';
    if(value>=65&&value<=254)return 'NORMAL';
    return null;
  }

  function setKokoroValue(value){
    const numeric=Number(value);
    if(!Number.isFinite(numeric))return kokoroValue;
    const nextValue=Math.max(0,Math.min(255,Math.round(numeric)));
    const nextState=stateFromValue(nextValue);
    const changed=nextValue!==kokoroValue||(nextState!==null&&nextState!==kokoroState);
    kokoroValue=nextValue;
    if(nextState!==null)setStateRaw(nextState);
    if(changed)emitKokoro();
    return kokoroValue;
  }

  function getKokoroValue(){return kokoroValue}
  function subscribeKokoro(listener){if(typeof listener!=='function')return()=>{};kokoroListeners.add(listener);listener(getKokoroSnapshot());return()=>kokoroListeners.delete(listener)}

  renderHealth();
  setStateRaw('NORMAL');
  kokoroValue=128;
  const unsubscribe=typeof HEALTH.subscribe==='function'?HEALTH.subscribe(renderHealth):null;

  window.BattleNetworkPlayerHud=Object.freeze({
    renderHealth,
    setKokoroState,
    getKokoroState,
    setKokoroValue,
    getKokoroValue,
    getKokoroSnapshot,
    subscribeKokoro,
    destroy(){if(typeof unsubscribe==='function')unsubscribe();kokoroListeners.clear()}
  });
})();
