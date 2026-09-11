(()=>{
  const scene=document.getElementById('scene');
  const FIELD=window.BattleNetworkField;
  if(!scene||!FIELD||scene.dataset.swordEffectHook==='v16')return;
  scene.dataset.swordEffectHook='v16';

  const SWORD_ID='CHIP_0002';
  const WIDE_ID='CHIP_0003';
  const LONG_ID='CHIP_EXE4_S056';
  const TILE=Number(FIELD.TILE_SIZE)||180;
  const DURATION=220;
  const DEFAULT_FORWARD_OFFSET=100;
  const VISUAL_LIFT=-30;
  const PAD=60;
  const DPR=Math.min(2,Math.max(1,window.devicePixelRatio||1));
  const nativeAppendChild=scene.appendChild.bind(scene);
  const meleePreview=document.getElementById('meleePreview');
  const pools={SWORD:[],WIDE:[],LONG:[]};
  let activeEffects=0;

  const bounds=Object.freeze({
    SWORD:Object.freeze({minX:-TILE*.5-PAD,maxX:TILE*.5+PAD,minY:-TILE*.5-PAD,maxY:TILE*.5+PAD}),
    WIDE:Object.freeze({minX:-TILE*.5-PAD,maxX:TILE*.5+PAD,minY:-TILE*1.5-PAD,maxY:TILE*1.5+PAD}),
    LONG:Object.freeze({minX:-TILE*.5-PAD,maxX:TILE*1.5+PAD,minY:-TILE*.5-PAD,maxY:TILE*.5+PAD})
  });

  const style=document.createElement('style');
  style.id='swordEffectDirectStyle';
  style.textContent=`
    #scene .swordSlashFxLayer{position:absolute;left:0;top:0;width:0;height:0;z-index:9;pointer-events:none;opacity:0;overflow:visible;will-change:opacity;backface-visibility:hidden}
    #scene .swordSlashFxCanvas{position:absolute;display:block;background:transparent!important;border:0!important;box-shadow:none!important;will-change:transform;backface-visibility:hidden}
  `;
  document.head.appendChild(style);

  function currentContext(){return window.BattleNetworkCombatRange?.getLastAttackContext?.()||null}

  function currentSlashType(){
    const context=currentContext();
    if(context?.sourceType==='CHIP'){
      if(context.sourceId===SWORD_ID)return 'SWORD';
      if(context.sourceId===WIDE_ID)return 'WIDE';
      if(context.sourceId===LONG_ID)return 'LONG';
    }
    const target=window.BattleNetworkFolder?.getTestTarget?.();
    if(target?.enabled===true&&target?.type==='SWORD')return 'SWORD';
    if(target?.enabled===true&&target?.type==='WIDE')return 'WIDE';
    if(target?.enabled===true&&target?.type==='LONG')return 'LONG';
    return null;
  }

  function normalizeDirection(direction){
    let x=Number(direction?.x),y=Number(direction?.y);
    if(!Number.isFinite(x)||!Number.isFinite(y)||Math.hypot(x,y)<.0001){x=1;y=0}
    const length=Math.hypot(x,y)||1;
    return {x:x/length,y:y/length};
  }

  function projectionConstants(){
    const world=Number(FIELD.WORLD_SIZE)||3600;
    const width=scene.clientWidth||5184;
    const height=scene.clientHeight||2592;
    return {px:width/(world*2),py:height/(world*2),width,height,world};
  }

  function projectWorld(worldX,worldY){
    const p=projectionConstants();
    return {
      x:(worldX-worldY)*p.px+p.width/2,
      y:(worldX+worldY)*p.py
    };
  }

  function projectedBasis(){
    const shape=currentContext()?.shape;
    const direction=normalizeDirection(shape?.direction||window.BattleNetworkPlayer?.getFacing?.()||{x:1,y:0});
    let normal=shape?.normal;
    let nx=Number(normal?.x),ny=Number(normal?.y);
    if(!Number.isFinite(nx)||!Number.isFinite(ny)||Math.hypot(nx,ny)<.0001){nx=-direction.y;ny=direction.x}
    const nl=Math.hypot(nx,ny)||1;
    nx/=nl;ny/=nl;
    const p=projectionConstants();
    return {
      direction,
      normal:{x:nx,y:ny},
      a:(direction.x-direction.y)*p.px,
      b:(direction.x+direction.y)*p.py,
      c:(nx-ny)*p.px,
      d:(nx+ny)*p.py
    };
  }

  function forwardOffsetPx(){
    const review=Number(window.BattleNetworkSwordOffsetReview?.getForwardOffset?.());
    return Number.isFinite(review)&&review>0?review:DEFAULT_FORWARD_OFFSET;
  }

  function effectAnchor(sourceNode,basis){
    const forward=forwardOffsetPx();
    const projectedLength=Math.hypot(basis.a,basis.b)||1;
    const dirX=basis.a/projectedLength;
    const dirY=basis.b/projectedLength;
    const shape=currentContext()?.shape;
    const originX=Number(shape?.origin?.x),originY=Number(shape?.origin?.y);
    if(Number.isFinite(originX)&&Number.isFinite(originY)){
      const point=projectWorld(originX,originY);
      return {x:point.x+dirX*forward,y:point.y+dirY*forward+VISUAL_LIFT};
    }
    const width=parseFloat(sourceNode?.style?.width)||160;
    const height=parseFloat(sourceNode?.style?.height)||90;
    const left=parseFloat(sourceNode?.style?.left)||0;
    const top=parseFloat(sourceNode?.style?.top)||0;
    return {x:left+width/2+dirX*forward,y:top+height/2+dirY*forward};
  }

  function swordGeometry(type){
    const left=-TILE*.5;
    const r=TILE*.03;
    const yTop=-TILE*.42;
    const yBottom=TILE*.42;
    const yCenter=0;
    const xInner=left+TILE*.38;

    if(type==='LONG'){
      const xTip=left+TILE*1.94;
      return {left,r,yTop,yBottom,yCenter,xInner,xTip,xOuter:left+(xTip-left)*.80,upperTipX:left+r,lowerTipX:left+r*.65,yScale:1,pointed:false};
    }
    if(type==='WIDE'){
      return {left,r,yTop,yBottom,yCenter,xInner,xTip:left+TILE*.88,xOuter:left+TILE*.76,upperTipX:left+r*.25,lowerTipX:left+r*.25,yScale:3/.84,pointed:true};
    }
    return {left,r,yTop,yBottom,yCenter,xInner,xTip:left+TILE*.88,xOuter:left+TILE*.76,upperTipX:left+r,lowerTipX:left+r*.65,yScale:1,pointed:false};
  }

  function modelPath(ctx,type){
    const g=swordGeometry(type);
    const sy=value=>value*g.yScale;

    ctx.beginPath();
    ctx.moveTo(g.upperTipX,sy(g.yTop));
    ctx.bezierCurveTo(
      g.xOuter,sy(g.yTop+TILE*.10),
      g.xTip-g.r*.25,sy(-TILE*.14),
      g.xTip,sy(-g.r*.15)
    );
    ctx.bezierCurveTo(
      g.xTip+g.r*.18,sy(-g.r*.05),
      g.xTip+g.r*.18,sy(g.r*.05),
      g.xTip,sy(g.r*.15)
    );
    ctx.bezierCurveTo(
      g.xTip-g.r*.25,sy(TILE*.14),
      g.xOuter,sy(g.yBottom-TILE*.08),
      g.lowerTipX,sy(g.yBottom)
    );

    if(g.pointed){
      ctx.bezierCurveTo(
        g.left+g.r*.55,sy(g.yBottom-g.r*.70),
        g.left+g.r*.85,sy(g.yBottom-g.r*1.05),
        g.left+g.r*1.25,sy(g.yBottom-g.r*1.15)
      );
    }else{
      ctx.bezierCurveTo(
        g.left+g.r*.35,sy(g.yBottom-g.r*.05),
        g.left+g.r*.45,sy(g.yBottom-g.r*.55),
        g.left+g.r*1.25,sy(g.yBottom-g.r*1.15)
      );
    }

    ctx.bezierCurveTo(
      g.xInner,sy(TILE*.25),
      g.xInner,sy(-TILE*.25),
      g.upperTipX,sy(g.yTop)
    );
    ctx.closePath();
  }

  function drawModel(ctx,type){
    const g=swordGeometry(type);
    const verticalHalf=type==='WIDE'?TILE*1.5:TILE*.5;
    const gradient=ctx.createLinearGradient(g.left,-verticalHalf,g.xTip,verticalHalf);
    gradient.addColorStop(0,'rgba(0,220,255,.70)');
    gradient.addColorStop(.40,'rgba(230,255,255,.95)');
    gradient.addColorStop(.70,'rgba(0,240,255,.80)');
    gradient.addColorStop(1,'rgba(0,180,255,.50)');

    ctx.save();
    ctx.globalAlpha=.96;
    ctx.fillStyle=gradient;
    ctx.shadowColor='rgba(0,220,255,.45)';
    ctx.shadowBlur=10;
    modelPath(ctx,type);
    ctx.fill();
    ctx.restore();
  }

  function createSurface(type){
    const b=bounds[type];
    const cssWidth=Math.ceil(b.maxX-b.minX);
    const cssHeight=Math.ceil(b.maxY-b.minY);
    const originX=-b.minX;
    const originY=-b.minY;

    const layer=document.createElement('div');
    layer.className='swordSlashFxLayer';
    const canvas=document.createElement('canvas');
    canvas.className='swordSlashFxCanvas';
    canvas.width=Math.round(cssWidth*DPR);
    canvas.height=Math.round(cssHeight*DPR);
    canvas.style.width=cssWidth+'px';
    canvas.style.height=cssHeight+'px';
    canvas.style.left=-originX+'px';
    canvas.style.top=-originY+'px';
    canvas.style.transformOrigin=`${originX}px ${originY}px`;

    const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true})||canvas.getContext('2d');
    if(ctx){
      ctx.setTransform(DPR,0,0,DPR,0,0);
      ctx.translate(originX,originY);
      drawModel(ctx,type);
    }

    layer.appendChild(canvas);
    nativeAppendChild(layer);
    const surface={type,layer,canvas,busy:false,fade:null};
    pools[type].push(surface);
    return surface;
  }

  for(const type of ['SWORD','WIDE','LONG']){
    createSurface(type);
    createSurface(type);
  }

  function acquireSurface(type){return pools[type]?.find(surface=>!surface.busy)||pools[type]?.[0]||null}
  function cancelAnimation(animation){if(animation){animation.onfinish=null;animation.oncancel=null;animation.cancel()}}

  function matrixCss(basis){
    return `matrix(${basis.a.toFixed(6)},${basis.b.toFixed(6)},${basis.c.toFixed(6)},${basis.d.toFixed(6)},0,0)`;
  }

  function renderSlashFx(sourceNode,type){
    const surface=acquireSurface(type);
    if(!surface)return;

    cancelAnimation(surface.fade);
    surface.fade=null;
    surface.busy=true;

    const basis=projectedBasis();
    const anchor=effectAnchor(sourceNode,basis);
    const transform=matrixCss(basis);

    surface.layer.dataset.effectType=type;
    surface.layer.dataset.projection='FIELD_WORLD_BASIS';
    surface.layer.dataset.forwardPx=forwardOffsetPx().toFixed(2);
    surface.layer.style.left=anchor.x+'px';
    surface.layer.style.top=anchor.y+'px';
    surface.layer.style.opacity='0';
    surface.canvas.style.transform=transform;

    activeEffects++;
    if(meleePreview)meleePreview.style.opacity='0';
    let finished=false;

    function finish(){
      if(finished)return;
      finished=true;
      surface.layer.style.opacity='0';
      surface.canvas.style.transform=transform;
      surface.busy=false;
      surface.fade=null;
      activeEffects=Math.max(0,activeEffects-1);
      if(activeEffects===0&&meleePreview)meleePreview.style.opacity='';
    }

    if(typeof surface.layer.animate==='function'){
      surface.fade=surface.layer.animate([
        {opacity:0,offset:0},
        {opacity:1,offset:.08},
        {opacity:1,offset:.62},
        {opacity:0,offset:1}
      ],{duration:DURATION,fill:'forwards',easing:'linear'});
      surface.fade.onfinish=finish;
      surface.fade.oncancel=()=>{if(!finished)finish()};
    }else{
      surface.layer.style.opacity='1';
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
    version:'DIRECT_CANVAS_V16_APPROVED_HEAVY_BOLD_PROJECTED_OFFSET100',
    handlesWide:true,
    forwardOffsetMode:'SCREEN_PX_PROJECTED_DIRECTION',
    forwardOffsetPx:DEFAULT_FORWARD_OFFSET,
    projection:'FIELD_WORLD_BASIS_MATRIX',
    renderer:'PREPAINTED_TRANSFORM_OPACITY',
    durationMs:DURATION
  });
})();
