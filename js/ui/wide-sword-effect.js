(()=>{
  const scene=document.getElementById('scene');
  const FIELD=window.BattleNetworkField;
  if(!scene||!FIELD||scene.dataset.wideSwordEffect==='v2')return;
  scene.dataset.wideSwordEffect='v2';

  const PX=.72,PY=.36,WIDE_ID='CHIP_0003',FORWARD_OFFSET=150,DURATION=390;
  const MAX_PROJECTED_LENGTH=Math.SQRT2*Math.max(PX,PY),SCALE_X=.6;
  const W=520,H=760,CY=380,BASE_CY=160,Y_SCALE=3,BODY_SPAN=429;
  const DPR=Math.min(2,Math.max(1,window.devicePixelRatio||1));
  const previousAppendChild=scene.appendChild.bind(scene);
  const meleePreview=document.getElementById('meleePreview');
  const pool=[];
  let active=0;

  const style=document.createElement('style');
  style.textContent=`#scene .wideSwordFxLayer{position:absolute;left:0;top:0;width:${W}px;height:${H}px;z-index:10;pointer-events:none;opacity:0;overflow:visible;transform-origin:50% 50%;will-change:transform,opacity;backface-visibility:hidden}#scene .wideSwordFx{display:block;width:${W}px;height:${H}px;background:transparent!important;border:0!important;box-shadow:none!important;transform-origin:32px ${CY}px;will-change:transform;backface-visibility:hidden}`;
  document.head.appendChild(style);

  const y=v=>CY+(v-BASE_CY)*Y_SCALE;
  const context=()=>window.BattleNetworkCombatRange?.getLastAttackContext?.()||null;
  function isWide(){
    const c=context();
    if(c?.sourceType==='CHIP'&&c?.sourceId===WIDE_ID)return true;
    const t=window.BattleNetworkFolder?.getTestTarget?.();
    return t?.enabled===true&&t?.type==='WIDE';
  }

  function projection(){
    const d=context()?.shape?.direction||window.BattleNetworkPlayer?.getFacing?.()||{x:1,y:0};
    let dx=Number(d.x),dy=Number(d.y);
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<.0001){dx=1;dy=0}
    const n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;
    const sx=(dx-dy)*PX,sy=(dx+dy)*PY,l=Math.hypot(sx,sy)||1;
    return {x:sx/l,y:sy/l,wx:dx,wy:dy,angle:Math.atan2(sy,sx)*180/Math.PI,scaleX:SCALE_X*Math.max(.5,Math.min(1,l/MAX_PROJECTED_LENGTH))};
  }

  function path(ctx){
    ctx.moveTo(32,y(86));
    ctx.bezierCurveTo(154,y(91),332,y(102),438,y(126));
    ctx.bezierCurveTo(472,y(134),487,y(149),477,y(166));
    ctx.bezierCurveTo(449,y(208),337,y(236),67,y(229));
    ctx.bezierCurveTo(165,y(206),235,y(181),266,y(155));
    ctx.bezierCurveTo(229,y(124),144,y(101),32,y(86));
    ctx.closePath();
  }

  function stroke(ctx,draw,color,width,alpha,blur=0){
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='rgba(114,224,255,.95)';ctx.shadowBlur=blur;ctx.beginPath();draw(ctx);ctx.stroke();ctx.restore();
  }

  function draw(ctx){
    const outer=ctx.createLinearGradient(35,y(92),480,y(190));
    outer.addColorStop(0,'rgba(80,207,247,.10)');
    outer.addColorStop(.20,'rgba(99,222,255,.54)');
    outer.addColorStop(.58,'rgba(151,237,255,.78)');
    outer.addColorStop(.84,'rgba(201,249,255,.88)');
    outer.addColorStop(1,'rgba(132,227,255,.58)');
    ctx.save();ctx.globalAlpha=.96;ctx.fillStyle=outer;ctx.shadowColor='rgba(89,214,255,.88)';ctx.shadowBlur=24;ctx.beginPath();path(ctx);ctx.fill();ctx.restore();

    const core=ctx.createLinearGradient(72,y(118),458,y(164));
    core.addColorStop(0,'rgba(193,249,255,.08)');
    core.addColorStop(.48,'rgba(226,254,255,.42)');
    core.addColorStop(.82,'rgba(250,255,255,.68)');
    core.addColorStop(1,'rgba(218,250,255,.38)');
    ctx.save();ctx.globalAlpha=.72;ctx.fillStyle=core;ctx.beginPath();
    ctx.moveTo(76,y(118));
    ctx.bezierCurveTo(199,y(119),346,y(126),438,y(143));
    ctx.bezierCurveTo(453,y(146),459,y(152),455,y(157));
    ctx.bezierCurveTo(425,y(172),371,y(184),307,y(190));
    ctx.bezierCurveTo(293,y(180),287,y(166),279,y(153));
    ctx.bezierCurveTo(240,y(135),164,y(122),76,y(118));
    ctx.closePath();ctx.fill();ctx.restore();

    stroke(ctx,c=>{c.moveTo(45,y(90));c.bezierCurveTo(174,y(94),343,y(105),441,y(128));c.bezierCurveTo(461,y(133),473,y(142),476,y(151))},'rgba(247,255,255,.98)',6.8,.88,7);
    stroke(ctx,c=>{c.moveTo(75,y(224));c.bezierCurveTo(191,y(209),320,y(196),438,y(169))},'rgba(91,216,252,.92)',4.8,.58,7);
  }

  function make(){
    const layer=document.createElement('div');layer.className='wideSwordFxLayer';
    const canvas=document.createElement('canvas');canvas.className='wideSwordFx';canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
    const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true})||canvas.getContext('2d');if(ctx){ctx.setTransform(DPR,0,0,DPR,0,0);draw(ctx)}
    layer.appendChild(canvas);previousAppendChild(layer);const s={layer,canvas,busy:false,fade:null,grow:null};pool.push(s);return s;
  }
  make();make();
  const acquire=()=>pool.find(s=>!s.busy)||pool[0];
  const cancel=a=>{if(a){a.onfinish=null;a.oncancel=null;a.cancel()}};

  function basis(p){
    const shape=context()?.shape,widthWorld=Number(shape?.widthWorld);
    if(!(widthWorld>0))return {c:0,d:1};
    let nx=Number(shape?.normal?.x),ny=Number(shape?.normal?.y);
    if(!Number.isFinite(nx)||!Number.isFinite(ny)||Math.hypot(nx,ny)<.0001){nx=-p.wy;ny=p.wx}
    const n=Math.hypot(nx,ny)||1;nx/=n;ny/=n;
    const sx=(nx-ny)*PX,sy=(nx+ny)*PY;
    let lx=p.x*sx+p.y*sy,ly=-p.y*sx+p.x*sy;if(ly<0){lx=-lx;ly=-ly}
    return {c:lx*widthWorld/BODY_SPAN,d:ly*widthWorld/BODY_SPAN};
  }

  function tf(p,sx){const b=basis(p);return `matrix(${sx},0,${b.c},${b.d},0,0)`}

  function render(node){
    const sw=parseFloat(node.style.width)||160,sh=parseFloat(node.style.height)||90,left=parseFloat(node.style.left)||0,top=parseFloat(node.style.top)||0;
    const cx=left+sw/2,cy=top+sh/2,p=projection(),s=acquire();if(!s)return;
    cancel(s.fade);cancel(s.grow);s.fade=null;s.grow=null;s.busy=true;
    const x=cx-W/2+p.x*FORWARD_OFFSET,y0=cy-H/2-8+p.y*FORWARD_OFFSET,target=tf(p,p.scaleX),start=tf(p,Math.max(.04,p.scaleX*.18));
    s.layer.style.transform=`translate3d(${x}px,${y0}px,0) rotate(${p.angle.toFixed(2)}deg)`;s.layer.style.opacity='0';s.canvas.style.transform=target;
    active++;if(meleePreview)meleePreview.style.opacity='0';let done=false;
    const finish=()=>{if(done)return;done=true;s.layer.style.opacity='0';s.canvas.style.transform=target;s.busy=false;s.fade=null;s.grow=null;active=Math.max(0,active-1);if(active===0&&meleePreview)meleePreview.style.opacity=''};
    if(typeof s.layer.animate==='function'&&typeof s.canvas.animate==='function'){
      s.grow=s.canvas.animate([{transform:start},{transform:target}],{duration:DURATION*.24,fill:'forwards',easing:'cubic-bezier(.22,1,.36,1)'});
      s.fade=s.layer.animate([{opacity:0,offset:0},{opacity:1,offset:.04},{opacity:1,offset:.68},{opacity:0,offset:1}],{duration:DURATION,fill:'forwards',easing:'linear'});s.fade.onfinish=finish;s.fade.oncancel=()=>{if(!done)finish()};
    }else{s.layer.style.opacity='1';setTimeout(finish,DURATION)}
  }

  scene.appendChild=function(node){
    if(node instanceof HTMLElement&&node.classList.contains('slash')&&isWide()){render(node);return node}
    return previousAppendChild(node);
  };

  window.BattleNetworkWideSwordEffect=Object.freeze({version:'WIDE_SINGLE_RANGE_V2_CLEAN_HIGHLIGHT',layout:'SINGLE_ATTACK_WIDTH',forwardOffset:FORWARD_OFFSET});
})();
