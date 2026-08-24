(()=>{
  const scene=document.getElementById('scene');
  const field=window.BattleNetworkField;
  if(!scene||!field)return;

  const SVG_NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(SVG_NS,'svg');
  const polygon=document.createElementNS(SVG_NS,'polygon');
  svg.setAttribute('class','battleRangeOverlay');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('preserveAspectRatio','none');
  polygon.setAttribute('class','battleRangeShape');
  svg.appendChild(polygon);
  scene.appendChild(svg);

  let width=0;
  let height=0;
  let px=0;
  let py=0;
  let visible=false;
  let hideGeneration=0;
  let lastPoints='';
  let lastRangeType='';

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
    return true;
  }

  function projectToText(point){
    const x=(point.x-point.y)*px+width/2;
    const y=(point.x+point.y)*py;
    return `${x},${y}`;
  }

  function applyHidden(){
    if(!visible)return;
    svg.classList.remove('show');
    visible=false;
  }

  function hide(){
    const generation=++hideGeneration;
    queueMicrotask(()=>{
      if(generation!==hideGeneration)return;
      applyHidden();
    });
  }

  function render(shape){
    ++hideGeneration;
    if(!shape||!Array.isArray(shape.points)||shape.points.length<3){
      applyHidden();
      return;
    }
    if(!width||!height){
      if(!refreshProjection()){
        applyHidden();
        return;
      }
    }

    const points=shape.points.map(projectToText).join(' ');
    if(points!==lastPoints){
      polygon.setAttribute('points',points);
      lastPoints=points;
    }

    const rangeType=(shape.rangeTypeId||'').toLowerCase();
    if(rangeType!==lastRangeType){
      polygon.dataset.rangeType=rangeType;
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