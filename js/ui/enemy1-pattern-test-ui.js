(()=>{
  const RUNTIME=window.BattleNetworkEnemy1Runtime,FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,battle=document.getElementById('battle'),scene=document.getElementById('scene');
  if(!RUNTIME||!FIELD||!ENEMY||!battle||!scene)throw new Error('BattleNetworkEnemy1PatternTestUI: required dependency is missing.');
  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2,SH=FIELD.WORLD_SIZE*PY*2,DEBUG_INTERVAL_MS=200,POSITION_EPSILON=6;
  const wrap=document.createElement('div'),toggle=document.createElement('button'),tools=document.createElement('div'),patternButton=document.createElement('button'),rangeButton=document.createElement('button'),glowButton=document.createElement('button'),detail=document.createElement('span');
  wrap.dataset.testOnly='enemy-debug-tools';
  wrap.style.cssText='position:absolute;right:10px;top:10px;z-index:70;display:flex;align-items:center;gap:6px;padding:5px 7px;border:1px solid rgba(255,255,255,.5);border-radius:8px;background:rgba(8,12,20,.88);color:#fff;font:700 11px/1.2 system-ui,sans-serif;pointer-events:auto;';
  [toggle,patternButton,rangeButton,glowButton].forEach(button=>{button.type='button';button.style.cssText='min-height:32px;border:1px solid #ffe27a;border-radius:6px;background:#30270d;color:#fff7c9;font-weight:900;font-variant-numeric:tabular-nums;padding:4px 8px;'});
  toggle.style.minWidth='82px';patternButton.style.minWidth='92px';tools.style.cssText='display:none;align-items:center;gap:6px;';detail.style.cssText='white-space:nowrap;font-variant-numeric:tabular-nums;';

  const layer=document.createElement('div');
  layer.dataset.testOnly='enemy-perception-layer';
  layer.style.cssText=`position:absolute;left:0;top:0;width:${SW}px;height:${SH}px;transform-origin:0 0;pointer-events:none;z-index:12;display:none;visibility:hidden;opacity:0;`;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox',`0 0 ${SW} ${SH}`);svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;';
  layer.appendChild(svg);battle.appendChild(layer);

  const rings=new Map();
  let rangeTimer=null,lastSceneTransform='';
  function sec(ms){return `${(ms/1000).toFixed(2)}s`}
  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function createEllipse(radius,stroke,fill,dash,width){const el=document.createElementNS('http://www.w3.org/2000/svg','ellipse');const rx=Math.SQRT2*radius*PX,ry=Math.SQRT2*radius*PY;el.setAttribute('cx','0');el.setAttribute('cy','0');el.setAttribute('rx',String(rx));el.setAttribute('ry',String(ry));el.setAttribute('fill',fill);el.setAttribute('stroke',stroke);el.setAttribute('stroke-width',String(width));el.setAttribute('stroke-dasharray',dash);el.setAttribute('vector-effect','non-scaling-stroke');return el}
  function ensureRings(enemyId,startRadius,releaseRadius){let pair=rings.get(enemyId);if(pair)return pair;const start=createEllipse(startRadius,'rgba(255,211,82,.95)','rgba(255,211,82,.07)','16 10',5),release=createEllipse(releaseRadius,'rgba(84,235,255,.95)','none','9 12',4);svg.append(start,release);pair={start,release,x:NaN,y:NaN,aware:null};rings.set(enemyId,pair);return pair}
  function clearStale(activeIds){for(const [id,pair] of rings){if(activeIds.has(id))continue;pair.start.remove();pair.release.remove();rings.delete(id)}}
  function syncLayerTransform(){const next=scene.style.transform||getComputedStyle(scene).transform||'';if(next!==lastSceneTransform){layer.style.transform=next;lastSceneTransform=next}}
  function showLayer(){if(layer.style.display!=='block')layer.style.display='block';if(layer.style.visibility!=='visible')layer.style.visibility='visible';if(layer.style.opacity!=='1')layer.style.opacity='1'}
  function hideLayer(){layer.style.opacity='0';layer.style.visibility='hidden';layer.style.display='none'}
  function renderRanges(){const debug=RUNTIME.getDebugState();if(!debug.enabled||!debug.showPerception)return;syncLayerTransform();showLayer();const config=RUNTIME.getEnemyConfig(),startRadius=FIELD.toWorldDistance(config.perceptionStartTiles),releaseRadius=FIELD.toWorldDistance(config.perceptionReleaseTiles),activeIds=new Set();for(const enemy of ENEMY.getActiveEnemies()){activeIds.add(enemy.id);const pair=ensureRings(enemy.id,startRadius,releaseRadius),aware=RUNTIME.getPerception(enemy.id),moved=Math.abs(pair.x-enemy.x)>=POSITION_EPSILON||Math.abs(pair.y-enemy.y)>=POSITION_EPSILON;if(moved){const p=project(enemy.x,enemy.y),transform=`translate(${p.x} ${p.y})`;pair.start.setAttribute('transform',transform);pair.release.setAttribute('transform',transform);pair.x=enemy.x;pair.y=enemy.y}if(pair.aware!==aware){pair.start.setAttribute('opacity',aware?'.62':'1');pair.release.setAttribute('opacity',aware?'1':'.62');pair.aware=aware}}clearStale(activeIds)}
  function stopRangeUpdates(){if(rangeTimer!==null){clearInterval(rangeTimer);rangeTimer=null}hideLayer()}
  function startRangeUpdates(){if(rangeTimer!==null)return;showLayer();renderRanges();rangeTimer=setInterval(renderRanges,DEBUG_INTERVAL_MS)}
  function syncRangeUpdates(){const debug=RUNTIME.getDebugState();debug.enabled&&debug.showPerception?startRangeUpdates():stopRangeUpdates()}
  function render(){const debug=RUNTIME.getDebugState(),p=RUNTIME.getPattern(),config=RUNTIME.getEnemyConfig();toggle.textContent=`TEST ${debug.enabled?'ON':'OFF'}`;toggle.style.background=debug.enabled?'#14532d':'#30270d';tools.style.display=debug.enabled?'flex':'none';rangeButton.textContent=`知覚 ${debug.showPerception?'ON':'OFF'}`;glowButton.textContent=`発光 ${debug.showAttackGlow?'ON':'OFF'}`;patternButton.textContent=`PATTERN ${p.id}`;detail.textContent=`知覚 ${config.perceptionStartTiles} / 解除 ${config.perceptionReleaseTiles} / FS ${sec(p.fullSyncWindowMs)}`;syncRangeUpdates()}
  toggle.addEventListener('click',()=>RUNTIME.setDebugEnabled(!RUNTIME.getDebugState().enabled));rangeButton.addEventListener('click',()=>RUNTIME.setDebugOption('showPerception',!RUNTIME.getDebugState().showPerception));glowButton.addEventListener('click',()=>RUNTIME.setDebugOption('showAttackGlow',!RUNTIME.getDebugState().showAttackGlow));patternButton.addEventListener('click',()=>{RUNTIME.cyclePattern();render()});
  tools.append(patternButton,rangeButton,glowButton,detail);wrap.append(toggle,tools);battle.appendChild(wrap);
  RUNTIME.subscribeDebug(render);
})();
