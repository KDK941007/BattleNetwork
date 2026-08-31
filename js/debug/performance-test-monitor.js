(()=>{
  const battle=document.getElementById('battle'),A=document.getElementById('A');
  if(!battle||!A)return;
  const values=new Map();
  let lastFrame=performance.now(),lastRender=0;
  const panel=document.createElement('div');
  panel.dataset.testOnly='performance-monitor';
  panel.style.cssText="position:absolute;left:8px;top:54px;z-index:9999;min-width:210px;padding:6px 8px;border:1px solid rgba(120,235,255,.75);border-radius:5px;background:rgba(0,12,20,.82);color:#dffaff;font:700 11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;pointer-events:none;";
  panel.textContent='PERF TEST\nwaiting...';
  battle.appendChild(panel);

  function record(name,ms){
    if(!Number.isFinite(ms))return;
    const prev=values.get(name)||{last:0,max:0};
    prev.last=ms;prev.max=Math.max(prev.max,ms);values.set(name,prev);
  }
  function measure(name,fn){const t=performance.now();try{return fn()}finally{record(name,performance.now()-t)}}
  function render(now){
    if(now-lastRender<250)return;
    lastRender=now;
    const order=['A task','firstHit','directHit','spreadCalc','spreadDamage','spreadVisual','frameGap'];
    const lines=['PERF TEST  last / max ms'];
    for(const name of order){const v=values.get(name);if(v)lines.push(`${name.padEnd(12)} ${v.last.toFixed(1).padStart(6)} / ${v.max.toFixed(1).padStart(6)}`)}
    panel.textContent=lines.join('\n');
  }
  A.addEventListener('pointerdown',()=>{
    const t=performance.now();
    queueMicrotask(()=>record('A task',performance.now()-t));
  },true);
  function frame(now){const gap=now-lastFrame;lastFrame=now;if(gap>20)record('frameGap',gap);render(now);requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
  window.BattleNetworkPerfTest=Object.freeze({record,measure,getSnapshot:()=>Object.freeze(Object.fromEntries([...values].map(([k,v])=>[k,Object.freeze({...v})]))) });
})();
