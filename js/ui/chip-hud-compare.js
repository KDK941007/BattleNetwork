(()=>{
  const shell=document.querySelector('.shell');
  const source=shell?.querySelector(':scope > .chipHud');
  if(!shell||!source)return;

  source.classList.add('chipHudSide','chipHudCompareLeft');

  const style=document.createElement('style');
  style.textContent=`
    .shell>.chipHud.chipHudSide{
      position:absolute;
      left:6px;
      right:auto;
      top:50px;
      bottom:auto;
      width:min(132px,24vw);
      min-height:0;
      padding:0;
      z-index:44;
      display:flex;
      flex-direction:column;
      align-items:stretch;
      gap:5px;
      pointer-events:none;
    }
    .chipHudSide .chipNow{
      display:none!important;
    }
    .chipHudSide .queue{
      display:flex;
      flex-direction:column;
      align-items:stretch;
      gap:4px;
      min-width:0;
      overflow:visible;
    }
    .chipHudSide .q{
      display:block;
      width:100%;
      min-height:0;
      padding:1px 0;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      box-shadow:none!important;
      color:#f4fdff;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      text-align:left;
      font-size:11px;
      font-weight:600;
      line-height:1.2;
      opacity:1;
      text-shadow:0 1px 2px #000,0 0 3px rgba(0,0,0,.9);
    }
    .chipHudSide .q:first-child:not(.empty){
      color:#ffe66d;
      font-weight:1000;
    }
  `;
  document.head.appendChild(style);

  const sourceTitle=source.querySelector('.chipNow');
  if(!sourceTitle)return;

  function sync(){
    if(sourceTitle.textContent!=='')sourceTitle.textContent='';
  }

  function layout(){
    const shellRect=shell.getBoundingClientRect();
    const readout=document.querySelector('.kokoroValueReadout');
    const hp=document.getElementById('playerHpWindow');
    const gauge=document.getElementById('customGauge');

    if(readout){
      const rect=readout.getBoundingClientRect();
      const readoutStyle=getComputedStyle(readout);
      const lineHeight=parseFloat(readoutStyle.lineHeight);
      const fontSize=parseFloat(readoutStyle.fontSize);
      const oneLineGap=Number.isFinite(lineHeight)?lineHeight:(Number.isFinite(fontSize)?fontSize*1.2:14);
      source.style.top=`${Math.max(4,rect.bottom-shellRect.top+oneLineGap)}px`;
    }

    if(hp&&gauge){
      const hpRect=hp.getBoundingClientRect();
      const gaugeHeight=gauge.offsetHeight||18;
      const left=Math.max(4,hpRect.right-shellRect.left+8);
      const top=Math.max(4,hpRect.top-shellRect.top+(hpRect.height-gaugeHeight)/2);
      gauge.style.left=`${left}px`;
      gauge.style.top=`${top}px`;
      gauge.style.transform='none';
      gauge.style.maxWidth=`calc(100% - ${left+8}px)`;
    }
  }

  sync();
  requestAnimationFrame(layout);
  new MutationObserver(sync).observe(source,{subtree:true,childList:true,characterData:true});
  window.addEventListener('resize',layout);
  if(window.ResizeObserver){
    const ro=new ResizeObserver(layout);
    [shell,document.getElementById('playerStatusHud'),document.getElementById('playerHpWindow')].filter(Boolean).forEach(el=>ro.observe(el));
  }
})();
