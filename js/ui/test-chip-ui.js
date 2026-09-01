(()=>{
  const master=window.BattleNetworkMaster;
  const data=window.BattleNetworkData||{};
  const hand=document.getElementById('hand');
  const modal=document.getElementById('chipDetailModal');
  if(!master||!hand||!modal)return;
  if(window.BattleNetworkFolder?.getTestTarget?.().enabled)return;

  const TEST_CHIP_IDS=['TEST_9001','TEST_9002','TEST_9003'];
  const LONG_PRESS_MS=520;
  const chipsById=new Map((data.CHIP_MASTER||[]).map(chip=>[chip.chipId,chip]));

  function attrHtml(chipId){
    const attr=master.getPrimaryAttribute(chipId);
    if(!attr?.iconPath)return '';
    return `<img class="attrIcon" src="${attr.iconPath}" alt="${attr.attributeName||''}" draggable="false">`;
  }

  function rangeVizClass(chip){
    if(chip.rangeTypeId==='LINE_FORWARD')return 'cannon';
    if(chip.rangeTypeId==='FRONT_RECT')return 'sword';
    if(chip.rangeTypeId==='THROW_AOE')return 'bomb';
    if(chip.rangeTypeId==='SELF')return 'recover';
    return '';
  }

  function showDetail(chip){
    const art=document.getElementById('detailArt');
    const detailName=document.getElementById('detailName');
    const detailDesc=document.getElementById('detailDesc');
    const detailRangeText=document.getElementById('detailRangeText');
    const detailRange=document.getElementById('detailRange');
    const detailPower=document.getElementById('detailPower');

    if(!art||!detailName||!detailDesc||!detailRangeText||!detailRange)return;

    detailName.textContent=chip.chipName;
    const imagePath=master.getChipImagePath(chip);
    art.innerHTML=imagePath?`<img src="${imagePath}" alt="${chip.chipName}" draggable="false">`:'';
    detailDesc.textContent=chip.description||'';
    detailRangeText.textContent=chip.rangeDescription||'';
    detailRange.className=`rangeViz ${rangeVizClass(chip)}`.trim();

    if(detailPower){
      const value=master.getChipValues(chip.chipId).find(row=>row.displayFlg!==false);
      detailPower.textContent=value?`${value.valueType?.displayLabel||''}：${value.value??'--'}`:'';
    }

    modal.classList.add('open');
    modal.querySelector('.chipDetail')?.scrollTo({top:0,left:0,behavior:'auto'});
  }

  function bindLongPress(card,chip){
    let timer=null;
    let startX=0;
    let startY=0;
    const clear=()=>{
      if(timer){
        clearTimeout(timer);
        timer=null;
      }
    };

    card.addEventListener('pointerdown',event=>{
      startX=event.clientX;
      startY=event.clientY;
      clear();
      timer=setTimeout(()=>{
        timer=null;
        showDetail(chip);
      },LONG_PRESS_MS);
    });
    card.addEventListener('pointermove',event=>{
      if(Math.hypot(event.clientX-startX,event.clientY-startY)>12)clear();
    });
    card.addEventListener('pointerup',clear);
    card.addEventListener('pointercancel',clear);
    card.addEventListener('lostpointercapture',clear);
    card.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
    });
  }

  function createTestCard(chip,slotNo){
    const card=document.createElement('button');
    const code=master.getChipCodes(chip.chipId)[0]?.codeValue||'-';
    card.type='button';
    card.className='chipCard testChipPreview';
    card.dataset.testChipId=chip.chipId;
    card.setAttribute('aria-label',`${chip.chipName} 動作確認用`);
    const imagePath=master.getChipImagePath(chip);
    card.innerHTML=`
      <span class="slotNo">${slotNo}</span>
      <span class="chipName">${chip.chipName}</span>
      <span class="chipArt">${imagePath?`<img src="${imagePath}" alt="${chip.chipName}" draggable="false">`:''}</span>
      <span class="chipMeta">
        <span class="chipCode">${code}</span>
        <span class="chipAttr">${attrHtml(chip.chipId)}</span>
        <span class="chipValue">TEST</span>
      </span>`;
    bindLongPress(card,chip);
    return card;
  }

  function injectTestCards(){
    const children=[...hand.children];
    TEST_CHIP_IDS.forEach((chipId,index)=>{
      const slotIndex=5+index;
      const chip=chipsById.get(chipId);
      const current=children[slotIndex];
      if(!chip||!current)return;
      if(current.dataset?.testChipId===chipId)return;
      if(!current.classList.contains('empty'))return;
      current.replaceWith(createTestCard(chip,slotIndex+1));
    });
  }

  const observer=new MutationObserver(()=>queueMicrotask(injectTestCards));
  observer.observe(hand,{childList:true});
  injectTestCards();
})();