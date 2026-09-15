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

  function currentTile(){
    const p=PLAYER.getPosition?.();
    return p?FIELD.getTileAtWorld(p.x,p.y):null;
  }

  function startWave(waveNumber){
    const health=HEALTH.getSnapshot();
    const tile=currentTile();
    tracker={
      waveNumber:Number(waveNumber)||0,
      elapsedSeconds:0,
      hits:0,
      movements:0,
      lastHp:Number(health.hp),
      lastTile:tile?{row:tile.row,col:tile.col}:null
    };
    lastFrame=performance.now();
    return getTrackingSnapshot();
  }

  function getTrackingSnapshot(){
    return tracker?Object.freeze({...tracker,lastTile:tracker.lastTile?Object.freeze({...tracker.lastTile}):null}):null;
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
    if(tracker&&isBattleTimeAdvancing()){
      tracker.elapsedSeconds+=elapsed;
      const tile=currentTile();
      if(tile){
        if(tracker.lastTile){
          tracker.movements+=Math.abs(tile.row-tracker.lastTile.row)+Math.abs(tile.col-tracker.lastTile.col);
        }
        tracker.lastTile={row:tile.row,col:tile.col};
      }
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

  function movementPoints(movements){return movements<=2?1:0}
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

  function finishWave({multiDeleteBonus=0}={}){
    if(!tracker)return null;
    const health=HEALTH.getSnapshot();
    const deleteTimeSeconds=Math.max(0,tracker.elapsedSeconds);
    const hits=Math.max(0,Math.trunc(tracker.hits));
    const movements=Math.max(0,Math.trunc(tracker.movements));
    const multiBonus=Math.max(0,Math.trunc(Number(multiDeleteBonus)||0));
    const points=timePoints(deleteTimeSeconds)+hitPoints(hits)+movementPoints(movements)+multiBonus;
    const bustingLevel=rankFromPoints(points);
    const hp=Number(health.hp),maxHp=Number(health.maxHp);
    const lowHp=Number.isFinite(hp)&&Number.isFinite(maxHp)&&maxHp>0&&hp/maxHp<LOW_HP_RATIO;
    const reward=weightedChoice(rewardCandidates(bustingLevel,lowHp));
    const result=Object.freeze({
      rewardId:++rewardSerial,
      waveNumber:tracker.waveNumber,
      deleteTimeSeconds,
      hits,
      movements,
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

  function renderRewardGet(modal,reward){
    const name=modal.querySelector('#battleRewardGetName');
    const code=modal.querySelector('#battleRewardGetCode');
    const image=modal.querySelector('#battleRewardImage');
    const parts=rewardDisplayParts(reward);
    name.textContent=parts.name;
    code.textContent=parts.code;
    code.hidden=!parts.code;
    image.hidden=true;
    image.onload=()=>{image.hidden=false};
    image.onerror=()=>{
      image.hidden=true;
      image.removeAttribute('src');
    };
    const info=rewardImageInfo(reward);
    if(!info){
      image.removeAttribute('src');
      image.alt='';
      return;
    }
    image.alt=info.alt;
    image.src=info.src;
  }

  function renderBustingBreakdown(modal,result){
    const timeScore=timePoints(result.deleteTimeSeconds);
    const hitScore=hitPoints(result.hits);
    const moveScore=movementPoints(result.movements);
    const multiScore=Math.max(0,Math.trunc(Number(result.multiDeleteBonus)||0));
    modal.querySelector('#battleRewardBreakdownTimeResult').textContent=formatTime(result.deleteTimeSeconds);
    modal.querySelector('#battleRewardBreakdownTimeScore').textContent=signedPoints(timeScore);
    modal.querySelector('#battleRewardBreakdownDamageResult').textContent=`${result.hits} HIT`;
    modal.querySelector('#battleRewardBreakdownDamageScore').textContent=signedPoints(hitScore);
    modal.querySelector('#battleRewardBreakdownMoveResult').textContent=String(result.movements);
    modal.querySelector('#battleRewardBreakdownMoveScore').textContent=signedPoints(moveScore);
    modal.querySelector('#battleRewardBreakdownMultiResult').textContent=String(result.multiDeleteBonus);
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
          <div class="battleRewardBreakdownRow"><span>MOVE</span><strong id="battleRewardBreakdownMoveResult"></strong><strong class="battleRewardBreakdownScore" id="battleRewardBreakdownMoveScore"></strong></div>
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
    modal.querySelector('#battleRewardWave').textContent=`WAVE ${result.waveNumber}`;
    modal.querySelector('#battleRewardTime').textContent=formatTime(result.deleteTimeSeconds);
    modal.querySelector('#battleRewardLevel').textContent=result.bustingLevel;
    renderRewardGet(modal,result.reward);
    renderBustingBreakdown(modal,result);
    modal.querySelector('#battleRewardStatus').textContent=applied.ok?'':'報酬の保存に失敗しました';
    modal.querySelector('#battleRewardAdvanceHint').textContent=isFinal?'TAP TO COMPLETE':'TAP TO NEXT';
    breakdown.hidden=true;
    rankRow.setAttribute('aria-expanded','false');
    rankRow.onclick=event=>{
      event.stopPropagation();
      const open=breakdown.hidden;
      breakdown.hidden=!open;
      rankRow.setAttribute('aria-expanded',open?'true':'false');
    };
    breakdown.onclick=event=>event.stopPropagation();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    panel.focus({preventScroll:true});
    return new Promise(resolve=>{
      const closeBreakdown=()=>{
        breakdown.hidden=true;
        rankRow.setAttribute('aria-expanded','false');
      };
      const finish=()=>{
        panel.onclick=null;
        panel.onkeydown=null;
        rankRow.onclick=null;
        breakdown.onclick=null;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden','true');
        resolve(true);
      };
      panel.onclick=event=>{
        if(event.target.closest('.battleRewardRankRow,.battleRewardBreakdown'))return;
        if(!breakdown.hidden){closeBreakdown();return}
        finish();
      };
      panel.onkeydown=event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        if(event.target.closest('.battleRewardRankRow'))return;
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
    getTrackingSnapshot
  });
})();
