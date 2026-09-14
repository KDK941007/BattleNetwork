(()=>{
  const player=document.getElementById('player');
  const hud=document.getElementById('playerStatusHud');
  if(!player||!hud||document.getElementById('confusionTestControls'))return;
  const panel=document.createElement('div');
  panel.id='confusionTestControls';
  panel.className='confusionTestControls';
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','混乱エフェクト調整');
  const caption=document.createElement('strong');
  caption.textContent='混乱エフェクト調整';
  panel.appendChild(caption);

  function slider(text,min,max,step,initial,property,format,cssValue){
    const label=document.createElement('label');
    label.appendChild(document.createTextNode(text));
    const output=document.createElement('output');
    const input=document.createElement('input');
    input.type='range';
    input.min=min;input.max=max;input.step=step;input.value=initial;
    input.setAttribute('aria-label',text);
    function sync(){
      const value=Number(input.value);
      output.value=format(value);
      player.style.setProperty(property,cssValue(value));
    }
    input.addEventListener('input',sync);
    label.appendChild(output);
    label.appendChild(input);
    panel.appendChild(label);
    sync();
    return ()=>{input.value=initial;sync()};
  }
  const resetStar=slider('星サイズ',4,30,1,10,'--confusion-star-size',v=>v+'px',v=>v+'px');
  const resetOrbit=slider('周回サイズ',50,300,10,100,'--confusion-orbit-scale',v=>v+'%',v=>String(v/100));
  const previewLabel=document.createElement('label');
  const preview=document.createElement('input');
  preview.type='checkbox';
  preview.addEventListener('change',()=>player.classList.toggle('confusionPreview',preview.checked));
  previewLabel.appendChild(preview);
  previewLabel.appendChild(document.createTextNode('表示テスト（見た目のみ）'));
  panel.appendChild(previewLabel);
  const reset=document.createElement('button');
  reset.type='button';
  reset.textContent='初期値に戻す';
  reset.addEventListener('click',()=>{
    resetStar();resetOrbit();
    preview.checked=false;
    player.classList.remove('confusionPreview');
  });
  panel.appendChild(reset);
  for(const type of ['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','keydown','keyup','wheel']){
    panel.addEventListener(type,event=>event.stopPropagation());
  }
  hud.appendChild(panel);
})();
