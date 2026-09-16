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

  const bottomDock=source.cloneNode(true);
  bottomDock.classList.remove('chipHudCompareLeft','chipHudSide');
  bottomDock.classList.add('chipHudCompareBottomDock');
  bottomDock.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  bottomDock.setAttribute('aria-hidden','true');
  shell.appendChild(bottomDock);

  const style=document.createElement('style');
  style.textContent=`
    .shell>.chipHud.chipHudSide,
    .shell>.chipHud.chipHudCompareKokoroRight,
    .shell>.chipHud.chipHudCompareBottomDock{
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
    .shell>.chipHud.chipHudCompareBottomDock{
      left:50%;
      right:auto;
      top:auto;
      bottom:12px;
      width:min(520px,48vw);
      padding:5px 6px;
      display:block;
      transform:translateX(-50%);
      border:1px solid rgba(83,193,222,.72);
      border-radius:10px;
      background:rgba(4,17,25,.84);
      box-shadow:0 0 0 1px rgba(135,230,255,.08) inset,0 4px 14px rgba(0,0,0,.38);
      overflow:hidden;
    }
    .chipHudSide .chipNow,
    .chipHudCompareKokoroRight .chipNow,
    .chipHudCompareBottomDock .chipNow{
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
    .chipHudCompareBottomDock .queue{
      width:100%;
      min-width:0;
      display:grid;
      grid-template-columns:minmax(0,1.25fr) repeat(2,minmax(0,1fr));
      align-items:center;
      gap:5px;
      overflow:hidden;
    }
    .chipHudCompareBottomDock .queue.advance{
      animation:chipDockAdvance .18s ease-out both;
    }
    @keyframes chipDockAdvance{
      from{transform:translateX(16px);opacity:.68}
      to{transform:translateX(0);opacity:1}
    }
    .chipHudSide .q,
    .chipHudCompareKokoroRight .q,
    .chipHudCompareBottomDock .q{
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
    .chipHudCompareBottomDock .q{
      width:100%;
      min-width:0;
      opacity:.72;
    }
    .chipHudCompareBottomDock .q:first-child:not(.empty){
      min-height:31px;
      padding:7px 9px;
      font-size:11px;
      font-weight:900;
      opacity:1;
      border-color:#b8f3ff;
      box-shadow:0 0 10px rgba(91,220,255,.5),inset 0 0 0 1px rgba(218,250,255,.18);
    }
    .chipHudCompareBottomDock .q.empty{
      grid-column:1/-1;
      text-align:center;
      opacity:.55;
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
  const bottomQueue=bottomDock.querySelector('.queue');
  if(!sourceTitle||!sourceQueue||!mirrorQueue||!horizontalQueue||!bottomQueue)return;

  let previousBottomLabels=[];
  function sync(){
    if(sourceTitle.textContent!=='')sourceTitle.textContent='';
    const nextLabels=[...sourceQueue.children].map(el=>el.textContent.trim());
    const advanced=previousBottomLabels.length>nextLabels.length&&nextLabels.length>0&&previousBottomLabels.slice(1).includes(nextLabels[0]);
    mirrorQueue.innerHTML=sourceQueue.innerHTML;
    horizontalQueue.innerHTML=sourceQueue.innerHTML;
    bottomQueue.innerHTML=sourceQueue.innerHTML;
    [...bottomQueue.children].slice(3).forEach(el=>el.remove());
    if(advanced){
      bottomQueue.classList.remove('advance');
      void bottomQueue.offsetWidth;
      bottomQueue.classList.add('advance');
    }
    previousBottomLabels=nextLabels;
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
