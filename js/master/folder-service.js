(()=>{
  const data=window.BattleNetworkData||{};
  const STORAGE_KEY='battleNetworkEquippedFolderId';

  // Chip-detail test rule:
  // expose only the chip under test plus the minimum chips required for its effect to function.
  const TEST_TARGET=Object.freeze({
    enabled:true,
    type:'ATTACK10',
    chipId:'CHIP_EXE4_S148',
    codes:Object.freeze(['*']),
    requiredCards:Object.freeze([
      Object.freeze({type:'VULCAN1',chipId:'CHIP_EXE4_S005',code:'V'}),
      Object.freeze({type:'ATTACK10',chipId:'CHIP_EXE4_S148',code:'*'}),
      Object.freeze({type:'ATTACK10',chipId:'CHIP_EXE4_S148',code:'*'})
    ])
  });

  const LEGACY_TYPE_BY_CHIP_ID=Object.freeze({
    CHIP_0001:'CANNON',
    CHIP_0002:'SWORD',
    CHIP_0003:'WIDE',
    CHIP_0004:'BOMB',
    CHIP_0005:'RECOVER',
    CHIP_EXE4_S004:'AIRSHOT',
    CHIP_EXE4_S005:'VULCAN1',
    CHIP_EXE4_S006:'VULCAN2',
    CHIP_EXE4_S007:'VULCAN3',
    CHIP_EXE4_S008:'SPREADGUN',
    CHIP_EXE4_S106:'CRACKOUT',
    CHIP_EXE4_S119:'AREASTEAL',
    CHIP_EXE4_S148:'ATTACK10'
  });

  const folderById=new Map((data.FOLDER_MASTER||[]).map(row=>[row.folderId,row]));
  const defaultFolder=(data.FOLDER_MASTER||[]).find(row=>row.defaultFlg)||data.FOLDER_MASTER?.[0]||null;

  function getStoredFolderId(){try{return localStorage.getItem(STORAGE_KEY)}catch{return null}}
  function getEquippedFolderId(){const stored=getStoredFolderId();if(stored&&folderById.has(stored))return stored;return defaultFolder?.folderId||null}
  function getFolder(folderId=getEquippedFolderId()){return folderById.get(folderId)||null}
  function getFolderEntries(folderId=getEquippedFolderId()){return (data.FOLDER_CHIP_RELATION||[]).filter(row=>row.folderId===folderId).sort((a,b)=>a.slotNo-b.slotNo).map(row=>({...row}))}
  function equipFolder(folderId){if(!folderById.has(folderId))throw new Error(`BattleNetwork folder: unknown folderId ${folderId}`);try{localStorage.setItem(STORAGE_KEY,folderId)}catch{}return getFolder(folderId)}
  function getTestTarget(){return TEST_TARGET}

  function buildTestCards(folderId){
    const required=TEST_TARGET.requiredCards;
    if(required?.length){
      return required.map((source,index)=>({id:index,type:source.type,code:source.code,chipId:source.chipId,folderId,slotNo:index+1}));
    }
    const codes=TEST_TARGET.codes;
    if(!codes.length)throw new Error('BattleNetwork folder: test target has no chip codes.');
    return Array.from({length:30},(_,index)=>({
      id:index,
      type:TEST_TARGET.type,
      code:codes[index%codes.length],
      chipId:TEST_TARGET.chipId,
      folderId,
      slotNo:index+1
    }));
  }

  function toLegacyCards(folderId=getEquippedFolderId()){
    if(TEST_TARGET.enabled)return buildTestCards(folderId);
    return getFolderEntries(folderId).map((entry,index)=>({id:index,type:LEGACY_TYPE_BY_CHIP_ID[entry.chipId]||`CHIP_${entry.chipId}`,code:entry.codeId,chipId:entry.chipId,folderId:entry.folderId,slotNo:entry.slotNo}));
  }

  function installCurrentBattleBridge(){
    const nativeMap=Array.prototype.map;
    Array.prototype.map=function(callback,thisArg){
      const isLegacyBattleFolder=this.length===30&&Array.isArray(this[0])&&this[0][0]==='CANNON'&&this[0][1]==='A';
      if(!isLegacyBattleFolder)return nativeMap.call(this,callback,thisArg);
      Array.prototype.map=nativeMap;
      return toLegacyCards();
    };
  }

  const ATTACK10_TYPE='ATTACK10';
  function isModifierCard(card){return card?.type===ATTACK10_TYPE}
  function isEligibleChip(chip){const power=Number(chip?.power);return Number.isFinite(power)&&power>0}
  function findSelectedTargetIndex(selectedIds,cardAt,chipByType){
    for(let i=selectedIds.length-1;i>=0;i--){
      const selectedCard=cardAt(selectedIds[i]);
      if(isModifierCard(selectedCard))continue;
      return isEligibleChip(chipByType[selectedCard?.type])?i:-1;
    }
    return -1;
  }
  function canAddModifier(){return true}
  function consumeAttached(queue,cardAt,discard){
    let count=0;
    while(queue.length){
      const nextId=queue[0],nextCard=cardAt(nextId);
      if(!isModifierCard(nextCard))break;
      queue.shift();discard?.add?.(nextId);count++;
    }
    return count;
  }
  function applyPower(chip,count){
    const base=Number(chip?.power);
    if(!Number.isFinite(base)||count<=0)return chip;
    return Object.freeze({...chip,power:base+10*count,attackPlus10Count:count});
  }
  function getDisplayEntries(ids,cardAt,chipByType){
    const result=[];
    for(let i=0;i<ids.length;i++){
      const c=cardAt(ids[i]);
      if(isModifierCard(c)){
        let targetIndex=i-1;
        while(targetIndex>=0&&isModifierCard(cardAt(ids[targetIndex])))targetIndex--;
        const targetCard=targetIndex>=0?cardAt(ids[targetIndex]):null;
        if(targetIndex<0||!isEligibleChip(chipByType[targetCard?.type]))result.push({id:ids[i],label:chipByType[c.type]?.name||c.type});
        continue;
      }
      const chip=chipByType[c.type],name=chip?.name||c.type;
      let plus=0,j=i+1;
      if(isEligibleChip(chip))while(j<ids.length&&isModifierCard(cardAt(ids[j]))){plus+=10;j++}
      const basePower=Number(chip?.power),power=Number.isFinite(basePower)&&basePower>0?basePower+plus:null;
      result.push({id:ids[i],label:power===null?name:`${name} ${power}`});
    }
    return result;
  }
  function ensureCustomStyles(){
    if(document.getElementById('attack10CustomStyle'))return;
    const style=document.createElement('style');style.id='attack10CustomStyle';
    style.textContent='.chipCard.attack10Target{box-shadow:0 0 0 2px rgba(255,226,96,.95),0 0 14px rgba(255,196,45,.7)}.chipCard .attack10Badge{position:absolute;right:6px;top:6px;z-index:5;padding:2px 6px;border-radius:10px;background:rgba(20,12,0,.88);border:1px solid #ffe36b;color:#fff2a8;font-size:12px;font-weight:900;line-height:1.2}.hand{position:relative}.attack10Links{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:8}.attack10Links line{stroke:#ffe36b;stroke-width:3;stroke-linecap:round;filter:drop-shadow(0 0 3px rgba(255,211,68,.8))}.attack10Links polygon{fill:#ffe36b;filter:drop-shadow(0 0 3px rgba(255,211,68,.8))}';
    document.head.appendChild(style);
  }
  function decorateCustom(hand,selectedIds,cardAt,chipByType){
    if(!hand)return;ensureCustomStyles();
    hand.querySelectorAll('.attack10Badge').forEach(el=>el.remove());
    hand.querySelectorAll('.chipCard.attack10Target').forEach(el=>el.classList.remove('attack10Target'));
    hand.querySelector('.attack10Links')?.remove();
    const selectedSet=new Set(selectedIds);
    const cardElements=[...hand.querySelectorAll('.chipCard')];
    const elementById=new Map();
    cardElements.forEach(el=>{const id=Number(el.dataset.cardId);if(Number.isFinite(id))elementById.set(id,el)});
    const links=[];
    for(let i=0;i<selectedIds.length;i++){
      const modifierId=selectedIds[i],modifierCard=cardAt(modifierId);
      if(!isModifierCard(modifierCard))continue;
      let targetIndex=i-1;
      while(targetIndex>=0&&isModifierCard(cardAt(selectedIds[targetIndex])))targetIndex--;
      if(targetIndex<0)continue;
      const targetId=selectedIds[targetIndex],targetCard=cardAt(targetId);
      if(!isEligibleChip(chipByType[targetCard?.type]))continue;
      links.push([modifierId,targetId]);
    }
    const grouped=new Map();links.forEach(([,targetId])=>grouped.set(targetId,(grouped.get(targetId)||0)+10));
    grouped.forEach((plus,targetId)=>{const targetEl=elementById.get(targetId);if(!targetEl)return;targetEl.classList.add('attack10Target');const badge=document.createElement('span');badge.className='attack10Badge';badge.textContent=`+${plus}`;targetEl.appendChild(badge)});
    if(!links.length)return;
    const handRect=hand.getBoundingClientRect(),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','attack10Links');svg.setAttribute('viewBox',`0 0 ${Math.max(1,handRect.width)} ${Math.max(1,handRect.height)}`);svg.setAttribute('preserveAspectRatio','none');
    links.forEach(([modifierId,targetId])=>{const from=elementById.get(modifierId),to=elementById.get(targetId);if(!from||!to||!selectedSet.has(modifierId)||!selectedSet.has(targetId))return;const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),x1=a.left-handRect.left+a.width/2,y1=a.top-handRect.top+a.height/2,x2=b.left-handRect.left+b.width/2,y2=b.top-handRect.top+b.height/2,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,endX=x2-ux*Math.min(28,b.width*.22),endY=y2-uy*Math.min(28,b.height*.22);const line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('x1',x1);line.setAttribute('y1',y1);line.setAttribute('x2',endX);line.setAttribute('y2',endY);svg.appendChild(line);const size=9,px=endX,py=endY,leftX=px-ux*size-uy*size*.65,leftY=py-uy*size+ux*size*.65,rightX=px-ux*size+uy*size*.65,rightY=py-uy*size-ux*size*.65,arrow=document.createElementNS(svg.namespaceURI,'polygon');arrow.setAttribute('points',`${px},${py} ${leftX},${leftY} ${rightX},${rightY}`);svg.appendChild(arrow)});
    hand.appendChild(svg);
  }
  window.BattleNetworkAttack10=Object.freeze({isModifierCard,isEligibleChip,canAddModifier,consumeAttached,applyPower,getDisplayEntries,decorateCustom});
  window.BattleNetworkFolder={getFolder,getFolderEntries,getEquippedFolderId,equipFolder,getTestTarget,toLegacyCards,installCurrentBattleBridge};
  installCurrentBattleBridge();
})();