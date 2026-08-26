(()=>{
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const battle=document.getElementById('battle');
  if(!FIELD)throw new Error('BattleNetworkWave: logical field grid is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkWave: enemy foundation is not loaded.');
  if(!battle)throw new Error('BattleNetworkWave: battle element is not available.');

  // v97 test-only composition. Count/positions/HP and repeated use across waves are not final balance values.
  const TEST_CONFIG=Object.freeze({
    testOnly:true,
    enemyMaxHp:200,
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

  let state={waveNumber:1,status:'IDLE',enemyIds:[]};
  let unsubscribeEnemy=null;

  function getSnapshot(){
    const enemyState=ENEMY.getBattleState();
    return Object.freeze({
      waveNumber:state.waveNumber,
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
    notice.textContent=state.status==='WAITING_CUSTOM'?'WAVE CLEAR':`WAVE ${state.waveNumber}`;
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
  function spawnTestEnemy(tile){
    const centerRow=Math.floor(FIELD.GRID_ROWS/2),centerCol=Math.floor(FIELD.GRID_COLS/2);
    const point=FIELD.tileToWorldCenter(centerRow+tile.rowOffset,centerCol+tile.colOffset);
    if(!point)throw new Error('BattleNetworkWave: test spawn tile is outside the field.');
    return ENEMY.spawn({x:point.x,y:point.y,health:{maxHp:TEST_CONFIG.enemyMaxHp}});
  }
  function spawnWave(waveNumber){
    const enemyIds=TEST_CONFIG.spawnTiles.map(spawnTestEnemy);
    state={waveNumber,status:'ACTIVE',enemyIds};
    render();
    return emit();
  }
  function requestCustomForNextWave(){
    const prepare=()=>{
      const player=window.BattleNetworkPlayer;
      if(!player?.prepareNextWave?.())console.warn('BattleNetworkWave: next-wave CUSTOM preparation was not started.');
    };
    if(typeof queueMicrotask==='function')queueMicrotask(prepare);
    else Promise.resolve().then(prepare);
  }
  function onEnemyState(enemyState){
    if(state.status!=='ACTIVE'||!enemyState.allDefeated)return;
    state={...state,status:'WAITING_CUSTOM'};
    render();
    emit();
    requestCustomForNextWave();
  }
  function startTestWave(){
    if(state.status!=='IDLE')return getSnapshot();
    const result=spawnWave(1);
    if(!unsubscribeEnemy)unsubscribeEnemy=ENEMY.subscribe(onEnemyState);
    return result;
  }
  function startNextWave(){
    if(state.status!=='WAITING_CUSTOM')return getSnapshot();
    ENEMY.clearAll();
    return spawnWave(state.waveNumber+1);
  }
  function onCustomConfirmed(){
    if(state.status!=='WAITING_CUSTOM')return getSnapshot();
    return startNextWave();
  }

  window.BattleNetworkWave=Object.freeze({
    TEST_CONFIG,
    getSnapshot,
    subscribe,
    startTestWave,
    startNextWave,
    onCustomConfirmed
  });

  startTestWave();
})();
