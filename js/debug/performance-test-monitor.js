(()=>{
  const enabled=true;
  if(!enabled)return;

  const battle=document.getElementById('battle'),A=document.getElementById('A'),queue=document.getElementById('queue'),customFill=document.getElementById('customFill');
  const ENEMY=window.BattleNetworkEnemy,COMBAT_RANGE=window.BattleNetworkCombatRange;
  if(!battle||!A||!queue||!customFill)return;

  const values=new Map(),events=[];
  const nativeRAF=window.requestAnimationFrame.bind(window);
  let lastFrame=performance.now(),lastRender=0,lastStall=null,shotWindowUntil=0;
  let lastAttackToken=COMBAT_RANGE?.getLastAttackContext?.()?.shotToken??null;
  let activeUse=null,lastGaugeMutation=performance.now(),lastEnemyMove=performance.now(),lastEnemySignature='';
  const heartbeats=new Map();

  const panel=document.createElement('div');
  panel.dataset.testOnly='performance-monitor';
  panel.style.cssText="position:absolute;left:8px;bottom:8px;z-index:9999;min-width:430px;max-width:650px;padding:8px 10px;border:1px solid rgba(120,235,255,.75);border-radius:5px;background:rgba(0,12,20,.9);color:#dffaff;font:700 12px/1.34 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;pointer-events:none;";
  panel.textContent='PERF TEST ON\nWAITING CHIP USE';
  battle.appendChild(panel);

  function record(name,ms){if(!Number.isFinite(ms))return;const prev=values.get(name)||{last:0,max:0};prev.last=ms;prev.max=Math.max(prev.max,ms);values.set(name,prev)}
  function measure(name,fn){const t=performance.now();try{return fn()}finally{record(name,performance.now()-t)}}
  function trace(name,detail=''){const now=performance.now();events.push({time:now,name:String(name),detail:String(detail||'')});if(events.length>100)events.splice(0,events.length-100);shotWindowUntil=Math.max(shotWindowUntil,now+1400)}
  function heartbeat(name,now=performance.now()){
    const key=String(name),prev=heartbeats.get(key);if(Number.isFinite(prev))record(`${key} gap`,now-prev);heartbeats.set(key,now)
  }
  function firstQueuedName(){return queue.querySelector('.q:not(.empty)')?.textContent?.trim()||''}
  function queueCount(){return queue.querySelectorAll('.q:not(.empty)').length}
  function findChipTimingByName(name){
    try{
      const compat=window.BattleNetworkMaster?.createGameCompatibilityData?.();
      const list=Object.values(compat?.CHIP||{});
      const chip=list.find(item=>item?.name===name);
      if(!chip)return null;
      const startup=Math.max(0,Number(chip.startupDelay)||0),recovery=Math.max(0,Number(chip.lock??.25));
      const burst=chip.type==='vulcan'?Math.max(0,Number(chip.burstIntervalSec)||0)*Math.max(0,(Math.floor(Number(chip.burstCount)||3)-1)):0;
      return {type:chip.type,startup,recovery,burst,total:startup+burst+recovery};
    }catch{return null}
  }

  const gaugeObserver=new MutationObserver(()=>{
    const now=performance.now(),gap=now-lastGaugeMutation;lastGaugeMutation=now;
    if(now<=shotWindowUntil)record('customGauge gap',gap);
  });
  gaugeObserver.observe(customFill,{attributes:true,attributeFilter:['style']});

  function sampleEnemyMovement(now){
    if(!ENEMY?.getActiveEnemies)return;
    const enemies=ENEMY.getActiveEnemies();
    const signature=enemies.map(e=>`${e.id}:${Number(e.x).toFixed(2)},${Number(e.y).toFixed(2)}`).join('|');
    if(!lastEnemySignature){lastEnemySignature=signature;lastEnemyMove=now;return}
    if(signature!==lastEnemySignature){const gap=now-lastEnemyMove;lastEnemyMove=now;lastEnemySignature=signature;if(now<=shotWindowUntil)record('enemyMove gap',gap)}
  }

  function inspectAttack(now){
    const ctx=COMBAT_RANGE?.getLastAttackContext?.();
    const token=ctx?.shotToken??null;
    if(token===null||token===lastAttackToken)return;
    lastAttackToken=token;
    if(activeUse){activeUse.attackAt=now;activeUse.attackDelay=now-activeUse.pressAt;record('press->attack',activeUse.attackDelay);trace('CHIP:attack',`${activeUse.name} ${activeUse.attackDelay.toFixed(1)}ms`)}
  }

  A.addEventListener('pointerdown',()=>{
    const name=firstQueuedName(),count=queueCount(),now=performance.now(),timing=findChipTimingByName(name);
    activeUse={name:name||'(none)',pressAt:now,countBefore:count,timing,attackAt:null,attackDelay:null};
    trace('A:pointerdown',activeUse.name);
    queueMicrotask(()=>{
      if(!activeUse)return;
      const accepted=queueCount()<activeUse.countBefore;
      activeUse.accepted=accepted;
      trace(accepted?'CHIP:accepted':'CHIP:rejected',activeUse.name);
      if(accepted&&activeUse.timing){
        activeUse.expectedAttackAt=activeUse.pressAt+activeUse.timing.startup*1000;
        activeUse.expectedUnlockAt=activeUse.pressAt+activeUse.timing.total*1000;
      }
    });
  },true);
  A.addEventListener('pointerup',()=>trace('A:pointerup'),true);

  function isLandscape(){return innerWidth>innerHeight}
  function captureStall(now,gap){if(!isLandscape()||now>shotWindowUntil)return;const from=now-gap-160,to=now+10;lastStall={gap,time:now,events:events.filter(e=>e.time>=from&&e.time<=to).slice(-26)}}
  function render(now){
    if(now-lastRender<120)return;lastRender=now;
    const lines=['PERF TEST ON'];
    if(activeUse){
      lines.push(`CHIP ${activeUse.name}${activeUse.accepted===false?' [REJECTED]':''}`);
      if(activeUse.timing)lines.push(`planned startup ${(activeUse.timing.startup*1000).toFixed(0)} / burst ${(activeUse.timing.burst*1000).toFixed(0)} / recovery ${(activeUse.timing.recovery*1000).toFixed(0)} ms`);
      lines.push(`press->attack ${activeUse.attackDelay===null?'waiting':activeUse.attackDelay.toFixed(1)+' ms'}`);
      if(Number.isFinite(activeUse.expectedUnlockAt))lines.push(`unlock target in ${Math.max(0,activeUse.expectedUnlockAt-now).toFixed(0)} ms`);
    }else lines.push('WAITING CHIP USE');
    if(lastStall){lines.push(`STALL ${lastStall.gap.toFixed(1)}ms:`);if(!lastStall.events.length)lines.push('  (no traced event in window)');else for(const e of lastStall.events){const d=e.time-lastStall.time;lines.push(`${d.toFixed(0).padStart(5)}ms ${e.name}${e.detail?' '+e.detail:''}`)}}else lines.push('STALL: none');
    lines.push('');
    const compact=['customGauge gap','enemyMove gap','enemyAI gap','press->attack','range render','range hide','bomb render','bomb hide','chipFrameGap'];
    for(const name of compact){const v=values.get(name);if(v)lines.push(`${name.padEnd(17)} ${v.last.toFixed(1).padStart(6)} / ${v.max.toFixed(1).padStart(6)} ms`)}
    panel.textContent=lines.join('\n');
  }

  function monitorFrame(now){
    const gap=now-lastFrame;lastFrame=now;
    if(isLandscape()&&now<=shotWindowUntil&&gap>20)record('chipFrameGap',gap);
    if(gap>=40)captureStall(now,gap);
    sampleEnemyMovement(now);inspectAttack(now);render(now);nativeRAF(monitorFrame)
  }
  nativeRAF(monitorFrame);

  window.BattleNetworkPerfTest=Object.freeze({record,measure,trace,heartbeat,getSnapshot:()=>Object.freeze(Object.fromEntries([...values].map(([k,v])=>[k,Object.freeze({...v})]))),getLastStall:()=>lastStall?Object.freeze({gap:lastStall.gap,time:lastStall.time,events:Object.freeze(lastStall.events.map(e=>Object.freeze({...e})))}):null});
})();
