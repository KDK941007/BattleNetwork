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
  const SPECIAL_RANGE_INFO=Object.freeze({
    CHIP_EXE4_S004:{type:'射撃',direction:'前方',distance:'長距離',shape:'直線・敵1体'},
    CHIP_EXE4_S005:{type:'射撃',direction:'前方',distance:'長距離',shape:'直線・3連射'},
    CHIP_EXE4_S106:{type:'地形操作',direction:'前方',distance:'1マス',shape:'正面1マス'},
    CHIP_EXE4_S119:{type:'エリア操作',direction:'敵エリア',distance:'最前列',shape:'縦3パネル'},
    CHIP_EXE4_S148:{type:'数値付加',direction:'直前チップ',distance:'--',shape:'攻撃力+10'}
  });

  function ensureStructure(){
    const row=modal.querySelector('.detailText .detailRow');
    if(!row)return null;
    const contentLabel=modal.querySelector('.detailContentHead .detailLabel');
    if(contentLabel)contentLabel.textContent='原作効果';
    let scroller=document.getElementById('detailCodes');
    if(!scroller){
      const block=document.createElement('div');
      block.className='detailDataBlock detailCodeBlock';
      const label=document.createElement('span');label.className='detailLabel';label.textContent='コード';
      scroller=document.createElement('div');scroller.id='detailCodes';scroller.className='detailTokenScroller';scroller.setAttribute('aria-label','チップコード');
      block.append(label,scroller);
      row.insertBefore(block,values.closest('.detailDataBlock')||null);
    }
    if(!document.getElementById('chipDetailContentUpdateStyle')){
      const style=document.createElement('style');style.id='chipDetailContentUpdateStyle';
      style.textContent=`#chipDetailModal .detailText .detailRow{grid-template-rows:auto minmax(0,1fr) 27px 27px 27px!important}#chipDetailModal #detailCodes .detailCodeToken{min-width:24px;justify-content:center;padding-inline:7px;border-color:#4b91aa;background:linear-gradient(180deg,#104155,#092b39)}#chipDetailModal #detailCodes .detailCodeToken .detailTokenValue{color:#f4fdff;font-size:9px;letter-spacing:.04em}#chipDetailModal .rangeSpecValue::before{content:none!important}`;
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
    if(!artwork)return;const src=master.getChipImagePath(chip);artwork.replaceChildren();artwork.style.removeProperty('background-image');if(!src)return;artwork.style.setProperty('background-image',`url("${src.replace(/"/g,'\\"')}")`,'important');artwork.style.setProperty('background-size','contain','important');artwork.style.setProperty('background-repeat','no-repeat','important');artwork.style.setProperty('background-position','center','important');artwork.style.setProperty('padding','3px','important');
  }
  function rangeInfo(chip){
    if(SPECIAL_RANGE_INFO[chip.chipId])return SPECIAL_RANGE_INFO[chip.chipId];
    const type=rangeTypeById.get(chip.rangeTypeId)||null,range=master.getRangeParams(chip.chipId),behavior=master.getBehaviorParams(chip.chipId);const length=valueText(range.LENGTH_TILES),width=valueText(range.WIDTH_TILES),radius=valueText(range.RADIUS_TILES),throwDistance=valueText(behavior.THROW_DISTANCE_TILES);
    if(chip.rangeTypeId==='LINE')return{type:type?.displayCategory||'射撃',direction:type?.displayDirection||'自由方向',distance:length?`${length}マス`:'--',shape:width?`直線・幅${width}マス`:'直線'};
    if(chip.rangeTypeId==='RECT')return{type:type?.displayCategory||'近接',direction:type?.displayDirection||'自由方向',distance:length?`${length}マス`:'--',shape:width?`幅${width}マス`:'矩形'};
    if(chip.rangeTypeId==='CIRCLE')return{type:throwDistance?'投擲':type?.displayCategory||'範囲',direction:throwDistance?'前方へ投擲':type?.displayDirection||'発生地点基準',distance:throwDistance?`${throwDistance}マス先`:'発生地点',shape:radius?`半径${radius}マス`:'円形'};
    if(chip.rangeTypeId==='SELF')return{type:type?.displayCategory||'回復',direction:type?.displayDirection||'自分中心',distance:'自分',shape:'自分自身'};
    return{type:type?.displayCategory||type?.rangeName||'--',direction:type?.displayDirection||'--',distance:'--',shape:type?.rangeName||'--'};
  }
  function renderRangeSpecs(chip){const info=rangeInfo(chip);setSpec(rangeTypeValue,info.type);setSpec(rangeDirectionValue,info.direction);setSpec(rangeDistanceValue,info.distance);setSpec(rangeShapeValue,info.shape)}
  const pxX=v=>`${v/GRID_COLS*100}%`,pxY=v=>`${v/GRID_ROWS*100}%`;
  function rect(el,left,top,width,height){el.style.left=pxX(left);el.style.top=pxY(top);el.style.width=pxX(width);el.style.height=pxY(height)}
  function playerMarker(x,y){const el=document.createElement('span');el.className='rangeGridPlayer';el.style.left=pxX(x);el.style.top=pxY(y);el.textContent='P';return el}
  function labels(board,legend){const f=document.createElement('span');f.className='rangeGridForward';f.textContent='前方 →';const u=document.createElement('span');u.className='rangeGridUnit';u.textContent='1グリッド = 1マス';const l=document.createElement('span');l.className='rangeGridLegend';l.textContent=legend;board.append(f,u,l)}
  function bombArc(x1,y1,x2){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('rangeGridArc');svg.setAttribute('viewBox',`0 0 ${GRID_COLS*100} ${GRID_ROWS*100}`);svg.setAttribute('preserveAspectRatio','none');const p=document.createElementNS(svg.namespaceURI,'path'),sx=x1*100,sy=y1*100,ex=x2*100,lift=Math.max(70,(ex-sx)*.34);p.setAttribute('d',`M ${sx} ${sy} Q ${(sx+ex)/2} ${sy-lift} ${ex} ${sy}`);svg.appendChild(p);return svg}
  function renderRangeDiagram(chip){
    if(!rangeViz)return;const range=master.getRangeParams(chip.chipId),behavior=master.getBehaviorParams(chip.chipId);const board=document.createElement('div');board.className='rangeGridBoard';board.dataset.rangeType=chip.rangeTypeId||'';let pc=1,pr=2,ox=1.5,oy=2.5,legend='';board.appendChild(playerMarker(ox,oy));
    if(chip.rangeTypeId==='LINE'||chip.rangeTypeId==='RECT'){
      const length=Number(range.LENGTH_TILES),width=Number(range.WIDTH_TILES);if(Number.isFinite(length)&&Number.isFinite(width)){const attack=document.createElement('span');attack.className=`rangeGridAttack ${chip.rangeTypeId==='LINE'?'rangeGridLine':'rangeGridRect'}`;rect(attack,pc+1,oy-width/2,Math.min(length,GRID_COLS-pc-1),width);board.appendChild(attack);legend=`射程 ${valueText(length)}マス / 幅 ${valueText(width)}マス`}
    }else if(chip.rangeTypeId==='CIRCLE'){
      const radius=Number(range.RADIUS_TILES),distance=Number(behavior.THROW_DISTANCE_TILES),centerX=ox+(Number.isFinite(distance)?distance:0);if(Number.isFinite(radius)){const target=document.createElement('span');target.className='rangeGridCircle';rect(target,centerX-radius,oy-radius,radius*2,radius*2);board.appendChild(target)}if(Number.isFinite(distance)&&distance>0){board.appendChild(bombArc(ox,oy,centerX));legend=`${valueText(distance)}マス先 / 半径 ${valueText(radius)}マス`}else legend=`半径 ${valueText(radius)}マス`;
    }else if(chip.rangeTypeId==='SELF'){
      const self=document.createElement('span');self.className='rangeGridSelf';rect(self,pc,pr,1,1);board.appendChild(self);legend='対象：自分自身';
    }else{
      const unsupported=document.createElement('span');unsupported.className='rangeGridUnsupported';unsupported.textContent='範囲図は未定義';board.appendChild(unsupported);legend=chip.rangeDescription||chip.rangeTypeId||'--';
    }
    labels(board,legend);rangeViz.className='rangeViz rangeGridViz';rangeViz.replaceChildren(board);
  }
  function renderChip(chip,{setName=true}={}){
    if(!chip)return false;if(setName&&detailName.textContent!==chip.chipName)detailName.textContent=chip.chipName||'';renderHeader(chip);renderCodes(chip);renderValues(chip);renderAttributes(chip);if(description)description.textContent=chip.description||'--';if(rangeText)rangeText.textContent=chip.rangeDescription||'--';renderRangeSpecs(chip);renderRangeDiagram(chip);renderArtwork(chip);if(codeScroller)codeScroller.scrollLeft=0;values.scrollLeft=0;attributes.scrollLeft=0;return true;
  }
  function renderCurrent(){if(!modal.classList.contains('open'))return;const chip=chipsByName.get(detailName.textContent.trim());if(chip)renderChip(chip,{setName:false})}
  function openByChipId(chipId){const chip=master.getChip(chipId);if(!chip)return false;renderChip(chip,{setName:true});modal.classList.add('open');modal.querySelector('.chipDetail')?.scrollTo({top:0,left:0,behavior:'auto'});return true}
  function openByChipName(name){const chip=chipsByName.get(String(name||'').trim());return chip?openByChipId(chip.chipId):false}
  new MutationObserver(()=>{if(modal.classList.contains('open'))queueMicrotask(renderCurrent)}).observe(modal,{attributes:true,attributeFilter:['class']});
  window.BattleNetworkChipDetail=Object.freeze({openByChipId,openByChipName,renderChip});
})();