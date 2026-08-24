(()=>{
  const scene=document.getElementById('scene');
  const field=window.BattleNetworkField;
  if(!scene||!field)return;

  const SVG_NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(SVG_NS,'svg');
  const polygon=document.createElementNS(SVG_NS,'polygon');
  svg.setAttribute('class','battleRangeOverlay');
  svg.setAttribute('aria-hidden','true');
  polygon.setAttribute('class','battleRangeShape');
  svg.appendChild(polygon);
  scene.appendChild(svg);

  function project(point){
    const width=scene.clientWidth;
    const height=scene.clientHeight;
    const px=width/(field.WORLD_SIZE*2);
    const py=height/(field.WORLD_SIZE*2);
    return {
      x:(point.x-point.y)*px+width/2,
      y:(point.x+point.y)*py
    };
  }

  function hide(){
    svg.classList.remove('show');
    polygon.removeAttribute('points');
    polygon.dataset.rangeType='';
  }

  function render(shape){
    if(!shape||!Array.isArray(shape.points)||shape.points.length<3){
      hide();
      return;
    }
    const width=scene.clientWidth;
    const height=scene.clientHeight;
    if(!width||!height){
      hide();
      return;
    }
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio','none');
    polygon.setAttribute('points',shape.points.map(point=>{
      const p=project(point);
      return `${p.x},${p.y}`;
    }).join(' '));
    polygon.dataset.rangeType=(shape.rangeTypeId||'').toLowerCase();
    svg.classList.add('show');
  }

  window.BattleNetworkRangePreview=Object.freeze({render,hide});
})();