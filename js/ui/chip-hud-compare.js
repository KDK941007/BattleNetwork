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

  const style=document.createElement('style');
  style.textContent=`
    .shell>.chipHud.chipHudSide{
      position:absolute;
      top:50px;
      bottom:auto;
      width:min(132px,24vw);
      min-height:0;
      padding:0;
      display:flex;
      flex-direction:column;
      align-items:stretch;
      gap:5px;
      z-index:44;
      pointer-events:none;
    }
    .shell>.chipHud.chipHudCompareLeft{left:6px;right:auto}
    .shell>.chipHud.chipHudCompareRight{left:auto;right:6px}
    .chipHudSide .chipNow{
      display:block;
      padding:2px 5px;
      font-size:10px;
      line-height:1.1;
      text-align:center;
      opacity:.9;
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
      min-height:24px;
      padding:5px 7px;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      text-align:left;
      font-size:10px;
      line-height:1.2;
    }
    .chipHudSide .q:first-child:not(.empty){
      border-color:#9cecff;
      box-shadow:0 0 8px rgba(91,220,255,.42),inset 0 0 0 1px rgba(194,248,255,.16);
    }
  `;
  document.head.appendChild(style);

  const sourceTitle=source.querySelector('.chipNow');
  const sourceQueue=source.querySelector('.queue');
  const mirrorTitle=mirror.querySelector('.chipNow');
  const mirrorQueue=mirror.querySelector('.queue');
  if(!sourceTitle||!sourceQueue||!mirrorTitle||!mirrorQueue)return;

  const sync=()=>{
    mirrorTitle.textContent=sourceTitle.textContent;
    mirrorQueue.innerHTML=sourceQueue.innerHTML;
  };
  sync();
  new MutationObserver(sync).observe(source,{subtree:true,childList:true,characterData:true});
})();
