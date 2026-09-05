(()=>{
  const scene=document.getElementById('scene');
  if(!scene||scene.dataset.swordEffectHook==='v5')return;
  scene.dataset.swordEffectHook='v5';

  const PX=.72,PY=.36,SWORD_ID='CHIP_0002';
  const SWORD_SCALE_X=.6,POSITION_STEP=10,POSITION_MIN=-100,POSITION_MAX=200;
  let forwardOffset=0,activeEffects=0,positionControl=null;

  const style=document.createElement('style');
  style.id='swordEffectDirectStyle';
  style.textContent=`
    #scene.swordSlashPlaying #meleePreview{opacity:0!important}
    #scene .swordSlashFx{position:absolute;z-index:9;pointer-events:none;background:transparent!important;border:0!important;box-shadow:none!important;transform-origin:50% 50%}
    #battle .swordPositionTest{position:absolute;right:10px;top:58px;z-index:71;display:flex;align-items:center;gap:5px;padding:5px 6px;border:1px solid rgba(255,255,255,.5);border-radius:7px;background:rgba(8,12,20,.9);color:#fff;font:900 11px/1 system-ui,sans-serif;pointer-events:auto}
    #battle .swordPositionTest button{min-width:48px;height:30px;padding:0 8px;border:1px solid #8eeaff;border-radius:5px;background:#0c4053;color:#eaffff;font:900 12px/1 system-ui,sans-serif}
    #battle .swordPositionTest strong{display:inline-block;min-width:48px;text-align:center;color:#fff7c9;font-variant-numeric:tabular-nums}
  `;
  document.head.appendChild(style);

  function currentContext(){return window.BattleNetworkCombatRange?.getLastAttackContext?.()||null}
  function isSwordContext(){
    const context=currentContext();
    if(context?.sourceType==='CHIP'&&context?.sourceId===SWORD_ID)return true;
    const target=window.BattleNetworkFolder?.getTestTarget?.();
    return target?.enabled===true&&target?.type==='SWORD';
  }
  function isSwordTestMode(){const target=window.BattleNetworkFolder?.getTestTarget?.();return target?.enabled===true&&target?.type==='SWORD'}
  function clampOffset(value){return Math.max(POSITION_MIN,Math.min(POSITION_MAX,Math.round(Number(value)||0)))}
  function setForwardOffset(value){forwardOffset=clampOffset(value);syncPositionControl();return forwardOffset}
  function adjustForwardOffset(delta){return setForwardOffset(forwardOffset+(Number(delta)||0))}
  function getForwardOffset(){return forwardOffset}

  function projectedDirection(){
    const direction=currentContext()?.shape?.direction||window.BattleNetworkPlayer?.getFacing?.()||{x:1,y:0};
    const dx=Number(direction.x),dy=Number(direction.y);
    if(!Number.isFinite(dx)||!Number.isFinite(dy))return {angle:0,x:1,y:0};
    const sx=(dx-dy)*PX,sy=(dx+dy)*PY;
    const length=Math.hypot(sx,sy)||1;
    return {angle:Math.atan2(sy,sx)*180/Math.PI,x:sx/length,y:sy/length};
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

  function drawFrame(ctx,progress,scaleX){
    const reveal=Math.min(1,progress/.24);
    const fade=progress<.68?1:Math.max(0,(1-progress)/.32);
    const revealX=18+482*(1-Math.pow(1-reveal,3));
    const anchorX=32;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0,0,revealX,320);
    ctx.clip();
    ctx.translate(anchorX,0);
    ctx.scale(scaleX,1);
    ctx.translate(-anchorX,0);

    const outer=ctx.createLinearGradient(35,92,480,190);
    outer.addColorStop(0,'rgba(80,207,247,.10)');
    outer.addColorStop(.20,'rgba(99,222,255,.54)');
    outer.addColorStop(.58,'rgba(151,237,255,.78)');
    outer.addColorStop(.84,'rgba(201,249,255,.88)');
    outer.addColorStop(1,'rgba(132,227,255,.58)');

    ctx.save();
    ctx.globalAlpha=.96*fade;
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
    ctx.globalAlpha=.82*fade;
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

    stroke(ctx,c=>{c.moveTo(45,90);c.bezierCurveTo(174,94,343,105,441,128);c.bezierCurveTo(461,133,473,142,476,151)},'rgba(245,255,255,.98)',7.5,.95*fade,8);
    stroke(ctx,c=>{c.moveTo(63,111);c.bezierCurveTo(192,114,341,122,435,142)},'rgba(198,248,255,.92)',3.2,.85*fade,5);
    stroke(ctx,c=>{c.moveTo(75,224);c.bezierCurveTo(191,209,320,196,438,169)},'rgba(89,214,252,.92)',5.5,.72*fade,9);
    stroke(ctx,c=>{c.moveTo(101,193);c.bezierCurveTo(181,183,236,170,281,153)},'rgba(229,254,255,.82)',3.1,.70*fade,5);
    stroke(ctx,c=>{c.moveTo(145,206);c.bezierCurveTo(246,191,340,174,414,154)},'rgba(128,231,255,.72)',2.4,.64*fade,4);
    stroke(ctx,c=>{c.moveTo(185,126);c.bezierCurveTo(266,128,340,136,407,149)},'rgba(238,255,255,.78)',2.3,.62*fade,4);
    ctx.restore();
  }

  function renderSwordFx(sourceNode){
    const width=parseFloat(sourceNode.style.width)||160;
    const height=parseFloat(sourceNode.style.height)||90;
    const left=parseFloat(sourceNode.style.left)||0;
    const top=parseFloat(sourceNode.style.top)||0;
    const centerX=left+width/2;
    const centerY=top+height/2;
    const projection=projectedDirection();

    sourceNode.style.setProperty('display','none','important');

    const canvas=document.createElement('canvas');
    const cssWidth=520,cssHeight=320,dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    canvas.className='swordSlashFx';
    canvas.dataset.forwardOffset=String(forwardOffset);
    canvas.width=Math.round(cssWidth*dpr);
    canvas.height=Math.round(cssHeight*dpr);
    canvas.style.width=cssWidth+'px';
    canvas.style.height=cssHeight+'px';
    canvas.style.left=(centerX-cssWidth/2+projection.x*forwardOffset)+'px';
    canvas.style.top=(centerY-cssHeight/2-8+projection.y*forwardOffset)+'px';
    canvas.style.transform=`rotate(${projection.angle.toFixed(2)}deg)`;

    nativeAppendChild(canvas);
    activeEffects++;
    scene.classList.add('swordSlashPlaying');

    const ctx=canvas.getContext('2d');
    if(!ctx){finish();return}
    const started=performance.now(),duration=390;
    let finished=false;

    function finish(){
      if(finished)return;
      finished=true;
      canvas.remove();
      activeEffects=Math.max(0,activeEffects-1);
      if(activeEffects===0)scene.classList.remove('swordSlashPlaying');
    }

    function frame(now){
      if(!canvas.isConnected){finish();return}
      const progress=Math.min(1,(now-started)/duration);
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      drawFrame(ctx,progress,SWORD_SCALE_X);
      if(progress<1)requestAnimationFrame(frame);else finish();
    }
    requestAnimationFrame(frame);
  }

  function syncPositionControl(){
    if(!positionControl)return;
    const value=positionControl.querySelector('strong');
    if(value)value.textContent=`${forwardOffset>=0?'+':''}${forwardOffset}px`;
    const buttons=positionControl.querySelectorAll('button');
    if(buttons[0])buttons[0].disabled=forwardOffset<=POSITION_MIN;
    if(buttons[1])buttons[1].disabled=forwardOffset>=POSITION_MAX;
  }
  function installPositionControl(){
    if(!isSwordTestMode())return;
    const battle=document.getElementById('battle');
    if(!battle||document.querySelector('.swordPositionTest'))return;
    const wrap=document.createElement('div'),label=document.createElement('span'),back=document.createElement('button'),value=document.createElement('strong'),forward=document.createElement('button');
    wrap.className='swordPositionTest';
    wrap.dataset.testOnly='sword-position';
    label.textContent='SWORD 前後';
    back.type='button';back.textContent='-10';back.addEventListener('click',()=>adjustForwardOffset(-POSITION_STEP));
    forward.type='button';forward.textContent='+10';forward.addEventListener('click',()=>adjustForwardOffset(POSITION_STEP));
    wrap.append(label,back,value,forward);
    battle.appendChild(wrap);
    positionControl=wrap;
    syncPositionControl();
  }

  const nativeAppendChild=scene.appendChild.bind(scene);
  scene.appendChild=function(node){
    if(node instanceof HTMLElement&&node.classList.contains('slash')&&isSwordContext()){
      const result=nativeAppendChild(node);
      renderSwordFx(node);
      return result;
    }
    return nativeAppendChild(node);
  };

  window.BattleNetworkSwordEffectDirect=Object.freeze({version:'DIRECT_CANVAS_V5_POSITION_TEST',scaleX:SWORD_SCALE_X,getForwardOffset,setForwardOffset,adjustForwardOffset});
  installPositionControl();
})();
