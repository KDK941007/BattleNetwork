(()=>{
  // Temporary investigation build: keep the monitor explicitly enabled so device-side URL/query handling cannot suppress it.
  const enabled=true;
  if(!enabled)return;

  const battle=document.getElementById('battle'),A=document.getElementById('A');
  if(!battle||!A)return;
  const values=new Map(),events=[];
  const nativeRAF=window.requestAnimationFrame.bind(window);
  let lastFrame=performance.now(),lastRender=0,lastStall=null,shotWindowUntil=0;
  const pendingFrameMarks=[];
  const panel=document.createElement('div');
  panel.dataset.testOnly='performance-monitor';
  panel.style.cssText="position:absolute;left:8px;bottom:8px;z-index:9999;min-width:360px;max-width:560px;padding:8px 10px;border:1px solid rgba(120,235,255,.75);border-radius:5px;background:rgba(0,12,20,.9);color:#dffaff;font:700 12px/1.34 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;pointer-events:none;";
  panel.textContent='PERF TEST ON\nSTALL: none';battle.appendChild(panel);

  function record(name,ms){if(!Number.isFinite(ms))return;const prev=values.get(name)||{last:0,max:0};prev.last=ms;prev.max=Math.max(prev.max,ms);values.set(name,prev)}
  function measure(name,fn){const t=performance.now();try{return fn()}finally{record(name,performance.now()-t)}}
  function trace(name,detail=''){const now=performance.now();events.push({time:now,name:String(name),detail:String(detail||'')});if(events.length>80)events.splice(0,events.length-80);shotWindowUntil=Math.max(shotWindowUntil,now+900)}
  function markNextFrame(name){pendingFrameMarks.push({name,time:performance.now()});shotWindowUntil=Math.max(shotWindowUntil,performance.now()+900)}
  function callbackName(cb){const raw=(cb&&cb.name)||'anonymous';if(raw==='loop')return 'raf:gameLoop';if(raw==='syncLayerTransform'||raw==='syncTransform')return 'raf:previewSync';if(raw==='observeAttackRange')return 'raf:hitObserve';if(raw==='frame')return 'raf:otherFrame';return `raf:${raw.slice(0,18)}`}
  window.requestAnimationFrame=function(callback){if(typeof callback!=='function')return nativeRAF(callback);const name=callbackName(callback);return nativeRAF(now=>{const t=performance.now();try{return callback(now)}finally{record(name,performance.now()-t)}})};

  function isLandscape(){return innerWidth>innerHeight}
  function captureStall(now,gap){if(!isLandscape()||now>shotWindowUntil)return;const from=now-gap-140,to=now+10;lastStall={gap,time:now,events:events.filter(e=>e.time>=from&&e.time<=to).slice(-22)}}
  function render(now){
    if(now-lastRender<200)return;lastRender=now;
    const lines=['PERF TEST ON'];
    if(lastStall){lines.push(`STALL ${lastStall.gap.toFixed(1)}ms:`);if(!lastStall.events.length)lines.push('  (no traced event in window)');else for(const e of lastStall.events){const delta=e.time-lastStall.time;lines.push(`${delta.toFixed(0).padStart(5)}ms ${e.name}${e.detail?' '+e.detail:''}`)}}else lines.push('STALL: none');
    lines.push('');
    const compact=['A nextFrame','range render','range hide','bomb render','bomb hide','raf:gameLoop','raf:previewSync','chipFrameGap'];
    for(const name of compact){const v=values.get(name);if(v)lines.push(`${name.padEnd(16)} ${v.last.toFixed(1).padStart(6)} / ${v.max.toFixed(1).padStart(6)} ms`)}
    panel.textContent=lines.join('\n');
  }
  A.addEventListener('pointerdown',()=>{trace('A:pointerdown');const t=performance.now();markNextFrame('A nextFrame');queueMicrotask(()=>record('A task',performance.now()-t))},true);
  A.addEventListener('pointerup',()=>trace('A:pointerup'),true);
  function monitorFrame(now){const gap=now-lastFrame;lastFrame=now;if(isLandscape()&&now<=shotWindowUntil&&gap>20)record('chipFrameGap',gap);if(gap>=40)captureStall(now,gap);if(pendingFrameMarks.length){const marks=pendingFrameMarks.splice(0,pendingFrameMarks.length);for(const mark of marks)record(mark.name,performance.now()-mark.time)}render(now);nativeRAF(monitorFrame)}
  nativeRAF(monitorFrame);
  window.BattleNetworkPerfTest=Object.freeze({record,measure,trace,markNextFrame,getSnapshot:()=>Object.freeze(Object.fromEntries([...values].map(([k,v])=>[k,Object.freeze({...v})]))),getLastStall:()=>lastStall?Object.freeze({gap:lastStall.gap,time:lastStall.time,events:Object.freeze(lastStall.events.map(e=>Object.freeze({...e})))}):null});
})();
