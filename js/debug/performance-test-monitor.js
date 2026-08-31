(()=>{
  const battle=document.getElementById('battle'),A=document.getElementById('A');
  if(!battle||!A)return;
  const values=new Map(),events=[];
  const nativeRAF=window.requestAnimationFrame.bind(window);
  let lastFrame=performance.now(),lastRender=0,lastStall=null;
  const pendingFrameMarks=[];
  const panel=document.createElement('div');
  panel.dataset.testOnly='performance-monitor';
  panel.style.cssText="position:absolute;left:8px;top:54px;z-index:9999;min-width:315px;max-width:420px;padding:6px 8px;border:1px solid rgba(120,235,255,.75);border-radius:5px;background:rgba(0,12,20,.86);color:#dffaff;font:700 11px/1.32 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;pointer-events:none;";
  panel.textContent='PERF TEST\nwaiting...';battle.appendChild(panel);

  function record(name,ms){if(!Number.isFinite(ms))return;const prev=values.get(name)||{last:0,max:0};prev.last=ms;prev.max=Math.max(prev.max,ms);values.set(name,prev)}
  function measure(name,fn){const t=performance.now();try{return fn()}finally{record(name,performance.now()-t)}}
  function trace(name,detail=''){const now=performance.now();events.push({time:now,name:String(name),detail:String(detail||'')});if(events.length>40)events.splice(0,events.length-40)}
  function markNextFrame(name){pendingFrameMarks.push({name,time:performance.now()})}
  function callbackName(cb){const raw=(cb&&cb.name)||'anonymous';if(raw==='loop')return 'raf:gameLoop';if(raw==='syncTransform')return 'raf:projSync';if(raw==='observeAttackRange')return 'raf:hitObserve';if(raw==='frame')return 'raf:otherFrame';return `raf:${raw.slice(0,18)}`}
  window.requestAnimationFrame=function(callback){if(typeof callback!=='function')return nativeRAF(callback);const name=callbackName(callback);return nativeRAF(now=>{const t=performance.now();try{return callback(now)}finally{record(name,performance.now()-t)}})};

  function captureStall(now,gap){
    const from=now-gap-40,to=now+5;
    const nearby=events.filter(e=>e.time>=from&&e.time<=to).slice(-10);
    lastStall={gap,time:now,events:nearby};
  }
  function render(now){
    if(now-lastRender<250)return;lastRender=now;
    const fixed=['A task','A nextFrame','firstHit','directHit','hit nextFrame','spreadCalc','spreadDamage','spreadVisual','spread nextFrame','frameGap'];
    const rafNames=[...values.keys()].filter(name=>name.startsWith('raf:')).sort();
    const lines=['PERF TEST  last / max ms'];
    for(const name of [...fixed,...rafNames]){const v=values.get(name);if(v)lines.push(`${name.padEnd(16)} ${v.last.toFixed(1).padStart(6)} / ${v.max.toFixed(1).padStart(6)}`)}
    if(lastStall){lines.push('',`STALL ${lastStall.gap.toFixed(1)}ms  events before/around:`);if(!lastStall.events.length)lines.push('  (no traced event)');else for(const e of lastStall.events){const delta=e.time-lastStall.time;lines.push(`${delta.toFixed(0).padStart(5)}ms ${e.name}${e.detail?' '+e.detail:''}`)}}
    panel.textContent=lines.join('\n');
  }
  A.addEventListener('pointerdown',()=>{trace('A:pointerdown');const t=performance.now();markNextFrame('A nextFrame');queueMicrotask(()=>record('A task',performance.now()-t))},true);
  A.addEventListener('pointerup',()=>trace('A:pointerup'),true);
  const custom=document.getElementById('customModal');if(custom)new MutationObserver(()=>trace(custom.classList.contains('open')?'CUSTOM:open':'CUSTOM:close')).observe(custom,{attributes:true,attributeFilter:['class']});
  const wave=document.querySelector('.waveStatusNotice');if(wave)new MutationObserver(()=>trace('WAVE',wave.textContent.trim())).observe(wave,{childList:true,characterData:true,subtree:true});
  function monitorFrame(now){
    const gap=now-lastFrame;lastFrame=now;if(gap>20)record('frameGap',gap);if(gap>=40)captureStall(now,gap);
    if(pendingFrameMarks.length){const marks=pendingFrameMarks.splice(0,pendingFrameMarks.length);for(const mark of marks)record(mark.name,performance.now()-mark.time)}
    render(now);nativeRAF(monitorFrame)
  }
  nativeRAF(monitorFrame);
  window.BattleNetworkPerfTest=Object.freeze({record,measure,trace,markNextFrame,getSnapshot:()=>Object.freeze(Object.fromEntries([...values].map(([k,v])=>[k,Object.freeze({...v})]))),getLastStall:()=>lastStall?Object.freeze({gap:lastStall.gap,time:lastStall.time,events:Object.freeze(lastStall.events.map(e=>Object.freeze({...e})))}):null});
})();
