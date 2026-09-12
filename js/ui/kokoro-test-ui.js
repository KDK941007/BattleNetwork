(()=>{
  // Temporary kokoro value test controls. Remove this file and its script tag after testing.
  const api=window.BattleNetworkPlayerHud;
  const hud=document.getElementById('playerStatusHud');
  if(!api||!hud||typeof api.getKokoroValue!=='function'||typeof api.setKokoroValue!=='function'||document.getElementById('kokoroTestControls'))return;

  const panel=document.createElement('div');
  panel.id='kokoroTestControls';
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','ココロ値テスト');
  panel.style.cssText='display:flex;flex-direction:column;gap:3px;pointer-events:auto;max-width:120px';

  const caption=document.createElement('span');
  caption.textContent='ココロ値';
  caption.style.cssText='font-size:10px;color:#fff;text-shadow:0 1px 2px #000';
  panel.appendChild(caption);

  const value=document.createElement('output');
  value.setAttribute('aria-live','polite');
  value.style.cssText='min-width:56px;text-align:center;color:#fff;font-size:18px;font-weight:900;line-height:1.1;text-shadow:0 1px 2px #000';
  panel.appendChild(value);

  const controls=document.createElement('div');
  controls.style.cssText='display:flex;gap:4px';
  panel.appendChild(controls);

  function makeButton(label,delta,ariaLabel){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=label;
    button.setAttribute('aria-label',ariaLabel);
    button.style.cssText='min-width:40px;min-height:30px;padding:3px 8px;border:1px solid #64ddff;border-radius:4px;background:#10232e;color:#fff;font-size:14px;font-weight:900;touch-action:manipulation';
    button.addEventListener('click',event=>{
      event.stopPropagation();
      api.setKokoroValue(api.getKokoroValue()+delta);
      sync();
    });
    controls.appendChild(button);
  }

  makeButton('−',-1,'ココロ値を1下げる');
  makeButton('+',1,'ココロ値を1上げる');

  function sync(){
    const current=api.getKokoroValue();
    value.value=String(current);
    value.textContent=String(current);
  }

  for(const type of ['pointerdown','pointerup','touchstart','touchend','keydown','keyup']){
    panel.addEventListener(type,event=>event.stopPropagation());
  }

  hud.appendChild(panel);
  sync();

  window.BattleNetworkKokoroTestUi=Object.freeze({
    getValue:()=>api.getKokoroValue(),
    setValue(next){const result=api.setKokoroValue(next);sync();return result},
    destroy(){panel.remove();delete window.BattleNetworkKokoroTestUi}
  });
})();
