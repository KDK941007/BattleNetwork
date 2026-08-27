(()=>{
  const RUNTIME=window.BattleNetworkEnemy1Runtime,FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,battle=document.getElementById('battle'),scene=document.getElementById('scene');
  if(!RUNTIME||!FIELD||!ENEMY||!battle||!scene)throw new Error('BattleNetworkEnemy1PatternTestUI: required dependency is missing.');
  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2,DEBUG_INTERVAL_MS=200,POSITION_EPSILON=6;
  const wrap=document.createElement('div'),toggle=document.createElement('button'),tools=document.createElement('div'),patternButton=document.createElement('button'),rangeButton=document.createElement('button'),glowButton=document.createElement('button'),detail=document.createElement('span');
  wrap.dataset.testOnly='enemy-debug-tools';
  wrap.style.cssText='position:absolute;right:10px;top:10px;z-index:70;display:flex;align-items:center;gap:6px;padding:5px 7px;border:1px solid rgba(255,255,255,.5);border-radius:8px;background:rgba(8,12,20,.88);color:#fff;font:700 11px/1.2 system-ui,sans-serif;pointer-events:auto;';
  [toggle,patternButton,rangeButton,glowButton].forEach(button=>{button.type='button';button.style.cssText='min-height:32px;border:1px solid #ffe27a;border-radius:6px;background:#30270d;color:#fff7c9;font-weight:900;font-variant-numeric:tabular-nums;padding:4px 8px;'});
  toggle.style.minWidth='82px';patternButton.style.minWidth='92px';tools.style.cssText='display:none;align-items:center;gap:6px;';detail.style.cssText='white-space:nowrap;font-variant-numeric:tabular-nums;';

  const layer=document.createElement('div');
  layer.dataset.testOnly='enemy-perception-layer';
  layer.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:12;display:none;overflow:hidden;';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('preserveAspectRatio','none');svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;';
  layer.appendChild(svg);battle.appendChild(layer);

  const rings=new Map();
  let rangeTimer=null,battleWidth=0,battleHeight=0;
  function sec(ms){return `${(ms/1000).toFixed(2)}s`}
  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function refreshViewport(){const w=battle.clientWidth,h=battle.clientHeight;if(w===battleWidth&&h===battleHeight)return;battleWidth=w;battleHeight=h;svg.setAttribute('viewBox',`0 0 ${w} ${h}`)}
  function sceneMatrix(){const raw=getComputedStyle(scene).transform;if(!raw||raw==='none')return new DOMMatrix();try{return new DOMMatrix(raw)}catch{return new DOMMatrix()}}
  function toScreen(point,matrix){const p=new DOMPoint(point.x,point.y).matrixTransform(matrix);return{x:p.x,y:p.y}}
  function matrixScale(matrix){return{x:Math.hypot(matrix.a,matrix.b)||1,y:Math.hypot(matrix.c,matrix.d)||1}}
  function createEllipse(stroke,fill,dash,width){const el=document.createElementNS('http://www.w3.org/2000/svg','ellipse');el.setAttribute('fill',fill);el.setAttribute('stroke',stroke);el.setAttribute('stroke-width',String(width));el.setAttribute('stroke-dasharray',dash);el.setAttribute('vector-effect','non-scaling-stroke');return el}
  function ensureRings(enemyId){let pair=rings.get(enemyId);if(pair)return pair;const start=createEllipse('rgba(255,211,82,.98)','rgba(255,211,82,.08)','16 10',5),release=createEllipse('rgba(84,235,255,.98)','none','9 12',4);svg.append(start,release);pair={start,release,x:NaN,y:NaN,aware:null,lastMatrix:''};rings.set(enemyId,pair);return pair}
  function clearStale(activeIds){for(const [id,pair] of rings){if(activeIds.has(id))continue;pair.start.remove();pair.release.remove();rings.delete(id)}}
  function showLayer(){if(layer.style.display!=='block')layer.style.display='block'}
  function hideLayer(){layer.style.display='none'}
  function setEllipseGeometry(el,center,radius,scale){const rx=Math.SQRT2*radius*PX*scale.x,ry=Math.SQRT2*radius*PY*scale.y;el.setAttribute('cx',String(center.x));el.setAttribute('cy',String(center.y));el.setAttribute('rx',String(rx));el.setAttribute('ry',String(ry))}
  function renderRanges(){const debug=RUNTIME.getDebugState();if(!debug.enabled||!debug.showPerception)return;refreshViewport();showLayer();const config=RUNTIME.getEnemyConfig(),startRadius=FIELD.toWorldDistance(config.perceptionStartTiles),releaseRadius=FIELD.toWorldDistance(config.perceptionReleaseTiles),matrix=sceneMatrix(),matrixKey=[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f].join(','),scale=matrixScale(matrix),activeIds=new Set();for(const enemy of ENEMY.getActiveEnemies()){activeIds.add(enemy.id);const pair=ensureRings(enemy.id),aware=RUNTIME.getPerception(enemy.id),moved=Math.abs(pair.x-enemy.x)>=POSITION_EPSILON||Math.abs(pair.y-enemy.y)>=POSITION_EPSILON||pair.lastMatrix!==matrixKey;if(moved){const center=toScreen(project(enemy.x,enemy.y),matrix);setEllipseGeometry(pair.start,center,startRadius,scale);setEllipseGeometry(pair.release,center,releaseRadius,scale);pair.x=enemy.x;pair.y=enemy.y;pair.lastMatrix=matrixKey}if(pair.aware!==aware){pair.start.setAttribute('opacity',aware?'.62':'1');pair.release.setAttribute('opacity',aware?'1':'.62');pair.aware=aware}}clearStale(activeIds)}
  function stopRangeUpdates(){if(rangeTimer!==null){clearInterval(rangeTimer);rangeTimer=null}hideLayer()}
  function startRangeUpdates(){if(rangeTimer!==null)return;showLayer();renderRanges();rangeTimer=setInterval(renderRanges,DEBUG_INTERVAL_MS)}
  function syncRangeUpdates(){const debug=RUNTIME.getDebugState();debug.enabled&&debug.showPerception?startRangeUpdates():stopRangeUpdates()}
  function render(){const debug=RUNTIME.getDebugState(),p=RUNTIME.getPattern(),config=RUNTIME.getEnemyConfig();toggle.textContent=`TEST ${debug.enabled?'ON':'OFF'}`;toggle.style.background=debug.enabled?'#14532d':'#30270d';tools.style.display=debug.enabled?'flex':'none';rangeButton.textContent=`知覚 ${debug.showPerception?'ON':'OFF'}`;glowButton.textContent=`発光 ${debug.showAttackGlow?'ON':'OFF'}`;patternButton.textContent=`PATTERN ${p.id}`;detail.textContent=`知覚 ${config.perceptionStartTiles} / 解除 ${config.perceptionReleaseTiles} / FS ${sec(p.fullSyncWindowMs)}`;syncRangeUpdates()}
  toggle.addEventListener('click',()=>RUNTIME.setDebugEnabled(!RUNTIME.getDebugState().enabled));rangeButton.addEventListener('click',()=>RUNTIME.setDebugOption('showPerception',!RUNTIME.getDebugState().showPerception));glowButton.addEventListener('click',()=>RUNTIME.setDebugOption('showAttackGlow',!RUNTIME.getDebugState().showAttackGlow));patternButton.addEventListener('click',()=>{RUNTIME.cyclePattern();render()});
  window.addEventListener('resize',()=>{battleWidth=0;battleHeight=0;for(const pair of rings.values())pair.lastMatrix='';renderRanges()},{passive:true});
  tools.append(patternButton,rangeButton,glowButton,detail);wrap.append(toggle,tools);battle.appendChild(wrap);
  RUNTIME.subscribeDebug(render);
})();
