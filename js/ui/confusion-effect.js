(()=>{
  // Attach once to a positioned character; movement follows its parent transform.
  const effects=new WeakMap();
  function attach(character){
    if(!character)return null;
    if(effects.has(character))return effects.get(character);
    const root=document.createElement('span');
    root.className='confusionEffect';
    root.setAttribute('aria-hidden','true');
    for(let i=0;i<3;i++){
      const star=document.createElement('span');
      star.className='confusionStar';
      root.appendChild(star);
    }
    character.appendChild(root);
    let active=false;
    const effect=Object.freeze({
      setActive(value){
        const next=value===true;
        if(next===active)return;
        active=next;
        root.classList.toggle('isActive',active);
      }
    });
    effects.set(character,effect);
    return effect;
  }
  window.BattleNetworkConfusionEffect=Object.freeze({attach});
  const playerEffect=attach(document.getElementById('player'));
  window.BattleNetworkDarkVulcan?.subscribe(state=>{
    playerEffect?.setActive(state.active);
  });
})();
