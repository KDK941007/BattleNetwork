(()=>{
  const RUNTIME=window.BattleNetworkEnemy1Runtime,FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,AI=window.BattleNetworkEnemyAI,battle=document.getElementById('battle'),scene=document.getElementById('scene');
  if(!RUNTIME||!FIELD||!ENEMY||!AI||!battle||!scene)throw new Error('BattleNetworkEnemy1PatternTestUI: required dependency is missing.');
  const PX=.72,PY=.36;
  const CANNON_BASE=Object.freeze({rangeTiles:5,projectileSpeed:900,actionLockSec:.25,startupDelaySec:0});
  const AIRSHOT_BASE=Object.freeze({rangeTiles:5,projectileSpeed:2000,actionLockSec:.25,startupDelaySec:0});
  const AIRSHOT_LIMITS=Object.freeze({rangeTiles:Object.freeze({min:1,max:12,step:1}),projectileSpeed:Object.freeze({min:100,max:3000,step:100}),actionLockSec:Object.freeze({min:.25,max:3.25,step:.5}),startupDelaySec:Object.freeze({min:0,max:2,step:.05})});
  let airShotSettings={...AIRSHOT_BASE};
  let settingsOpen=false;
  const airShotListeners=new Set();
  function getAirShotSettings(){return Object.freeze({...airShotSettings})}
  function emitAirShotSettings(){const snapshot=getAirShotSettings();airShotListeners.forEach(listener=>{try{listener(snapshot)}catch(error){console.error('BattleNetworkTestSettings listener failed.',error)}});return snapshot}
  function clampStep(value,limit){const n=Math.max(limit.min,Math.min(limit.max,Number(value)));const steps=Math.round((n-limit.min)/limit.step);return Number((limit.min+steps*limit.step).toFixed(2))}
  function setAirShotSetting(key,value){const limit=AIRSHOT_LIMITS[key];if(!limit)return getAirShotSettings();airShotSettings={...airShotSettings,[key]:clampStep(value,limit)};render();return emitAirShotSettings()}
  function adjustAirShotSetting(key,direction){const limit=AIRSHOT_LIMITS[key];if(!limit)return getAirShotSettings();return setAirShotSetting(key,airShotSettings[key]+limit.step*(direction<0?-1:1))}
  function subscribeAirShot(listener){if(typeof listener!=='function')return()=>{};airShotListeners.add(listener);listener(getAirShotSettings());return()=>airShotListeners.delete(listener)}
  window.BattleNetworkTestSettings=Object.freeze({CANNON_BASE,AIRSHOT_BASE,AIRSHOT_LIMITS,getAirShotSettings,setAirShotSetting,adjustAirShotSetting,subscribeAirShot});

  const wrap=document.createElement('div'),toggle=document.createElement('button'),tools=document.createElement('div'),modeButton=document.createElement('button'),patternButton=document.createElement('button'),rangeButton=document.createElement('button'),glowButton=document.createElement('button'),attackButton=document.createElement('button'),movementButton=document.createElement('button'),detail=document.createElement('span'),airShotPanel=document.createElement('div');
  wrap.dataset.testOnly='enemy-debug-tools';
  wrap.style.cssText='position:absolute;right:10px;top:10px;z-index:70;display:flex;align-items:flex-start;gap:6px;padding:5px 7px;border:1px solid rgba(255,255,255,.5);border-radius:8px;background:rgba(8,12,20,.88);color:#fff;font:700 11px/1.2 system-ui,sans-serif;pointer-events:auto;max-width:calc(100% - 20px);box-sizing:border-box;';
  [toggle,modeButton,patternButton,rangeButton,glowButton,attackButton,movementButton].forEach(button=>{button.type='button';button.style.cssText='min-height:32px;border:1px solid #ffe27a;border-radius:6px;background:#30270d;color:#fff7c9;font-weight:900;font-variant-numeric:tabular-nums;padding:4px 8px;'});
  toggle.style.minWidth='108px';patternButton.style.minWidth='146px';patternButton.disabled=true;patternButton.style.opacity='.72';tools.style.cssText='display:none;align-items:center;gap:8px;flex-wrap:wrap;align-content:flex-start;justify-content:flex-start;overflow:auto;min-width:0;';detail.style.cssText='white-space:normal;font-variant-numeric:tabular-nums;';
  airShotPanel.style.cssText='display:flex;align-items:center;gap:5px;padding:4px 6px;border:1px solid rgba(112,222,255,.55);border-radius:7px;background:rgba(6,35,48,.78);font-variant-numeric:tabular-nums;flex-wrap:wrap;max-width:100%;box-sizing:border-box;';

  function makeStepper(label,key,unit,formatValue){
    const box=document.createElement('span'),name=document.createElement('span'),prev=document.createElement('button'),value=document.createElement('strong'),next=document.createElement('button');
    box.style.cssText='display:inline-flex;align-items:center;gap:3px;white-space:nowrap;';
    name.textContent=label;name.style.cssText='color:#c8f5ff;font-weight:900;';
    [prev,next].forEach(button=>{button.type='button';button.style.cssText='width:28px;height:28px;padding:0;border:1px solid #8eeaff;border-radius:5px;background:#0c4053;color:#eaffff;font-weight:900;line-height:1;';});
    prev.textContent='◀';next.textContent='▶';value.style.cssText='display:inline-block;min-width:58px;text-align:center;color:#fff;';
    const refresh=()=>{const raw=airShotSettings[key];value.textContent=`${formatValue?formatValue(raw):raw}${unit||''}`;};
    prev.addEventListener('click',()=>adjustAirShotSetting(key,-1));next.addEventListener('click',()=>adjustAirShotSetting(key,1));
    box.append(name,prev,value,next);box.refresh=refresh;return box;
  }
  const rangeStepper=makeStepper('射程','rangeTiles','マス');
  const speedStepper=makeStepper('弾速','projectileSpeed','',value=>String(value));
  const startupStepper=makeStepper('発動前','startupDelaySec','秒',value=>Number(value).toFixed(2));
  const lockStepper=makeStepper('発動後','actionLockSec','秒',value=>Number(value).toFixed(2));
  const cannonReference=document.createElement('span');cannonReference.style.cssText='white-space:nowrap;color:#ffe9a6;font-weight:900;';cannonReference.textContent=`キャノン基準：射程 ${CANNON_BASE.rangeTiles} / 弾速 ${CANNON_BASE.projectileSpeed} / 発動後 ${CANNON_BASE.actionLockSec.toFixed(2)}秒`;
  airShotPanel.append(document.createTextNode('エアシュート '),rangeStepper,speedStepper,startupStepper,lockStepper,cannonReference);

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
  function setSettingsOpen(open){
    settingsOpen=open===true;
    if(settingsOpen){
      playerApi()?.pauseForWaveTransition?.();AI.pause('TEST_SETTINGS');
      wrap.style.cssText+='left:0;right:0;top:0;bottom:0;width:100%;height:100%;max-width:none;border-radius:0;padding:10px;display:flex;flex-direction:column;align-items:stretch;overflow:hidden;';
      toggle.style.alignSelf='flex-start';tools.style.flex='1 1 auto';
    }else{
      AI.resume('TEST_SETTINGS');playerApi()?.resumeAfterWaveTransition?.();
      wrap.style.cssText='position:absolute;right:10px;top:10px;z-index:70;display:flex;align-items:flex-start;gap:6px;padding:5px 7px;border:1px solid rgba(255,255,255,.5);border-radius:8px;background:rgba(8,12,20,.88);color:#fff;font:700 11px/1.2 system-ui,sans-serif;pointer-events:auto;max-width:calc(100% - 20px);box-sizing:border-box;';
      toggle.style.alignSelf='auto';tools.style.flex='';
    }
    render();
  }
  function toggleTestMode(){RUNTIME.setDebugEnabled(!RUNTIME.getDebugState().enabled)}
  function render(){const debug=RUNTIME.getDebugState(),p=RUNTIME.getPattern(),config=RUNTIME.getEnemyConfig(),playerParams=playerApi()?.getParameters?.(),moveSpeed=playerParams?.moveSpeed??300,attackEnabled=AI.isChannelEnabled('ATTACK'),movementEnabled=AI.isChannelEnabled('MOVEMENT');toggle.textContent=settingsOpen?'テスト設定 閉じる':'テスト設定';toggle.style.background=settingsOpen?'#14532d':'#30270d';tools.style.display=settingsOpen?'flex':'none';modeButton.textContent=`テストモード ${debug.enabled?'ON':'OFF'}`;modeButton.style.background=debug.enabled?'#14532d':'#30270d';rangeButton.textContent=`知覚 ${debug.showPerception?'ON':'OFF'}`;glowButton.textContent=`発光 ${debug.showAttackGlow?'ON':'OFF'}`;attackButton.textContent=`敵攻撃 ${attackEnabled?'ON':'OFF'}`;movementButton.textContent=`敵移動 ${movementEnabled?'ON':'OFF'}`;attackButton.style.background=attackEnabled?'#14532d':'#30270d';movementButton.style.background=movementEnabled?'#14532d':'#30270d';patternButton.textContent=`予兆 ${sec(p.telegraphMs)} 固定`;detail.textContent=`予兆 ${sec(p.telegraphMs)} / CT ${sec(p.cooldownMs)} / P速度 ${moveSpeed} / 追跡 ${config.chaseRangeTiles} / 攻撃開始 ${p.attackStartRangeTiles} / 到達 ${p.projectileMaxRangeTiles} / 知覚 ${config.perceptionStartTiles} / 解除 ${config.perceptionReleaseTiles}`;rangeStepper.refresh();speedStepper.refresh();startupStepper.refresh();lockStepper.refresh();syncRangeUpdates()}
  toggle.addEventListener('click',()=>setSettingsOpen(!settingsOpen));modeButton.addEventListener('click',toggleTestMode);rangeButton.addEventListener('click',()=>RUNTIME.setDebugOption('showPerception',!RUNTIME.getDebugState().showPerception));glowButton.addEventListener('click',()=>RUNTIME.setDebugOption('showAttackGlow',!RUNTIME.getDebugState().showAttackGlow));attackButton.addEventListener('click',()=>{AI.setChannelEnabled('ATTACK',!AI.isChannelEnabled('ATTACK'));render()});movementButton.addEventListener('click',()=>{AI.setChannelEnabled('MOVEMENT',!AI.isChannelEnabled('MOVEMENT'));render()});
  tools.append(modeButton,patternButton,rangeButton,glowButton,attackButton,movementButton,airShotPanel,detail);wrap.append(toggle,tools);battle.appendChild(wrap);RUNTIME.subscribeDebug(render);render();
})();