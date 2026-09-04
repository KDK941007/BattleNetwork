(()=>{
  const master=window.BattleNetworkMaster;
  const data=window.BattleNetworkData||{};
  const hand=document.getElementById('hand');
  const modal=document.getElementById('chipDetailModal');
  if(!master||!hand||!modal)return;

  const LONG_PRESS_MS=520;
  const chipsById=new Map((data.CHIP_MASTER||[]).map(chip=>[chip.chipId,chip]));
  const initialFolder=(data.FOLDER_MASTER||[]).find(row=>row.defaultFlg)||data.FOLDER_MASTER?.[0]||null;

  function attrHtml(chipId){
    const attr=master.getPrimaryAttribute(chipId);
    if(!attr?.iconPath)return '';
    return `<img class="attrIcon" src="${attr.iconPath}" alt="${attr.attributeName||''}" draggable="false">`;
  }

  function showDetail(chip){
    if(window.BattleNetworkChipDetail?.openByChipId?.(chip.chipId))return;

    const art=document.getElementById('detailArt');
    const detailName=document.getElementById('detailName');
    const detailDesc=document.getElementById('detailDesc');
    const detailRangeText=document.getElementById('detailRangeText');
    if(!art||!detailName||!detailDesc||!detailRangeText)return;

    detailName.textContent=chip.chipName;
    const imagePath=master.getChipImagePath(chip);
    art.innerHTML=imagePath?`<img src="${imagePath}" alt="${chip.chipName}" draggable="false">`:'';
    detailDesc.textContent=chip.description||'';
    detailRangeText.textContent=chip.rangeDescription||'';
    modal.classList.add('open');
    modal.querySelector('.chipDetail')?.scrollTo({top:0,left:0,behavior:'auto'});
  }

  function bindDetailOpen(card,chip){
    let timer=null;
    let startX=0;
    let startY=0;
    let longPressed=false;
    const clear=()=>{
      if(timer){clearTimeout(timer);timer=null}
    };

    card.addEventListener('pointerdown',event=>{
      startX=event.clientX;
      startY=event.clientY;
      longPressed=false;
      clear();
      timer=setTimeout(()=>{
        timer=null;
        longPressed=true;
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
      longPressed=false;
    });
  }

  function displayValue(chipId){
    const value=master.getChipValues(chipId).find(row=>row.displayFlg!==false);
    if(!value)return '--';
    if(value.valueMode==='VARIABLE')return '可変';
    return value.value??'--';
  }

  function createReviewCard(entry,slotNo){
    const chip=chipsById.get(entry.chipId);
    if(!chip)return null;
    const card=document.createElement('button');
    card.type='button';
    card.className='chipCard detailReviewChip';
    card.dataset.detailReviewChipId=chip.chipId;
    card.setAttribute('aria-label',`${chip.chipName} 詳細確認用`);
    const imagePath=master.getChipImagePath(chip);
    card.innerHTML=`
      <span class="slotNo">${slotNo}</span>
      <span class="chipName">${chip.chipName}</span>
      <span class="chipArt">${imagePath?`<img src="${imagePath}" alt="${chip.chipName}" draggable="false">`:''}</span>
      <span class="chipMeta">
        <span class="chipCode">${entry.codeId||'-'}</span>
        <span class="chipAttr">${attrHtml(chip.chipId)}</span>
        <span class="chipValue">${displayValue(chip.chipId)}</span>
      </span>`;
    bindDetailOpen(card,chip);
    return card;
  }

  function getInitialUniqueEntries(){
    if(!initialFolder)return [];
    const seen=new Set();
    return (data.FOLDER_CHIP_RELATION||[])
      .filter(row=>row.folderId===initialFolder.folderId)
      .sort((a,b)=>a.slotNo-b.slotNo)
      .filter(row=>{
        if(seen.has(row.chipId))return false;
        seen.add(row.chipId);
        return true;
      });
  }

  const reviewEntries=getInitialUniqueEntries();
  const reviewIds=reviewEntries.map(row=>row.chipId);

  function isReviewHand(){
    const children=[...hand.children];
    return children.length===reviewIds.length&&children.every((child,index)=>child.dataset.detailReviewChipId===reviewIds[index]);
  }

  function injectInitialFolderReview(){
    if(!window.BattleNetworkFolder?.getTestTarget?.().enabled)return;
    if(!reviewEntries.length||isReviewHand())return;
    const cards=reviewEntries.map((entry,index)=>createReviewCard(entry,index+1)).filter(Boolean);
    hand.replaceChildren(...cards);
    const folderInfo=document.getElementById('folderInfo');
    if(folderInfo)folderInfo.textContent=`初期フォルダ ${cards.length}種`;
  }

  const observer=new MutationObserver(()=>queueMicrotask(injectInitialFolderReview));
  observer.observe(hand,{childList:true});
  injectInitialFolderReview();
})();