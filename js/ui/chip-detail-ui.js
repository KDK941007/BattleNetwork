(()=>{
  const master=window.BattleNetworkMaster;
  const data=window.BattleNetworkData||{};
  const modal=document.getElementById('chipDetailModal');
  const detailName=document.getElementById('detailName');
  const titleName=document.getElementById('detailChipName');
  const libraryNo=document.getElementById('detailLibraryNo');
  const classValue=document.getElementById('detailClass');
  const capacity=document.getElementById('detailCapacity');
  const rarity=document.getElementById('detailRarity');
  const values=document.getElementById('detailValues');
  const attributes=document.getElementById('detailAttributes');
  const artwork=document.getElementById('detailArt');
  const description=document.getElementById('detailDesc');
  const rangeText=document.getElementById('detailRangeText');
  const rangeViz=document.getElementById('detailRange');
  const rangeTypeValue=modal?.querySelector('.rangeTypeValue');
  const rangeDirectionValue=modal?.querySelector('.rangeDirectionValue');
  const rangeDistanceValue=modal?.querySelector('.rangeDistanceValue');
  const rangeShapeValue=modal?.querySelector('.rangeShapeValue');
  if(!master||!modal||!detailName||!titleName||!libraryNo||!classValue||!capacity||!rarity||!values||!attributes)return;

  const chipsByName=new Map((data.CHIP_MASTER||[]).map(chip=>[chip.chipName,chip]));
  const rangeTypeById=new Map((data.RANGE_TYPE_MASTER||[]).map(row=>[row.rangeTypeId,row]));
  const GRID_COLS=7,GRID_ROWS=5;
  const CENTER_COL=3,CENTER_ROW=2;
  const LONG_COL=1,LONG_ROW=2;

  const SPECIAL_RANGE_INFO=Object.freeze({
    CHIP_EXE4_S004:{type:'射撃',direction:'前方',distance:'長距離',shape:'直線・敵1体'},
    CHIP_EXE4_S005:{type:'射撃',direction:'前方',distance:'長距離',shape:'直線・3連射'},
    CHIP_EXE4_S106:{type:'地形操作',direction:'前方',distance:'1マス',shape:'正面1マス'},
    CHIP_EXE4_S119:{type:'移動',direction:'周囲',distance:'隣接1マス',shape:'周囲4マス'},
    CHIP_EXE4_S148:{type:'数値付加',direction:'直前チップ',distance:'--',shape:'攻撃力+10'}
  });

  function ensureStructure(){
    const row=modal.querySelector('.detailText .detailRow');
    if(!row)return null;
    const contentLabel=modal.querySelector('.detailContentHead .detailLabel');
    if(contentLabel)contentLabel.textContent='原作効果';
    let scroller=document.getElementById('detailCodes');
    if(!scroller){
      const block=document.createElement('div');block.className='detailDataBlock detailCodeBlock';
      const label=document.createElement('span');label.className='detailLabel';label.textContent='コード';
      scroller=document.createElement('div');scroller.id='detailCodes';scroller.className='detailTokenScroller';scroller.setAttribute('aria-label','チップコード');
      block.append(label,scroller);row.insertBefore(block,values.closest('.detailDataBlock')||null);
    }
    if(!document.getElementById('chipDetailContentUpdateStyle')){
      const style=document.createElement('style');style.id='chipDetailContentUpdateStyle';
      style.textContent=`
        #chipDetailModal .detailText .detailRow{grid-template-rows:auto minmax(0,1fr) 27px 27px 27px!important}
        #chipDetailModal #detailCodes .detailCodeToken{min-width:24px;justify-content:center;padding-inline:7px;border-color:#4b91aa;background:linear-gradient(180deg,#104155,#092b39)}
        #chipDetailModal #detailCodes .detailCodeToken .detailTokenValue{color:#f4fdff;font-size:9px;letter-spacing:.04em}
        #chipDetailModal .rangeSpecValue::before{content:none!important}
        #chipDetailModal .detailArt img{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important}
        #chipDetailModal .rangeGridTerrain,#chipDetailModal .rangeGridSelect{position:absolute;z-index:2;box-sizing:border-box;pointer-events:none;border-radius:4px}
        #chipDetailModal .rangeGridTerrain{border:2px dashed rgba(255,151,104,.98);background:rgba(255,103,65,.25);box-shadow:0 0 9px rgba(255,116,72,.22)}
        #chipDetailModal .rangeGridSelect{border:2px solid rgba(190,145,255,.98);background:rgba(157,98,255,.24);box-shadow:0 0 9px rgba(164,105,255,.22)}
        #chipDetailModal .rangeGridModifier{position:absolute;z-index:7;left:58%;top:42%;transform:translate(-50%,-50%);padding:5px 9px;border:2px solid #ffe66d;border-radius:7px;background:rgba(73,55,5,.92);color:#fff3a8;font-size:15px;font-weight:1000;line-height:1;box-shadow:0 0 10px rgba(255,222,86,.35);pointer-events:none}
      `;
      document.head.appendChild(style);
    }
    return scroller;
  }
  const codeScroller=ensureStructure();

  function emptyToken(text='--'){const token=document.createElement('span');token.className='detailInfoToken detailInfoTokenEmpty';token.textContent=text;return token}
  function valueText(v){const n=Number(v);return Number.isFinite(n)?(Number.isInteger(n)?String(n):String(Number(n.toFixed(2)))):null}
  function setSpec(el,text){if(!el)return;el.textContent=text||'--';el.title=text||'--'}

  function renderHeader(chip){
    const chipClass=master.getChipClass(chip.chipId);
    const no=typeof chip.libraryNo==='number'&&Number.isFinite(chip.libraryNo)?String(chip.libraryNo).padStart(4,'0'):chip.libraryNo!=null?String(chip.libraryNo):'----';
    libraryNo.textContent=`No.${no}`;titleName.textContent=chip.chipName||'--';classValue.textContent=chipClass?.classInitial||'--';classValue.title=chipClass?.className||'';capacity.textContent=Number.isFinite(chip.capacityMb)?String(chip.capacityMb):'--';rarity.textContent=Number.isFinite(chip.rarity)&&chip.rarity>0?'★'.repeat(chip.rarity):'--';
  }
  function renderCodes(chip){
    if(!codeScroller)return;codeScroller.replaceChildren();const rows=master.getChipCodes(chip.chipId);if(!rows.length){codeScroller.appendChild(emptyToken());return}
    rows.forEach(row=>{const token=document.createElement('span');token.className='detailInfoToken detailCodeToken';const value=document.createElement('span');value.className='detailTokenValue';value.textContent=row.codeValue||row.codeId||'--';token.appendChild(value);codeScroller.appendChild(token)});
  }
  function renderValues(chip){
    values.replaceChildren();const rows=master.getChipValues(chip.chipId).filter(row=>row.displayFlg!==false);if(!rows.length){values.appendChild(emptyToken());return}
    rows.forEach(row=>{const token=document.createElement('span');token.className='detailInfoToken detailValueToken';const label=document.createElement('span');label.className='detailTokenLabel';label.textContent=row.labelOverride||row.valueType?.displayLabel||row.valueTypeId;const value=document.createElement('span');value.className='detailTokenValue';value.textContent=row.valueMode==='VARIABLE'?'可変':`${row.value??'--'}${row.valueType?.unit||''}`;token.append(label,value);values.appendChild(token)});
  }
  function renderAttributes(chip){
    attributes.replaceChildren();const rows=master.getChipAttributes(chip.chipId);if(!rows.length){attributes.appendChild(emptyToken());return}
    rows.forEach(row=>{const token=document.createElement('span');token.className='detailInfoToken detailAttributeToken';if(row.attribute?.iconPath){const img=document.createElement('img');img.className='detailAttributeIcon';img.src=row.attribute.iconPath;img.alt='';img.draggable=false;token.appendChild(img)}const name=document.createElement('span');name.className='detailTokenValue';name.textContent=row.attribute?.attributeName||'--';token.appendChild(name);attributes.appendChild(token)});
  }
  function renderArtwork(chip){
    if(!artwork)return;
    const src=master.getChipImagePath(chip);
    artwork.replaceChildren();
    ['background-image','background-size','background-repeat','background-position'].forEach(name=>artwork.style.removeProperty(name));
    artwork.style.setProperty('padding','3px','important');
    if(!src)return;
    const img=document.createElement('img');
    img.src=src;img.alt=chip.chipName||'';img.draggable=false;
    img.style.setProperty('display','block','important');
    img.style.setProperty('width','100%','important');img.style.setProperty('height','100%','important');img.style.setProperty('object-fit','contain','important');
    artwork.appendChild(img);
  }
  function rangeInfo(chip){
    if(SPECIAL_RANGE_INFO[chip.chipId])return SPECIAL_RANGE_INFO[chip.chipId];
    const type=rangeTypeById.get(chip.rangeTypeId)||null,range=master.getRangeParams(chip.chipId),behavior=master.getBehaviorParams(chip.chipId);const length=valueText(range.LENGTH_TILES),width=valueText(range.WIDTH_TILES),radius=valueText(range.RADIUS_TILES),throwDistance=valueText(behavior.THROW_DISTANCE_TILES);
    if(chip.rangeTypeId==='LINE')return{type:type?.displayCategory||'射撃',direction:type?.displayDirection||'自由方向',distance:length?`${length}マス`:'--',shape:width?`直線・幅${width}マス`:'直線'};
    if(chip.rangeTypeId==='RECT')return{type:type?.displayCategory||'近接',direction:'前方',distance:length?`${length}マス`:'--',shape:width?`幅${width}マス`:'矩形'};
    if(chip.rangeTypeId==='CIRCLE')return{type:throwDistance?'投擲':type?.displayCategory||'範囲',direction:throwDistance?'前方へ投擲':type?.displayDirection||'発生地点基準',distance:throwDistance?`${throwDistance}マス先`:'発生地点',shape:radius?`半径${radius}マス`:'円形'};
    if(chip.rangeTypeId==='SELF')return{type:type?.displayCategory||'回復',direction:'自分中心',distance:'自分',shape:'自分自身'};
    return{type:type?.displayCategory||type?.rangeName||'--',direction:type?.displayDirection||'--',distance:'--',shape:type?.rangeName||'--'};
  }
  function renderRangeSpecs(chip){const info=rangeInfo(chip);setSpec(rangeTypeValue,info.type);setSpec(rangeDirectionValue,info.direction);setSpec(rangeDistanceValue,info.distance);setSpec(rangeShapeValue,info.shape)}

  const pxX=v=>`${v/GRID_COLS*100}%`,pxY=v=>`${v/GRID_ROWS*100}%`;
  function rect(el,left,top,width,height){el.style.left=pxX(left);el.style.top=pxY(top);el.style.width=pxX(width);el.style.height=pxY(height)}
  function playerMarker(col,row){const el=document.createElement('span');el.className='rangeGridPlayer';el.style.left=pxX(col+.5);el.style.top=pxY(row+.5);el.textContent='P';return el}
  function labels(board,legend,heading='前方 →'){const f=document.createElement('span');f.className='rangeGridForward';f.textContent=heading;const u=document.createElement('span');u.className='rangeGridUnit';u.textContent='1グリッド = 1マス';const l=document.createElement('span');l.className='rangeGridLegend';l.textContent=legend;board.append(f,u,l)}
  function bombArc(x1,y1,x2){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('rangeGridArc');svg.setAttribute('viewBox',`0 0 ${GRID_COLS*100} ${GRID_ROWS*100}`);svg.setAttribute('preserveAspectRatio','none');const p=document.createElementNS(svg.namespaceURI,'path'),sx=x1*100,sy=y1*100,ex=x2*100,lift=Math.max(70,(ex-sx)*.34);p.setAttribute('d',`M ${sx} ${sy} Q ${(sx+ex)/2} ${sy-lift} ${ex} ${sy}`);svg.appendChild(p);return svg}
  function addCell(board,className,col,row){const el=document.createElement('span');el.className=className;rect(el,col,row,1,1);board.appendChild(el);return el}
  function addAttack(board,className,col,row,width=1,height=1){const el=document.createElement('span');el.className=className;rect(el,col,row,width,height);board.appendChild(el);return el}

  function renderLongRange(board,chip){
    board.appendChild(playerMarker(LONG_COL,LONG_ROW));
    addAttack(board,'rangeGridAttack rangeGridLine',LONG_COL+1,LONG_ROW,GRID_COLS-LONG_COL-1,1);
    const burst=chip.chipId==='CHIP_EXE4_S005';
    labels(board,burst?'長距離直線 / 3連射':'長距離直線 / 敵1体');
  }
  function renderCrackOut(board){
    board.appendChild(playerMarker(CENTER_COL,CENTER_ROW));
    addCell(board,'rangeGridTerrain',CENTER_COL+1,CENTER_ROW);
    labels(board,'正面1マスを地形変更');
  }
  function renderAreaSteal(board){
    board.appendChild(playerMarker(CENTER_COL,CENTER_ROW));
    [[CENTER_COL,CENTER_ROW-1],[CENTER_COL,CENTER_ROW+1],[CENTER_COL-1,CENTER_ROW],[CENTER_COL+1,CENTER_ROW]].forEach(([col,row])=>addCell(board,'rangeGridSelect',col,row));
    labels(board,'周囲4マスから移動先を選択','周囲選択');
  }
  function renderAttackPlus(board){
    board.appendChild(playerMarker(CENTER_COL,CENTER_ROW));
    const modifier=document.createElement('span');modifier.className='rangeGridModifier';modifier.textContent='+10';board.appendChild(modifier);
    labels(board,'直前の攻撃チップへ+10','数値付加');
  }
  function renderRangeDiagram(chip){
    if(!rangeViz)return;
    const range=master.getRangeParams(chip.chipId),behavior=master.getBehaviorParams(chip.chipId);
    const board=document.createElement('div');board.className='rangeGridBoard';board.dataset.rangeType=chip.rangeTypeId||chip.chipId||'';

    if(chip.chipId==='CHIP_EXE4_S004'||chip.chipId==='CHIP_EXE4_S005'){
      renderLongRange(board,chip);
    }else if(chip.chipId==='CHIP_EXE4_S106'){
      renderCrackOut(board);
    }else if(chip.chipId==='CHIP_EXE4_S119'){
      renderAreaSteal(board);
    }else if(chip.chipId==='CHIP_EXE4_S148'){
      renderAttackPlus(board);
    }else if(chip.rangeTypeId==='LINE'){
      /* Cannon: accepted long-range layout is intentionally preserved. */
      const pc=LONG_COL,pr=LONG_ROW,ox=pc+.5,oy=pr+.5;
      board.appendChild(playerMarker(pc,pr));
      const length=Number(range.LENGTH_TILES),width=Number(range.WIDTH_TILES);
      if(Number.isFinite(length)&&Number.isFinite(width)){
        addAttack(board,'rangeGridAttack rangeGridLine',pc+1,oy-width/2,Math.min(length,GRID_COLS-pc-1),width);
        labels(board,`射程 ${valueText(length)}マス / 幅 ${valueText(width)}マス`);
      }else labels(board,'直線');
    }else if(chip.rangeTypeId==='CIRCLE'){
      /* MiniBomb: accepted throw layout is intentionally preserved. */
      const pc=LONG_COL,pr=LONG_ROW,ox=pc+.5,oy=pr+.5;
      board.appendChild(playerMarker(pc,pr));
      const radius=Number(range.RADIUS_TILES),distance=Number(behavior.THROW_DISTANCE_TILES),centerX=ox+(Number.isFinite(distance)?distance:0);
      if(Number.isFinite(radius)){const target=document.createElement('span');target.className='rangeGridCircle';rect(target,centerX-radius,oy-radius,radius*2,radius*2);board.appendChild(target)}
      if(Number.isFinite(distance)&&distance>0){board.appendChild(bombArc(ox,oy,centerX));labels(board,`${valueText(distance)}マス先 / 半径 ${valueText(radius)}マス`)}else labels(board,`半径 ${valueText(radius)}マス`);
    }else if(chip.rangeTypeId==='RECT'){
      /* Sword / WideSword: player stays centered and attack cells follow grid boundaries. */
      board.appendChild(playerMarker(CENTER_COL,CENTER_ROW));
      const length=Number(range.LENGTH_TILES),width=Number(range.WIDTH_TILES);
      if(Number.isFinite(length)&&Number.isFinite(width)){
        const top=CENTER_ROW-Math.floor((width-1)/2);
        addAttack(board,'rangeGridAttack rangeGridRect',CENTER_COL+1,top,length,width);
        labels(board,`前方 ${valueText(length)}マス / 幅 ${valueText(width)}マス`);
      }else labels(board,'前方・近距離');
    }else if(chip.rangeTypeId==='SELF'){
      /* Recovery: player stays centered and only the player's own cell is the target. */
      board.appendChild(playerMarker(CENTER_COL,CENTER_ROW));
      addCell(board,'rangeGridSelf',CENTER_COL,CENTER_ROW);
      labels(board,'対象：自分自身','自分中心');
    }else{
      board.appendChild(playerMarker(CENTER_COL,CENTER_ROW));
      labels(board,chip.rangeDescription||'範囲情報なし','模式図');
    }
    rangeViz.className='rangeViz rangeGridViz';rangeViz.replaceChildren(board);
  }

  function renderChip(chip,{setName=true}={}){
    if(!chip)return false;
    if(setName&&detailName.textContent!==chip.chipName)detailName.textContent=chip.chipName||'';
    renderHeader(chip);renderCodes(chip);renderValues(chip);renderAttributes(chip);
    if(description)description.textContent=chip.description||'--';if(rangeText)rangeText.textContent=chip.rangeDescription||'--';
    renderRangeSpecs(chip);renderRangeDiagram(chip);renderArtwork(chip);
    if(codeScroller)codeScroller.scrollLeft=0;values.scrollLeft=0;attributes.scrollLeft=0;return true;
  }
  function renderCurrent(){if(!modal.classList.contains('open'))return;const chip=chipsByName.get(detailName.textContent.trim());if(chip)renderChip(chip,{setName:false})}
  function openByChipId(chipId){const chip=master.getChip(chipId);if(!chip)return false;renderChip(chip,{setName:true});modal.classList.add('open');modal.querySelector('.chipDetail')?.scrollTo({top:0,left:0,behavior:'auto'});return true}
  function openByChipName(name){const chip=chipsByName.get(String(name||'').trim());return chip?openByChipId(chip.chipId):false}
  new MutationObserver(()=>{if(modal.classList.contains('open'))queueMicrotask(renderCurrent)}).observe(modal,{attributes:true,attributeFilter:['class']});
  window.BattleNetworkChipDetail=Object.freeze({openByChipId,openByChipName,renderChip});
})();