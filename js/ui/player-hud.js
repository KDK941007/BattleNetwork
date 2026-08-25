(()=>{
  const HEALTH=window.BattleNetworkPlayerHealth;
  const hud=document.getElementById('playerStatusHud');
  const hpWindow=document.getElementById('playerHpWindow');
  const hpValue=document.getElementById('playerHpValue');
  const kokoro=document.getElementById('kokoroWindow');
  if(!HEALTH||!hud||!hpWindow||!hpValue||!kokoro)throw new Error('BattleNetworkPlayerHud: required dependency is missing.');

  let kokoroState='NORMAL';

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

  function setKokoroState(state){
    const next=String(state||'NORMAL').toUpperCase();
    kokoroState=next;
    kokoro.dataset.state=next;
    return kokoroState;
  }

  function getKokoroState(){return kokoroState}

  renderHealth();
  setKokoroState('NORMAL');
  const unsubscribe=typeof HEALTH.subscribe==='function'?HEALTH.subscribe(renderHealth):null;

  window.BattleNetworkPlayerHud=Object.freeze({
    renderHealth,
    setKokoroState,
    getKokoroState,
    destroy(){if(typeof unsubscribe==='function')unsubscribe()}
  });
})();
