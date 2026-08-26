(()=>{
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const battle=document.getElementById('battle');
  if(!FIELD)throw new Error('BattleNetworkWave: logical field grid is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkWave: enemy foundation is not loaded.');
  if(!battle)throw new Error('BattleNetworkWave: battle element is not available.');

  // v99 test-only composition/timing/presentation. Count/positions/HP/timing are not final game-balance values.
  const TEST_CONFIG=Object.freeze({
    testOnly:true,
    enemyMaxHp:200,
    clearNoticeMs:1500,
    startNoticeMs:1500,
    spawnTiles:Object.freeze([
      Object.freeze({rowOffset:0,colOffset:3}),
      Object.freeze({rowOffset:-3,colOffset:3})
    ])
  });
  const listeners=new Set();
  const notice=document.createElement('div');
  notice.className='waveStatusNotice';
  notice.setAttribute('aria-live','polite');
  battle.appendChild(notice);

  // waveNumber is the active/last completed wave. pendingWaveNumber is the wave to start after CUSTOM.
  let state={waveNumber:0,pendingWaveNumber:1,status:'WAITING_CUSTOM',enemyIds:[]};
  let transitionToken=0;

  function getSnapshot(){
    const enemyState=ENEMY.getBattleState();
    return Object.freeze({
      waveNumber:state.waveNumber,
      pendingWaveNumber:state.pendingWaveNumber,
      status:state.status,
      enemyIds:Object.freeze(state.enemyIds.slice()),
      total:enemyState.total,
      active:enemyState.active,
      defeated:enemyState.defeated,
      allDefeated:enemyState.allDefeated
    });
  }
  function render(){
    notice.dataset.status=state.status;
    if(state.status==='CLEARING'||(state.status==='WAITING_CUSTOM'&&state.waveNumber>0)){
      notice.textContent='WAVE CLEAR';
      return;
    }
    if(state.status==='STARTING'){
      notice.textContent=`WAVE ${state.pendingWaveNumber} START`;
      return;
    }
    const number=state.status==='ACTIVE'?state.waveNumber:state.pendingWaveNumber;
    notice.textContent=`WAVE ${number}`;
  }
  function emit(){
    const current=getSnapshot();
    listeners.forEach(listener=>{try{listener(current)}catch(error){console.error('BattleNetworkWave listener failed.',error)}});
    return current;
  }
  function subscribe(listener){
    if(typeof listener!=='function')return()=>{};
    listeners.add(listener);
    listener(getSnapshot());
    return()=>listeners.delete(listener);
  }
  function getPlayer(){return window.BattleNetworkPlayer||null}
  function scheduleTransition(delayMs,callback){
    const token=++transitionToken;
    setTimeout(()=>{if(token===transitionToken)callback()},delayMs);
  }
  function spawnTestEnemy(tile){
    const centerRow=Math.floor(FIELD.GRID_ROWS/2),centerCol=Math.floor(FIELD.GRID_COLS/2);
    const point=FIELD.tileToWorldCenter(centerRow+tile.rowOffset,centerCol+tile.colOffset);
    if(!point)throw new Error('BattleNetworkWave: test spawn tile is outside the field.');
    return ENEMY.spawn({x:point.x,y:point.y,health:{maxHp:TEST_CONFIG.enemyMaxHp}});
  }
  function spawnWave(waveNumber){
    const enemyIds=TEST_CONFIG.spawnTiles.map(spawnTestEnemy);
    state={waveNumber,pendingWaveNumber:null,status:'ACTIVE',enemyIds};
    render();
    const result=emit();
    getPlayer()?.resumeAfterWaveTransition?.();
    return result;
  }
  function openNextWaveCustom(){
    if(state.status!=='CLEARING')return getSnapshot();
    state={...state,status:'WAITING_CUSTOM'};
    render();
    emit();
    getPlayer()?.openNextWaveCustom?.();
    return getSnapshot();
  }
  function onEnemyState(enemyState){
    if(state.status!=='ACTIVE'||!enemyState.allDefeated)return;
    getPlayer()?.pauseForWaveTransition?.();
    state={...state,pendingWaveNumber:state.waveNumber+1,status:'CLEARING'};
    render();
    emit();
    scheduleTransition(TEST_CONFIG.clearNoticeMs,openNextWaveCustom);
  }
  function startNextWave(){
    if(state.status!=='WAITING_CUSTOM'||!Number.isFinite(state.pendingWaveNumber))return getSnapshot();
    const nextWaveNumber=state.pendingWaveNumber;
    getPlayer()?.pauseForWaveTransition?.();
    ENEMY.clearAll();
    state={waveNumber:state.waveNumber,pendingWaveNumber:nextWaveNumber,status:'STARTING',enemyIds:[]};
    render();
    emit();
    scheduleTransition(TEST_CONFIG.startNoticeMs,()=>{
      if(state.status!=='STARTING'||state.pendingWaveNumber!==nextWaveNumber)return;
      spawnWave(nextWaveNumber);
    });
    return getSnapshot();
  }
  function startTestWave(){return startNextWave()}
  function onCustomConfirmed(){return startNextWave()}

  window.BattleNetworkWave=Object.freeze({
    TEST_CONFIG,
    getSnapshot,
    subscribe,
    startTestWave,
    startNextWave,
    onCustomConfirmed
  });

  ENEMY.subscribe(onEnemyState);
  render();
})();
