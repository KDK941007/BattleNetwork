(()=>{
  // Temporary visual test controls. Remove this file and its script tag after testing.
  const api=window.BattleNetworkPlayerHud;
  const hud=document.getElementById('playerStatusHud');
  const kokoro=document.getElementById('kokoroWindow');
  if(!api||!hud||!kokoro||document.getElementById('kokoroTestControls'))return;
  const panel=document.createElement('div');
  panel.id='kokoroTestControls';
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','ココロ表示テスト');
  panel.style.cssText='display:flex;flex-direction:column;gap:3px;pointer-events:auto;max-width:120px';
  const caption=document.createElement('span');
  caption.textContent='ココロ表示テスト';
  caption.style.cssText='font-size:10px;color:#fff;text-shadow:0 1px 2px #000';
  panel.appendChild(caption);
  const buttons=[];
  function sync(){
    const state=api.getKokoroState();
    for(const [button,id] of buttons){
      const active=state===id;
      button.setAttribute('aria-pressed',String(active));
      button.style.background=active?'#176078':'#10232e';
    }
  }
  for(const [id,label] of [['NORMAL','平常'],['FULL_SYNCHRO','フルシンクロ'],['ANXIOUS','不安'],['ANGRY','怒り'],['EVIL','悪']]){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=label;
    button.style.cssText='min-height:28px;padding:3px 7px;border:1px solid #64ddff;border-radius:4px;color:#fff;font-size:11px;touch-action:manipulation';
    button.addEventListener('click',event=>{
      event.stopPropagation();
      api.setKokoroState(id);
      sync();
    });
    buttons.push([button,id]);
    panel.appendChild(button);
  }
  for(const type of ['pointerdown','pointerup','touchstart','touchend','keydown','keyup']){
    panel.addEventListener(type,event=>event.stopPropagation());
  }
  hud.appendChild(panel);
  const observer=new MutationObserver(sync);
  observer.observe(kokoro,{attributes:true,attributeFilter:['data-state']});
  sync();
  window.BattleNetworkKokoroTestUi=Object.freeze({
    destroy(){observer.disconnect();panel.remove();delete window.BattleNetworkKokoroTestUi}
  });
})();