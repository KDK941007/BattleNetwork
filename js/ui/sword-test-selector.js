(()=>{
  const folder=window.BattleNetworkFolder;
  const battle=document.getElementById('battle');
  if(!folder||!battle)return;

  const STORAGE_KEY='battleNetworkSwordReviewTarget';
  const OPTIONS=Object.freeze({
    SWORD:Object.freeze({type:'SWORD',chipId:'CHIP_0002',code:'S',label:'SWORD'}),
    WIDE:Object.freeze({type:'WIDE',chipId:'CHIP_0003',code:'S',label:'WIDE SWORD'}),
    LONG:Object.freeze({type:'LONG',chipId:'CHIP_EXE4_S056',code:'S',label:'LONG SWORD'})
  });

  function readSelectedKey(){
    try{
      const value=localStorage.getItem(STORAGE_KEY);
      if(value&&OPTIONS[value])return value;
    }catch{}
    return 'LONG';
  }

  let selectedKey=readSelectedKey();
  const originalToLegacyCards=folder.toLegacyCards.bind(folder);

  function getTestTarget(){
    const selected=OPTIONS[selectedKey]||OPTIONS.LONG;
    return Object.freeze({
      enabled:true,
      type:selected.type,
      chipId:selected.chipId,
      codes:Object.freeze([selected.code]),
      requiredCards:Object.freeze([])
    });
  }

  function toLegacyCards(folderId){
    const target=getTestTarget();
    if(!target.enabled)return originalToLegacyCards(folderId);
    return Array.from({length:30},(_,index)=>({
      id:index,
      type:target.type,
      code:target.codes[0],
      chipId:target.chipId,
      folderId:folderId??folder.getEquippedFolderId?.()??null,
      slotNo:index+1
    }));
  }

  folder.getTestTarget=getTestTarget;
  folder.toLegacyCards=toLegacyCards;

  // folder-service installs its own one-shot bridge before this review selector loads.
  // Intercept the same legacy startup folder first so game.js receives the selected
  // Sword/WideSword/LongSword test cards instead of the folder-service default LONG cards.
  const previousMap=Array.prototype.map;
  Array.prototype.map=function(callback,thisArg){
    const isLegacyBattleFolder=this.length===30&&Array.isArray(this[0])&&this[0][0]==='CANNON'&&this[0][1]==='A';
    if(!isLegacyBattleFolder)return previousMap.call(this,callback,thisArg);
    Array.prototype.map=previousMap;
    return toLegacyCards();
  };

  const style=document.createElement('style');
  style.id='swordTestSelectorStyle';
  style.textContent=`
    #swordTestSelector{position:absolute;top:52px;right:8px;z-index:80;display:flex;align-items:center;gap:5px;padding:5px 6px;border:1px solid rgba(174,235,255,.8);border-radius:8px;background:rgba(4,18,32,.86);box-shadow:0 0 12px rgba(86,205,255,.28);pointer-events:auto}
    #swordTestSelector button{height:30px;padding:0 9px;border:1px solid rgba(174,235,255,.55);border-radius:6px;background:rgba(20,71,101,.82);color:#dff8ff;font:800 10px/1 system-ui,sans-serif;white-space:nowrap;touch-action:manipulation}
    #swordTestSelector button.active{border-color:#fff3a0;background:#6d5710;color:#fff8bf;box-shadow:0 0 8px rgba(255,226,96,.55)}
    #swordTestSelector button:active{transform:scale(.95)}
  `;
  document.head.appendChild(style);

  const panel=document.createElement('div');
  panel.id='swordTestSelector';
  panel.setAttribute('aria-label','ソード系テスト対象選択');

  Object.entries(OPTIONS).forEach(([key,option])=>{
    const button=document.createElement('button');
    button.type='button';
    button.textContent=option.label;
    button.dataset.swordTestTarget=key;
    button.classList.toggle('active',key===selectedKey);
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      if(key===selectedKey)return;
      try{localStorage.setItem(STORAGE_KEY,key)}catch{}
      selectedKey=key;
      location.reload();
    });
    panel.appendChild(button);
  });

  panel.addEventListener('pointerdown',event=>event.stopPropagation());
  battle.appendChild(panel);

  window.BattleNetworkSwordTestSelector=Object.freeze({
    version:'SWORD_TEST_SELECTOR_V2',
    getSelected:()=>selectedKey,
    getTestTarget
  });
})();
