(()=>{
  const RUNTIME=window.BattleNetworkEnemy1Runtime,FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,AI=window.BattleNetworkEnemyAI,battle=document.getElementById('battle'),scene=document.getElementById('scene');
  if(!RUNTIME||!FIELD||!ENEMY||!AI||!battle||!scene)throw new Error('BattleNetworkEnemy1PatternTestUI: required dependency is missing.');
  const PX=.72,PY=.36;
  const TIMING=window.BattleNetworkData?.CHIP_TIMING_DEFAULTS||Object.freeze({startupDelaySec:.10,actionLockSec:.25});
  const SHOOTING_RANGE=Number(window.BattleNetworkData?.SHOOTING_RANGE_DEFAULT_TILES)||7;
  const CANNON_BASE=Object.freeze({rangeTiles:SHOOTING_RANGE,projectileSpeed:2000,actionLockSec:.25,startupDelaySec:.40});
  const AIRSHOT_BASE=Object.freeze({rangeTiles:SHOOTING_RANGE,projectileSpeed:4000,actionLockSec:TIMING.actionLockSec,startupDelaySec:TIMING.startupDelaySec});
  const VULCAN1_BASE=Object.freeze({burstIntervalSec:.05});
  const CANNON_LIMITS=Object.freeze({projectileSpeed:Object.freeze({min:100,max:3000,step:100}),startupDelaySec:Object.freeze({min:0,max:2,step:.05})});
  const VULCAN1_LIMITS=Object.freeze({burstIntervalSec:Object.freeze({min:.05,max:1.00,step:.05})});
  let cannonSettings={...CANNON_BASE},vulcan1Settings={...VULCAN1_BASE},settingsOpen=false;
  const cannonListeners=new Set(),vulcan1Listeners=new Set();
  function clampStep(value,limit){const n=Math.max(limit.min,Math.min(limit.max,Number(value)));const steps=Math.round((n-limit.min)/limit.step);return Number((limit.min+steps*limit.step).toFixed(2))}
  function getAirShotSettings(){return Object.freeze({...AIRSHOT_BASE})}
  function getCannonSettings(){return Object.freeze({...cannonSettings})}
  function getVulcan1Settings(){return Object.freeze({...vulcan1Settings})}
  function emit(listeners,snapshot){listeners.forEach(listener=>{try{listener(snapshot)}catch(error){console.error('BattleNetworkTestSettings listener failed.',error)}});return snapshot}
  function setSetting(target,key,value,limits,listeners,getter){const limit=limits[key];if(!limit)return getter();target[key]=clampStep(value,limit);render();return emit(listeners,getter())}
  function adjustSetting(target,key,direction,limits,listeners,getter){const limit=limits[key];if(!limit)return getter();return setSetting(target,key,target[key]+limit.step*(direction<0?-1:1),limits,listeners,getter)}
  function setCannonSetting(key,value){return setSetting(cannonSettings,key,value,CANNON_LIMITS,cannonListeners,getCannonSettings)}
  function adjustCannonSetting(key,direction){return adjustSetting(cannonSettings,key,direction,CANNON_LIMITS,cannonListeners,getCannonSettings)}
  function setVulcan1Setting(key,value){return setSetting(vulcan1Settings,key,value,VULCAN1_LIMITS,vulcan1Listeners,getVulcan1Settings)}
  function adjustVulcan1Setting(key,direction){return adjustSetting(vulcan1Settings,key,direction,VULCAN1_LIMITS,vulcan1Listeners,getVulcan1Settings)}
  function subscribe(listeners,getter,listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);listener(getter());return()=>listeners.delete(listener)}
  function subscribeCannon(listener){return subscribe(cannonListeners,getCannonSettings,listener)}
  function subscribeVulcan1(listener){return subscribe(vulcan1Listeners,getVulcan1Settings,listener)}
  window.BattleNetworkTestSettings=Object.freeze({CANNON_BASE,AIRSHOT_BASE,VULCAN1_BASE,CANNON_LIMITS,VULCAN1_LIMITS,getCannonSettings,setCannonSetting,adjustCannonSetting,subscribeCannon,getAirShotSettings,getVulcan1Settings,setVulcan1Setting,adjustVulcan1Setting,subscribeVulcan1});

  const wrap=document.createElement('div'),toggle=document.createElement('button'),tools=document.createElement('div'),modeButton=document.createElement('button'),patternButton=document.createElement('button'),rangeButton=document.createElement('button'),glowButton=document.createElement('button'),attackButton=document.createElement('button'),movementButton=document.createElement('button'),detail=document.createElement('span'),vulcanPanel=document.createElement('div'),airShotPanel=document.createElement('div'),cannonPanel=document.createElement('div'),modePanel=document.createElement('div');
  wrap.dataset.testOnly='enemy-debug-tools';
  const closedStyle='position:absolute;right:10px;top:10px;z-index:70;display:flex;align-items:flex-start;gap:6px;padding:5px 7px;border:1px solid rgba(255,255,255,.5);border-radius:8px;background:rgba(8,12,20,.88);color:#fff;font:700 11px/1.2 system-ui,sans-serif;pointer-events:auto;max-width:calc(100% - 20px);box-sizing:border-box;';
  const openStyle='position:absolute;left:0;right:0;top:0;bottom:0;width:100%;height:100%;z-index:70;display:flex;flex-direction:column;align-items:stretch;gap:10px;padding:12px;border:1px solid rgba(255,255,255,.5);border-radius:0;background:rgba(8,12,20,.96);color:#fff;font:700 11px/1.25 system-ui,sans-serif;pointer-events:auto;box-sizing:border-box;overflow:hidden;';
  wrap.style.cssText=closedStyle;
  [toggle,modeButton,patternButton,rangeButton,glowButton,attackButton,movementButton].forEach(button=>{button.type='button';button.style.cssText='min-height:36px;border:1px solid #ffe27a;border-radius:6px;background:#30270d;color:#fff7c9;font-weight:900;font-variant-numeric:tabular-nums;padding:6px 10px;'});
  toggle.style.minWidth='108px';patternButton.disabled=true;patternButton.style.opacity='.72';
  tools.style.cssText='display:none;flex:1 1 0;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;flex-direction:column;align-items:stretch;gap:10px;padding-right:4px;padding-bottom:24px;box-sizing:border-box;';
  modePanel.style.cssText='display:flex;flex:0 0 auto;flex-direction:column;align-items:stretch;gap:8px;';
  detail.style.cssText='display:block;flex:0 0 auto;white-space:normal;font-variant-numeric:tabular-nums;padding:8px 2px 24px;';
  const chipPanelStyle='display:flex;flex:0 0 auto;flex-direction:column;align-items:stretch;gap:8px;padding:10px;border:1px solid rgba(112,222,255,.55);border-radius:7px;background:rgba(6,35,48,.78);font-variant-numeric:tabular-nums;box-sizing:border-box;';
  vulcanPanel.style.cssText=chipPanelStyle;airShotPanel.style.cssText=chipPanelStyle;cannonPanel.style.cssText=chipPanelStyle;

  function makeStepper(label,key,unit,formatValue,target,adjust){
    const box=document.createElement('div'),name=document.createElement('span'),control=document.createElement('span'),prev=document.createElement('button'),value=document.createElement('strong'),next=document.createElement('button');
    box.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:38px;';name.textContent=label;name.style.cssText='color:#c8f5ff;font-weight:900;min-width:76px;';control.style.cssText='display:inline-flex;align-items:center;gap:8px;white-space:nowrap;';
    [prev,next].forEach(button=>{button.type='button';button.style.cssText='width:42px;height:34px;padding:0;border:1px solid #8eeaff;border-radius:5px;background:#0c4053;color:#eaffff;font-weight:900;line-height:1;';});
    prev.textContent='◀';next.textContent='▶';value.style.cssText='display:inline-block;min-width:82px;text-align:center;color:#fff;font-size:13px;';const refresh=()=>{const raw=target[key];value.textContent=`${formatValue?formatValue(raw):raw}${unit||''}`;};prev.addEventListener('click',()=>adjust(key,-1));next.addEventListener('click',()=>adjust(key,1));control.append(prev,value,next);box.append(name,control);box.refresh=refresh;return box;
  }
  const vulcanIntervalStepper=makeStepper('連射間隔','burstIntervalSec','秒',value=>Number(value).toFixed(2),vulcan1Settings,adjustVulcan1Setting);
  const cannonSpeedStepper=makeStepper('弾速','projectileSpeed','',value=>String(value),cannonSettings,adjustCannonSetting);
  const cannonStartupStepper=makeStepper('発動前','startupDelaySec','秒',value=>Number(value).toFixed(2),cannonSettings,adjustCannonSetting);
  const vulcanTitle=document.createElement('strong');vulcanTitle.textContent='バルカン1';vulcanTitle.style.cssText='font-size:14px;color:#eaffff;';
  const airShotTitle=document.createElement('strong');airShotTitle.textContent='エアシュート';airShotTitle.style.cssText='font-size:14px;color:#eaffff;';
  const cannonTitle=document.createElement('strong');cannonTitle.textContent='キャノン';cannonTitle.style.cssText='font-size:14px;color:#eaffff;';
  const vulcanFixed=document.createElement('span');vulcanFixed.style.cssText='display:block;color:#ffe9a6;font-weight:900;padding-top:4px;';vulcanFixed.textContent=`固定値：3発 / 射程 ${SHOOTING_RANGE} / 弾速 4000 / 発動前 ${TIMING.startupDelaySec.toFixed(2)}秒 / 発動後 ${TIMING.actionLockSec.toFixed(2)}秒`;
  const airShotFixed=document.createElement('span');airShotFixed.style.cssText='display:block;color:#ffe9a6;font-weight:900;padding-top:4px;';airShotFixed.textContent=`確定値：射程 ${SHOOTING_RANGE} / 弾速 4000 / 発動前 ${TIMING.startupDelaySec.toFixed(2)}秒 / 発動後 ${TIMING.actionLockSec.toFixed(2)}秒`;
  const cannonFixed=document.createElement('span');cannonFixed.style.cssText='display:block;color:#ffe9a6;font-weight:900;padding-top:4px;';cannonFixed.textContent=`固定値：射程 ${SHOOTING_RANGE} / 発動後 0.25秒`;
  vulcanPanel.append(vulcanTitle,vulcanIntervalStepper,vulcanFixed);airShotPanel.append(airShotTitle,airShotFixed);cannonPanel.append(cannonTitle,cannonSpeedStepper,cannonStartupStepper,cannonFixed);

  const rings=new Map();let animationFrame=null,startRadius=0,releaseRadius=0;
  function sec(ms){return `${(ms/1000).toFixed(2)}s`}
  function playerApi(){return window.BattleNetworkPlayer||null}
  function refreshRadii(){const config=RUNTIME.getEnemyConfig();startRadius=FIELD.toWorldDistance(config.perceptionStartTiles);releaseRadius=FIELD.toWorldDistance(config.perceptionReleaseTiles)}
  function geometry(radius){return{w:Math.SQRT2*radius*PX*2,h:Math.SQRT2*radius*PY*2}}
  function createRing(border,background){const el=document.createElement('div');el.dataset.testOnly='enemy-perception-ring';el.style.cssText=`position:absolute;left:50%;top:50%;border:${border};border-style:dashed;border-radius:50%;background:${background};pointer-events:none;transform:translate(-50%,-50%);transform-origin:center;`;return el}
  function createCenterMarker(){const el=document.createElement('div');el.dataset.testOnly='enemy-perception-center';el.style.cssText='position:absolute;left:50%;top:50%;width:18px;height:18px;border:3px solid #fff;border-radius:50%;background:#ff3344;box-shadow:0 0 0 3px rgba(255,51,68,.35),0 0 10px rgba(255,51,68,.9);pointer-events:none;transform:translate(-50%,-50%);z-index:12;';return el}
  function applySizes(pair){const a=geometry(startRadius),b=geometry(releaseRadius);pair.start.style.width=`${a.w}px`;pair.start.style.height=`${a.h}px`;pair.release.style.width=`${b.w}px`;pair.release.style.height=`${b.h}px`}
  function getEnemyElementByIndex(index){const elements=scene.querySelectorAll('.enemyPrototype');return elements[index]||null}
  function ensureRings(enemy,index){let pair=rings.get(enemy.id);if(pair&&pair.host?.isConnected)return pair;const host=getEnemyElementByIndex(index);if(!host)return null;const start=createRing('5px rgba(255,211,82,.98)','rgba(255,211,82,.08)'),release=createRing('4px rgba(84,235,255,.98)','transparent'),center=createCenterMarker();host.prepend(release,start,center);pair={host,start,release,center,aware:null};rings.set(enemy.id,pair);applySizes(pair);return pair}
  function removePair(id,pair){pair.start?.remove();pair.release?.remove();pair.center?.remove();rings.delete(id)}
  function updateRingSizes(){for(const pair of rings.values())applySizes(pair)}
  function drawFrame(){if(animationFrame===null)return;const debug=RUNTIME.getDebugState();if(!debug.enabled||!debug.showPerception){animationFrame=null;return}const all=ENEMY.getEnemies(),activeIds=new Set();all.forEach((enemy,index)=>{if(enemy.isDefeated)return;activeIds.add(enemy.id);const pair=ensureRings(enemy,index);if(!pair)return;const aware=RUNTIME.getPerception(enemy.id);if(pair.aware!==aware){pair.start.style.opacity=aware?'.62':'1';pair.release.style.opacity=aware?'1':'.62';pair.aware=aware}});for(const [id,pair] of rings){if(!activeIds.has(id)||!pair.host?.isConnected)removePair(id,pair)}animationFrame=requestAnimationFrame(drawFrame)}
  function hideRings(){for(const pair of rings.values()){pair.start.style.display='none';pair.release.style.display='none';pair.center.style.display='none'}}
  function showRings(){for(const pair of rings.values()){pair.start.style.display='block';pair.release.style.display='block';pair.center.style.display='block'}}
  function stopRangeUpdates(){if(animationFrame!==null){cancelAnimationFrame(animationFrame);animationFrame=null}hideRings()}
  function startRangeUpdates(){refreshRadii();updateRingSizes();showRings();if(animationFrame===null)animationFrame=requestAnimationFrame(drawFrame)}
  function syncRangeUpdates(){const debug=RUNTIME.getDebugState();debug.enabled&&debug.showPerception?startRangeUpdates():stopRangeUpdates()}
  function setSettingsOpen(open){settingsOpen=open===true;if(settingsOpen){playerApi()?.pauseForWaveTransition?.();AI.pause('TEST_SETTINGS');wrap.style.cssText=openStyle;toggle.style.alignSelf='flex-start';tools.scrollTop=0}else{AI.resume('TEST_SETTINGS');playerApi()?.resumeAfterWaveTransition?.();wrap.style.cssText=closedStyle;toggle.style.alignSelf='auto'}render()}
  function toggleTestMode(){RUNTIME.setDebugEnabled(!RUNTIME.getDebugState().enabled)}
  function render(){const debug=RUNTIME.getDebugState(),p=RUNTIME.getPattern(),config=RUNTIME.getEnemyConfig(),playerParams=playerApi()?.getParameters?.(),moveSpeed=playerParams?.moveSpeed??300,attackEnabled=AI.isChannelEnabled('ATTACK'),movementEnabled=AI.isChannelEnabled('MOVEMENT');toggle.textContent=settingsOpen?'テスト設定 閉じる':'テスト設定';toggle.style.background=settingsOpen?'#14532d':'#30270d';tools.style.display=settingsOpen?'flex':'none';modeButton.textContent=`テストモード ${debug.enabled?'ON':'OFF'}`;modeButton.style.background=debug.enabled?'#14532d':'#30270d';rangeButton.textContent=`知覚 ${debug.showPerception?'ON':'OFF'}`;glowButton.textContent=`発光 ${debug.showAttackGlow?'ON':'OFF'}`;attackButton.textContent=`敵攻撃 ${attackEnabled?'ON':'OFF'}`;movementButton.textContent=`敵移動 ${movementEnabled?'ON':'OFF'}`;attackButton.style.background=attackEnabled?'#14532d':'#30270d';movementButton.style.background=movementEnabled?'#14532d':'#30270d';patternButton.textContent=`予兆 ${sec(p.telegraphMs)} 固定`;detail.textContent=`予兆 ${sec(p.telegraphMs)} / CT ${sec(p.cooldownMs)} / P速度 ${moveSpeed} / 追跡 ${config.chaseRangeTiles} / 攻撃開始 ${p.attackStartRangeTiles} / 到達 ${p.projectileMaxRangeTiles} / 知覚 ${config.perceptionStartTiles} / 解除 ${config.perceptionReleaseTiles}`;vulcanIntervalStepper.refresh();cannonSpeedStepper.refresh();cannonStartupStepper.refresh();syncRangeUpdates()}

  let scrollTouchY=null,scrollTouchMoved=false;
  tools.addEventListener('touchstart',event=>{if(!settingsOpen||event.touches.length!==1)return;scrollTouchY=event.touches[0].clientY;scrollTouchMoved=false},{passive:true});
  tools.addEventListener('touchmove',event=>{if(!settingsOpen||scrollTouchY===null||event.touches.length!==1)return;const y=event.touches[0].clientY,dy=scrollTouchY-y;if(Math.abs(dy)>=1){tools.scrollTop+=dy;scrollTouchY=y;scrollTouchMoved=true;event.preventDefault();event.stopPropagation()}},{passive:false});
  const endScrollTouch=()=>{scrollTouchY=null;scrollTouchMoved=false};tools.addEventListener('touchend',endScrollTouch,{passive:true});tools.addEventListener('touchcancel',endScrollTouch,{passive:true});

  toggle.addEventListener('click',()=>setSettingsOpen(!settingsOpen));modeButton.addEventListener('click',toggleTestMode);rangeButton.addEventListener('click',()=>RUNTIME.setDebugOption('showPerception',!RUNTIME.getDebugState().showPerception));glowButton.addEventListener('click',()=>RUNTIME.setDebugOption('showAttackGlow',!RUNTIME.getDebugState().showAttackGlow));attackButton.addEventListener('click',()=>{AI.setChannelEnabled('ATTACK',!AI.isChannelEnabled('ATTACK'));render()});movementButton.addEventListener('click',()=>{AI.setChannelEnabled('MOVEMENT',!AI.isChannelEnabled('MOVEMENT'));render()});
  modePanel.append(modeButton,patternButton,rangeButton,glowButton,attackButton,movementButton);tools.append(modePanel,vulcanPanel,airShotPanel,cannonPanel,detail);wrap.append(toggle,tools);battle.appendChild(wrap);RUNTIME.subscribeDebug(render);render();
})();