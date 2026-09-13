(()=>{
  // Temporary Full Synchro ring tuning controls. Remove this file and its script tag after values are fixed.
  const battle=document.getElementById('battle');
  const root=document.documentElement;
  if(!battle||document.getElementById('fullSynchroRingTestControls'))return;

  const defaults=Object.freeze({wobble:8,thicknessX:4,thicknessY:4,speed:1});
  const state={...defaults};

  const panel=document.createElement('div');
  panel.id='fullSynchroRingTestControls';
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','フルシンクロリング調整');
  panel.style.cssText='position:absolute;right:8px;top:32px;z-index:75;width:220px;padding:7px;border:1px solid rgba(120,222,255,.62);border-radius:8px;background:rgba(5,24,34,.92);color:#effcff;font-size:11px;font-weight:800;pointer-events:auto;touch-action:auto';

  const title=document.createElement('div');
  title.textContent='FS RING TEST';
  title.style.cssText='margin-bottom:5px;text-align:center;font-size:11px;font-weight:1000;letter-spacing:.4px';
  panel.appendChild(title);

  function apply(){
    root.style.setProperty('--full-synchro-ring-wobble',`${state.wobble}deg`);
    root.style.setProperty('--full-synchro-ring-wobble-neg',`${-state.wobble}deg`);
    root.style.setProperty('--full-synchro-ring-thickness-x',`${state.thicknessX}px`);
    root.style.setProperty('--full-synchro-ring-thickness-y',`${state.thicknessY}px`);
    root.style.setProperty('--full-synchro-ring-duration',`${1/state.speed}s`);
  }

  function makeRow({key,label,min,max,step,unit}){
    const row=document.createElement('label');
    row.style.cssText='display:grid;grid-template-columns:64px 1fr 38px;align-items:center;gap:5px;margin:4px 0';

    const name=document.createElement('span');
    name.textContent=label;
    row.appendChild(name);

    const slider=document.createElement('input');
    slider.type='range';
    slider.min=String(min);
    slider.max=String(max);
    slider.step=String(step);
    slider.value=String(state[key]);
    slider.setAttribute('aria-label',label);
    slider.style.cssText='width:100%;min-width:0;touch-action:auto';
    row.appendChild(slider);

    const value=document.createElement('input');
    value.type='number';
    value.min=String(min);
    value.max=String(max);
    value.step=String(step);
    value.value=String(state[key]);
    value.setAttribute('aria-label',`${label} 数値`);
    value.style.cssText='width:38px;height:26px;padding:1px 2px;border:1px solid #39758d;border-radius:4px;background:#0b2a38;color:#fff;text-align:center;font-size:12px;font-weight:900;touch-action:auto';
    row.appendChild(value);

    const sync=(raw,source)=>{
      let next=Number(raw);
      if(!Number.isFinite(next))return;
      next=Math.min(max,Math.max(min,next));
      state[key]=next;
      slider.value=String(next);
      value.value=String(next);
      value.title=`${next}${unit}`;
      apply();
      source?.blur?.();
    };

    slider.addEventListener('input',event=>{event.stopPropagation();sync(slider.value)});
    value.addEventListener('change',event=>{event.stopPropagation();sync(value.value,value)});
    value.addEventListener('input',event=>event.stopPropagation());

    panel.appendChild(row);
    return {slider,value,sync};
  }

  const rows={
    wobble:makeRow({key:'wobble',label:'上下幅',min:0,max:30,step:1,unit:'°'}),
    thicknessX:makeRow({key:'thicknessX',label:'厚み 横',min:1,max:16,step:.5,unit:'px'}),
    thicknessY:makeRow({key:'thicknessY',label:'厚み 縦',min:1,max:16,step:.5,unit:'px'}),
    speed:makeRow({key:'speed',label:'速さ',min:.2,max:4,step:.1,unit:'x'})
  };

  const note=document.createElement('div');
  note.textContent='横=左右端 / 縦=上下端　速さ1.0x=現在値';
  note.style.cssText='margin-top:4px;color:#b9dce8;font-size:9px;text-align:center';
  panel.appendChild(note);

  const reset=document.createElement('button');
  reset.type='button';
  reset.textContent='初期値に戻す';
  reset.style.cssText='display:block;width:100%;min-height:28px;margin-top:5px;border:1px solid #64ddff;border-radius:5px;background:#10232e;color:#fff;font-size:10px;font-weight:900;touch-action:manipulation';
  reset.addEventListener('click',event=>{
    event.stopPropagation();
    Object.assign(state,defaults);
    rows.wobble.sync(state.wobble);
    rows.thicknessX.sync(state.thicknessX);
    rows.thicknessY.sync(state.thicknessY);
    rows.speed.sync(state.speed);
  });
  panel.appendChild(reset);

  for(const type of ['pointerdown','pointerup','touchstart','touchend','click','keydown','keyup','wheel']){
    panel.addEventListener(type,event=>event.stopPropagation());
  }

  battle.appendChild(panel);
  apply();

  window.BattleNetworkFullSynchroRingTestUi=Object.freeze({
    getValues:()=>Object.freeze({...state}),
    setValues(values={}){
      if(Number.isFinite(Number(values.wobble)))rows.wobble.sync(Number(values.wobble));
      if(Number.isFinite(Number(values.thicknessX)))rows.thicknessX.sync(Number(values.thicknessX));
      if(Number.isFinite(Number(values.thicknessY)))rows.thicknessY.sync(Number(values.thicknessY));
      if(Number.isFinite(Number(values.speed)))rows.speed.sync(Number(values.speed));
      return Object.freeze({...state});
    },
    reset(){reset.click();return Object.freeze({...state})},
    destroy(){
      root.style.removeProperty('--full-synchro-ring-wobble');
      root.style.removeProperty('--full-synchro-ring-wobble-neg');
      root.style.removeProperty('--full-synchro-ring-thickness-x');
      root.style.removeProperty('--full-synchro-ring-thickness-y');
      root.style.removeProperty('--full-synchro-ring-duration');
      panel.remove();
      delete window.BattleNetworkFullSynchroRingTestUi;
    }
  });
})();
