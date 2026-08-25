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
  const rangeViz=document.getElementById('detailRange');

  if(!master||!modal||!detailName||!chipTitleName||!libraryNo||!classValue||!capacity||!rarity||!values||!attributes)return;

  const chipsByName=new Map((data.CHIP_MASTER||[]).map(chip=>[chip.chipName,chip]));
  const GRID_COLS=7;
  const GRID_ROWS=5;
  const ORIGIN_X=1.5;
  const ORIGIN_Y=2.5;

  function createEmptyToken(text='--'){
    const token=document.createElement('span');
    token.className='detailInfoToken detailInfoTokenEmpty';
    token.textContent=text;
    return token;
  }

  function renderHeaderInfo(chip){
    const chipClass=master.getChipClass(chip.chipId);
    const no=Number.isFinite(chip.libraryNo)?String(chip.libraryNo).padStart(4,'0'):'----';
    libraryNo.textContent=`No.${no}`;
    chipTitleName.textContent=chip.chipName||'--';
    classValue.textContent=chipClass?.classInitial||'--';
    capacity.textContent=Number.isFinite(chip.capacityMb)?String(chip.capacityMb):'--';
    rarity.textContent=Number.isFinite(chip.rarity)&&chip.rarity>0?'★'.repeat(chip.rarity):'--';
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

  function percentX(tileValue){return `${tileValue/GRID_COLS*100}%`}
  function percentY(tileValue){return `${tileValue/GRID_ROWS*100}%`}

  function setTileRect(element,left,top,width,height){
    element.style.left=percentX(left);
    element.style.top=percentY(top);
    element.style.width=percentX(width);
    element.style.height=percentY(height);
  }

  function createGridPlayer(){
    const player=document.createElement('span');
    player.className='rangeGridPlayer';
    player.style.left=percentX(ORIGIN_X);
    player.style.top=percentY(ORIGIN_Y);
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

  function createBombArc(targetX){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('rangeGridArc');
    svg.setAttribute('viewBox',`0 0 ${GRID_COLS*100} ${GRID_ROWS*100}`);
    svg.setAttribute('preserveAspectRatio','none');

    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    const startX=ORIGIN_X*100;
    const startY=ORIGIN_Y*100;
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
    const board=document.createElement('div');
    board.className='rangeGridBoard';
    board.dataset.rangeType=chip.rangeTypeId||'';
    board.appendChild(createGridPlayer());

    let legend='';

    if(chip.rangeTypeId==='LINE'||chip.rangeTypeId==='RECT'){
      const length=Number(range.LENGTH_TILES);
      const width=Number(range.WIDTH_TILES);
      if(Number.isFinite(length)&&Number.isFinite(width)){
        const attack=document.createElement('span');
        attack.className=`rangeGridAttack ${chip.rangeTypeId==='LINE'?'rangeGridLine':'rangeGridRect'}`;
        setTileRect(attack,ORIGIN_X,ORIGIN_Y-width/2,length,width);
        board.appendChild(attack);
        legend=`射程 ${length}マス / 幅 ${width}マス`;
      }
    }else if(chip.rangeTypeId==='CIRCLE'){
      const radius=Number(range.RADIUS_TILES);
      const throwDistance=Number(behavior.THROW_DISTANCE_TILES);
      const centerX=ORIGIN_X+(Number.isFinite(throwDistance)?throwDistance:0);
      if(Number.isFinite(radius)){
        const target=document.createElement('span');
        target.className='rangeGridCircle';
        setTileRect(target,centerX-radius,ORIGIN_Y-radius,radius*2,radius*2);
        board.appendChild(target);
      }
      if(Number.isFinite(throwDistance)&&throwDistance>0){
        board.appendChild(createBombArc(centerX));
        legend=`${throwDistance}マス先 / 半径 ${radius}マス`;
      }else{
        legend=`半径 ${radius}マス`;
      }
    }else if(chip.rangeTypeId==='SELF'){
      const self=document.createElement('span');
      self.className='rangeGridSelf';
      self.style.left=percentX(ORIGIN_X);
      self.style.top=percentY(ORIGIN_Y);
      board.appendChild(self);
      legend='対象：自分自身';
    }else{
      const unsupported=document.createElement('span');
      unsupported.className='rangeGridUnsupported';
      unsupported.textContent='範囲図は準備中';
      board.appendChild(unsupported);
      legend=chip.rangeTypeId||'--';
    }

    createGridLabels(board,legend);
    rangeViz.classList.add('rangeGridViz');
    rangeViz.replaceChildren(board);
  }

  function render(){
    if(!modal.classList.contains('open'))return;
    const chip=chipsByName.get(detailName.textContent.trim());
    if(!chip)return;
    renderHeaderInfo(chip);
    renderValues(chip);
    renderAttributes(chip);
    renderRangeDiagram(chip);
    fitArtwork();
    values.scrollLeft=0;
    attributes.scrollLeft=0;
  }

  const modalObserver=new MutationObserver(()=>{
    if(modal.classList.contains('open'))queueMicrotask(render);
  });
  modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});

  const nameObserver=new MutationObserver(()=>{
    if(modal.classList.contains('open'))queueMicrotask(render);
  });
  nameObserver.observe(detailName,{childList:true,subtree:true,characterData:true});

  if(artwork){
    const artworkObserver=new MutationObserver(()=>{
      if(modal.classList.contains('open'))queueMicrotask(fitArtwork);
    });
    artworkObserver.observe(artwork,{childList:true,subtree:true});
  }
})();
