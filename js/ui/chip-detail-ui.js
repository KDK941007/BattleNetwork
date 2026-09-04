(()=>{
  const master=window.BattleNetworkMaster;
  const data=window.BattleNetworkData||{};

  const modal=document.getElementById('chipDetailModal');
  const detailName=document.getElementById('detailName');
  const chipTitleName=document.getElementById('detailChipName');
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

  if(!master||!modal||!detailName||!chipTitleName||!libraryNo||!classValue||!capacity||!rarity||!values||!attributes)return;

  const chipsByName=new Map((data.CHIP_MASTER||[]).map(chip=>[chip.chipName,chip]));
  const rangeTypeById=new Map((data.RANGE_TYPE_MASTER||[]).map(row=>[row.rangeTypeId,row]));
  const GRID_COLS=7;
  const GRID_ROWS=5;
  const CENTER_PLAYER_TILE_COL=Math.floor(GRID_COLS/2);
  const CENTER_PLAYER_TILE_ROW=Math.floor(GRID_ROWS/2);

  const SPECIAL_RANGE_INFO=Object.freeze({
    CHIP_EXE4_S004:Object.freeze({type:'射撃',direction:'前方',distance:'長距離',shape:'直線・敵1体'}),
    CHIP_EXE4_S005:Object.freeze({type:'射撃',direction:'前方',distance:'長距離',shape:'直線・3連射'}),
    CHIP_EXE4_S106:Object.freeze({type:'地形操作',direction:'前方',distance:'1マス',shape:'正面1マス'}),
    CHIP_EXE4_S119:Object.freeze({type:'エリア操作',direction:'敵エリア',distance:'最前列',shape:'縦3パネル'}),
    CHIP_EXE4_S148:Object.freeze({type:'数値付加',direction:'直前チップ',distance:'--',shape:'攻撃力+10'})
  });

  function ensureStructure(){
    const row=modal.querySelector('.detailText .detailRow');
    if(!row)return null;

    const contentLabel=modal.querySelector('.detailContentHead .detailLabel');
    if(contentLabel)contentLabel.textContent='原作効果';

    let codeScroller=document.getElementById('detailCodes');
    if(!codeScroller){
      const block=document.createElement('div');
      block.className='detailDataBlock detailCodeBlock';
      const label=document.createElement('span');
      label.className='detailLabel';
      label.textContent='コード';
      codeScroller=document.createElement('div');
      codeScroller.id='detailCodes';
      codeScroller.className='detailTokenScroller';
      codeScroller.setAttribute('aria-label','チップコード');
      block.append(label,codeScroller);
      const valuesBlock=values.closest('.detailDataBlock');
      row.insertBefore(block,valuesBlock||null);
    }

    if(!document.getElementById('chipDetailContentUpdateStyle')){
      const style=document.createElement('style');
      style.id='chipDetailContentUpdateStyle';
      style.textContent=`
        #chipDetailModal .detailText .detailRow{
          grid-template-rows:auto minmax(0,1fr) 27px 27px 27px!important;
        }
        #chipDetailModal #detailCodes .detailCodeToken{
          min-width:24px;
          justify-content:center;
          padding-inline:7px;
          border-color:#4b91aa;
          background:linear-gradient(180deg,#104155,#092b39);
        }
        #chipDetailModal #detailCodes .detailCodeToken .detailTokenValue{
          color:#f4fdff;
          font-size:9px;
          letter-spacing:.04em;
        }
        #chipDetailModal .rangeSpecValue::before{
          content:none!important;
        }
      `;
      document.head.appendChild(style);
    }
    return codeScroller;
  }

  const codeScroller=ensureStructure();

  function createEmptyToken(text='--'){
    const token=document.createElement('span');
    token.className='detailInfoToken detailInfoTokenEmpty';
    token.textContent=text;
    return token;
  }

  function renderHeaderInfo(chip){
    const chipClass=master.getChipClass(chip.chipId);
    const no=typeof chip.libraryNo==='number'&&Number.isFinite(chip.libraryNo)
      ?String(chip.libraryNo).padStart(4,'0')
      :chip.libraryNo!=null?String(chip.libraryNo):'----';
    libraryNo.textContent=`No.${no}`;
    chipTitleName.textContent=chip.chipName||'--';
    classValue.textContent=chipClass?.classInitial||'--';
    classValue.title=chipClass?.className||'';
    capacity.textContent=Number.isFinite(chip.capacityMb)?String(chip.capacityMb):'--';
    rarity.textContent=Number.isFinite(chip.rarity)&&chip.rarity>0?'★'.repeat(chip.rarity):'--';
  }

  function renderCodes(chip){
    if(!codeScroller)return;
    codeScroller.replaceChildren();
    const codes=master.getChipCodes(chip.chipId);
    if(!codes.length){
      codeScroller.appendChild(createEmptyToken());
      return;
    }
    codes.forEach(code=>{
      const token=document.createElement('span');
      token.className='detailInfoToken detailCodeToken';
      const value=document.createElement('span');
      value.className='detailTokenValue';
      value.textContent=code.codeValue||code.codeId||'--';
      token.appendChild(value);
      codeScroller.appendChild(token);
    });
  }

  function renderValues(chip){
    values.replaceChildren();
    const rows=master.getChipValues(chip.chipId).filter(row=>row.displayFlg!==false);
    if(!rows.length){
      values.appendChild(createEmptyToken());
      return;
    }

    rows.forEach(row=>{
      const token=document.createElement('span');
      token.className='detailInfoToken detailValueToken';

      const label=document.createElement('span');
      label.className='detailTokenLabel';
      label.textContent=row.labelOverride||row.valueType?.displayLabel||row.valueTypeId;

      const value=document.createElement('span');
      value.className='detailTokenValue';
      if(row.valueMode==='VARIABLE'){
        value.textContent='可変';
      }else{
        const unit=row.valueType?.unit||'';
        value.textContent=`${row.value??'--'}${unit}`;
      }

      token.append(label,value);
      values.appendChild(token);
    });
  }

  function renderAttributes(chip){
    attributes.replaceChildren();
    const rows=master.getChipAttributes(chip.chipId);
    if(!rows.length){
      attributes.appendChild(createEmptyToken());
      return;
    }

    rows.forEach(row=>{
      const attr=row.attribute;
      const token=document.createElement('span');
      token.className='detailInfoToken detailAttributeToken';

      if(attr.iconPath){
        const img=document.createElement('img');
        img.className='detailAttributeIcon';
        img.src=attr.iconPath;
        img.alt='';
        img.draggable=false;
        token.appendChild(img);
      }

      const name=document.createElement('span');
      name.className='detailTokenValue';
      name.textContent=attr.attributeName;
      token.appendChild(name);
      attributes.appendChild(token);
    });
  }

  function renderDescription(chip){
    if(description)description.textContent=chip.description||'--';
    if(rangeText)rangeText.textContent=chip.rangeDescription||'--';
  }

  function renderArtwork(chip){
    if(!artwork)return;
    const src=master.getChipImagePath(chip);
    artwork.replaceChildren();
    artwork.style.removeProperty('background-image');
    if(!src)return;
    const img=document.createElement('img');
    img.src=src;
    img.alt=chip.chipName||'';
    img.draggable=false;
    artwork.appendChild(img);
    fitArtwork();
  }

  function fitArtwork(){
    if(!artwork)return;
    const img=artwork.querySelector('img');
    if(!img)return;

    const src=img.currentSrc||img.src;
    if(!src)return;

    artwork.style.setProperty('background-image',`url("${src.replace(/"/g,'\\"')}")`,'important');
    artwork.style.setProperty('background-size','contain','important');
    artwork.style.setProperty('background-repeat','no-repeat','important');
    artwork.style.setProperty('background-position','center','important');
    artwork.style.setProperty('padding','3px','important');

    img.style.setProperty('display','none','important');
  }

  function formatNumber(value){
    const n=Number(value);
    if(!Number.isFinite(n))return null;
    return Number.isInteger(n)?String(n):String(Number(n.toFixed(2)));
  }

  function setRangeSpec(element,value){
    if(!element)return;
    element.textContent=value||'--';
    element.title=value||'--';
  }

  function getRangeInfo(chip){
    const override=SPECIAL_RANGE_INFO[chip.chipId];
    if(override)return override;

    const type=rangeTypeById.get(chip.rangeTypeId)||null;
    const range=master.getRangeParams(chip.chipId);
    const behavior=master.getBehaviorParams(chip.chipId);
    const length=formatNumber(range.LENGTH_TILES);
    const width=formatNumber(range.WIDTH_TILES);
    const radius=formatNumber(range.RADIUS_TILES);
    const throwDistance=formatNumber(behavior.THROW_DISTANCE_TILES);

    if(chip.rangeTypeId==='LINE'){
      return {
        type:type?.displayCategory||type?.rangeName||'射撃',
        direction:type?.displayDirection||'自由方向',
        distance:length?`${length}マス`:'--',
        shape:width?`直線・幅${width}マス`:'直線'
      };
    }
    if(chip.rangeTypeId==='RECT'){
      return {
        type:type?.displayCategory||type?.rangeName||'近接',
        direction:type?.displayDirection||'自由方向',
        distance:length?`${length}マス`:'--',
        shape:width?`幅${width}マス`:'矩形'
      };
    }
    if(chip.rangeTypeId==='CIRCLE'){
      return {
        type:throwDistance? '投擲':(type?.displayCategory||type?.rangeName||'範囲'),
        direction:throwDistance?'前方へ投擲':(type?.displayDirection||'発生地点基準'),
        distance:throwDistance?`${throwDistance}マス先`:'発生地点',
        shape:radius?`半径${radius}マス`:'円形'
      };
    }
    if(chip.rangeTypeId==='SELF'){
      return {
        type:type?.displayCategory||'回復',
        direction:type?.displayDirection||'自分中心',
        distance:'自分',
        shape:'自分自身'
      };
    }
    return {
      type:type?.displayCategory||type?.rangeName||'--',
      direction:type?.displayDirection||'--',
      distance:'--',
      shape:type?.rangeName||'--'
    };
  }

  function renderRangeSpecs(chip){
    const info=getRangeInfo(chip);
    setRangeSpec(rangeTypeValue,info.type);
    setRangeSpec(rangeDirectionValue,info.direction);
    setRangeSpec(rangeDistanceValue,info.distance);
    setRangeSpec(rangeShapeValue,info.shape);
  }

  function percentX(tileValue){return `${tileValue/GRID_COLS*100}%`}
  function percentY(tileValue){return `${tileValue/GRID_ROWS*100}%`}

  function setTileRect(element,left,top,width,height){
    element.style.left=percentX(left);
    element.style.top=percentY(top);
    element.style.width=percentX(width);
    element.style.height=percentY(height);
  }

  function chooseTile(preferred,min,max,count){
    const lower=Math.max(0,Math.ceil(min));
    const upper=Math.min(count-1,Math.floor(max));
    if(lower>upper)return Math.min(count-1,Math.max(0,preferred));
    return Math.min(upper,Math.max(lower,preferred));
  }

  function getDiagramPlacement(chip,range,behavior){
    let playerCol=CENTER_PLAYER_TILE_COL;
    let playerRow=CENTER_PLAYER_TILE_ROW;

    if(chip.rangeTypeId==='LINE'||chip.rangeTypeId==='RECT'){
      const length=Number(range.LENGTH_TILES);
      const width=Number(range.WIDTH_TILES);

      if(Number.isFinite(length)){
        playerCol=chooseTile(CENTER_PLAYER_TILE_COL,0,GRID_COLS-1-length,GRID_COLS);
      }

      if(Number.isFinite(width)){
        playerRow=chooseTile(CENTER_PLAYER_TILE_ROW,width/2-.5,GRID_ROWS-.5-width/2,GRID_ROWS);
      }
    }else if(chip.rangeTypeId==='CIRCLE'){
      const radius=Number(range.RADIUS_TILES);
      const throwDistance=Number(behavior.THROW_DISTANCE_TILES);
      const distance=Number.isFinite(throwDistance)?throwDistance:0;

      if(Number.isFinite(radius)){
        playerCol=chooseTile(CENTER_PLAYER_TILE_COL,radius-distance-.5,GRID_COLS-.5-distance-radius,GRID_COLS);
        playerRow=chooseTile(CENTER_PLAYER_TILE_ROW,radius-.5,GRID_ROWS-.5-radius,GRID_ROWS);
      }
    }

    return {playerCol,playerRow,originX:playerCol+.5,originY:playerRow+.5};
  }

  function createGridPlayer(originX,originY){
    const player=document.createElement('span');
    player.className='rangeGridPlayer';
    player.style.left=percentX(originX);
    player.style.top=percentY(originY);
    player.textContent='P';
    return player;
  }

  function createGridLabels(board,legend){
    const forward=document.createElement('span');
    forward.className='rangeGridForward';
    forward.textContent='前方 →';

    const unit=document.createElement('span');
    unit.className='rangeGridUnit';
    unit.textContent='1グリッド = 1マス';

    const value=document.createElement('span');
    value.className='rangeGridLegend';
    value.textContent=legend;

    board.append(forward,unit,value);
  }

  function createBombArc(originX,originY,targetX){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('rangeGridArc');
    svg.setAttribute('viewBox',`0 0 ${GRID_COLS*100} ${GRID_ROWS*100}`);
    svg.setAttribute('preserveAspectRatio','none');

    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    const startX=originX*100;
    const startY=originY*100;
    const endX=targetX*100;
    const lift=Math.max(70,(endX-startX)*.34);
    path.setAttribute('d',`M ${startX} ${startY} Q ${(startX+endX)/2} ${startY-lift} ${endX} ${startY}`);
    svg.appendChild(path);
    return svg;
  }

  function renderRangeDiagram(chip){
    if(!rangeViz)return;

    const range=master.getRangeParams(chip.chipId);
    const behavior=master.getBehaviorParams(chip.chipId);
    const placement=getDiagramPlacement(chip,range,behavior);
    const {playerCol,playerRow,originX,originY}=placement;
    const board=document.createElement('div');
    board.className='rangeGridBoard';
    board.dataset.rangeType=chip.rangeTypeId||'';
    board.appendChild(createGridPlayer(originX,originY));

    let legend='';

    if(chip.rangeTypeId==='LINE'||chip.rangeTypeId==='RECT'){
      const length=Number(range.LENGTH_TILES);
      const width=Number(range.WIDTH_TILES);
      if(Number.isFinite(length)&&Number.isFinite(width)){
        const attack=document.createElement('span');
        attack.className=`rangeGridAttack ${chip.rangeTypeId==='LINE'?'rangeGridLine':'rangeGridRect'}`;
        const attackLeft=playerCol+1;
        setTileRect(attack,attackLeft,originY-width/2,length,width);
        board.appendChild(attack);
        legend=`射程 ${formatNumber(length)}マス / 幅 ${formatNumber(width)}マス`;
      }
    }else if(chip.rangeTypeId==='CIRCLE'){
      const radius=Number(range.RADIUS_TILES);
      const throwDistance=Number(behavior.THROW_DISTANCE_TILES);
      const centerX=originX+(Number.isFinite(throwDistance)?throwDistance:0);
      if(Number.isFinite(radius)){
        const target=document.createElement('span');
        target.className='rangeGridCircle';
        setTileRect(target,centerX-radius,originY-radius,radius*2,radius*2);
        board.appendChild(target);
      }
      if(Number.isFinite(throwDistance)&&throwDistance>0){
        board.appendChild(createBombArc(originX,originY,centerX));
        legend=`${formatNumber(throwDistance)}マス先 / 半径 ${formatNumber(radius)}マス`;
      }else{
        legend=`半径 ${formatNumber(radius)}マス`;
      }
    }else if(chip.rangeTypeId==='SELF'){
      const self=document.createElement('span');
      self.className='rangeGridSelf';
      setTileRect(self,playerCol,playerRow,1,1);
      board.appendChild(self);
      legend='対象：自分自身';
    }else{
      const unsupported=document.createElement('span');
      unsupported.className='rangeGridUnsupported';
      unsupported.textContent='範囲図は未定義';
      board.appendChild(unsupported);
      legend=chip.rangeDescription||chip.rangeTypeId||'--';
    }

    createGridLabels(board,legend);
    rangeViz.className='rangeViz rangeGridViz';
    rangeViz.replaceChildren(board);
  }

  function renderChip(chip,{refreshArtwork=true}={}){
    if(!chip)return false;
    detailName.textContent=chip.chipName||'';
    renderHeaderInfo(chip);
    renderCodes(chip);
    renderValues(chip);
    renderAttributes(chip);
    renderDescription(chip);
    renderRangeSpecs(chip);
    renderRangeDiagram(chip);
    if(refreshArtwork)renderArtwork(chip);
    else fitArtwork();
    if(codeScroller)codeScroller.scrollLeft=0;
    values.scrollLeft=0;
    attributes.scrollLeft=0;
    return true;
  }

  function renderCurrent(){
    if(!modal.classList.contains('open'))return;
    const chip=chipsByName.get(detailName.textContent.trim());
    if(!chip)return;
    renderChip(chip,{refreshArtwork:true});
  }

  function openByChipId(chipId){
    const chip=master.getChip(chipId);
    if(!chip)return false;
    renderChip(chip,{refreshArtwork:true});
    modal.classList.add('open');
    modal.querySelector('.chipDetail')?.scrollTo({top:0,left:0,behavior:'auto'});
    return true;
  }

  function openByChipName(chipName){
    const chip=chipsByName.get(String(chipName||'').trim());
    return chip?openByChipId(chip.chipId):false;
  }

  const modalObserver=new MutationObserver(()=>{
    if(modal.classList.contains('open'))queueMicrotask(renderCurrent);
  });
  modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});

  const nameObserver=new MutationObserver(()=>{
    if(modal.classList.contains('open'))queueMicrotask(renderCurrent);
  });
  nameObserver.observe(detailName,{childList:true,subtree:true,characterData:true});

  if(artwork){
    const artworkObserver=new MutationObserver(()=>{
      if(modal.classList.contains('open'))queueMicrotask(fitArtwork);
    });
    artworkObserver.observe(artwork,{childList:true,subtree:true});
  }

  window.BattleNetworkChipDetail=Object.freeze({openByChipId,openByChipName,renderChip});
})();