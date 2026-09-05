(()=>{
  const scene=document.getElementById('scene');
  if(!scene||scene.dataset.swordEffectHook==='v11')return;
  scene.dataset.swordEffectHook='v11';

  const PX=.72,PY=.36,SWORD_ID='CHIP_0002',WIDE_ID='CHIP_0003';
  const SWORD_SCALE_X=.6,WIDE_SCALE_X_MULTIPLIER=3,FORWARD_OFFSET=150,MAX_PROJECTED_LENGTH=Math.SQRT2*Math.max(PX,PY);
  const CSS_WIDTH=520,CSS_HEIGHT=320,DURATION=390,DPR=Math.min(2,Math.max(1,window.devicePixelRatio||1));
  const nativeAppendChild=scene.appendChild.bind(scene);
  const meleePreview=document.getElementById('meleePreview');
  const surfacePools={SWORD:[],WIDE:[]};
  let activeEffects=0;

  const style=document.createElement('style');
  style.id='swordEffectDirectStyle';
  style.textContent=`
    #scene .swordSlashFxLayer{position:absolute;left:0;top:0;width:${CSS_WIDTH}px;height:${CSS_HEIGHT}px;z-index:9;pointer-events:none;opacity:0;overflow:visible;transform-origin:50% 50%;will-change:transform,opacity;backface-visibility:hidden}
    #scene .swordSlashFx{display:block;width:${CSS_WIDTH}px;height:${CSS_HEIGHT}px;background:transparent!important;border:0!important;box-shadow:none!important;transform-origin:32px 50%;will-change:transform;backface-visibility:hidden}
  `;
  document.head.appendChild(style);

  function currentContext(){return window.BattleNetworkCombatRange?.getLastAttackContext?.()||null}
  function currentSlashType(){
    const context=currentContext();
    if(context?.sourceType==='CHIP'){
      if(context.sourceId===SWORD_ID)return 'SWORD';
      if(context.sourceId===WIDE_ID)return 'WIDE';
    }
    const target=window.BattleNetworkFolder?.getTestTarget?.();
    if(target?.enabled===true&&target?.type==='SWORD')return 'SWORD';
    if(target?.enabled===true&&target?.type==='WIDE')return 'WIDE';
    return null;
  }

  function projectedDirection(){
    const direction=currentContext()?.shape?.direction||window.BattleNetworkPlayer?.getFacing?.()||{x:1,y:0};
    let dx=Number(direction.x),dy=Number(direction.y);
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<.0001){dx=1;dy=0}
    const worldLength=Math.hypot(dx,dy)||1;
    dx/=worldLength;dy/=worldLength;
    const sx=(dx-dy)*PX,sy=(dx+dy)*PY;
    const projectedLength=Math.hypot(sx,sy)||1;
    const directionScale=Math.max(.5,Math.min(1,projectedLength/MAX_PROJECTED_LENGTH));
    return {
      angle:Math.atan2(sy,sx)*180/Math.PI,
      x:sx/projectedLength,
      y:sy/projectedLength,
      scaleX:SWORD_SCALE_X*directionScale,
      directionScale
    };
  }

  function bodyPath(ctx){
    ctx.moveTo(32,86);
    ctx.bezierCurveTo(154,91,332,102,438,126);
    ctx.bezierCurveTo(472,134,487,149,477,166);
    ctx.bezierCurveTo(449,208,337,236,67,229);
    ctx.bezierCurveTo(165,206,235,181,266,155);
    ctx.bezierCurveTo(229,124,144,101,32,86);
    ctx.closePath();
  }

  function stroke(ctx,draw,color,width,alpha,blur=0){
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.strokeStyle=color;
    ctx.lineWidth=width;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.shadowColor='rgba(114,224,255,.95)';
    ctx.shadowBlur=blur;
    ctx.beginPath();
    draw(ctx);
    ctx.stroke();
    ctx.restore();
  }

  function drawSwordSlash(ctx){
    const outer=ctx.createLinearGradient(35,92,480,190);
    outer.addColorStop(0,'rgba(80,207,247,.10)');
    outer.addColorStop(.20,'rgba(99,222,255,.54)');
    outer.addColorStop(.58,'rgba(151,237,255,.78)');
    outer.addColorStop(.84,'rgba(201,249,255,.88)');
    outer.addColorStop(1,'rgba(132,227,255,.58)');

    ctx.save();
    ctx.globalAlpha=.96;
    ctx.fillStyle=outer;
    ctx.shadowColor='rgba(89,214,255,.88)';
    ctx.shadowBlur=24;
    ctx.beginPath();
    bodyPath(ctx);
    ctx.fill();
    ctx.restore();

    const inner=ctx.createLinearGradient(70,110,455,155);
    inner.addColorStop(0,'rgba(180,247,255,.12)');
    inner.addColorStop(.48,'rgba(219,253,255,.66)');
    inner.addColorStop(1,'rgba(245,255,255,.92)');
    ctx.save();
    ctx.globalAlpha=.82;
    ctx.fillStyle=inner;
    ctx.beginPath();
    ctx.moveTo(58,103);
    ctx.bezierCurveTo(188,104,345,113,439,135);
    ctx.bezierCurveTo(459,140,466,149,459,158);
    ctx.bezierCurveTo(423,176,352,188,272,194);
    ctx.bezierCurveTo(287,177,292,163,279,151);
    ctx.bezierCurveTo(239,126,158,110,58,103);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    stroke(ctx,c=>{c.moveTo(45,90);c.bezierCurveTo(174,94,343,105,441,128);c.bezierCurveTo(461,133,473,142,476,151)},'rgba(245,255,255,.98)',7.5,.95,8);
    stroke(ctx,c=>{c.moveTo(63,111);c.bezierCurveTo(192,114,341,122,435,142)},'rgba(198,248,255,.92)',3.2,.85,5);
    stroke(ctx,c=>{c.moveTo(75,224);c.bezierCurveTo(191,209,320,196,438,169)},'rgba(89,214,252,.92)',5.5,.72,9);
    stroke(ctx,c=>{c.moveTo(101,193);c.bezierCurveTo(181,183,236,170,281,153)},'rgba(229,254,255,.82)',3.1,.70,5);
    stroke(ctx,c=>{c.moveTo(145,206);c.bezierCurveTo(246,191,340,174,414,154)},'rgba(128,231,255,.72)',2.4,.64,4);
    stroke(ctx,c=>{c.moveTo(185,126);c.bezierCurveTo(266,128,340,136,407,149)},'rgba(238,255,255,.78)',2.3,.62,4);
  }

  function createSurface(type){
    const layer=document.createElement('div');
    layer.className='swordSlashFxLayer';
    const canvas=document.createElement('canvas');
    canvas.className='swordSlashFx';
    canvas.width=Math.round(CSS_WIDTH*DPR);
    canvas.height=Math.round(CSS_HEIGHT*DPR);
    canvas.style.width=CSS_WIDTH+'px';
    canvas.style.height=CSS_HEIGHT+'px';
    const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true})||canvas.getContext('2d');
    if(ctx){ctx.setTransform(DPR,0,0,DPR,0,0);drawSwordSlash(ctx)}
    layer.appendChild(canvas);
    nativeAppendChild(layer);
    const surface={type,layer,canvas,busy:false,fade:null,grow:null};
    surfacePools[type].push(surface);
    return surface;
  }

  createSurface('SWORD');
  createSurface('SWORD');
  createSurface('WIDE');
  createSurface('WIDE');

  function acquireSurface(type){return surfacePools[type]?.find(surface=>!surface.busy)||surfacePools[type]?.[0]||null}
  function cancelAnimation(animation){if(animation){animation.onfinish=null;animation.oncancel=null;animation.cancel()}}

  function renderSlashFx(sourceNode,type){
    const width=parseFloat(sourceNode.style.width)||160;
    const height=parseFloat(sourceNode.style.height)||90;
    const left=parseFloat(sourceNode.style.left)||0;
    const top=parseFloat(sourceNode.style.top)||0;
    const centerX=left+width/2;
    const centerY=top+height/2;
    const projection=projectedDirection();
    const surface=acquireSurface(type);
    if(!surface)return;

    cancelAnimation(surface.fade);
    cancelAnimation(surface.grow);
    surface.fade=null;surface.grow=null;surface.busy=true;

    const x=centerX-CSS_WIDTH/2+projection.x*FORWARD_OFFSET;
    const y=centerY-CSS_HEIGHT/2-8+projection.y*FORWARD_OFFSET;
    const widthMultiplier=type==='WIDE'?WIDE_SCALE_X_MULTIPLIER:1;
    const targetScaleX=projection.scaleX*widthMultiplier;
    const startScaleX=Math.max(.04,targetScaleX*.18);

    surface.layer.dataset.effectType=type;
    surface.layer.dataset.forwardOffset=String(FORWARD_OFFSET);
    surface.layer.dataset.directionScale=projection.directionScale.toFixed(3);
    surface.layer.dataset.widthMultiplier=String(widthMultiplier);
    surface.layer.style.transform=`translate3d(${x}px,${y}px,0) rotate(${projection.angle.toFixed(2)}deg)`;
    surface.layer.style.opacity='0';
    surface.canvas.style.transform=`scaleX(${targetScaleX})`;

    activeEffects++;
    if(meleePreview)meleePreview.style.opacity='0';
    let finished=false;

    function finish(){
      if(finished)return;
      finished=true;
      surface.layer.style.opacity='0';
      surface.canvas.style.transform=`scaleX(${targetScaleX})`;
      surface.busy=false;
      surface.fade=null;
      surface.grow=null;
      activeEffects=Math.max(0,activeEffects-1);
      if(activeEffects===0&&meleePreview)meleePreview.style.opacity='';
    }

    if(typeof surface.layer.animate==='function'&&typeof surface.canvas.animate==='function'){
      surface.grow=surface.canvas.animate([
        {transform:`scaleX(${startScaleX})`},
        {transform:`scaleX(${targetScaleX})`}
      ],{duration:DURATION*.24,fill:'forwards',easing:'cubic-bezier(.22,1,.36,1)'});
      surface.fade=surface.layer.animate([
        {opacity:0,offset:0},
        {opacity:1,offset:.04},
        {opacity:1,offset:.68},
        {opacity:0,offset:1}
      ],{duration:DURATION,fill:'forwards',easing:'linear'});
      surface.fade.onfinish=finish;
      surface.fade.oncancel=()=>{if(!finished)finish()};
    }else{
      surface.layer.style.opacity='1';
      surface.canvas.style.transform=`scaleX(${targetScaleX})`;
      setTimeout(finish,DURATION);
    }
  }

  scene.appendChild=function(node){
    if(node instanceof HTMLElement&&node.classList.contains('slash')){
      const type=currentSlashType();
      if(type){renderSlashFx(node,type);return node}
    }
    return nativeAppendChild(node);
  };

  window.BattleNetworkSwordEffectDirect=Object.freeze({
    version:'DIRECT_CANVAS_V11_WIDE_X3_SWORD_SHAPE',
    scaleX:SWORD_SCALE_X,
    wideScaleXMultiplier:WIDE_SCALE_X_MULTIPLIER,
    forwardOffset:FORWARD_OFFSET,
    getProjection:()=>projectedDirection(),
    renderer:'PREPAINTED_TRANSFORM_OPACITY'
  });
})();
