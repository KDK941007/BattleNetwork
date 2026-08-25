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

  let width=0;
  let height=0;
  let px=0;
  let py=0;
  let visible=false;
  let lastPath='';

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
    lastPath='';
    return true;
  }

  function project(point){
    return {
      x:(point.x-point.y)*px+width/2,
      y:(point.x+point.y)*py
    };
  }

  function hide(){
    if(!visible)return;
    svg.classList.remove('show');
    visible=false;
  }

  function render(origin,target){
    if(!origin||!target)return hide();
    if(!width||!height){
      if(!refreshProjection())return hide();
    }

    const start=project(origin);
    const end=project(target);
    start.y-=30;

    const middleX=(start.x+end.x)/2;
    const middleY=(start.y+end.y)/2;
    const apexLift=field.TILE_SIZE*py*1.35;
    const controlY=middleY-apexLift*2;
    const nextPath=`M ${start.x} ${start.y} Q ${middleX} ${controlY} ${end.x} ${end.y}`;

    if(nextPath!==lastPath){
      path.setAttribute('d',nextPath);
      lastPath=nextPath;
    }

    if(!visible){
      svg.classList.add('show');
      visible=true;
    }
  }

  refreshProjection();
  window.addEventListener('resize',refreshProjection,{passive:true});

  window.BattleNetworkBombPreview=Object.freeze({render,hide,refreshProjection});
})();
