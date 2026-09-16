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
  kokoroHorizontal.classList.remove('chipHudCompareLeft','chipHudSide');
  kokoroHorizontal.classList.add('chipHudCompareKokoroRight');
  kokoroHorizontal.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  kokoroHorizontal.setAttribute('aria-hidden','true');
  shell.appendChild(kokoroHorizontal);

  const bottomClassic=source.cloneNode(true);
  bottomClassic.classList.remove('chipHudCompareLeft','chipHudSide');
  bottomClassic.classList.add('chipHudCompareBottomClassic');
  bottomClassic.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  bottomClassic.setAttribute('aria-hidden','true');
  shell.appendChild(bottomClassic);

  const style=document.createElement('style');
  style.textContent=`
    .shell>.chipHud.chipHudSide,
    .shell>.chipHud.chipHudCompareKokoroRight,
    .shell>.chipHud.chipHudCompareBottomClassic{
      position:absolute;
      min-height:0;
      z-index:44;
      pointer-events:none;
    }
    .shell>.chipHud.chipHudSide{
      top:50px;
      bottom:auto;
      width:min(132px,24vw);
      padding:0;
      display:flex;
      flex-direction:column;
      align-items:stretch;
      gap:5px;
    }
    .shell>.chipHud.chipHudCompareLeft{left:6px;right:auto}
    .shell>.chipHud.chipHudCompareRight{left:auto;right:6px}
    .shell>.chipHud.chipHudCompareKokoroRight{
      top:0;
      bottom:auto;
      left:0;
      right:auto;
      width:auto;
      max-width:calc(100% - 12px);
      padding:0;
      display:flex;
      align-items:center;
      gap:4px;
      overflow:hidden;
    }
    .shell>.chipHud.chipHudCompareBottomClassic{
      left:50%;
      right:auto;
      top:auto;
      bottom:12px;
      width:min(520px,48vw);
      padding:0;
      display:block;
      transform:translateX(-50%);
      overflow:hidden;
    }
    .chipHudSide .chipNow,
    .chipHudCompareKokoroRight .chipNow,
    .chipHudCompareBottomClassic .chipNow{
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
    .chipHudCompareBottomClassic .queue{
      width:100%;
      display:flex;
      flex-direction:row;
      align-items:center;
      justify-content:flex-start;
      gap:6px;
      min-width:0;
      overflow:hidden;
    }
    .chipHudSide .q,
    .chipHudCompareKokoroRight .q,
    .chipHudCompareBottomClassic .q{
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
    .chipHudCompareBottomClassic .q{
      flex:0 0 140px;
      width:140px;
      min-height:30px;
      padding:7px 11px;
      border-width:2px;
      border-color:rgba(88,180,210,.82);
      background:rgba(5,30,42,.96);
      color:#f4fdff;
      font-size:12px;
      font-weight:800;
      line-height:1.2;
      opacity:.82;
      text-shadow:0 1px 2px #000,0 0 3px rgba(0,0,0,.9);
      box-shadow:0 3px 7px rgba(0,0,0,.38);
    }
    .chipHudCompareBottomClassic .q:first-child:not(.empty){
      flex-basis:170px;
      width:170px;
      min-height:34px;
      padding:8px 13px;
      border-color:#d9f9ff;
      background:rgba(8,47,63,.98);
      color:#fff;
      font-size:13px;
      font-weight:1000;
      opacity:1;
      box-shadow:0 0 11px rgba(91,220,255,.62),0 3px 8px rgba(0,0,0,.46),inset 0 0 0 1px rgba(220,250,255,.2);
    }
    .chipHudCompareBottomClassic .q.empty{
      flex-basis:170px;
      width:170px;
      text-align:center;
      opacity:.62;
    }
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
  const bottomClassicQueue=bottomClassic.querySelector('.queue');
  if(!sourceTitle||!sourceQueue||!mirrorQueue||!horizontalQueue||!bottomClassicQueue)return;

  function sync(){
    if(sourceTitle.textContent!=='')sourceTitle.textContent='';
    mirrorQueue.innerHTML=sourceQueue.innerHTML;
    horizontalQueue.innerHTML=sourceQueue.innerHTML;
    bottomClassicQueue.innerHTML=sourceQueue.innerHTML;
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
