(()=>{
  const scene=document.getElementById('scene');
  const field=window.BattleNetworkField;
  if(!scene||!field)return;

  const SVG_NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(SVG_NS,'svg');
  const path=document.createElementNS(SVG_NS,'path');
  svg.setAttribute('class','bombTrajectoryOverlay');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('preserveAspectRatio','none');
  path.setAttribute('class','bombTrajectoryPath');
  svg.appendChild(path);
  scene.appendChild(svg);

  let width=0,height=0,px=0,py=0,visible=false,lastPath='',lastTransform='';

  function refreshProjection(){
    const nextWidth=scene.clientWidth,nextHeight=scene.clientHeight;
    if(!nextWidth||!nextHeight)return false;
    if(nextWidth===width&&nextHeight===height)return true;
    width=nextWidth;height=nextHeight;
    px=width/(field.WORLD_SIZE*2);py=height/(field.WORLD_SIZE*2);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    lastPath='';lastTransform='';
    return true;
  }

  function project(point){return{x:(point.x-point.y)*px+width/2,y:(point.x+point.y)*py}}
  function hide(){if(!visible)return;svg.classList.remove('show');visible=false}

  function render(origin,target){
    if(!origin||!target)return hide();
    if((!width||!height)&&!refreshProjection())return hide();

    const originScreen=project(origin);
    const dx=target.x-origin.x,dy=target.y-origin.y;
    const endX=(dx-dy)*px,endY=(dx+dy)*py;
    const startY=-30;
    const apexLift=field.TILE_SIZE*py*1.35;
    const controlX=endX/2;
    const controlY=(startY+endY)/2-apexLift*2;
    const nextPath=`M 0 ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
    if(nextPath!==lastPath){path.setAttribute('d',nextPath);lastPath=nextPath}

    const transform=`translate(${originScreen.x} ${originScreen.y})`;
    if(transform!==lastTransform){path.setAttribute('transform',transform);lastTransform=transform}

    if(!visible){svg.classList.add('show');visible=true}
  }

  refreshProjection();
  window.addEventListener('resize',refreshProjection,{passive:true});
  window.BattleNetworkBombPreview=Object.freeze({render,hide,refreshProjection});
})();
