(()=>{
  const shell=document.querySelector('.shell');
  const source=shell?.querySelector(':scope > .chipHud');
  if(!shell||!source)return;

  source.classList.add('chipHudSide','chipHudCompareLeft');

  const mirror=source.cloneNode(true);
  mirror.classList.remove('chipHudCompareLeft');
  mirror.classList.add('chipHudSide','chipHudCompareRight');
  mirror.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  mirror.setAttribute('aria-hidden','true');
  shell.appendChild(mirror);

  const kokoroHorizontal=source.cloneNode(true);
  kokoroHorizontal.classList.remove('chipHudCompareLeft');
  kokoroHorizontal.classList.add('chipHudCompareKokoroRight');
  kokoroHorizontal.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  kokoroHorizontal.setAttribute('aria-hidden','true');
  shell.appendChild(kokoroHorizontal);

  const style=document.createElement('style');
  style.textContent=`
    .shell>.chipHud.chipHudSide,
    .shell>.chipHud.chipHudCompareKokoroRight{
      position:absolute;
      bottom:auto;
      min-height:0;
      padding:0;
      z-index:44;
      pointer-events:none;
    }
    .shell>.chipHud.chipHudSide{
      top:50px;
      width:min(132px,24vw);
      display:flex;
      flex-direction:column;
      align-items:stretch;
      gap:5px;
    }
    .shell>.chipHud.chipHudCompareLeft{left:6px;right:auto}
    .shell>.chipHud.chipHudCompareRight{left:auto;right:6px}
    .shell>.chipHud.chipHudCompareKokoroRight{
      top:0;
      left:0;
      right:auto;
      width:auto;
      max-width:calc(100% - 12px);
      display:flex;
      align-items:center;
      gap:4px;
      overflow:hidden;
    }
    .chipHudSide .chipNow,
    .chipHudCompareKokoroRight .chipNow{
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
    .chipHudCompareKokoroRight .queue{
      display:flex;
      flex-direction:row;
      align-items:center;
      gap:4px;
      min-width:0;
      overflow:hidden;
    }
    .chipHudSide .q,
    .chipHudCompareKokoroRight .q{
      display:block;
      min-height:24px;
      padding:5px 7px;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      text-align:left;
      font-size:10px;
      line-height:1.2;
    }
    .chipHudSide .q{width:100%}
    .chipHudCompareKokoroRight .q{width:auto;max-width:120px;flex:0 1 auto}
    .chipHudSide .q:first-child:not(.empty),
    .chipHudCompareKokoroRight .q:first-child:not(.empty){
      border-color:#9cecff;
      box-shadow:0 0 8px rgba(91,220,255,.42),inset 0 0 0 1px rgba(194,248,255,.16);
    }
  `;
  document.head.appendChild(style);

  const sourceTitle=source.querySelector('.chipNow');
  const sourceQueue=source.querySelector('.queue');
  const mirrorQueue=mirror.querySelector('.queue');
  const horizontalQueue=kokoroHorizontal.querySelector('.queue');
  if(!sourceTitle||!sourceQueue||!mirrorQueue||!horizontalQueue)return;

  function sync(){
    if(sourceTitle.textContent!=='')sourceTitle.textContent='';
    mirrorQueue.innerHTML=sourceQueue.innerHTML;
    horizontalQueue.innerHTML=sourceQueue.innerHTML;
  }

  function layout(){
    const shellRect=shell.getBoundingClientRect();
    const readout=document.querySelector('.kokoroValueReadout');
    const kokoroRow=document.querySelector('.kokoroRow');
    const hp=document.getElementById('playerHpWindow');
    const gauge=document.getElementById('customGauge');

    if(readout){
      const rect=readout.getBoundingClientRect();
      source.style.top=`${Math.max(4,rect.bottom-shellRect.top+4)}px`;
    }

    if(kokoroRow){
      const rect=kokoroRow.getBoundingClientRect();
      const left=Math.max(4,rect.right-shellRect.left+6);
      const top=Math.max(4,rect.top-shellRect.top);
      kokoroHorizontal.style.left=`${left}px`;
      kokoroHorizontal.style.top=`${top}px`;
      kokoroHorizontal.style.maxWidth=`${Math.max(0,shell.clientWidth-left-8)}px`;
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
