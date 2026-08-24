(()=>{
  const master=window.BattleNetworkMaster;
  const data=window.BattleNetworkData||{};

  const modal=document.getElementById('chipDetailModal');
  const detailName=document.getElementById('detailName');
  const libraryNo=document.getElementById('detailLibraryNo');
  const classValue=document.getElementById('detailClass');
  const capacity=document.getElementById('detailCapacity');
  const rarity=document.getElementById('detailRarity');
  const values=document.getElementById('detailValues');
  const attributes=document.getElementById('detailAttributes');

  if(!master||!modal||!detailName||!values||!attributes)return;

  const chipsByName=new Map((data.CHIP_MASTER||[]).map(chip=>[chip.chipName,chip]));

  function createEmptyToken(text='--'){
    const token=document.createElement('span');
    token.className='detailInfoToken detailInfoTokenEmpty';
    token.textContent=text;
    return token;
  }

  function renderBasicInfo(chip){
    const chipClass=master.getChipClass(chip.chipId);
    libraryNo.textContent=Number.isFinite(chip.libraryNo)?String(chip.libraryNo).padStart(3,'0'):'--';
    classValue.textContent=chipClass?.classInitial||'--';
    capacity.textContent=Number.isFinite(chip.capacityMb)?String(chip.capacityMb):'--';
    rarity.textContent=Number.isFinite(chip.rarity)&&chip.rarity>0?'★'.repeat(chip.rarity):'--';
  }

  function renderValues(chip){
    values.replaceChildren();
    const rows=master.getChipValues(chip.chipId).filter(row=>row.displayFlg!==false);
    if(!rows.length){
      values.appendChild(createEmptyToken());
      return;
    }

    rows.forEach(row=>{
      const token=document.createElement('span');
      token.className='detailInfoToken detailValueToken';

      const label=document.createElement('span');
      label.className='detailTokenLabel';
      label.textContent=row.labelOverride||row.valueType?.displayLabel||row.valueTypeId;

      const value=document.createElement('span');
      value.className='detailTokenValue';
      if(row.valueMode==='VARIABLE'){
        value.textContent='可変';
      }else{
        const unit=row.valueType?.unit||'';
        value.textContent=`${row.value??'--'}${unit}`;
      }

      token.append(label,value);
      values.appendChild(token);
    });
  }

  function renderAttributes(chip){
    attributes.replaceChildren();
    const rows=master.getChipAttributes(chip.chipId);
    if(!rows.length){
      attributes.appendChild(createEmptyToken());
      return;
    }

    rows.forEach(row=>{
      const attr=row.attribute;
      const token=document.createElement('span');
      token.className='detailInfoToken detailAttributeToken';

      if(attr.iconPath){
        const img=document.createElement('img');
        img.className='detailAttributeIcon';
        img.src=attr.iconPath;
        img.alt='';
        img.draggable=false;
        token.appendChild(img);
      }

      const name=document.createElement('span');
      name.className='detailTokenValue';
      name.textContent=attr.attributeName;
      token.appendChild(name);
      attributes.appendChild(token);
    });
  }

  function render(){
    if(!modal.classList.contains('open'))return;
    const chip=chipsByName.get(detailName.textContent.trim());
    if(!chip)return;
    renderBasicInfo(chip);
    renderValues(chip);
    renderAttributes(chip);
    values.scrollLeft=0;
    attributes.scrollLeft=0;
  }

  const modalObserver=new MutationObserver(()=>{
    if(modal.classList.contains('open'))queueMicrotask(render);
  });
  modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});

  const nameObserver=new MutationObserver(()=>{
    if(modal.classList.contains('open'))queueMicrotask(render);
  });
  nameObserver.observe(detailName,{childList:true,subtree:true,characterData:true});
})();
