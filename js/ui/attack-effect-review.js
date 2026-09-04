(()=>{
  const scene=document.getElementById('scene');
  const RANGE=window.BattleNetworkCombatRange;
  if(!scene||!RANGE)return;

  const AIRSHOT_ID='CHIP_EXE4_S004';
  const SWORD_ID='CHIP_0002';
  const PX=.72,PY=.36;

  const style=document.createElement('style');
  style.id='attackEffectReviewStyle';
  style.textContent=`
    .bullet.cannon.airshotFinalEffect{
      overflow:visible!important;
      border:0!important;
      pointer-events:none!important;
      transform-origin:center!important;
      width:104px!important;
      height:72px!important;
      border-radius:50%!important;
      background:radial-gradient(ellipse at 68% 50%,rgba(251,255,255,.98) 0 9%,rgba(207,252,255,.92) 20%,rgba(118,231,249,.74) 42%,rgba(71,199,229,.33) 65%,transparent 80%)!important;
      box-shadow:0 0 22px rgba(177,250,255,.94),0 0 50px rgba(92,220,244,.68),0 0 78px rgba(64,185,221,.34)!important;
      filter:blur(.2px) saturate(1.05);
    }
    .bullet.cannon.airshotFinalEffect::before{
      content:"";
      position:absolute;
      right:48%;
      top:50%;
      width:220px;
      height:124px;
      transform:translateY(-50%);
      background:
        radial-gradient(ellipse at 90% 50%,rgba(220,253,255,.70) 0 16%,rgba(135,235,251,.42) 34%,transparent 61%),
        radial-gradient(ellipse at 66% 28%,rgba(161,242,253,.42) 0 18%,rgba(95,215,241,.20) 42%,transparent 64%),
        radial-gradient(ellipse at 48% 74%,rgba(136,232,248,.38) 0 20%,rgba(73,201,233,.18) 44%,transparent 66%),
        radial-gradient(ellipse at 22% 46%,rgba(103,216,241,.29) 0 18%,transparent 58%);
      filter:blur(8px);
      opacity:1;
    }
    .bullet.cannon.airshotFinalEffect::after{
      content:"";
      position:absolute;
      right:38%;
      top:50%;
      width:188px;
      height:102px;
      border-radius:50%;
      border-top:9px solid rgba(214,253,255,.88);
      border-bottom:9px solid rgba(126,232,251,.72);
      border-left:5px solid rgba(83,205,237,.32);
      transform:translateY(-50%) scaleY(.72);
      box-shadow:0 0 15px rgba(136,238,253,.72),inset 0 0 18px rgba(107,226,248,.28);
      opacity:.94;
    }
    .slash.swordCanvasEffect{
      overflow:visible!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      box-shadow:none!important;
      animation:none!important;
    }
    .slash.swordCanvasEffect .swordSlashCanvas{
      position:absolute;
      left:50%;
      top:50%;
      width:280px;
      height:190px;
      pointer-events:none;
      transform-origin:center;
      mix-blend-mode:screen;
      filter:drop-shadow(0 0 5px rgba(119,224,255,.72));
    }
  `;
  document.head.appendChild(style);

  function context(){return RANGE.getLastAttackContext?.()||null}
  function isAirShotContext(){const c=context();return c?.sourceType==='CHIP'&&c?.sourceId===AIRSHOT_ID}
  function isSwordContext(){const c=context();return c?.sourceType==='CHIP'&&c?.sourceId===SWORD_ID}

  function decorateAirShot(projectile){
    if(!(projectile instanceof HTMLElement)||!projectile.matches('.bullet.cannon'))return false;
    if(!isAirShotContext())return false;
    projectile.classList.add('airshotFinalEffect');
    return true;
  }

  function projectedDirectionAngle(direction){
    const dx=Number(direction?.x),dy=Number(direction?.y);
    if(!Number.isFinite(dx)||!Number.isFinite(dy))return -8;
    const sx=(dx-dy)*PX,sy=(dx+dy)*PY;
    return Math.atan2(sy,sx)*180/Math.PI-35;
  }

  function drawCurve(ctx,path,style,width,alpha,blur=0){
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.strokeStyle=style;
    ctx.lineWidth=width;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.shadowColor='rgba(124,226,255,.90)';
    ctx.shadowBlur=blur;
    ctx.beginPath();
    path(ctx);
    ctx.stroke();
    ctx.restore();
  }

  function drawSwordFrame(ctx,width,height,progress){
    const ease=1-Math.pow(1-progress,3);
    const fade=progress<.70?1:Math.max(0,1-(progress-.70)/.30);
    const reveal=Math.min(width,width*(.08+.96*ease));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0,0,reveal,height);
    ctx.clip();

    const bodyGradient=ctx.createLinearGradient(18,164,304,28);
    bodyGradient.addColorStop(0,'rgba(108,224,255,0)');
    bodyGradient.addColorStop(.18,'rgba(115,226,255,.22)');
    bodyGradient.addColorStop(.56,'rgba(177,242,255,.48)');
    bodyGradient.addColorStop(.84,'rgba(212,251,255,.60)');
    bodyGradient.addColorStop(1,'rgba(130,226,255,0)');

    ctx.save();
    ctx.globalAlpha=.78*fade;
    ctx.fillStyle=bodyGradient;
    ctx.shadowColor='rgba(110,224,255,.72)';
    ctx.shadowBlur=18;
    ctx.beginPath();
    ctx.moveTo(18,166);
    ctx.bezierCurveTo(78,178,194,139,300,25);
    ctx.bezierCurveTo(239,103,133,139,47,151);
    ctx.bezierCurveTo(35,154,25,160,18,166);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const mainPath=c=>{c.moveTo(20,165);c.bezierCurveTo(82,177,201,135,300,25)};
    drawCurve(ctx,mainPath,'rgba(87,210,250,.38)',27,.52*fade,22);
    drawCurve(ctx,mainPath,'rgba(122,229,255,.72)',17,.86*fade,13);
    drawCurve(ctx,mainPath,'rgba(219,251,255,.98)',7,fade,7);
    drawCurve(ctx,mainPath,'rgba(111,215,250,.96)',2.4,.95*fade,2);

    const trail1=c=>{c.moveTo(18,176);c.bezierCurveTo(85,183,181,151,263,76)};
    const trail2=c=>{c.moveTo(34,185);c.bezierCurveTo(105,183,181,154,238,105)};
    const trail3=c=>{c.moveTo(58,164);c.bezierCurveTo(123,163,206,125,282,50)};
    drawCurve(ctx,trail1,'rgba(104,221,255,.74)',6,.66*fade,8);
    drawCurve(ctx,trail1,'rgba(224,253,255,.88)',2.2,.75*fade,3);
    drawCurve(ctx,trail2,'rgba(105,213,250,.55)',4,.52*fade,6);
    drawCurve(ctx,trail3,'rgba(190,246,255,.70)',3,.58*fade,5);

    const tipGradient=ctx.createLinearGradient(242,100,308,17);
    tipGradient.addColorStop(0,'rgba(126,225,255,0)');
    tipGradient.addColorStop(.62,'rgba(219,252,255,.90)');
    tipGradient.addColorStop(1,'rgba(255,255,255,0)');
    const tip1=c=>{c.moveTo(245,101);c.quadraticCurveTo(282,58,307,17)};
    const tip2=c=>{c.moveTo(255,111);c.quadraticCurveTo(288,74,309,43)};
    drawCurve(ctx,tip1,tipGradient,4,.82*fade,7);
    drawCurve(ctx,tip2,'rgba(135,229,255,.66)',2.2,.58*fade,4);

    const spark=(x1,y1,x2,y2,w,a)=>drawCurve(ctx,c=>{c.moveTo(x1,y1);c.lineTo(x2,y2)},'rgba(190,247,255,.90)',w,a*fade,4);
    spark(42,145,73,131,2,.55);
    spark(73,177,112,158,1.7,.46);
    spark(221,90,255,64,1.8,.48);
    spark(267,53,293,31,1.5,.52);
    ctx.restore();
  }

  function decorateSword(slash){
    if(!(slash instanceof HTMLElement)||!slash.matches('.slash'))return false;
    if(!isSwordContext())return false;
    slash.classList.add('swordCanvasEffect');
    slash.replaceChildren();

    const canvas=document.createElement('canvas');
    canvas.className='swordSlashCanvas';
    const logicalWidth=320,logicalHeight=210,dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    canvas.width=Math.round(logicalWidth*dpr);
    canvas.height=Math.round(logicalHeight*dpr);
    const attackContext=context();
    const angle=projectedDirectionAngle(attackContext?.shape?.direction);
    canvas.style.transform=`translate(-50%,-50%) rotate(${angle.toFixed(2)}deg)`;
    slash.appendChild(canvas);

    const ctx=canvas.getContext('2d');
    if(!ctx)return true;
    const started=performance.now(),duration=285;
    const frame=now=>{
      if(!canvas.isConnected)return;
      const progress=Math.min(1,(now-started)/duration);
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      drawSwordFrame(ctx,logicalWidth,logicalHeight,progress);
      if(progress<1)requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return true;
  }

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(!(node instanceof HTMLElement))continue;
        if(node.matches('.bullet.cannon'))decorateAirShot(node);
        if(node.matches('.slash'))decorateSword(node);
        node.querySelectorAll?.('.bullet.cannon').forEach(decorateAirShot);
        node.querySelectorAll?.('.slash').forEach(decorateSword);
      }
    }
  });
  observer.observe(scene,{childList:true,subtree:true});

  window.BattleNetworkAirShotEffect=Object.freeze({mode:'A3_FINAL',decorate:decorateAirShot});
  window.BattleNetworkSwordEffect=Object.freeze({mode:'CANVAS_PALE_CYAN_CRESCENT_V1',decorate:decorateSword});
})();
