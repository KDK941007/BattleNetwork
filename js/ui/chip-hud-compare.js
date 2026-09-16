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
      gap:10px;
      min-width:0;
      overflow:hidden;
    }
    .chipHudCompareBottomClassic .queue{
      width:100%;
      display:flex;
      flex-direction:row;
      align-items:center;
      justify-content:flex-start;
      gap:10px;
      min-width:0;
      overflow:hidden;
    }
    .chipHudSide .q,
    .chipHudCompareKokoroRight .q,
    .chipHudCompareBottomClassic .q{
      display:block;
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
    .chipHudSide .q{width:100%}
    .chipHudCompareKokoroRight .q{width:auto;max-width:140px;flex:0 1 auto}
    .chipHudCompareBottomClassic .q{
      flex:0 0 140px;
      width:140px;
      font-size:12px;
    }
    .chipHudSide .q:first-child:not(.empty),
    .chipHudCompareKokoroRight .q:first-child:not(.empty),
    .chipHudCompareBottomClassic .q:first-child:not(.empty){
      color:#ffe66d;
      font-weight:1000;
    }
    .chipHudCompareBottomClassic .q.empty{
      flex-basis:140px;
      width:140px;
      text-align:left;
      opacity:.62;
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
    const gauge=document.getElementById('customGauge');

    if(readout){
      const rect=readout.getBoundingClientRect();
      source.style.top=`${Math.max(4,rect.bottom-shellRect.top+4)}px`;
    }

    if(gauge){
      gauge.style.left='50%';
      gauge.style.top='4px';
      gauge.style.transform='translateX(-50%)';
      gauge.style.maxWidth='';

      const gaugeRect=gauge.getBoundingClientRect();
      kokoroHorizontal.style.left='50%';
      kokoroHorizontal.style.right='auto';
      kokoroHorizontal.style.top=`${Math.max(4,gaugeRect.bottom-shellRect.top+4)}px`;
      kokoroHorizontal.style.width=`${gaugeRect.width}px`;
      kokoroHorizontal.style.maxWidth='calc(100% - 16px)';
      kokoroHorizontal.style.transform='translateX(-50%)';
    }
  }

  sync();
  requestAnimationFrame(layout);
  new MutationObserver(sync).observe(source,{subtree:true,childList:true,characterData:true});
  window.addEventListener('resize',layout);
  if(window.ResizeObserver){
    const ro=new ResizeObserver(layout);
    [shell,document.getElementById('playerStatusHud'),document.getElementById('playerHpWindow'),document.getElementById('customGauge')].filter(Boolean).forEach(el=>ro.observe(el));
  }
})();
