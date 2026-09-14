(()=>{
  // Temporary morality controls for Evil-state verification.
  const EVIL=window.BattleNetworkEvil;
  const HUD=document.getElementById('playerStatusHud');
  if(!EVIL||!HUD||document.getElementById('evilTestControls'))return;

  const panel=document.createElement('div');
  panel.id='evilTestControls';
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','悪状態テスト');
  panel.style.cssText='display:flex;flex-direction:column;gap:3px;pointer-events:auto;max-width:170px;padding:4px;border:1px solid rgba(255,255,255,.35);border-radius:4px;background:rgba(4,10,18,.72)';

  const caption=document.createElement('span');
  caption.textContent='悪テスト';
  caption.style.cssText='font-size:10px;color:#fff;font-weight:900;text-shadow:0 1px 2px #000';
  panel.appendChild(caption);

  const status=document.createElement('output');
  status.setAttribute('aria-live','polite');
  status.style.cssText='font-size:10px;color:#fff;line-height:1.2;text-shadow:0 1px 2px #000';
  panel.appendChild(status);

  const note=document.createElement('span');
  note.textContent='善悪度は次ウェーブ判定';
  note.style.cssText='font-size:9px;color:#d7e8f2;line-height:1.1;text-shadow:0 1px 2px #000';
  panel.appendChild(note);

  const controls=document.createElement('div');
  controls.style.cssText='display:flex;gap:4px';
  panel.appendChild(controls);

  function makeButton(value){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=String(value);
    button.setAttribute('aria-label',`善悪度を${value}に設定`);
    button.style.cssText='min-width:48px;min-height:28px;padding:2px 6px;border:1px solid #9cb9c9;border-radius:4px;background:#10232e;color:#fff;font-size:12px;font-weight:900;touch-action:manipulation';
    button.addEventListener('click',event=>{
      event.stopPropagation();
      EVIL.setMorality(value);
      sync();
    });
    controls.appendChild(button);
  }

  makeButton(500);
  makeButton(469);

  function sync(snapshot=EVIL.getSnapshot?.()){
    const current=snapshot||EVIL.getSnapshot?.()||{};
    status.value=`善悪度 ${current.morality} / 悪 ${current.active?'ON':'OFF'}`;
    status.textContent=status.value;
  }

  for(const type of ['pointerdown','pointerup','touchstart','touchend','keydown','keyup','wheel']){
    panel.addEventListener(type,event=>event.stopPropagation());
  }

  HUD.appendChild(panel);
  const unsubscribe=typeof EVIL.subscribe==='function'?EVIL.subscribe(sync):null;
  if(!unsubscribe)sync();

  window.BattleNetworkEvilTestUi=Object.freeze({
    setMorality(value){return EVIL.setMorality(value)},
    getSnapshot:()=>EVIL.getSnapshot?.(),
    destroy(){if(typeof unsubscribe==='function')unsubscribe();panel.remove();delete window.BattleNetworkEvilTestUi}
  });
})();
