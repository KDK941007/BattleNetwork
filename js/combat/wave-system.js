(()=>{
  const FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,AI=window.BattleNetworkEnemyAI,battle=document.getElementById('battle');
  if(!FIELD||!ENEMY||!AI||!battle)throw new Error('BattleNetworkWave: required dependency is missing.');
  const MODULES=['./js/combat/battle-reward-system.js?v=10','./js/combat/enemy-navigation.js?v=7','./js/combat/combat-defaults.js?v=143','./js/combat/enemy1-runtime.js?v=148','./js/combat/enemy1-movement.js?v=148','./js/combat/enemy1-shockwave.js?v=147','./js/ui/enemy1-pattern-test-ui.js?v=159','./js/debug/hitbox-debug-ui.js?v=3'];
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`BattleNetworkWave: failed to load ${src}`));document.head.appendChild(s)})}
  const enemy1Ready=MODULES.reduce((p,src)=>p.then(()=>loadScript(src)),Promise.resolve()).catch(error=>{console.error(error);throw error});
  const TEST_CONFIG=Object.freeze({
    testOnly:true,
    missionWaveCount:3,
    attackBehaviorId:'ENEMY1_GROUND_SHOCKWAVE',
    movementBehaviorId:'ENEMY1_MOVEMENT',
    clearNoticeMs:1500,
    startNoticeMs:1500,
    waveSpawnTiles:Object.freeze({
      1:Object.freeze([Object.freeze({rowOffset:0,colOffset:4})]),
      2:Object.freeze([
        Object.freeze({rowOffset:-1,colOffset:4}),
        Object.freeze({rowOffset:0,colOffset:4}),
        Object.freeze({rowOffset:1,colOffset:4})
      ]),
      3:Object.freeze([
        Object.freeze({rowOffset:-2,colOffset:3}),
        Object.freeze({rowOffset:-2,colOffset:5}),
        Object.freeze({rowOffset:0,colOffset:4}),
        Object.freeze({rowOffset:2,colOffset:3}),
        Object.freeze({rowOffset:2,colOffset:5})
      ])
    }),
    swordDummyTiles:Object.freeze([Object.freeze({rowOffset:0,colOffset:1})]),
    longSwordDummyTiles:Object.freeze([
      Object.freeze({rowOffset:0,colOffset:1}),
      Object.freeze({rowOffset:0,colOffset:2})
    ]),
    spreadDummyTiles:Object.freeze([Object.freeze({rowOffset:-1,colOffset:4}),Object.freeze({rowOffset:1,colOffset:4})]),
    vulcanGridTiles:Object.freeze([
      Object.freeze({rowOffset:-1,colOffset:3}),Object.freeze({rowOffset:-1,colOffset:4}),Object.freeze({rowOffset:-1,colOffset:5}),
      Object.freeze({rowOffset:0,colOffset:3}),Object.freeze({rowOffset:0,colOffset:4}),Object.freeze({rowOffset:0,colOffset:5}),
      Object.freeze({rowOffset:1,colOffset:3}),Object.freeze({rowOffset:1,colOffset:4}),Object.freeze({rowOffset:1,colOffset:5})
    ]),
    chipDetailTestHp:999,
    spreadTestHp:999,
    vulcanTestHp:999,
    swordTestHp:999
  });
  const listeners=new Set(),notice=document.createElement('div');notice.className='waveStatusNotice';notice.setAttribute('aria-live','polite');battle.appendChild(notice);
  let state={waveNumber:0,pendingWaveNumber:1,status:'WAITING_CUSTOM',enemyIds:[],prepared:false},transitionToken=0;
  let lastActiveCount=0,multiDeleteBatchCount=0,maxMultiDeleteCount=0,multiDeleteResetTimer=null;
  function clearMultiDeleteResetTimer(){if(multiDeleteResetTimer!==null){clearTimeout(multiDeleteResetTimer);multiDeleteResetTimer=null}}
  function resetMultiDeleteTracking(active=0){clearMultiDeleteResetTimer();lastActiveCount=Math.max(0,Math.trunc(Number(active)||0));multiDeleteBatchCount=0;maxMultiDeleteCount=0}
  function noteEnemyCountForMultiDelete(e){
    const active=Math.max(0,Math.trunc(Number(e?.active)||0));
    if(state.status!=='ACTIVE'){lastActiveCount=active;return}
    if(active<lastActiveCount){
      multiDeleteBatchCount+=lastActiveCount-active;
      if(multiDeleteBatchCount>=2)maxMultiDeleteCount=Math.max(maxMultiDeleteCount,multiDeleteBatchCount);
      if(multiDeleteResetTimer===null)multiDeleteResetTimer=setTimeout(()=>{multiDeleteBatchCount=0;multiDeleteResetTimer=null},0);
    }else if(active>lastActiveCount){
      multiDeleteBatchCount=0;
    }
    lastActiveCount=active;
  }
  function multiDeleteBonus(count){const value=Math.max(0,Math.trunc(Number(count)||0));return value>=3?4:value===2?2:0}
  function getSnapshot(){const e=ENEMY.getBattleState();return Object.freeze({waveNumber:state.waveNumber,pendingWaveNumber:state.pendingWaveNumber,status:state.status,missionWaveCount:TEST_CONFIG.missionWaveCount,missionComplete:state.status==='MISSION_CLEAR',enemyIds:Object.freeze(state.enemyIds.slice()),total:e.total,active:e.active,defeated:e.defeated,allDefeated:e.allDefeated})}
  function render(){notice.dataset.status=state.status;if(state.status==='MISSION_CLEAR'){notice.textContent='MISSION CLEAR';return}if(state.status==='CLEARING'){notice.textContent='WAVE CLEAR';return}if(state.status==='REWARD'){notice.textContent='GET DATA';return}if(state.status==='STARTING'){notice.textContent=`WAVE ${state.pendingWaveNumber} START`;return}if(state.status==='WAITING_CUSTOM'&&state.waveNumber>0){notice.textContent=`WAVE ${state.pendingWaveNumber} READY`;return}notice.textContent=`WAVE ${state.status==='ACTIVE'?state.waveNumber:state.pendingWaveNumber}`}
  function emit(){const v=getSnapshot();listeners.forEach(fn=>{try{fn(v)}catch(e){console.error('BattleNetworkWave listener failed.',e)}});return v}
  function subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);fn(getSnapshot());return()=>listeners.delete(fn)}
  function getPlayer(){return window.BattleNetworkPlayer||null}
  function getEvil(){return window.BattleNetworkEvil||null}
  function getReward(){return window.BattleNetworkBattleReward||null}
  function scheduleTransition(ms,fn){const token=++transitionToken;setTimeout(()=>{if(token===transitionToken)fn()},ms)}
  function showBattlefield(){document.getElementById('customModal')?.classList.remove('open');document.getElementById('chipDetailModal')?.classList.remove('open')}
  function getDefaults(){const runtime=window.BattleNetworkEnemy1Runtime;if(!runtime)throw new Error('BattleNetworkWave: Enemy 1 runtime is missing.');return runtime.getEnemyDefaults()}
  function boundsOverlap(a,b){return !!a&&!!b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top}
  function spawnBoundsAt(position,defaults){const width=FIELD.TILE_SIZE*defaults.hitBoxWidthTiles,height=FIELD.TILE_SIZE*defaults.hitBoxHeightTiles,offsetX=FIELD.TILE_SIZE*defaults.hitBoxOffsetXTiles,offsetY=FIELD.TILE_SIZE*defaults.hitBoxOffsetYTiles,centerX=position.x+offsetX,centerY=position.y+offsetY;return{left:centerX-width/2,right:centerX+width/2,top:centerY-height/2,bottom:centerY+height/2}}
  function canUseSpawnCell(row,col,defaults){const p=FIELD.tileToWorldCenter(row,col);if(!p||!FIELD.canOccupyWorld?.(p.x,p.y))return false;const candidate=spawnBoundsAt(p,defaults);for(const enemy of ENEMY.getActiveEnemies()){if(boundsOverlap(candidate,enemy.bounds))return false}return true}
  function resolveSpawnPosition(tile,defaults){
    const baseRow=Math.floor(FIELD.GRID_ROWS/2)+tile.rowOffset,baseCol=Math.floor(FIELD.GRID_COLS/2)+tile.colOffset;
    if(canUseSpawnCell(baseRow,baseCol,defaults))return FIELD.tileToWorldCenter(baseRow,baseCol);
    const maxRadius=Math.max(FIELD.GRID_ROWS,FIELD.GRID_COLS);
    for(let radius=1;radius<=maxRadius;radius++){
      for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){
        if(Math.max(Math.abs(dr),Math.abs(dc))!==radius)continue;
        const row=baseRow+dr,col=baseCol+dc;
        if(row<0||row>=FIELD.GRID_ROWS||col<0||col>=FIELD.GRID_COLS)continue;
        if(canUseSpawnCell(row,col,defaults))return FIELD.tileToWorldCenter(row,col);
      }
    }
    throw new Error('BattleNetworkWave: no non-overlapping spawn tile is available.');
  }
  function spawnBaseEnemy(tile,{staticDummy=false,maxHp=null}={}){const defaults=getDefaults(),p=staticDummy?FIELD.tileToWorldCenter(Math.floor(FIELD.GRID_ROWS/2)+tile.rowOffset,Math.floor(FIELD.GRID_COLS/2)+tile.colOffset):resolveSpawnPosition(tile,defaults);if(!p)throw new Error('BattleNetworkWave: spawn tile outside field.');const hp=Number.isFinite(maxHp)&&maxHp>0?maxHp:defaults.maxHp;return ENEMY.spawn({x:p.x,y:p.y,health:{maxHp:hp},visual:{width:defaults.visualWidthPx,height:defaults.visualHeightPx,offsetX:defaults.visualOffsetXPx,offsetY:defaults.visualOffsetYPx},hitBox:{width:FIELD.TILE_SIZE*defaults.hitBoxWidthTiles,height:FIELD.TILE_SIZE*defaults.hitBoxHeightTiles,offsetX:FIELD.TILE_SIZE*defaults.hitBoxOffsetXTiles,offsetY:FIELD.TILE_SIZE*defaults.hitBoxOffsetYTiles},collision:{allowPlayerOverlap:defaults.allowPlayerOverlap,allowEnemyOverlap:staticDummy?true:defaults.allowEnemyOverlap}})}
  function spawnEnemy(tile,{maxHp=null}={}){const id=spawnBaseEnemy(tile,{maxHp});const m=AI.assignBehavior(id,TEST_CONFIG.movementBehaviorId);if(!m.ok)throw new Error(`BattleNetworkWave: movement assign failed: ${m.reason}`);const a=AI.assignBehavior(id,TEST_CONFIG.attackBehaviorId);if(!a.ok)throw new Error(`BattleNetworkWave: attack assign failed: ${a.reason}`);return id}
  function getWaveSpawnTiles(n){return TEST_CONFIG.waveSpawnTiles[n]||TEST_CONFIG.waveSpawnTiles[1]}
  function getTestTarget(){return window.BattleNetworkFolder?.getTestTarget?.()||null}
  function isSpreadGunTest(){try{return window.BattleNetworkFolder?.toLegacyCards?.()?.[0]?.type==='SPREADGUN'}catch{return false}}
  function isVulcanTest(){return getTestTarget()?.enabled===true&&getTestTarget()?.type==='VULCAN1'}
  function isSwordTest(){return getTestTarget()?.enabled===true&&getTestTarget()?.type==='SWORD'}
  function isLongSwordTest(){return getTestTarget()?.enabled===true&&getTestTarget()?.type==='LONG'}
  function isChipDetailTest(){return getTestTarget()?.enabled===true}
  function createWaveEnemies(n){
    const longSwordTest=isLongSwordTest(),swordTest=!longSwordTest&&isSwordTest(),vulcanTest=!longSwordTest&&!swordTest&&isVulcanTest(),spreadTest=!longSwordTest&&!swordTest&&!vulcanTest&&isSpreadGunTest(),hp=isChipDetailTest()?TEST_CONFIG.chipDetailTestHp:spreadTest?TEST_CONFIG.spreadTestHp:null;
    let enemyIds;
    if(longSwordTest){
      enemyIds=TEST_CONFIG.longSwordDummyTiles.map(tile=>spawnBaseEnemy(tile,{staticDummy:true,maxHp:TEST_CONFIG.swordTestHp}));
    }else if(swordTest){
      enemyIds=TEST_CONFIG.swordDummyTiles.map(tile=>spawnBaseEnemy(tile,{staticDummy:true,maxHp:TEST_CONFIG.swordTestHp}));
    }else if(vulcanTest){
      enemyIds=TEST_CONFIG.vulcanGridTiles.map(tile=>spawnBaseEnemy(tile,{staticDummy:true,maxHp:TEST_CONFIG.vulcanTestHp}));
    }else{
      enemyIds=getWaveSpawnTiles(n).map(tile=>spawnEnemy(tile,{maxHp:hp}));
      if(spreadTest)TEST_CONFIG.spreadDummyTiles.forEach(tile=>enemyIds.push(spawnBaseEnemy(tile,{staticDummy:true,maxHp:TEST_CONFIG.spreadTestHp})));
    }
    return enemyIds
  }
  function activateWave(n,enemyIds,{initializeSystems=true}={}){
    const ids=Array.isArray(enemyIds)?enemyIds:createWaveEnemies(n);
    state={waveNumber:n,pendingWaveNumber:null,status:'ACTIVE',enemyIds:ids,prepared:false};
    resetMultiDeleteTracking(ENEMY.getBattleState().active);
    if(initializeSystems){getEvil()?.onWaveStart?.();getReward()?.startWave?.(n)}
    render();const v=emit();getPlayer()?.resumeAfterWaveTransition?.();AI.resume('WAVE_TRANSITION');return v
  }
  function spawnWave(n){return activateWave(n,createWaveEnemies(n),{initializeSystems:true})}
  function prepareNextWaveIntro(n){
    AI.pause('WAVE_TRANSITION');getPlayer()?.pauseForWaveTransition?.();AI.clearAssignments();ENEMY.clearAll();FIELD.resetTerrain?.();resetMultiDeleteTracking(0);
    getEvil()?.onWaveStart?.();getReward()?.startWave?.(n);
    state={...state,pendingWaveNumber:n,status:'STARTING',enemyIds:[],prepared:true};render();emit();
    scheduleTransition(TEST_CONFIG.startNoticeMs,()=>{
      if(state.status!=='STARTING'||state.pendingWaveNumber!==n||!state.prepared)return;
      state={...state,status:'WAITING_CUSTOM'};render();emit();getPlayer()?.openNextWaveCustom?.();
    });
    return getSnapshot()
  }
  async function openWaveReward(rewardResult){
    if(state.status!=='CLEARING')return getSnapshot();
    const completedWave=state.waveNumber;
    const finalWave=completedWave>=TEST_CONFIG.missionWaveCount;
    showBattlefield();
    state={...state,pendingWaveNumber:finalWave?null:completedWave+1,status:'REWARD'};render();emit();
    await getReward()?.show?.(rewardResult,{isFinal:finalWave});
    if(state.status!=='REWARD'||state.waveNumber!==completedWave)return getSnapshot();
    if(finalWave){state={...state,pendingWaveNumber:null,status:'MISSION_CLEAR',prepared:false};render();return emit()}
    return prepareNextWaveIntro(completedWave+1)
  }
  function onEnemyState(e){
    noteEnemyCountForMultiDelete(e);
    if(state.status!=='ACTIVE'||!e.allDefeated)return;
    showBattlefield();AI.pause('WAVE_TRANSITION');getPlayer()?.pauseForWaveTransition?.();
    const multiDeleteCount=maxMultiDeleteCount,multiDeleteScore=multiDeleteBonus(multiDeleteCount);
    const rewardResult=getReward()?.finishWave?.({multiDeleteCount,multiDeleteBonus:multiDeleteScore})||null;
    getEvil()?.onWaveEnd?.();const finalWave=state.waveNumber>=TEST_CONFIG.missionWaveCount;state={...state,pendingWaveNumber:finalWave?null:state.waveNumber+1,status:'CLEARING',prepared:false};render();emit();scheduleTransition(TEST_CONFIG.clearNoticeMs,()=>{void openWaveReward(rewardResult)})
  }
  function startNextWave(){
    if(state.status!=='WAITING_CUSTOM'||!Number.isFinite(state.pendingWaveNumber))return getSnapshot();
    const n=state.pendingWaveNumber;
    if(state.prepared){return activateWave(n,createWaveEnemies(n),{initializeSystems:false})}
    AI.pause('WAVE_TRANSITION');getPlayer()?.pauseForWaveTransition?.();AI.clearAssignments();ENEMY.clearAll();resetMultiDeleteTracking(0);state={waveNumber:state.waveNumber,pendingWaveNumber:n,status:'STARTING',enemyIds:[],prepared:false};render();emit();scheduleTransition(TEST_CONFIG.startNoticeMs,()=>{if(state.status!=='STARTING'||state.pendingWaveNumber!==n)return;enemy1Ready.then(()=>spawnWave(n)).catch(()=>{state={...state,status:'WAITING_CUSTOM'};render();emit()})});return getSnapshot()
  }
  window.BattleNetworkWave=Object.freeze({TEST_CONFIG,getSnapshot,subscribe,startTestWave:startNextWave,startNextWave,onCustomConfirmed:startNextWave});AI.pause('WAVE_TRANSITION');ENEMY.subscribe(onEnemyState);render();
})();