(()=>{
  const FIELD=window.BattleNetworkField;
  const PLAYER=window.BattleNetworkPlayer;
  const HEALTH=window.BattleNetworkPlayerHealth;
  const SAVE=window.BattleNetworkSaveData;
  const MASTER=window.BattleNetworkMaster;
  const battle=document.getElementById('battle');
  const shell=battle?.closest('.shell')||document.body;
  if(!FIELD||!PLAYER||!HEALTH||!SAVE||!MASTER||!battle)throw new Error('BattleNetworkBattleReward: required dependency is missing.');

  if(!document.querySelector('link[data-battle-reward-style]')){
    const styleLink=document.createElement('link');
    styleLink.rel='stylesheet';
    styleLink.href='./css/battle-reward.css?v=6';
    styleLink.dataset.battleRewardStyle='1';
    document.head.appendChild(styleLink);
  }

  const PLAYER_ID='PLAYER_1';
  const METTAUR_CHIP_ID='CHIP_EXE4_S103';
  const LOW_HP_RATIO=.375;
  const CHIP_REVEAL_COLS=10;
  const CHIP_REVEAL_ROWS=10;
  const CHIP_REVEAL_COUNT=CHIP_REVEAL_COLS*CHIP_REVEAL_ROWS;
  const CHIP_REVEAL_DELAY=100;
  const CHIP_REVEAL_DURATION=720;
  const CHIP_REVEAL_ORDER=Object.freeze(Array.from({length:CHIP_REVEAL_COUNT},(_,index)=>index).sort((a,b)=>((a*37)%CHIP_REVEAL_COUNT)-((b*37)%CHIP_REVEAL_COUNT)));
  const REWARD_IMAGE_PATHS=Object.freeze({
    ZENNY:'./assets/rewards/zenny.png',
    HP:'./assets/rewards/hp.png'
  });
  const codeRelations=window.BattleNetworkData?.CHIP_CODE_RELATION;
  if(Array.isArray(codeRelations)){
    for(const codeId of ['A','L','V','*']){
      if(!codeRelations.some(row=>row?.chipId===METTAUR_CHIP_ID&&row?.codeId===codeId))codeRelations.push({chipId:METTAUR_CHIP_ID,codeId});
    }
  }
  const appliedRewards=new Map();
  let tracker=null;
  let rewardSerial=0;
  let rewardRevealFrame=null;
  let rewardRevealToken=0;
  let lastFrame=performance.now();

  function isBattleTimeAdvancing(){
    if(document.hidden)return false;
    const wave=window.BattleNetworkWave?.getSnapshot?.();
    if(!wave||wave.status!=='ACTIVE')return false;
    if(document.getElementById('customModal')?.classList.contains('open'))return false;
    if(document.getElementById('settingsModal')?.classList.contains('open'))return false;
    if(document.getElementById('battle')?.classList.contains('editMode'))return false;
    if(window.BattleNetworkAreaSteal?.isActive?.()===true)return false;
    if(PLAYER.isDefeated?.()===true)return false;
    return true;
  }

  function startWave(waveNumber){
    const health=HEALTH.getSnapshot();
    const dashState=PLAYER.getDashState?.();
    tracker={
      waveNumber:Number(waveNumber)||0,
      elapsedSeconds:0,
      hits:0,
      dashes:0,
      lastHp:Number(health.hp),
      lastDashActive:PLAYER.isDashing?.()===true,
      lastDashQueued:dashState?.queued===true
    };
    lastFrame=performance.now();
    return getTrackingSnapshot();
  }

  function getTrackingSnapshot(){
    return tracker?Object.freeze({...tracker}):null;
  }

  HEALTH.subscribe(health=>{
    if(!tracker)return;
    const hp=Number(health.hp);
    if(Number.isFinite(hp)&&Number.isFinite(tracker.lastHp)&&hp<tracker.lastHp)tracker.hits+=1;
    if(Number.isFinite(hp))tracker.lastHp=hp;
  });

  function tick(now){
    const elapsed=Math.max(0,(now-lastFrame)/1000);
    lastFrame=now;
    if(tracker){
      const advancing=isBattleTimeAdvancing();
      const dashActive=PLAYER.isDashing?.()===true;
      const dashQueued=PLAYER.getDashState?.()?.queued===true;
      if(advancing){
        tracker.elapsedSeconds+=elapsed;
        const directStart=!tracker.lastDashActive&&dashActive;
        const queuedStart=tracker.lastDashActive&&tracker.lastDashQueued&&dashActive&&!dashQueued;
        if(directStart||queuedStart)tracker.dashes+=1;
      }
      tracker.lastDashActive=dashActive;
      tracker.lastDashQueued=dashQueued;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  document.addEventListener('visibilitychange',()=>{lastFrame=performance.now()});

  function timePoints(seconds){
    if(seconds<=5)return 7;
    if(seconds<=12)return 6;
    if(seconds<=36)return 5;
    return 4;
  }

  function hitPoints(hits){
    if(hits<=0)return 1;
    if(hits===1)return 0;
    if(hits===2)return -1;
    if(hits===3)return -2;
    return -3;
  }

  function dashPoints(dashes){return dashes<=1?1:0}
  function multiDeletePoints(count){const value=Math.max(0,Math.trunc(Number(count)||0));return value>=3?4:value===2?2:0}
  function rankFromPoints(points){return points>=11?'S':String(Math.max(1,Math.min(10,Math.trunc(points))))}
  function rankNumber(rank){return rank==='S'?11:Math.max(1,Math.min(10,Math.trunc(Number(rank)||1)))}

  function weightedChoice(entries){
    const total=entries.reduce((sum,entry)=>sum+Math.max(0,Number(entry.weight)||0),0);
    if(!(total>0))return null;
    let cursor=Math.random()*total;
    for(const entry of entries){cursor-=Math.max(0,Number(entry.weight)||0);if(cursor<0)return entry}
    return entries[entries.length-1]||null;
  }

  function variantSlot(weight){
    const half=weight/2;
    return [
      {type:'CHIP',chipId:METTAUR_CHIP_ID,code:'L',amount:1,weight:half},
      {type:'CHIP',chipId:METTAUR_CHIP_ID,code:'V',amount:1,weight:half}
    ];
  }

  function rewardCandidates(rank,lowHp){
    const level=rankNumber(rank);
    if(lowHp){
      if(level<=4)return [{type:'HP',amount:50,weight:100}];
      if(level===5)return [...variantSlot(25),{type:'HP',amount:50,weight:75}];
      if(level===6)return [...variantSlot(50),{type:'HP',amount:50,weight:50}];
      if(level===7)return [{type:'CHIP',chipId:METTAUR_CHIP_ID,code:'A',amount:1,weight:50},...variantSlot(25),{type:'HP',amount:50,weight:25}];
      return [{type:'CHIP',chipId:METTAUR_CHIP_ID,code:'A',amount:1,weight:100}];
    }
    if(level<=3)return [{type:'ZENNY',amount:30,weight:100}];
    if(level===4)return [{type:'ZENNY',amount:30,weight:50},{type:'ZENNY',amount:50,weight:50}];
    if(level===5)return [{type:'ZENNY',amount:50,weight:50},{type:'ZENNY',amount:100,weight:25},...variantSlot(25)];
    if(level===6)return [{type:'ZENNY',amount:100,weight:50},...variantSlot(50)];
    if(level===7)return [{type:'CHIP',chipId:METTAUR_CHIP_ID,code:'A',amount:1,weight:50},{type:'ZENNY',amount:100,weight:25},...variantSlot(25)];
    return [{type:'CHIP',chipId:METTAUR_CHIP_ID,code:'A',amount:1,weight:100}];
  }

  function finishWave({multiDeleteCount=0,multiDeleteBonus=null}={}){
    if(!tracker)return null;
    const health=HEALTH.getSnapshot();
    const deleteTimeSeconds=Math.max(0,tracker.elapsedSeconds);
    const hits=Math.max(0,Math.trunc(tracker.hits));
    const dashes=Math.max(0,Math.trunc(tracker.dashes));
    const multiCount=Math.max(0,Math.trunc(Number(multiDeleteCount)||0));
    const explicitMultiBonus=Number(multiDeleteBonus);
    const multiBonus=Number.isFinite(explicitMultiBonus)?Math.max(0,Math.trunc(explicitMultiBonus)):multiDeletePoints(multiCount);
    const points=timePoints(deleteTimeSeconds)+hitPoints(hits)+dashPoints(dashes)+multiBonus;
    const bustingLevel=rankFromPoints(points);
    const hp=Number(health.hp),maxHp=Number(health.maxHp);
    const lowHp=Number.isFinite(hp)&&Number.isFinite(maxHp)&&maxHp>0&&hp/maxHp<LOW_HP_RATIO;
    const reward=weightedChoice(rewardCandidates(bustingLevel,lowHp));
    const result=Object.freeze({
      rewardId:++rewardSerial,
      waveNumber:tracker.waveNumber,
      deleteTimeSeconds,
      hits,
      dashes,
      multiDeleteCount:multiCount,
      multiDeleteBonus:multiBonus,
      bustingPoints:points,
      bustingLevel,
      lowHp,
      remainingHp:Number.isFinite(hp)?hp:null,
      maxHp:Number.isFinite(maxHp)?maxHp:null,
      reward:reward?Object.freeze({...reward}):null
    });
    tracker=null;
    return result;
  }

  async function addZenny(amount){
    await SAVE.initialize?.();
    const current=await SAVE.getPlayerProgress(PLAYER_ID);
    const before=Math.max(0,Math.trunc(Number(current?.zenny)||0));
    const after=before+Math.max(0,Math.trunc(Number(amount)||0));
    await SAVE.savePlayerProgress({...current,player_id:PLAYER_ID,zenny:after});
    return Object.freeze({before,after});
  }

  async function applyReward(result){
    if(!result?.reward)return Object.freeze({ok:false,reason:'NO_REWARD'});
    if(appliedRewards.has(result.rewardId))return appliedRewards.get(result.rewardId);
    let applied;
    try{
      const reward=result.reward;
      if(reward.type==='CHIP'){
        const quantity=await SAVE.addOwnedChip(reward.chipId,reward.code,reward.amount||1);
        applied=Object.freeze({ok:true,type:'CHIP',quantity});
      }else if(reward.type==='ZENNY'){
        const zenny=await addZenny(reward.amount);
        applied=Object.freeze({ok:true,type:'ZENNY',zenny});
      }else if(reward.type==='HP'){
        const healing=HEALTH.applyHealing(reward.amount);
        applied=Object.freeze({ok:healing?.ok===true,type:'HP',healing});
      }else{
        applied=Object.freeze({ok:false,reason:'UNKNOWN_REWARD'});
      }
    }catch(error){
      console.error('BattleNetworkBattleReward: failed to apply reward.',error);
      applied=Object.freeze({ok:false,reason:'APPLY_FAILED'});
    }
    appliedRewards.set(result.rewardId,applied);
    return applied;
  }

  function formatTime(seconds){
    const total=Math.max(0,Number(seconds)||0);
    const minutes=Math.floor(total/60);
    const secs=Math.floor(total%60);
    const centis=Math.floor((total-Math.floor(total))*100);
    return `${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}:${String(centis).padStart(2,'0')}`;
  }

  function signedPoints(points){
    const value=Math.trunc(Number(points)||0);
    return `${value>=0?'+':''}${value}`;
  }

  function rewardDisplayParts(reward){
    if(!reward)return Object.freeze({name:'---',code:''});
    if(reward.type==='CHIP'){
      const chip=MASTER.getChip?.(reward.chipId);
      return Object.freeze({name:chip?.chipName||'メットガード1',code:String(reward.code||'')});
    }
    if(reward.type==='ZENNY')return Object.freeze({name:`${reward.amount}z`,code:''});
    if(reward.type==='HP')return Object.freeze({name:`HP+${reward.amount}`,code:''});
    return Object.freeze({name:'---',code:''});
  }

  function rewardImageInfo(reward){
    if(!reward)return null;
    if(reward.type==='CHIP'){
      const chip=MASTER.getChip?.(reward.chipId);
      const src=MASTER.getChipImagePath?.(chip||reward.chipId);
      return src?{src,alt:chip?.chipName||'バトルチップ'}:null;
    }
    if(reward.type==='ZENNY')return {src:REWARD_IMAGE_PATHS.ZENNY,alt:'ゼニー'};
    if(reward.type==='HP')return {src:REWARD_IMAGE_PATHS.HP,alt:'HP回復'};
    return null;
  }

  function setRewardTextVisible(modal,visible){
    const opacity=visible?'1':'0';
    const name=modal.querySelector('#battleRewardGetName');
    const code=modal.querySelector('#battleRewardGetCode');
    if(name){name.style.transition='opacity 120ms ease-out';name.style.opacity=opacity}
    if(code){code.style.transition='opacity 120ms ease-out';code.style.opacity=opacity}
  }

  function setRewardAdvanceVisible(modal,visible){
    const hint=modal.querySelector('#battleRewardAdvanceHint');
    if(hint)hint.textContent=visible?(modal.dataset.rewardAdvanceText||''):'';
  }

  function setChipRevealPromptVisible(prompt,visible){
    if(!prompt)return;
    prompt.hidden=!visible;
    prompt.style.display=visible?'flex':'none';
  }

  function cancelRewardReveal(modal){
    if(rewardRevealFrame!==null){cancelAnimationFrame(rewardRevealFrame);rewardRevealFrame=null}
    const overlay=modal?.querySelector('#battleRewardPixelReveal');
    if(overlay)overlay.hidden=true;
    setChipRevealPromptVisible(modal?.querySelector('#battleRewardRevealPrompt'),false);
  }

  function ensureChipRevealOverlay(modal){
    const frame=modal.querySelector('.battleRewardImageFrame');
    if(!frame)return null;
    frame.style.position='relative';
    let overlay=frame.querySelector('#battleRewardPixelReveal');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='battleRewardPixelReveal';
    overlay.hidden=true;
    overlay.setAttribute('aria-hidden','true');
    overlay.style.cssText=`position:absolute;display:grid;grid-template-columns:repeat(${CHIP_REVEAL_COLS},minmax(0,1fr));grid-template-rows:repeat(${CHIP_REVEAL_ROWS},minmax(0,1fr));gap:0;pointer-events:none;z-index:3;overflow:hidden;`;
    for(let index=0;index<CHIP_REVEAL_COUNT;index++){
      const tile=document.createElement('span');
      tile.style.cssText='display:block;min-width:0;min-height:0;background:#061326;opacity:1;';
      overlay.appendChild(tile);
    }
    frame.appendChild(overlay);
    return overlay;
  }

  function ensureChipRevealPrompt(modal){
    const frame=modal.querySelector('.battleRewardImageFrame');
    if(!frame)return null;
    frame.style.position='relative';
    let prompt=frame.querySelector('#battleRewardRevealPrompt');
    if(prompt)return prompt;
    prompt=document.createElement('div');
    prompt.id='battleRewardRevealPrompt';
    prompt.textContent='TAP';
    prompt.hidden=true;
    prompt.style.cssText="position:absolute;left:0;top:0;width:100%;height:100%;display:none;align-items:center;justify-content:center;box-sizing:border-box;padding:6px;border:1px solid rgba(142,232,255,.7);background:rgba(3,20,48,.72);color:#9fe8ff;font-family:'Orbitron',var(--bn-ui-font),system-ui,sans-serif;font-size:11px;font-weight:900;line-height:1;letter-spacing:.08em;text-align:center;text-shadow:0 2px 0 #061326;pointer-events:none;z-index:4;";
    frame.appendChild(prompt);
    return prompt;
  }

  function setChipRevealState(modal,state){
    modal.dataset.rewardRevealState=state;
    const pending=state==='pending';
    const blocked=pending||state==='running';
    const frame=modal.querySelector('.battleRewardImageFrame');
    if(frame)frame.style.cursor=pending?'pointer':'';
    setChipRevealPromptVisible(modal.querySelector('#battleRewardRevealPrompt'),pending);
    setRewardAdvanceVisible(modal,!blocked);
  }

  function positionChipRevealLayers(overlay,prompt,image){
    const border=2;
    const width=Math.max(0,image.offsetWidth-border*2);
    const height=Math.max(0,image.offsetHeight-border*2);
    if(!(width>0&&height>0))return false;
    const left=image.offsetLeft+border;
    const top=image.offsetTop+border;
    overlay.style.left=`${left}px`;
    overlay.style.top=`${top}px`;
    overlay.style.width=`${width}px`;
    overlay.style.height=`${height}px`;
    if(prompt){
      prompt.style.left=`${left}px`;
      prompt.style.top=`${top}px`;
      prompt.style.width=`${width}px`;
      prompt.style.height=`${height}px`;
    }
    return true;
  }

  function prepareChipReveal(modal,image,token){
    if(token!==rewardRevealToken)return;
    const overlay=ensureChipRevealOverlay(modal);
    const prompt=ensureChipRevealPrompt(modal);
    if(!overlay||!prompt)return;
    if(!positionChipRevealLayers(overlay,prompt,image)){
      rewardRevealFrame=requestAnimationFrame(()=>prepareChipReveal(modal,image,token));
      return;
    }
    rewardRevealFrame=null;
    for(const tile of overlay.children)tile.style.opacity='1';
    overlay.hidden=false;
    image.style.visibility='hidden';
    setChipRevealState(modal,'pending');
    if(modal.dataset.rewardRevealRequested==='1')startChipReveal(modal,image,token);
  }

  function startChipReveal(modal,image,token){
    if(token!==rewardRevealToken||modal.dataset.rewardRevealState!=='pending')return;
    const overlay=ensureChipRevealOverlay(modal);
    const prompt=ensureChipRevealPrompt(modal);
    if(!overlay||!prompt)return;
    if(!positionChipRevealLayers(overlay,prompt,image)){
      rewardRevealFrame=requestAnimationFrame(()=>startChipReveal(modal,image,token));
      return;
    }
    const tiles=overlay.children;
    for(const tile of tiles)tile.style.opacity='1';
    overlay.hidden=false;
    setChipRevealPromptVisible(prompt,false);
    image.style.visibility='visible';
    setChipRevealState(modal,'running');
    const start=performance.now()+CHIP_REVEAL_DELAY;
    let revealed=0;
    const step=now=>{
      if(token!==rewardRevealToken)return;
      const progress=Math.max(0,Math.min(1,(now-start)/CHIP_REVEAL_DURATION));
      const target=Math.floor(progress*CHIP_REVEAL_COUNT);
      while(revealed<target){
        const tile=tiles[CHIP_REVEAL_ORDER[revealed]];
        if(tile)tile.style.opacity='0';
        revealed++;
      }
      if(progress>=1){
        while(revealed<CHIP_REVEAL_COUNT){
          const tile=tiles[CHIP_REVEAL_ORDER[revealed]];
          if(tile)tile.style.opacity='0';
          revealed++;
        }
        overlay.hidden=true;
        rewardRevealFrame=null;
        modal.dataset.rewardRevealRequested='0';
        setRewardTextVisible(modal,true);
        setChipRevealState(modal,'complete');
        return;
      }
      rewardRevealFrame=requestAnimationFrame(step);
    };
    rewardRevealFrame=requestAnimationFrame(step);
  }

  function requestChipReveal(modal){
    if(modal.dataset.rewardRevealState!=='pending')return false;
    modal.dataset.rewardRevealRequested='1';
    setChipRevealPromptVisible(modal.querySelector('#battleRewardRevealPrompt'),false);
    const image=modal.querySelector('#battleRewardImage');
    if(image&&!image.hidden&&image.naturalWidth>0)startChipReveal(modal,image,rewardRevealToken);
    return true;
  }

  function renderRewardGet(modal,reward){
    const token=++rewardRevealToken;
    cancelRewardReveal(modal);
    const name=modal.querySelector('#battleRewardGetName');
    const code=modal.querySelector('#battleRewardGetCode');
    const image=modal.querySelector('#battleRewardImage');
    const parts=rewardDisplayParts(reward);
    const revealChip=reward?.type==='CHIP';
    modal.dataset.rewardRevealRequested='0';
    const prompt=ensureChipRevealPrompt(modal);
    setChipRevealPromptVisible(prompt,revealChip);
    name.textContent=parts.name;
    code.textContent=parts.code;
    code.hidden=!parts.code;
    setRewardTextVisible(modal,!revealChip);
    setChipRevealState(modal,revealChip?'pending':'complete');
    image.onload=null;
    image.onerror=null;
    image.hidden=true;
    image.style.visibility='hidden';
    const info=rewardImageInfo(reward);
    if(!info){
      image.removeAttribute('src');
      image.alt='';
      image.style.visibility='visible';
      setRewardTextVisible(modal,true);
      setChipRevealState(modal,'complete');
      return;
    }
    let started=false;
    const reveal=()=>{
      if(started||token!==rewardRevealToken)return;
      started=true;
      image.hidden=false;
      if(revealChip){
        requestAnimationFrame(()=>prepareChipReveal(modal,image,token));
      }else{
        image.style.visibility='visible';
        setRewardTextVisible(modal,true);
        setChipRevealState(modal,'complete');
      }
    };
    image.onload=reveal;
    image.onerror=()=>{
      if(token!==rewardRevealToken)return;
      cancelRewardReveal(modal);
      image.hidden=true;
      image.style.visibility='visible';
      image.removeAttribute('src');
      setRewardTextVisible(modal,true);
      setChipRevealState(modal,'complete');
    };
    image.alt=info.alt;
    image.src=info.src;
    if(image.complete&&image.naturalWidth>0)queueMicrotask(reveal);
  }

  function renderBustingBreakdown(modal,result){
    const timeScore=timePoints(result.deleteTimeSeconds);
    const hitScore=hitPoints(result.hits);
    const dashScore=dashPoints(result.dashes);
    const multiScore=Math.max(0,Math.trunc(Number(result.multiDeleteBonus)||0));
    modal.querySelector('#battleRewardBreakdownTimeResult').textContent=formatTime(result.deleteTimeSeconds);
    modal.querySelector('#battleRewardBreakdownTimeScore').textContent=signedPoints(timeScore);
    modal.querySelector('#battleRewardBreakdownDamageResult').textContent=`${result.hits} HIT`;
    modal.querySelector('#battleRewardBreakdownDamageScore').textContent=signedPoints(hitScore);
    modal.querySelector('#battleRewardBreakdownMoveResult').textContent=String(result.dashes);
    modal.querySelector('#battleRewardBreakdownMoveScore').textContent=signedPoints(dashScore);
    modal.querySelector('#battleRewardBreakdownMultiResult').textContent=String(result.multiDeleteCount||0);
    modal.querySelector('#battleRewardBreakdownMultiScore').textContent=signedPoints(multiScore);
    modal.querySelector('#battleRewardBreakdownTotal').textContent=`${result.bustingPoints}  →  ${result.bustingLevel}`;
  }

  function ensureRewardModal(){
    let modal=document.getElementById('battleRewardModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='battleRewardModal';
    modal.className='battleRewardModal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`<div class="battleRewardPanel" role="dialog" aria-modal="true" aria-label="バトル報酬" tabindex="0">
      <div class="battleRewardWave" id="battleRewardWave"></div>
      <div class="battleRewardRows">
        <div class="battleRewardMetricRow"><span>DELETE TIME</span><strong id="battleRewardTime">00:00:00</strong></div>
        <button class="battleRewardMetricRow battleRewardRankRow" id="battleRewardRankRow" type="button" aria-expanded="false" aria-controls="battleRewardBreakdown"><span>BUSTING LV.</span><strong id="battleRewardLevel">1</strong></button>
      </div>
      <div class="battleRewardData">
        <div class="battleRewardDataText">
          <div class="battleRewardDataTitle">GET DATA</div>
          <div class="battleRewardValueRow"><strong class="battleRewardValue"><span class="battleRewardValueName" id="battleRewardGetName">---</span><span class="battleRewardCode" id="battleRewardGetCode" hidden></span></strong></div>
        </div>
        <div class="battleRewardImageFrame"><img id="battleRewardImage" hidden alt="" draggable="false"></div>
        <div class="battleRewardBreakdown" id="battleRewardBreakdown" hidden>
          <div class="battleRewardBreakdownTitle">BUSTING DETAIL</div>
          <div class="battleRewardBreakdownHeader"><span></span><span>RESULT</span><span>SCORE</span></div>
          <div class="battleRewardBreakdownRow"><span>TIME</span><strong id="battleRewardBreakdownTimeResult"></strong><strong class="battleRewardBreakdownScore" id="battleRewardBreakdownTimeScore"></strong></div>
          <div class="battleRewardBreakdownRow"><span>DAMAGE</span><strong id="battleRewardBreakdownDamageResult"></strong><strong class="battleRewardBreakdownScore" id="battleRewardBreakdownDamageScore"></strong></div>
          <div class="battleRewardBreakdownRow"><span>DASH</span><strong id="battleRewardBreakdownMoveResult"></strong><strong class="battleRewardBreakdownScore" id="battleRewardBreakdownMoveScore"></strong></div>
          <div class="battleRewardBreakdownRow"><span>MULTI DELETE</span><strong id="battleRewardBreakdownMultiResult"></strong><strong class="battleRewardBreakdownScore" id="battleRewardBreakdownMultiScore"></strong></div>
          <div class="battleRewardBreakdownTotal"><span>TOTAL</span><strong id="battleRewardBreakdownTotal"></strong></div>
        </div>
      </div>
      <div class="battleRewardStatus" id="battleRewardStatus"></div>
      <div class="battleRewardAdvanceHint" id="battleRewardAdvanceHint">TAP TO NEXT</div>
    </div>`;
    shell.appendChild(modal);
    return modal;
  }

  async function show(result,{isFinal=false}={}){
    if(!result)return false;
    const applied=await applyReward(result);
    const modal=ensureRewardModal();
    const panel=modal.querySelector('.battleRewardPanel');
    const rankRow=modal.querySelector('#battleRewardRankRow');
    const breakdown=modal.querySelector('#battleRewardBreakdown');
    const imageFrame=modal.querySelector('.battleRewardImageFrame');
    const advanceText=isFinal?'TAP TO COMPLETE':'TAP TO NEXT';
    modal.dataset.rewardAdvanceText=advanceText;
    modal.querySelector('#battleRewardWave').textContent=`WAVE ${result.waveNumber}`;
    modal.querySelector('#battleRewardTime').textContent=formatTime(result.deleteTimeSeconds);
    modal.querySelector('#battleRewardLevel').textContent=result.bustingLevel;
    renderRewardGet(modal,result.reward);
    renderBustingBreakdown(modal,result);
    modal.querySelector('#battleRewardStatus').textContent=applied.ok?'':'報酬の保存に失敗しました';
    setRewardAdvanceVisible(modal,modal.dataset.rewardRevealState!=='pending'&&modal.dataset.rewardRevealState!=='running');
    breakdown.hidden=true;
    rankRow.setAttribute('aria-expanded','false');
    rankRow.onclick=event=>{
      event.stopPropagation();
      const open=breakdown.hidden;
      breakdown.hidden=!open;
      rankRow.setAttribute('aria-expanded',open?'true':'false');
    };
    breakdown.onclick=event=>event.stopPropagation();
    imageFrame.onclick=event=>{
      const state=modal.dataset.rewardRevealState;
      if(state==='pending'){
        event.stopPropagation();
        requestChipReveal(modal);
        return;
      }
      if(state==='running')event.stopPropagation();
    };
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    panel.focus({preventScroll:true});
    return new Promise(resolve=>{
      const closeBreakdown=()=>{
        breakdown.hidden=true;
        rankRow.setAttribute('aria-expanded','false');
      };
      const finish=()=>{
        rewardRevealToken++;
        cancelRewardReveal(modal);
        const image=modal.querySelector('#battleRewardImage');
        if(image){image.onload=null;image.onerror=null}
        panel.onclick=null;
        panel.onkeydown=null;
        imageFrame.onclick=null;
        imageFrame.style.cursor='';
        rankRow.onclick=null;
        breakdown.onclick=null;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden','true');
        resolve(true);
      };
      panel.onclick=event=>{
        if(event.target.closest('.battleRewardRankRow,.battleRewardBreakdown'))return;
        const revealState=modal.dataset.rewardRevealState;
        if(revealState==='pending'||revealState==='running')return;
        if(!breakdown.hidden){closeBreakdown();return}
        finish();
      };
      panel.onkeydown=event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        if(event.target.closest('.battleRewardRankRow'))return;
        const revealState=modal.dataset.rewardRevealState;
        if(revealState==='pending'||revealState==='running'){event.preventDefault();return}
        event.preventDefault();
        if(!breakdown.hidden){closeBreakdown();return}
        finish();
      };
    });
  }

  window.BattleNetworkBattleReward=Object.freeze({
    LOW_HP_RATIO,
    METTAUR_CHIP_ID,
    REWARD_IMAGE_PATHS,
    startWave,
    finishWave,
    show,
    applyReward,
    getTrackingSnapshot,
    multiDeletePoints
  });
})();
