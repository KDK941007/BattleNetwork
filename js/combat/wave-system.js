(()=>{
  const FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,AI=window.BattleNetworkEnemyAI,battle=document.getElementById('battle'),shell=battle?.closest('.shell')||document.body;
  if(!FIELD||!ENEMY||!AI||!battle)throw new Error('BattleNetworkWave: required dependency is missing.');
  const MODULES=['./js/combat/battle-reward-system.js?v=13','./js/combat/enemy-navigation.js?v=7','./js/combat/combat-defaults.js?v=143','./js/combat/enemy1-runtime.js?v=149','./js/combat/enemy1-movement.js?v=149','./js/combat/enemy1-shockwave.js?v=150','./js/ui/enemy1-pattern-test-ui.js?v=159','./js/debug/hitbox-debug-ui.js?v=4'];
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`BattleNetworkWave: failed to load ${src}`));document.head.appendChild(s)})}
  const enemy1Ready=MODULES.reduce((p,src)=>p.then(()=>loadScript(src)),Promise.resolve()).catch(error=>{console.error(error);throw error});
  const TEST_CONFIG=Object.freeze({
    testOnly:true,
    missionWaveCount:3,
    attackBehaviorId:'ENEMY1_GROUND_SHOCKWAVE',
    movementBehaviorId:'ENEMY1_MOVEMENT',
    clearNoticeMs:1000,
    startNoticeMs:1500,
    postStartDelayMs:500,
    defaultPlayerStartPosition:Object.freeze({x:FIELD.WORLD_SIZE/2,y:FIELD.WORLD_SIZE/2}),
    wavePlayerStartPositions:Object.freeze({}),
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
  const settingsList=document.querySelector('#settingsModal .settingsList'),settingsWaveInfo=document.createElement('div');
  settingsWaveInfo.id='settingsWaveInfo';
  settingsWaveInfo.setAttribute('aria-label','現在のウェーブ');
  settingsWaveInfo.style.cssText='min-height:48px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #315d70;border-radius:8px;background:#0b2a38;color:#eafaff;font-weight:900;';
  settingsWaveInfo.innerHTML='<span>WAVE</span><strong id="settingsWaveValue">1 / 3</strong>';
  settingsList?.prepend(settingsWaveInfo);

  const missionAbortButton=document.createElement('button');
  missionAbortButton.id='missionAbortButton';
  missionAbortButton.className='settingsItem missionAbortButton';
  missionAbortButton.type='button';
  missionAbortButton.innerHTML='ミッション中断<small>現在のミッションを終了</small>';
  settingsList?.appendChild(missionAbortButton);

  const missionAbortModal=document.createElement('div');
  missionAbortModal.id='missionAbortModal';
  missionAbortModal.className='missionAbortModal';
  missionAbortModal.hidden=true;
  missionAbortModal.innerHTML='<div class="missionAbortDialog" role="dialog" aria-modal="true" aria-labelledby="missionAbortTitle"><div class="missionAbortEyebrow">SYSTEM CONTROL</div><div class="missionAbortTitle" id="missionAbortTitle">MISSION ABORT</div><div class="missionAbortMessage" id="missionAbortMessage"></div><div class="missionAbortRewardHead">CURRENT BATTLE REWARD</div><div class="missionAbortRewardList" id="missionAbortRewardList"></div><div class="missionAbortRewardNote">※HP回復は一覧表示対象外</div><div class="missionAbortActions"><button type="button" id="missionAbortCancel">キャンセル</button><button type="button" id="missionAbortConfirm">中断する</button></div></div>';
  shell.appendChild(missionAbortModal);

  const missionSelectOverlay=document.createElement('div');
  missionSelectOverlay.id='missionSelectOverlay';
  missionSelectOverlay.className='missionSelectOverlay';
  missionSelectOverlay.innerHTML='<div class="missionSelectPanel"><div class="missionSelectEyebrow">BATTLE NETWORK // MISSION ACCESS</div><div class="missionSelectTitle">MISSION SELECT</div><div class="missionSelectGrid"><button type="button" class="missionSelectCard" id="missionSelectMission1"><span class="missionSelectNo">MISSION 01</span><strong>ネットバトル演習</strong><span class="missionSelectMeta">3 WAVES</span><span class="missionSelectStart">START &gt;&gt;</span></button></div><div class="missionSelectStatus" id="missionSelectStatus">LOADING MISSION DATA...</div></div>';
  shell.appendChild(missionSelectOverlay);
  const missionSelectButton=missionSelectOverlay.querySelector('#missionSelectMission1');
  const missionSelectStatus=missionSelectOverlay.querySelector('#missionSelectStatus');
  missionSelectButton.disabled=true;

  const missionClearOverlay=document.createElement('div');
  missionClearOverlay.id='missionClearOverlay';
  missionClearOverlay.className='missionClearOverlay';
  missionClearOverlay.hidden=true;
  missionClearOverlay.setAttribute('aria-live','polite');
  missionClearOverlay.innerHTML='<div class="missionClearPanel"><div class="missionClearEyebrow">NETWORK OPERATION COMPLETE</div><div class="missionClearTitle">MISSION CLEAR</div><div class="missionClearRule"><span></span><b>BATTLE REWARD</b><span></span></div><div class="missionClearRewardList" id="missionClearRewardList"></div><div class="missionClearStatus" id="missionClearStatus"></div><button type="button" class="missionClearReturn" id="missionClearReturn">ミッション選択へ</button></div>';
  shell.appendChild(missionClearOverlay);

  let state={waveNumber:0,pendingWaveNumber:null,status:'MISSION_SELECT',enemyIds:[],prepared:false},transitionToken=0;
  let lastActiveCount=0,multiDeleteBatchCount=0,maxMultiDeleteCount=0,multiDeleteResetTimer=null;
  let carryFullSynchroAcrossWave=false,waveClearPending=false,pendingWaveRewardResult=null,deleteFxObserver=null;
  let missionRewardResults=[],missionClearLocked=false,missionModulesReady=false;
  function clearMultiDeleteResetTimer(){if(multiDeleteResetTimer!==null){clearTimeout(multiDeleteResetTimer);multiDeleteResetTimer=null}}
  function resetMultiDeleteTracking(active=0){clearMultiDeleteResetTimer();lastActiveCount=Math.max(0,Math.trunc(Number(active)||0));multiDeleteBatchCount=0;maxMultiDeleteCount=0}
  function clearDeleteFxObserver(){if(deleteFxObserver){deleteFxObserver.disconnect();deleteFxObserver=null}}
  function resetWaveClearWait(){clearDeleteFxObserver();waveClearPending=false;pendingWaveRewardResult=null}
  function deleteVisualsComplete(){const roots=[...document.querySelectorAll('[data-enemy-delete-fx="1"]')];return roots.length===0||roots.every(root=>root.style.visibility==='hidden')}
  function waitForDeleteVisuals(fn){
    if(deleteVisualsComplete()){fn();return}
    clearDeleteFxObserver();
    const roots=[...document.querySelectorAll('[data-enemy-delete-fx="1"]')];
    deleteFxObserver=new MutationObserver(()=>{
      if(!deleteVisualsComplete())return;
      clearDeleteFxObserver();
      fn();
    });
    roots.forEach(root=>deleteFxObserver.observe(root,{attributes:true,attributeFilter:['style']}));
    if(deleteVisualsComplete()){clearDeleteFxObserver();fn()}
  }
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
  function getSnapshot(){const e=ENEMY.getBattleState();return Object.freeze({waveNumber:state.waveNumber,pendingWaveNumber:state.pendingWaveNumber,status:state.status,missionWaveCount:TEST_CONFIG.missionWaveCount,missionComplete:state.status==='MISSION_CLEAR',pendingRewardCount:missionRewardResults.filter(result=>result?.reward).length+(pendingWaveRewardResult?.reward?1:0),enemyIds:Object.freeze(state.enemyIds.slice()),total:e.total,active:e.active,defeated:e.defeated,allDefeated:e.allDefeated})}
  function displayedWaveNumber(){if((state.status==='STARTING'||state.status==='START_GAP'||state.status==='WAITING_CUSTOM')&&Number.isFinite(state.pendingWaveNumber))return state.pendingWaveNumber;if(state.waveNumber>0)return state.waveNumber;return Number.isFinite(state.pendingWaveNumber)?state.pendingWaveNumber:1}
  function updateSettingsWave(){
    const value=document.getElementById('settingsWaveValue');
    if(value)value.textContent=`${displayedWaveNumber()} / ${TEST_CONFIG.missionWaveCount}`;
    const unavailable=state.status==='MISSION_SELECT'||state.status==='MISSION_CLEAR'||missionClearLocked;
    missionAbortButton.hidden=state.status==='MISSION_SELECT';
    missionAbortButton.disabled=unavailable;
  }
  function render(){
    notice.dataset.status=state.status;
    notice.hidden=false;
    missionSelectOverlay.hidden=state.status!=='MISSION_SELECT';
    missionClearOverlay.hidden=state.status!=='MISSION_CLEAR';
    updateSettingsWave();
    if(state.status==='MISSION_CLEAR'||state.status==='MISSION_SELECT'){notice.textContent='';notice.hidden=true;return}
    if(state.status==='CLEARING'){notice.textContent='WAVE CLEAR';return}
    if(state.status==='STARTING'){notice.textContent=`WAVE ${state.pendingWaveNumber} START`;return}
    notice.textContent='';notice.hidden=true;
  }
  function emit(){const v=getSnapshot();listeners.forEach(fn=>{try{fn(v)}catch(e){console.error('BattleNetworkWave listener failed.',e)}});return v}
  function subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);fn(getSnapshot());return()=>listeners.delete(fn)}
  function getPlayer(){return window.BattleNetworkPlayer||null}
  function getEvil(){return window.BattleNetworkEvil||null}
  function getReward(){return window.BattleNetworkBattleReward||null}
  function currentMissionRewardResults(){
    const results=missionRewardResults.slice();
    if(pendingWaveRewardResult?.reward&&!results.includes(pendingWaveRewardResult))results.push(pendingWaveRewardResult);
    return results
  }
  function pendingMissionRewardCount(){return currentMissionRewardResults().filter(result=>result?.reward).length}
  function setMissionSelectStatus(message){if(missionSelectStatus)missionSelectStatus.textContent=message||''}
  function closeSettingsIfOpen(){
    const settings=document.getElementById('settingsModal');
    if(settings?.classList.contains('open'))document.getElementById('closeSettings')?.click();
  }
  function renderRewardRows(list,rows,emptyText='ITEM DATA : NONE'){
    if(!list)return;
    list.replaceChildren();
    const rewards=Array.isArray(rows)?rows:[];
    if(!rewards.length){
      const empty=document.createElement('div');
      empty.className='missionClearRewardEmpty';
      empty.textContent=emptyText;
      list.appendChild(empty);
      return
    }
    rewards.forEach(entry=>{
      const row=document.createElement('div');
      row.className='missionClearRewardRow';
      const waveTag=document.createElement('span');
      waveTag.className='missionClearRewardWave';
      waveTag.textContent=`WAVE ${String(entry.waveNumber||0).padStart(2,'0')}`;
      const icon=document.createElement('span');
      icon.className='missionClearRewardIcon';
      if(entry.imageSrc){
        const image=document.createElement('img');
        image.src=entry.imageSrc;
        image.alt=entry.imageAlt||'';
        image.draggable=false;
        icon.appendChild(image);
      }
      const name=document.createElement('strong');
      name.className='missionClearRewardName';
      name.textContent=entry.name||'---';
      const code=document.createElement('span');
      code.className='missionClearRewardCode';
      code.textContent=entry.code||'';
      row.append(waveTag,icon,name,code);
      list.appendChild(row);
    });
  }
  function renderMissionClear(summary){
    renderRewardRows(document.getElementById('missionClearRewardList'),summary?.displayRewards);
    const status=document.getElementById('missionClearStatus');
    if(status)status.textContent=(summary?.failureCount||0)>0?'一部のバトル報酬を保存できませんでした':'';
  }
  function closeMissionAbortDialog(){missionAbortModal.hidden=true}
  function openMissionAbortDialog(){
    if(state.status==='MISSION_SELECT'||state.status==='MISSION_CLEAR'||missionClearLocked)return;
    const currentRewards=currentMissionRewardResults();
    const summary=getReward()?.summarizeMission?.(currentRewards)||Object.freeze({rewardCount:pendingMissionRewardCount(),displayRewards:Object.freeze([])});
    const hasRewards=(summary.rewardCount||0)>0;
    const message=document.getElementById('missionAbortMessage');
    if(message)message.textContent=hasRewards?'ミッションを中断しますか？\n現在のバトル報酬は、中断すると手に入りません。':'ミッションを中断しますか？\n現在、未受取のバトル報酬はありません。';
    renderRewardRows(document.getElementById('missionAbortRewardList'),summary.displayRewards,'ITEM DATA : NONE');
    missionAbortModal.hidden=false;
    document.getElementById('missionAbortCancel')?.focus({preventScroll:true});
  }
  function returnToMissionSelect(){
    transitionToken++;
    resetWaveClearWait();
    closeMissionAbortDialog();
    closeSettingsIfOpen();
    showBattlefield();
    AI.pause('WAVE_TRANSITION');
    getPlayer()?.pauseForWaveTransition?.();
    AI.clearAssignments();
    ENEMY.clearAll();
    FIELD.resetTerrain?.();
    resetMultiDeleteTracking(0);
    carryFullSynchroAcrossWave=false;
    missionRewardResults=[];
    missionClearLocked=false;
    state={waveNumber:0,pendingWaveNumber:null,status:'MISSION_SELECT',enemyIds:[],prepared:false};
    missionSelectButton.disabled=!missionModulesReady;
    setMissionSelectStatus(missionModulesReady?'MISSION 01 READY':'LOADING MISSION DATA...');
    render();
    return emit()
  }
  function abortMission(){returnToMissionSelect()}
  async function startMission1(){
    if(state.status!=='MISSION_SELECT'||!missionModulesReady)return getSnapshot();
    missionSelectButton.disabled=true;
    setMissionSelectStatus('CONNECTING...');
    missionRewardResults=[];
    missionClearLocked=false;
    carryFullSynchroAcrossWave=false;
    state={waveNumber:0,pendingWaveNumber:1,status:'STARTING',enemyIds:[],prepared:false};
    render();emit();
    try{
      await enemy1Ready;
      return prepareNextWaveIntro(1)
    }catch(error){
      console.error('BattleNetworkWave: mission start failed.',error);
      state={waveNumber:0,pendingWaveNumber:null,status:'MISSION_SELECT',enemyIds:[],prepared:false};
      missionSelectButton.disabled=false;
      setMissionSelectStatus('MISSION DATA LOAD FAILED');
      render();
      return emit()
    }
  }
  missionAbortButton.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openMissionAbortDialog()});
  document.getElementById('missionAbortCancel')?.addEventListener('click',closeMissionAbortDialog);
  document.getElementById('missionAbortConfirm')?.addEventListener('click',abortMission);
  missionAbortModal.addEventListener('pointerdown',event=>{if(event.target===missionAbortModal)closeMissionAbortDialog()});
  missionSelectButton.addEventListener('click',()=>{void startMission1()});
  document.getElementById('missionClearReturn')?.addEventListener('click',returnToMissionSelect);
  function isFullSynchroActive(){return window.BattleNetworkFullSynchro?.isActive?.()===true}
  function restoreFullSynchroCarry(){
    if(!carryFullSynchroAcrossWave||getEvil()?.isActive?.()===true)return false;
    const hud=window.BattleNetworkPlayerHud;
    if(typeof hud?.setKokoroValue!=='function')return false;
    hud.setKokoroValue(255);
    return true;
  }
  function scheduleTransition(ms,fn){const token=++transitionToken;setTimeout(()=>{if(token===transitionToken)fn()},ms)}
  function showBattlefield(){document.getElementById('customModal')?.classList.remove('open');document.getElementById('chipDetailModal')?.classList.remove('open')}
  function showPreparedCustom(){document.getElementById('customModal')?.classList.add('open')}
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
  function getWavePlayerStartPosition(n){return TEST_CONFIG.wavePlayerStartPositions[n]||TEST_CONFIG.defaultPlayerStartPosition}
  function resetPlayerStartPosition(n){const player=getPlayer(),position=getWavePlayerStartPosition(n);if(!player?.setWaveStartPosition?.(position.x,position.y))throw new Error(`BattleNetworkWave: player start position is unavailable for wave ${n}.`);return position}
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
  function prepareWaveBattlefield(n){
    FIELD.resetTerrain?.();
    resetPlayerStartPosition(n);
    return createWaveEnemies(n)
  }
  function activateWave(n,enemyIds,{initializeSystems=true}={}){
    resetWaveClearWait();
    const ids=Array.isArray(enemyIds)?enemyIds:createWaveEnemies(n);
    state={waveNumber:n,pendingWaveNumber:null,status:'ACTIVE',enemyIds:ids,prepared:false};
    resetMultiDeleteTracking(ENEMY.getBattleState().active);
    if(initializeSystems){getEvil()?.onWaveStart?.();getReward()?.startWave?.(n)}
    window.BattleNetworkEnemy1Runtime?.resetWaveActions?.(ids,performance.now());render();const v=emit();getPlayer()?.resumeAfterWaveTransition?.();AI.resume('WAVE_TRANSITION');return v
  }
  function spawnWave(n){return activateWave(n,prepareWaveBattlefield(n),{initializeSystems:true})}
  function prepareNextWaveIntro(n){
    showBattlefield();resetWaveClearWait();AI.pause('WAVE_TRANSITION');getPlayer()?.pauseForWaveTransition?.();AI.clearAssignments();ENEMY.clearAll();resetMultiDeleteTracking(0);
    getPlayer()?.openNextWaveCustom?.();showBattlefield();
    getEvil()?.onWaveStart?.();restoreFullSynchroCarry();getReward()?.startWave?.(n);
    const enemyIds=prepareWaveBattlefield(n);
    state={...state,pendingWaveNumber:n,status:'STARTING',enemyIds,prepared:true};render();emit();
    scheduleTransition(TEST_CONFIG.startNoticeMs,()=>{
      if(state.status!=='STARTING'||state.pendingWaveNumber!==n||!state.prepared)return;
      state={...state,status:'START_GAP'};render();emit();
      scheduleTransition(TEST_CONFIG.postStartDelayMs,()=>{
        if(state.status!=='START_GAP'||state.pendingWaveNumber!==n||!state.prepared)return;
        state={...state,status:'WAITING_CUSTOM'};render();emit();showPreparedCustom();
      });
    });
    return getSnapshot()
  }
  async function completeMissionClear(){
    if(state.status!=='CLEARING'&&state.status!=='REWARD')return getSnapshot();
    missionClearLocked=true;
    updateSettingsWave();
    const completedRewards=missionRewardResults.slice();
    let summary=Object.freeze({ok:false,appliedCount:0,failureCount:completedRewards.filter(result=>result?.reward).length,displayRewards:Object.freeze([])});
    try{
      summary=await getReward()?.commitMission?.(completedRewards)||summary;
    }catch(error){
      console.error('BattleNetworkWave: failed to commit mission rewards.',error);
    }
    if(state.status!=='CLEARING'&&state.status!=='REWARD')return getSnapshot();
    missionRewardResults=[];
    state={...state,pendingWaveNumber:null,status:'MISSION_CLEAR',prepared:false};
    renderMissionClear(summary);
    render();
    return emit()
  }
  async function openWaveRewardPreview(rewardResult,completedWave,finalWave){
    if(state.status!=='CLEARING'||state.waveNumber!==completedWave)return getSnapshot();
    state={...state,pendingWaveNumber:finalWave?null:completedWave+1,status:'REWARD',prepared:false};
    render();emit();
    await getReward()?.show?.(rewardResult,{isFinal:finalWave,apply:false});
    if(state.status!=='REWARD'||state.waveNumber!==completedWave)return getSnapshot();
    if(finalWave)return completeMissionClear();
    return prepareNextWaveIntro(completedWave+1)
  }
  function completeWaveClear(){
    if(state.status!=='ACTIVE'||!waveClearPending)return;
    const rewardResult=pendingWaveRewardResult;
    const completedWave=state.waveNumber;
    clearDeleteFxObserver();waveClearPending=false;pendingWaveRewardResult=null;
    if(rewardResult)missionRewardResults.push(rewardResult);
    const finalWave=completedWave>=TEST_CONFIG.missionWaveCount;
    if(finalWave)missionClearLocked=true;
    state={...state,pendingWaveNumber:finalWave?null:completedWave+1,status:'CLEARING',prepared:false};
    render();emit();
    scheduleTransition(TEST_CONFIG.clearNoticeMs,()=>{void openWaveRewardPreview(rewardResult,completedWave,finalWave)})
  }
  function onEnemyState(e){
    noteEnemyCountForMultiDelete(e);
    if(state.status!=='ACTIVE'||!e.allDefeated)return;
    if(!waveClearPending){
      waveClearPending=true;
      showBattlefield();AI.pause('WAVE_TRANSITION');getPlayer()?.pauseForWaveTransition?.();
      const multiDeleteCount=maxMultiDeleteCount,multiDeleteScore=multiDeleteBonus(multiDeleteCount);
      pendingWaveRewardResult=getReward()?.finishWave?.({multiDeleteCount,multiDeleteBonus:multiDeleteScore})||null;
      carryFullSynchroAcrossWave=carryFullSynchroAcrossWave||isFullSynchroActive();
      getEvil()?.onWaveEnd?.();restoreFullSynchroCarry();
    }
    waitForDeleteVisuals(completeWaveClear)
  }
  function startNextWave(){
    if(state.status!=='WAITING_CUSTOM'||!Number.isFinite(state.pendingWaveNumber))return getSnapshot();
    const n=state.pendingWaveNumber;
    if(state.prepared){return activateWave(n,state.enemyIds.slice(),{initializeSystems:false})}
    AI.pause('WAVE_TRANSITION');getPlayer()?.pauseForWaveTransition?.();AI.clearAssignments();ENEMY.clearAll();resetMultiDeleteTracking(0);state={waveNumber:state.waveNumber,pendingWaveNumber:n,status:'STARTING',enemyIds:[],prepared:false};render();emit();scheduleTransition(TEST_CONFIG.startNoticeMs,()=>{if(state.status!=='STARTING'||state.pendingWaveNumber!==n)return;enemy1Ready.then(()=>spawnWave(n)).catch(()=>{state={...state,status:'WAITING_CUSTOM'};render();emit()})});return getSnapshot()
  }
  window.BattleNetworkWave=Object.freeze({TEST_CONFIG,getSnapshot,subscribe,startTestWave:startNextWave,startNextWave,onCustomConfirmed:startNextWave,returnToMissionSelect,startMission1});
  AI.pause('WAVE_TRANSITION');ENEMY.subscribe(onEnemyState);showBattlefield();getPlayer()?.pauseForWaveTransition?.();render();
  enemy1Ready.then(()=>{
    missionModulesReady=true;
    missionSelectButton.disabled=state.status!=='MISSION_SELECT';
    if(state.status==='MISSION_SELECT')setMissionSelectStatus('MISSION 01 READY')
  }).catch(()=>{
    missionModulesReady=false;
    missionSelectButton.disabled=true;
    setMissionSelectStatus('MISSION DATA LOAD FAILED')
  });
})();