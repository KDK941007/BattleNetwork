(()=>{
  const RUNTIME=window.BattleNetworkEnemy1Runtime,FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,AI=window.BattleNetworkEnemyAI,battle=document.getElementById('battle'),scene=document.getElementById('scene');
  if(!RUNTIME||!FIELD||!ENEMY||!AI||!battle||!scene)throw new Error('BattleNetworkEnemy1PatternTestUI: required dependency is missing.');
  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2,SH=FIELD.WORLD_SIZE*PY*2;
  const PERCEPTION_REFRESH_MS=120;
  let settingsOpen=false;

  const wrap=document.createElement('div'),toggle=document.createElement('button'),tools=document.createElement('div'),patternButton=document.createElement('button'),rangeButton=document.createElement('button'),glowButton=document.createElement('button'),attackButton=document.createElement('button'),movementButton=document.createElement('button'),detail=document.createElement('span'),modePanel=document.createElement('div');
  wrap.dataset.testOnly='enemy-debug-tools';
  const closedStyle='position:absolute;left:10px;bottom:10px;right:auto;top:auto;z-index:70;display:flex;align-items:flex-start;gap:4px;padding:4px 5px;border:1px solid rgba(255,255,255,.5);border-radius:7px;background:rgba(8,12,20,.88);color:#fff;font:700 10px/1.15 system-ui,sans-serif;pointer-events:auto;max-width:calc(100% - 20px);box-sizing:border-box;';
  const openStyle='position:absolute;left:0;right:0;top:0;bottom:0;width:100%;height:100%;z-index:70;display:flex;flex-direction:column;align-items:stretch;gap:6px;padding:8px;border:1px solid rgba(255,255,255,.5);border-radius:0;background:rgba(8,12,20,.96);color:#fff;font:700 10px/1.2 system-ui,sans-serif;pointer-events:auto;box-sizing:border-box;overflow:hidden;';
  wrap.style.cssText=closedStyle;
  [toggle,patternButton,rangeButton,glowButton,attackButton,movementButton].forEach(button=>{button.type='button';button.style.cssText='min-height:30px;border:1px solid #ffe27a;border-radius:5px;background:#30270d;color:#fff7c9;font-size:10px;font-weight:900;font-variant-numeric:tabular-nums;padding:4px 6px;white-space:nowrap;'});
  toggle.style.minWidth='92px';patternButton.disabled=true;patternButton.style.opacity='.72';
  tools.style.cssText='display:none;flex:1 1 0;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;flex-direction:column;align-items:stretch;gap:6px;padding:0 2px 8px;box-sizing:border-box;';
  modePanel.style.cssText='display:grid;flex:0 0 auto;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;align-items:stretch;';
  detail.style.cssText='display:block;flex:0 0 auto;white-space:normal;font-size:9px;line-height:1.35;font-variant-numeric:tabular-nums;padding:4px 2px 6px;color:#dff8ff;';

  const perceptionCanvas=document.createElement('canvas');
  perceptionCanvas.dataset.testOnly='enemy-perception-canvas';
  perceptionCanvas.width=Math.max(1,Math.ceil(SW));
  perceptionCanvas.height=Math.max(1,Math.ceil(SH));
  perceptionCanvas.style.cssText=`display:none;position:absolute;left:0;top:0;width:${SW}px;height:${SH}px;z-index:6;pointer-events:none;`;
  scene.appendChild(perceptionCanvas);
  const ctx=perceptionCanvas.getContext('2d',{alpha:true});
  let startRadius=0,releaseRadius=0,rangeTimer=null;

  function sec(ms){return `${(ms/1000).toFixed(2)}s`}
  function playerApi(){return window.BattleNetworkPlayer||null}
  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function refreshRadii(){const config=RUNTIME.getEnemyConfig();startRadius=FIELD.toWorldDistance(config.perceptionStartTiles);releaseRadius=FIELD.toWorldDistance(config.perceptionReleaseTiles)}
  function ringGeometry(radius){return{rx:Math.SQRT2*radius*PX,ry:Math.SQRT2*radius*PY}}
  function enemyVisualCenter(enemy){const p=project(enemy.x,enemy.y),v=enemy.visual||{};return{x:p.x+(Number(v.offsetX)||0),y:p.y-(Number(v.height)||0)/2+(Number(v.offsetY)||0)}}
  function drawEllipse(center,radius,color,alpha,lineWidth){const g=ringGeometry(radius);ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.setLineDash([10,8]);ctx.beginPath();ctx.ellipse(center.x,center.y,g.rx,g.ry,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
  function drawCenter(center){ctx.save();ctx.fillStyle='#ff3344';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(center.x,center.y,6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
  function drawPerception(){
    rangeTimer=null;
    if(!RUNTIME.getDebugState().showPerception||!ctx){stopRangeUpdates();return}
    ctx.clearRect(0,0,perceptionCanvas.width,perceptionCanvas.height);
    const enemies=ENEMY.getEnemies();
    for(const enemy of enemies){
      if(enemy.isDefeated)continue;
      const center=enemyVisualCenter(enemy),aware=RUNTIME.getPerception(enemy.id);
      drawEllipse(center,releaseRadius,'rgba(84,235,255,.98)',aware?1:.56,2);
      drawEllipse(center,startRadius,'rgba(255,211,82,.98)',aware ? .58 : 1,2.5);
      drawCenter(center);
    }
    rangeTimer=setTimeout(drawPerception,PERCEPTION_REFRESH_MS);
  }
  function stopRangeUpdates(){if(rangeTimer!==null){clearTimeout(rangeTimer);rangeTimer=null}if(ctx)ctx.clearRect(0,0,perceptionCanvas.width,perceptionCanvas.height);perceptionCanvas.style.display='none'}
  function startRangeUpdates(){refreshRadii();perceptionCanvas.style.display='block';if(rangeTimer===null)drawPerception()}
  function syncRangeUpdates(){RUNTIME.getDebugState().showPerception?startRangeUpdates():stopRangeUpdates()}

  function setSettingsOpen(open){settingsOpen=open===true;if(settingsOpen){playerApi()?.pauseForWaveTransition?.();AI.pause('TEST_SETTINGS');wrap.style.cssText=openStyle;toggle.style.alignSelf='flex-start';tools.scrollTop=0}else{AI.resume('TEST_SETTINGS');playerApi()?.resumeAfterWaveTransition?.();wrap.style.cssText=closedStyle;toggle.style.alignSelf='auto'}render()}
  function updateButton(button,label,enabled){button.textContent=`${label} ${enabled?'ON':'OFF'}`;button.style.background=enabled?'#14532d':'#30270d'}
  function render(){
    const debug=RUNTIME.getDebugState(),p=RUNTIME.getPattern(),config=RUNTIME.getEnemyConfig(),playerParams=playerApi()?.getParameters?.(),moveSpeed=playerParams?.moveSpeed??300,attackEnabled=AI.isChannelEnabled('ATTACK'),movementEnabled=AI.isChannelEnabled('MOVEMENT');
    toggle.textContent=settingsOpen?'設定 閉じる':'テスト設定';toggle.style.background=settingsOpen?'#14532d':'#30270d';tools.style.display=settingsOpen?'flex':'none';
    updateButton(rangeButton,'知覚',debug.showPerception);updateButton(glowButton,'発光',debug.showAttackGlow);updateButton(attackButton,'敵攻撃',attackEnabled);updateButton(movementButton,'敵移動',movementEnabled);
    patternButton.textContent=`予兆 ${sec(p.telegraphMs)}`;
    detail.textContent=`予兆 ${sec(p.telegraphMs)} / CT ${sec(p.cooldownMs)} / P速度 ${moveSpeed} / 追跡 ${config.chaseRangeTiles} / 攻撃開始 ${p.attackStartRangeTiles} / 到達 ${p.projectileMaxRangeTiles} / 知覚 ${config.perceptionStartTiles} / 解除 ${config.perceptionReleaseTiles}`;
    syncRangeUpdates();
  }

  let scrollTouchY=null;
  tools.addEventListener('touchstart',event=>{if(!settingsOpen||event.touches.length!==1)return;scrollTouchY=event.touches[0].clientY},{passive:true});
  tools.addEventListener('touchmove',event=>{if(!settingsOpen||scrollTouchY===null||event.touches.length!==1)return;const y=event.touches[0].clientY,dy=scrollTouchY-y;if(Math.abs(dy)>=1){tools.scrollTop+=dy;scrollTouchY=y;event.preventDefault();event.stopPropagation()}},{passive:false});
  const endScrollTouch=()=>{scrollTouchY=null};tools.addEventListener('touchend',endScrollTouch,{passive:true});tools.addEventListener('touchcancel',endScrollTouch,{passive:true});

  toggle.addEventListener('click',()=>setSettingsOpen(!settingsOpen));
  rangeButton.addEventListener('click',()=>RUNTIME.setDebugOption('showPerception',!RUNTIME.getDebugState().showPerception));
  glowButton.addEventListener('click',()=>RUNTIME.setDebugOption('showAttackGlow',!RUNTIME.getDebugState().showAttackGlow));
  attackButton.addEventListener('click',()=>{AI.setChannelEnabled('ATTACK',!AI.isChannelEnabled('ATTACK'));render()});
  movementButton.addEventListener('click',()=>{AI.setChannelEnabled('MOVEMENT',!AI.isChannelEnabled('MOVEMENT'));render()});
  modePanel.append(patternButton,rangeButton,glowButton,attackButton,movementButton);tools.append(modePanel,detail);wrap.append(toggle,tools);battle.appendChild(wrap);RUNTIME.subscribeDebug(render);render();
})();