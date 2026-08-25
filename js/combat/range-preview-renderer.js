(()=>{
  const battle=document.getElementById('battle');
  const scene=document.getElementById('scene');
  const field=window.BattleNetworkField;
  if(!battle||!scene||!field)return;

  const layer=document.createElement('div');
  layer.id='combatPreviewLayer';
  layer.style.position='absolute';
  layer.style.left='0';
  layer.style.top='0';
  layer.style.width=`${scene.clientWidth}px`;
  layer.style.height=`${scene.clientHeight}px`;
  layer.style.transformOrigin='0 0';
  layer.style.pointerEvents='none';
  layer.style.willChange='transform';
  layer.style.zIndex='4';
  battle.appendChild(layer);

  let lastSceneTransform='';
  function syncLayerTransform(){
    const next=scene.style.transform||'';
    if(next!==lastSceneTransform){
      layer.style.transform=next;
      lastSceneTransform=next;
    }
    requestAnimationFrame(syncLayerTransform);
  }
  requestAnimationFrame(syncLayerTransform);

  const SVG_NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(SVG_NS,'svg');
  const polygon=document.createElementNS(SVG_NS,'polygon');
  const ellipse=document.createElementNS(SVG_NS,'ellipse');
  svg.setAttribute('class','battleRangeOverlay');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('preserveAspectRatio','none');
  polygon.setAttribute('class','battleRangeShape');
  ellipse.setAttribute('class','battleRangeShape');
  polygon.style.display='none';
  ellipse.style.display='none';
  svg.append(polygon,ellipse);
  layer.appendChild(svg);

  let width=0,height=0,px=0,py=0,visible=false,hideGeneration=0,activeShape='';
  let lastRangeType='',lastPolygonGeometry='',lastPolygonTransform='',lastEllipseGeometry='',lastEllipseTransform='';

  function refreshProjection(){
    const nextWidth=scene.clientWidth,nextHeight=scene.clientHeight;
    if(!nextWidth||!nextHeight)return false;
    if(nextWidth===width&&nextHeight===height)return true;
    width=nextWidth;height=nextHeight;
    layer.style.width=`${width}px`;
    layer.style.height=`${height}px`;
    px=width/(field.WORLD_SIZE*2);py=height/(field.WORLD_SIZE*2);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    lastPolygonGeometry='';lastPolygonTransform='';lastEllipseGeometry='';lastEllipseTransform='';
    return true;
  }

  function project(point){return{x:(point.x-point.y)*px+width/2,y:(point.x+point.y)*py}}
  function setActiveShape(next){if(activeShape===next)return;activeShape=next;polygon.style.display=next==='polygon'?'':'none';ellipse.style.display=next==='ellipse'?'':'none'}
  function applyHidden(){if(!visible)return;svg.classList.remove('show');visible=false}
  function hide(){const generation=++hideGeneration;queueMicrotask(()=>{if(generation===hideGeneration)applyHidden()})}

  function renderForwardShape(shape){
    if(!shape.origin||!shape.direction||!Number.isFinite(shape.lengthWorld)||!Number.isFinite(shape.widthWorld))return false;
    const half=shape.widthWorld/2;
    const geometry=`0,${-half} ${shape.lengthWorld},${-half} ${shape.lengthWorld},${half} 0,${half}`;
    if(geometry!==lastPolygonGeometry){polygon.setAttribute('points',geometry);lastPolygonGeometry=geometry}

    const dir=shape.direction,normal=shape.normal||{x:-dir.y,y:dir.x},origin=project(shape.origin);
    const a=px*(dir.x-dir.y),b=py*(dir.x+dir.y),c=px*(normal.x-normal.y),d=py*(normal.x+normal.y);
    const transform=`matrix(${a} ${b} ${c} ${d} ${origin.x} ${origin.y})`;
    if(transform!==lastPolygonTransform){polygon.setAttribute('transform',transform);lastPolygonTransform=transform}
    setActiveShape('polygon');
    return true;
  }

  function renderCircle(shape){
    if(!shape.center||!Number.isFinite(shape.radiusWorld))return false;
    const rx=Math.SQRT2*shape.radiusWorld*px,ry=Math.SQRT2*shape.radiusWorld*py;
    const geometry=`${rx}|${ry}`;
    if(geometry!==lastEllipseGeometry){ellipse.setAttribute('cx','0');ellipse.setAttribute('cy','0');ellipse.setAttribute('rx',rx);ellipse.setAttribute('ry',ry);lastEllipseGeometry=geometry}
    const center=project(shape.center),transform=`translate(${center.x} ${center.y})`;
    if(transform!==lastEllipseTransform){ellipse.setAttribute('transform',transform);lastEllipseTransform=transform}
    setActiveShape('ellipse');
    return true;
  }

  function render(shape){
    ++hideGeneration;
    if(!shape)return applyHidden();
    if((!width||!height)&&!refreshProjection())return applyHidden();
    const rendered=shape.rangeTypeId==='CIRCLE'?renderCircle(shape):renderForwardShape(shape);
    if(!rendered)return applyHidden();
    const rangeType=(shape.rangeTypeId||'').toLowerCase();
    if(rangeType!==lastRangeType){polygon.dataset.rangeType=rangeType;ellipse.dataset.rangeType=rangeType;lastRangeType=rangeType}
    if(!visible){svg.classList.add('show');visible=true}
  }

  refreshProjection();
  window.addEventListener('resize',refreshProjection,{passive:true});
  window.BattleNetworkRangePreview=Object.freeze({render,hide,refreshProjection});
})();
