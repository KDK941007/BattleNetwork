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
  const rangeCaption=modal?.querySelector('.detailRangeCaption');
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
  const AIRSHOT_RANGE_TILES=7;
  const VULCAN_RANGE_TILES=7;
  const AREA_STEAL_RANGE_TILES=4;
  const AREA_STEAL_GRID_SIZE=AREA_STEAL_RANGE_TILES*2+1;

  const SPECIAL_RANGE_INFO=Object.freeze({
    CHIP_EXE4_S004:{type:'射撃',direction:'自由方向',distance:`${AIRSHOT_RANGE_TILES}マス`,shape:'直線・敵1体'},
    CHIP_EXE4_S005:{type:'射撃',direction:'自由方向',distance:`${VULCAN_RANGE_TILES}マス`,shape:'直線・3連射／ヒット時に直後1マスへ誘爆'},
    CHIP_EXE4_S106:{type:'地形操作',direction:'前方',distance:'1マス',shape:'正面1マス'},
    CHIP_EXE4_S119:{type:'移動',direction:'上下左右・斜めの8方向',distance:`各方向 最大${AREA_STEAL_RANGE_TILES}マス`,shape:'8方向の直線上にある選択可能マス'},
    CHIP_EXE4_S148:{type:'数値付加',direction:'直前チップ',distance:'--',shape:null}
  });

  const SPECIAL_DETAIL_TEXT=Object.freeze({
    CHIP_EXE4_S004:{
      description:'正面に空気の弾を発射し、直線上の敵1体に20ダメージを与える。ヒットした敵を1マス後方へ吹き飛ばす。',
      rangeDescription:`自由方向・直線／射程${AIRSHOT_RANGE_TILES}マス・敵1体`
    },
    CHIP_EXE4_S005:{
      description:'攻撃力10の弾を3連射する。各弾が敵にヒットすると、その敵の直後1マスにも同じ攻撃力で誘爆する。',
      rangeDescription:`自由方向・直線／射程${VULCAN_RANGE_TILES}マス・3連射／ヒット時に直後1マスへ誘爆`
    },
    CHIP_EXE4_S119:{
      description:`上下左右・斜めの8方向へ、それぞれ最大${AREA_STEAL_RANGE_TILES}マス先までの選択可能なマスを選び、そのマスの中心へ瞬間移動する。途中のマスの状態は問わず、移動先が立てない穴パネル、敵や置き物などで占有されたマスの場合は選択できない。選択時間は2秒。`,
      rangeDescription:`上下左右・斜め8方向／各方向最大${AREA_STEAL_RANGE_TILES}マス／選択可能なマスへ瞬間移動`
    }
  });

  function ensureStructure(){
    const row=modal.querySelector('.detailText .detailRow');
    if(!row)return null;
    const contentLabel=modal.querySelector('.detailContentHead .detailLabel');
    if(contentLabel)contentLabel.textContent='詳細';
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
        #chipDetailModal .rangeSpecs{display:none!important}
        #chipDetailModal .rangeInfo{grid-template-rows:auto minmax(0,1fr)!important}
        #chipDetailModal .detailRangeCaption{display:block!important;min-height:0!important;overflow:auto!important;padding:8px 10px!important}
        #chipDetailModal .rangeDetailList{display:flex;flex-direction:column;gap:0;min-height:100%}
        #chipDetailModal .rangeDetailRow{display:grid;grid-template-columns:46px minmax(0,1fr);gap:8px;align-items:start;padding:3px 0;border-bottom:1px solid rgba(91,188,216,.22)}
        #chipDetailModal .rangeDetailKey{color:#83dff3;font-size:9px;font-weight:900;white-space:nowrap}
        #chipDetailModal .rangeDetailValue{min-width:0;color:#f0fbff;font-size:10px;font-weight:800;line-height:1.35;overflow-wrap:anywhere}
        #chipDetailModal .rangeDetailDescription{display:grid;grid-template-columns:46px minmax(0,1fr);gap:8px;align-items:start;padding-top:6px}
        #chipDetailModal .rangeDetailDescription .rangeDetailValue{font-weight:700;color:#d6f4fb}
        #chipDetailModal .detailArt img{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important}
        #chipDetailModal .rangeGridTerrain,#chipDetailModal .rangeGridSelect{position:absolute;z-index:2;box-sizing:border-box;pointer-events:none;border-radius:4px}
        #chipDetailModal .rangeGridTerrain{border:2px dashed rgba(255,151,104,.98);background:rgba(255,103,65,.25);box-shadow:0 0 9px rgba(255,116,72,.22)}
        #chipDetailModal .rangeGridSelect{border:1px solid rgba(190,145,255,.78);background:rgba(157,98,255,.22);box-shadow:inset 0 0 4px rgba(190,145,255,.16)}
        #chipDetailModal .rangeGridModifier{position:absolute;z-index:7;left:58%;top:42%;transform:translate(-50%,-50%);padding:5px 9px;border:2px solid #ffe66d;border-radius:7px;background:rgba(73,55,5,.92);color:#fff3a8;font-size:15px;font-weight:1000;line-height:1;box-shadow:0 0 10px rgba(255,222,86,.35);pointer-events:none}
        #chipDetailModal .rangeGridBoard.rangeGridBoardLong7{aspect-ratio:9 / 5;background-size:calc(100% / 9) calc(100% / 5),calc(100% / 9) calc(100% / 5),100% 100%}
        #chipDetailModal .rangeGridBoard.rangeGridBoardAreaSteal{width:min(100%,230px);aspect-ratio:1;background-size:calc(100% / 9) calc(100% / 9),calc(100% / 9) calc(100% / 9),100% 100%}
        #chipDetailModal .rangeGridBoardAreaSteal .rangeGridPlayer{width:7.2%}
      `;
      document.head.appendChild(style);
    }
    return scroller;
  }
  const codeScroller=ensureStructure();

  function emptyToken(text='--'){const token=document.createElement('span');token.className='detailInfoToken detailInfoTokenEmpty';token.textContent=text;return token}
  function valueText(v){const n=Number(v);return Number.isFinite(n)?(Number.isInteger(n)?String(n):String(Number(n.toFixed(2)))):null}
  function setSpec(el,text){if(!el)return;el.textContent=text||'--';el.title=text||'--'}
  function detailText(chip){return SPECIAL_DETAIL_TEXT[chip.chipId]||{description:chip.description||'--',rangeDescription:chip.rangeDescription||'--'}}

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
    values.replaceChildren();
    let rows=master.getChipValues(chip.chipId).filter(row=>row.displayFlg!==false);
    if(chip.chipId==='CHIP_EXE4_S119')rows=[];
    if(!rows.length){values.appendChild(emptyToken());return}
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
    const img=document.createElement('img');img.src=src;img.alt=chip.chipName||'';img.draggable=false;
    img.style.setProperty('display','block','important');img.style.setProperty('width','100%','important');img.style.setProperty('height','100%','important');img.style.setProperty('object-fit','contain','important');
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
  function renderRangeSpecs(chip){
    const info=rangeInfo(chip),text=detailText(chip).rangeDescription;
    setSpec(rangeTypeValue,info.type);setSpec(rangeDirectionValue,info.direction);setSpec(rangeDistanceValue,info.distance);setSpec(rangeShapeValue,info.shape);
    if(!rangeCaption)return;
    const list=document.createElement('div');list.className='rangeDetailList';
    const rows=[['種別',info.type],['方向',info.direction],['射程',info.distance]];
    if(info.shape)rows.push(['範囲',info.shape]);
    rows.forEach(([key,value])=>{const row=document.createElement('div');row.className='rangeDetailRow';const k=document.createElement('span');k.className='rangeDetailKey';k.textContent=key;const v=document.createElement('span');v.className='rangeDetailValue';v.textContent=value||'--';row.append(k,v);list.appendChild(row)});
    const desc=document.createElement('div');desc.className='rangeDetailDescription';const k=document.createElement('span');k.className='rangeDetailKey';k.textContent='説明';const v=document.createElement('span');v.className='rangeDetailValue';v.textContent=text||'--';desc.append(k,v);list.appendChild(desc);
    rangeCaption.replaceChildren(list);
  }

  const pxX=(v,cols=GRID_COLS)=>`${v/cols*100}%`,pxY=(v,rows=GRID_ROWS)=>`${v/rows*100}%`;
  function rect(el,left,top,width,height,cols=GRID_COLS,rows=GRID_ROWS){el.style.left=pxX(left,cols);el.style.top=pxY(top,rows);el.style.width=pxX(width,cols);el.style.height=pxY(height,rows)}
  function playerMarker(col,row,cols=GRID_COLS,rows=GRID_ROWS){const el=document.createElement('span');el.className='rangeGridPlayer';el.style.left=pxX(col+.5,cols);el.style.top=pxY(row+.5,rows);el.textContent='P';return el}
  function labels(board,legend,heading='前方 →'){const f=document.createElement('span');f.className='rangeGridForward';f.textContent=heading;const u=document.createElement('span');u.className='rangeGridUnit';u.textContent='1グリッド = 1マス';const l=document.createElement('span');l.className='rangeGridLegend';l.textContent=legend;board.append(f,u,l)}
  function bombArc(x1,y1,x2){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('rangeGridArc');svg.setAttribute('viewBox',`0 0 ${GRID_COLS*100} ${GRID_ROWS*100}`);svg.setAttribute('preserveAspectRatio','none');const p=document.createElementNS(svg.namespaceURI,'path'),sx=x1*100,sy=y1*100,ex=x2*100,lift=Math.max(70,(ex-sx)*.34);p.setAttribute('d',`M ${sx} ${sy} Q ${(sx+ex)/2} ${sy-lift} ${ex} ${sy}`);svg.appendChild(p);return svg}
  function addCell(board,className,col,row,cols=GRID_COLS,rows=GRID_ROWS){const el=document.createElement('span');el.className=className;rect(el,col,row,1,1,cols,rows);board.appendChild(el);return el}
  function addAttack(board,className,col,row,width=1,height=1,cols=GRID_COLS,rows=GRID_ROWS){const el=document.createElement('span');el.className=className;rect(el,col,row,width,height,cols,rows);board.appendChild(el);return el}

  function renderLongRange(board,chip){
    const cols=9,rows=5,playerCol=1,playerRow=2,rangeTiles=chip.chipId==='CHIP_EXE4_S005'?VULCAN_RANGE_TILES:AIRSHOT_RANGE_TILES;
    board.classList.add('rangeGridBoardLong7');
    board.appendChild(playerMarker(playerCol,playerRow,cols,rows));
    addAttack(board,'rangeGridAttack rangeGridLine',playerCol+1,playerRow,rangeTiles,1,cols,rows);
    const burst=chip.chipId==='CHIP_EXE4_S005';
    labels(board,burst?`射程 ${rangeTiles}マス / 3連射 / ヒット時に直後1マスへ誘爆`:`射程 ${rangeTiles}マス / 敵1体`);
  }
  function renderCrackOut(board){
    board.appendChild(playerMarker(CENTER_COL,CENTER_ROW));addCell(board,'rangeGridTerrain',CENTER_COL+1,CENTER_ROW);labels(board,'正面1マスを地形変更');
  }
  function renderAreaSteal(board){
    const size=AREA_STEAL_GRID_SIZE,center=AREA_STEAL_RANGE_TILES;
    board.classList.add('rangeGridBoardAreaSteal');
    for(let row=0;row<size;row++)for(let col=0;col<size;col++){
      const dr=row-center,dc=col-center,ar=Math.abs(dr),ac=Math.abs(dc);
      if((dr===0&&dc===0)||!(dr===0||dc===0||ar===ac))continue;
      addCell(board,'rangeGridSelect',col,row,size,size);
    }
    board.appendChild(playerMarker(center,center,size,size));
    labels(board,`8方向 / 各最大${AREA_STEAL_RANGE_TILES}マス`,'8方向');
  }
  function renderAttackPlus(board){
    board.appendChild(playerMarker(CENTER_COL,CENTER_ROW));const modifier=document.createElement('span');modifier.className='rangeGridModifier';modifier.textContent='+10';board.appendChild(modifier);labels(board,'直前の攻撃チップへ+10','数値付加');
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
      const pc=LONG_COL,pr=LONG_ROW,ox=pc+.5,oy=pr+.5;board.appendChild(playerMarker(pc,pr));
      const length=Number(range.LENGTH_TILES),width=Number(range.WIDTH_TILES);
      if(Number.isFinite(length)&&Number.isFinite(width)){addAttack(board,'rangeGridAttack rangeGridLine',pc+1,oy-width/2,Math.min(length,GRID_COLS-pc-1),width);labels(board,`射程 ${valueText(length)}マス / 幅 ${valueText(width)}マス`)}else labels(board,'直線');
    }else if(chip.rangeTypeId==='CIRCLE'){
      const pc=LONG_COL,pr=LONG_ROW,ox=pc+.5,oy=pr+.5;board.appendChild(playerMarker(pc,pr));
      const radius=Number(range.RADIUS_TILES),distance=Number(behavior.THROW_DISTANCE_TILES),centerX=ox+(Number.isFinite(distance)?distance:0);
      if(Number.isFinite(radius)){const target=document.createElement('span');target.className='rangeGridCircle';rect(target,centerX-radius,oy-radius,radius*2,radius*2);board.appendChild(target)}
      if(Number.isFinite(distance)&&distance>0){board.appendChild(bombArc(ox,oy,centerX));labels(board,`${valueText(distance)}マス先 / 半径 ${valueText(radius)}マス`)}else labels(board,`半径 ${valueText(radius)}マス`);
    }else if(chip.rangeTypeId==='RECT'){
      board.appendChild(playerMarker(CENTER_COL,CENTER_ROW));const length=Number(range.LENGTH_TILES),width=Number(range.WIDTH_TILES);
      if(Number.isFinite(length)&&Number.isFinite(width)){const top=CENTER_ROW-Math.floor((width-1)/2);addAttack(board,'rangeGridAttack rangeGridRect',CENTER_COL+1,top,length,width);labels(board,`前方 ${valueText(length)}マス / 幅 ${valueText(width)}マス`)}else labels(board,'前方・近距離');
    }else if(chip.rangeTypeId==='SELF'){
      board.appendChild(playerMarker(CENTER_COL,CENTER_ROW));addCell(board,'rangeGridSelf',CENTER_COL,CENTER_ROW);labels(board,'対象：自分自身','自分中心');
    }else{
      board.appendChild(playerMarker(CENTER_COL,CENTER_ROW));labels(board,detailText(chip).rangeDescription||'範囲情報なし','模式図');
    }
    rangeViz.className='rangeViz rangeGridViz';rangeViz.replaceChildren(board);
  }

  function renderChip(chip,{setName=true}={}){
    if(!chip)return false;
    if(setName&&detailName.textContent!==chip.chipName)detailName.textContent=chip.chipName||'';
    const text=detailText(chip);
    renderHeader(chip);renderCodes(chip);renderValues(chip);renderAttributes(chip);
    if(description)description.textContent=text.description;if(rangeText)rangeText.textContent=text.rangeDescription;
    renderRangeSpecs(chip);renderRangeDiagram(chip);renderArtwork(chip);
    if(codeScroller)codeScroller.scrollLeft=0;values.scrollLeft=0;attributes.scrollLeft=0;return true;
  }
  function renderCurrent(){if(!modal.classList.contains('open'))return;const chip=chipsByName.get(detailName.textContent.trim());if(chip)renderChip(chip,{setName:false})}
  function openByChipId(chipId){const chip=master.getChip(chipId);if(!chip)return false;renderChip(chip,{setName:true});modal.classList.add('open');modal.querySelector('.chipDetail')?.scrollTo({top:0,left:0,behavior:'auto'});return true}
  function openByChipName(name){const chip=chipsByName.get(String(name||'').trim());return chip?openByChipId(chip.chipId):false}
  new MutationObserver(()=>{if(modal.classList.contains('open'))queueMicrotask(renderCurrent)}).observe(modal,{attributes:true,attributeFilter:['class']});
  window.BattleNetworkChipDetail=Object.freeze({openByChipId,openByChipName,renderChip});
})();