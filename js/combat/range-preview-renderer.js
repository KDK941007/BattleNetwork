(()=>{
  const scene=document.getElementById('scene');
  const field=window.BattleNetworkField;
  if(!scene||!field)return;

  const SVG_NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(SVG_NS,'svg');
  const polygon=document.createElementNS(SVG_NS,'polygon');
  const ellipse=document.createElementNS(SVG_NS,'ellipse');
  const MIN_RENDER_INTERVAL_MS=32;
  svg.setAttribute('class','battleRangeOverlay');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('preserveAspectRatio','none');
  polygon.setAttribute('class','battleRangeShape');
  ellipse.setAttribute('class','battleRangeShape');
  polygon.style.display='none';
  ellipse.style.display='none';
  svg.append(polygon,ellipse);
  scene.appendChild(svg);

  let width=0;
  let height=0;
  let px=0;
  let py=0;
  let visible=false;
  let hideGeneration=0;
  let activeShape='';
  let lastPoints='';
  let lastRangeType='';
  let lastEllipse='';
  let lastRenderAt=-Infinity;

  function refreshProjection(){
    const nextWidth=scene.clientWidth;
    const nextHeight=scene.clientHeight;
    if(!nextWidth||!nextHeight)return false;
    if(nextWidth===width&&nextHeight===height)return true;

    width=nextWidth;
    height=nextHeight;
    px=width/(field.WORLD_SIZE*2);
    py=height/(field.WORLD_SIZE*2);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    lastPoints='';
    lastEllipse='';
    lastRenderAt=-Infinity;
    return true;
  }

  function project(point){
    return {
      x:(point.x-point.y)*px+width/2,
      y:(point.x+point.y)*py
    };
  }

  function projectToText(point){
    const p=project(point);
    return `${p.x},${p.y}`;
  }

  function setActiveShape(next){
    if(activeShape===next)return;
    activeShape=next;
    polygon.style.display=next==='polygon'?'':'none';
    ellipse.style.display=next==='ellipse'?'':'none';
  }

  function applyHidden(){
    if(!visible)return;
    svg.classList.remove('show');
    visible=false;
    lastRenderAt=-Infinity;
  }

  function hide(){
    const generation=++hideGeneration;
    queueMicrotask(()=>{
      if(generation!==hideGeneration)return;
      applyHidden();
    });
  }

  function renderCircle(shape){
    if(!shape.center||!Number.isFinite(shape.radiusWorld))return false;
    const center=project(shape.center);
    const rx=Math.SQRT2*shape.radiusWorld*px;
    const ry=Math.SQRT2*shape.radiusWorld*py;
    const values=`${center.x}|${center.y}|${rx}|${ry}`;
    if(values!==lastEllipse){
      ellipse.setAttribute('cx',center.x);
      ellipse.setAttribute('cy',center.y);
      ellipse.setAttribute('rx',rx);
      ellipse.setAttribute('ry',ry);
      lastEllipse=values;
    }
    setActiveShape('ellipse');
    return true;
  }

  function renderPolygon(shape){
    if(!Array.isArray(shape.points)||shape.points.length<3)return false;
    const points=shape.points.map(projectToText).join(' ');
    if(points!==lastPoints){
      polygon.setAttribute('points',points);
      lastPoints=points;
    }
    setActiveShape('polygon');
    return true;
  }

  function render(shape){
    ++hideGeneration;
    if(!shape){
      applyHidden();
      return;
    }
    if(!width||!height){
      if(!refreshProjection()){
        applyHidden();
        return;
      }
    }

    const now=performance.now();
    if(visible&&now-lastRenderAt<MIN_RENDER_INTERVAL_MS)return;
    lastRenderAt=now;

    const rendered=shape.rangeTypeId==='CIRCLE'
      ?renderCircle(shape)
      :renderPolygon(shape);
    if(!rendered){
      applyHidden();
      return;
    }

    const rangeType=(shape.rangeTypeId||'').toLowerCase();
    if(rangeType!==lastRangeType){
      polygon.dataset.rangeType=rangeType;
      ellipse.dataset.rangeType=rangeType;
      lastRangeType=rangeType;
    }

    if(!visible){
      svg.classList.add('show');
      visible=true;
    }
  }

  refreshProjection();
  window.addEventListener('resize',refreshProjection,{passive:true});

  window.BattleNetworkRangePreview=Object.freeze({render,hide,refreshProjection});
})();
