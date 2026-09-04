(()=>{
  const scene=document.getElementById('scene');
  if(!scene)return;

  const PX=.72,PY=.36;

  function facingAngle(){
    const facing=window.BattleNetworkPlayer?.getFacing?.()||{x:1,y:0};
    const dx=Number(facing.x),dy=Number(facing.y);
    const sx=(dx-dy)*PX,sy=(dx+dy)*PY;
    return Math.atan2(sy,sx)*180/Math.PI-37;
  }

  function stroke(ctx,draw,color,width,alpha=1,blur=0){
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.strokeStyle=color;
    ctx.lineWidth=width;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.shadowColor='rgba(123,229,255,.96)';
    ctx.shadowBlur=blur;
    ctx.beginPath();
    draw(ctx);
    ctx.stroke();
    ctx.restore();
  }

  function drawSlash(ctx,w,h,p){
    const reveal=Math.min(w,w*(.05+1.04*(1-Math.pow(1-p,3))));
    const fade=p<.72?1:Math.max(0,1-(p-.72)/.28);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0,0,reveal,h);
    ctx.clip();

    const fill=ctx.createLinearGradient(18,198,346,18);
    fill.addColorStop(0,'rgba(79,207,250,0)');
    fill.addColorStop(.13,'rgba(95,218,255,.30)');
    fill.addColorStop(.45,'rgba(155,237,255,.62)');
    fill.addColorStop(.76,'rgba(220,252,255,.78)');
    fill.addColorStop(1,'rgba(145,231,255,0)');

    ctx.save();
    ctx.globalAlpha=.95*fade;
    ctx.fillStyle=fill;
    ctx.shadowColor='rgba(104,220,255,.95)';
    ctx.shadowBlur=24;
    ctx.beginPath();
    ctx.moveTo(14,201);
    ctx.bezierCurveTo(80,211,215,153,350,16);
    ctx.bezierCurveTo(268,117,151,163,51,176);
    ctx.bezierCurveTo(34,178,21,190,14,201);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const main=c=>{c.moveTo(16,200);c.bezierCurveTo(87,212,221,149,350,16)};
    stroke(ctx,main,'rgba(73,199,245,.42)',34,.72*fade,26);
    stroke(ctx,main,'rgba(111,224,255,.88)',21,.98*fade,16);
    stroke(ctx,main,'rgba(231,254,255,1)',9.5,fade,9);
    stroke(ctx,main,'rgba(111,220,252,1)',2.8,.98*fade,2);

    const trail1=c=>{c.moveTo(12,216);c.bezierCurveTo(94,217,199,172,308,70)};
    const trail2=c=>{c.moveTo(36,229);c.bezierCurveTo(120,218,209,178,274,118)};
    const trail3=c=>{c.moveTo(60,190);c.bezierCurveTo(141,186,237,137,330,42)};
    stroke(ctx,trail1,'rgba(94,218,255,.80)',7.5,.78*fade,10);
    stroke(ctx,trail1,'rgba(232,254,255,.95)',2.5,.86*fade,3);
    stroke(ctx,trail2,'rgba(102,215,251,.66)',5,.64*fade,7);
    stroke(ctx,trail3,'rgba(190,246,255,.82)',3.5,.70*fade,5);

    stroke(ctx,c=>{c.moveTo(280,112);c.quadraticCurveTo(322,62,356,8)},'rgba(232,254,255,.98)',4.6,.9*fade,8);
    stroke(ctx,c=>{c.moveTo(291,124);c.quadraticCurveTo(326,80,356,43)},'rgba(139,230,255,.76)',2.4,.68*fade,4);

    const spark=(x1,y1,x2,y2,wid,a)=>stroke(ctx,c=>{c.moveTo(x1,y1);c.lineTo(x2,y2)},'rgba(207,250,255,.96)',wid,a*fade,4);
    spark(48,169,86,149,2.2,.62);
    spark(82,210,132,184,1.8,.54);
    spark(245,104,284,73,1.9,.58);
    spark(300,59,334,30,1.6,.62);

    ctx.restore();
  }

  function decorateSlash(slash){
    if(!(slash instanceof HTMLElement)||!slash.classList.contains('slash'))return false;
    if(slash.dataset.directSwordEffect==='1')return true;
    slash.dataset.directSwordEffect='1';

    slash.style.setProperty('border','0','important');
    slash.style.setProperty('border-radius','0','important');
    slash.style.setProperty('background','transparent','important');
    slash.style.setProperty('box-shadow','none','important');
    slash.style.setProperty('animation','none','important');
    slash.style.setProperty('overflow','visible','important');
    slash.style.setProperty('pointer-events','none','important');
    slash.replaceChildren();

    const canvas=document.createElement('canvas');
    canvas.width=720;
    canvas.height=480;
    canvas.style.cssText='position:absolute;left:50%;top:50%;width:360px;height:240px;pointer-events:none;transform-origin:center;filter:drop-shadow(0 0 10px rgba(110,224,255,.95));mix-blend-mode:screen;';
    canvas.style.transform=`translate(-50%,-50%) rotate(${facingAngle().toFixed(2)}deg)`;
    slash.appendChild(canvas);

    const ctx=canvas.getContext('2d');
    if(!ctx)return true;
    const started=performance.now();
    const duration=330;
    const frame=now=>{
      if(!canvas.isConnected)return;
      const p=Math.min(1,(now-started)/duration);
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.setTransform(2,0,0,2,0,0);
      drawSlash(ctx,360,240,p);
      if(p<1)requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return true;
  }

  const nativeAppendChild=scene.appendChild.bind(scene);
  scene.appendChild=function(node){
    const result=nativeAppendChild(node);
    if(node instanceof HTMLElement&&node.classList.contains('slash'))decorateSlash(node);
    return result;
  };

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node instanceof HTMLElement&&node.classList.contains('slash'))decorateSlash(node);
      }
    }
  });
  observer.observe(scene,{childList:true});
  scene.querySelectorAll('.slash').forEach(decorateSlash);

  window.BattleNetworkSwordEffectDirect=Object.freeze({version:'DIRECT_CANVAS_V1',decorateSlash});
})();