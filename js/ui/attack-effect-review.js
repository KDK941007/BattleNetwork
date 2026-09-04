(()=>{
  const scene=document.getElementById('scene');
  const RANGE=window.BattleNetworkCombatRange;
  if(!scene||!RANGE)return;

  const AIRSHOT_ID='CHIP_EXE4_S004';
  const SWORD_ID='CHIP_0002';
  const PX=.72,PY=.36;

  const swordTestActive=window.BattleNetworkFolder?.getTestTarget?.()?.enabled===true&&window.BattleNetworkFolder?.getTestTarget?.()?.type==='SWORD';
  scene.classList.toggle('swordEffectReviewActive',swordTestActive);

  document.getElementById('attackEffectReviewStyle')?.remove();
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

    .scene.swordEffectReviewActive .slash{
      overflow:visible!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      box-shadow:none!important;
      animation:none!important;
      pointer-events:none!important;
    }
    .scene.swordEffectReviewActive .slash:not(.swordCanvasEffect)::before{
      content:"";
      position:absolute;
      left:50%;
      top:50%;
      width:310px;
      height:175px;
      transform:translate(-50%,-50%) rotate(-20deg);
      border-radius:50%;
      border-top:24px solid rgba(123,229,255,.82);
      border-right:8px solid rgba(205,249,255,.58);
      border-left:0;
      border-bottom:0;
      filter:drop-shadow(0 0 10px rgba(104,222,255,.92));
      box-shadow:inset 0 12px 18px rgba(223,253,255,.24);
    }
    .scene.swordEffectReviewActive .slash:not(.swordCanvasEffect)::after{
      content:"";
      position:absolute;
      left:50%;
      top:50%;
      width:294px;
      height:164px;
      transform:translate(-50%,-50%) rotate(-20deg);
      border-radius:50%;
      border-top:6px solid rgba(238,255,255,.98);
      border-right:3px solid rgba(171,241,255,.72);
      border-left:0;
      border-bottom:0;
      filter:drop-shadow(0 0 5px rgba(184,248,255,.95));
    }
    .slash.swordCanvasEffect .swordSlashCanvas{
      position:absolute;
      left:50%;
      top:50%;
      width:340px;
      height:220px;
      pointer-events:none;
      transform-origin:center;
      mix-blend-mode:screen;
      filter:drop-shadow(0 0 9px rgba(119,224,255,.95));
    }
  `;
  document.head.appendChild(style);

  function context(){return RANGE.getLastAttackContext?.()||null}
  function isAirShotContext(){const c=context();return c?.sourceType==='CHIP'&&c?.sourceId===AIRSHOT_ID}
  function isSwordContext(){
    const c=context();
    if(c?.sourceType==='CHIP'&&c?.sourceId===SWORD_ID)return true;
    return swordTestActive;
  }

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
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=style;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='rgba(124,226,255,.95)';ctx.shadowBlur=blur;ctx.beginPath();path(ctx);ctx.stroke();ctx.restore();
  }

  function drawSwordFrame(ctx,width,height,progress){
    const ease=1-Math.pow(1-progress,3),fade=progress<.72?1:Math.max(0,1-(progress-.72)/.28),reveal=Math.min(width,width*(.06+1.02*ease));
    ctx.save();ctx.beginPath();ctx.rect(0,0,reveal,height);ctx.clip();
    const bodyGradient=ctx.createLinearGradient(16,176,314,20);
    bodyGradient.addColorStop(0,'rgba(90,216,255,0)');bodyGradient.addColorStop(.16,'rgba(101,220,255,.30)');bodyGradient.addColorStop(.52,'rgba(176,242,255,.58)');bodyGradient.addColorStop(.83,'rgba(226,253,255,.72)');bodyGradient.addColorStop(1,'rgba(138,229,255,0)');
    ctx.save();ctx.globalAlpha=.92*fade;ctx.fillStyle=bodyGradient;ctx.shadowColor='rgba(111,225,255,.88)';ctx.shadowBlur=22;ctx.beginPath();ctx.moveTo(14,178);ctx.bezierCurveTo(76,190,202,145,314,18);ctx.bezierCurveTo(247,111,136,151,44,162);ctx.bezierCurveTo(31,164,21,171,14,178);ctx.closePath();ctx.fill();ctx.restore();
    const main=c=>{c.moveTo(16,177);c.bezierCurveTo(83,190,207,141,314,18)};
    drawCurve(ctx,main,'rgba(77,204,247,.45)',31,.66*fade,24);drawCurve(ctx,main,'rgba(118,228,255,.82)',19,.95*fade,15);drawCurve(ctx,main,'rgba(230,253,255,1)',8.5,fade,8);drawCurve(ctx,main,'rgba(105,214,250,1)',2.7,.98*fade,2);
    const t1=c=>{c.moveTo(15,190);c.bezierCurveTo(87,195,186,158,277,77)};const t2=c=>{c.moveTo(34,201);c.bezierCurveTo(111,195,190,163,249,111)};const t3=c=>{c.moveTo(55,172);c.bezierCurveTo(126,171,214,129,296,48)};
    drawCurve(ctx,t1,'rgba(103,220,255,.78)',7,.72*fade,9);drawCurve(ctx,t1,'rgba(228,253,255,.92)',2.5,.83*fade,3);drawCurve(ctx,t2,'rgba(106,214,251,.63)',4.5,.60*fade,7);drawCurve(ctx,t3,'rgba(194,247,255,.78)',3.3,.65*fade,5);
    const tipGradient=ctx.createLinearGradient(248,105,320,12);tipGradient.addColorStop(0,'rgba(126,225,255,0)');tipGradient.addColorStop(.62,'rgba(225,253,255,.98)');tipGradient.addColorStop(1,'rgba(255,255,255,0)');
    drawCurve(ctx,c=>{c.moveTo(250,108);c.quadraticCurveTo(290,59,319,12)},tipGradient,4.5,.9*fade,8);drawCurve(ctx,c=>{c.moveTo(260,119);c.quadraticCurveTo(294,77,319,43)},'rgba(137,231,255,.73)',2.4,.65*fade,4);
    const spark=(x1,y1,x2,y2,w,a)=>drawCurve(ctx,c=>{c.moveTo(x1,y1);c.lineTo(x2,y2)},'rgba(198,248,255,.95)',w,a*fade,4);
    spark(39,153,76,136,2.2,.62);spark(72,189,118,166,1.9,.54);spark(225,94,260,67,1.9,.56);spark(271,54,301,29,1.6,.60);
    ctx.restore();
  }

  function decorateSword(slash){
    if(!(slash instanceof HTMLElement)||!slash.matches('.slash'))return false;
    if(!isSwordContext())return false;
    slash.classList.add('swordCanvasEffect');slash.replaceChildren();
    const canvas=document.createElement('canvas');canvas.className='swordSlashCanvas';
    const logicalWidth=340,logicalHeight=220,dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));canvas.width=Math.round(logicalWidth*dpr);canvas.height=Math.round(logicalHeight*dpr);
    const attackContext=context(),angle=projectedDirectionAngle(attackContext?.shape?.direction);canvas.style.transform=`translate(-50%,-50%) rotate(${angle.toFixed(2)}deg)`;slash.appendChild(canvas);
    const ctx=canvas.getContext('2d');if(!ctx)return true;const started=performance.now(),duration=320;
    const frame=now=>{if(!canvas.isConnected)return;const progress=Math.min(1,(now-started)/duration);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);drawSwordFrame(ctx,logicalWidth,logicalHeight,progress);if(progress<1)requestAnimationFrame(frame)};
    requestAnimationFrame(frame);return true;
  }

  const observer=new MutationObserver(records=>{for(const record of records){for(const node of record.addedNodes){if(!(node instanceof HTMLElement))continue;if(node.matches('.bullet.cannon'))decorateAirShot(node);if(node.matches('.slash'))decorateSword(node);node.querySelectorAll?.('.bullet.cannon').forEach(decorateAirShot);node.querySelectorAll?.('.slash').forEach(decorateSword)}}});
  observer.observe(scene,{childList:true,subtree:true});
  document.querySelectorAll('#scene .slash').forEach(decorateSword);
  window.BattleNetworkAirShotEffect=Object.freeze({mode:'A3_FINAL',decorate:decorateAirShot});
  window.BattleNetworkSwordEffect=Object.freeze({mode:'CANVAS_PALE_CYAN_CRESCENT_V3',decorate:decorateSword});
})();