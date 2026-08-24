(()=>{
  const master=window.BattleNetworkMaster;
  const data=window.BattleNetworkData||{};
  const hand=document.getElementById('hand');
  const detailModal=document.getElementById('chipDetailModal');
  const detailName=document.getElementById('detailName');
  const detailPanel=detailModal?.querySelector('.chipDetail');

  if(!master||!hand||!detailModal||!detailName||!detailPanel)return;

  const THEME_CLASSES=['chipTheme-standard','chipTheme-mega','chipTheme-giga','chipTheme-dark'];
  const chipsByName=new Map((data.CHIP_MASTER||[]).map(chip=>[chip.chipName,chip]));

  function resolveThemeByName(name){
    const chip=chipsByName.get((name||'').trim());
    return chip?master.getChipTheme(chip.chipId):'standard';
  }

  function setThemeClass(element,theme){
    element.classList.remove(...THEME_CLASSES);
    element.classList.add(`chipTheme-${theme||'standard'}`);
  }

  function applyCardTheme(card){
    if(card.classList.contains('empty'))return;
    const name=card.querySelector('.chipName')?.textContent||'';
    setThemeClass(card,resolveThemeByName(name));
  }

  function applyCustomThemes(){
    hand.querySelectorAll('.chipCard').forEach(applyCardTheme);
  }

  function applyDetailTheme(){
    const name=detailName.textContent||'';
    setThemeClass(detailPanel,resolveThemeByName(name));
  }

  new MutationObserver(applyCustomThemes).observe(hand,{childList:true,subtree:true,characterData:true});
  new MutationObserver(()=>{
    if(detailModal.classList.contains('open'))queueMicrotask(applyDetailTheme);
  }).observe(detailModal,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>{
    if(detailModal.classList.contains('open'))queueMicrotask(applyDetailTheme);
  }).observe(detailName,{childList:true,subtree:true,characterData:true});

  applyCustomThemes();
  applyDetailTheme();
})();
