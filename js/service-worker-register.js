(()=>{
  function installSwordHook(){
    const scene=document.getElementById('scene');
    if(!scene||scene.dataset.swordHookInstalled==='1')return;
    scene.dataset.swordHookInstalled='1';

    function drawSlash(slash){
      if(!(slash instanceof HTMLElement)||!slash.classList.contains('slash'))return;
      slash.style.setProperty('border','0','important');
      slash.style.setProperty('border-radius','0','important');
      slash.style.setProperty('background','transparent','important');
      slash.style.setProperty('box-shadow','none','important');
      slash.style.setProperty('animation','none','important');
      slash.style.setProperty('overflow','visible','important');
      slash.replaceChildren();

      const canvas=document.createElement('canvas');
      canvas.width=720;canvas.height=480;
      canvas.style.cssText='position:absolute;left:50%;top:50%;width:360px;height:240px;pointer-events:none;transform:translate(-50%,-50%) rotate(-18deg);filter:drop-shadow(0 0 10px rgba(112,225,255,.95));mix-blend-mode:screen;';
      slash.appendChild(canvas);
      const ctx=canvas.getContext('2d');
      if(!ctx)return;
      const start=performance.now(),duration=330;
      const stroke=(draw,color,width,alpha,blur)=>{ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='rgba(120,228,255,.96)';ctx.shadowBlur=blur;ctx.beginPath();draw();ctx.stroke();ctx.restore()};
      const frame=now=>{
        if(!canvas.isConnected)return;
        const p=Math.min(1,(now-start)/duration),fade=p<.72?1:Math.max(0,1-(p-.72)/.28),ease=1-Math.pow(1-p,3),reveal=360*(.05+1.04*ease);
        ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,720,480);ctx.setTransform(2,0,0,2,0,0);ctx.save();ctx.beginPath();ctx.rect(0,0,reveal,240);ctx.clip();
        const g=ctx.createLinearGradient(14,202,350,15);g.addColorStop(0,'rgba(79,207,250,0)');g.addColorStop(.14,'rgba(93,218,255,.34)');g.addColorStop(.48,'rgba(160,239,255,.66)');g.addColorStop(.78,'rgba(226,253,255,.80)');g.addColorStop(1,'rgba(145,231,255,0)');
        ctx.save();ctx.globalAlpha=.96*fade;ctx.fillStyle=g;ctx.shadowColor='rgba(104,220,255,.96)';ctx.shadowBlur=24;ctx.beginPath();ctx.moveTo(14,202);ctx.bezierCurveTo(80,212,215,154,350,16);ctx.bezierCurveTo(267,118,150,163,50,176);ctx.bezierCurveTo(34,179,21,190,14,202);ctx.closePath();ctx.fill();ctx.restore();
        const main=()=>{ctx.moveTo(16,200);ctx.bezierCurveTo(87,212,221,149,350,16)};
        stroke(main,'rgba(73,199,245,.45)',34,.72*fade,26);stroke(main,'rgba(112,226,255,.90)',21,.98*fade,16);stroke(main,'rgba(235,255,255,1)',9.5,fade,9);stroke(main,'rgba(111,220,252,1)',2.8,.98*fade,2);
        stroke(()=>{ctx.moveTo(12,216);ctx.bezierCurveTo(94,217,199,172,308,70)},'rgba(95,219,255,.82)',7.5,.78*fade,10);
        stroke(()=>{ctx.moveTo(36,229);ctx.bezierCurveTo(120,218,209,178,274,118)},'rgba(102,215,251,.68)',5,.64*fade,7);
        stroke(()=>{ctx.moveTo(60,190);ctx.bezierCurveTo(141,186,237,137,330,42)},'rgba(194,248,255,.84)',3.5,.70*fade,5);
        stroke(()=>{ctx.moveTo(280,112);ctx.quadraticCurveTo(322,62,356,8)},'rgba(238,255,255,.98)',4.6,.9*fade,8);
        ctx.restore();if(p<1)requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    const nativeAppend=scene.appendChild.bind(scene);
    scene.appendChild=function(node){const result=nativeAppend(node);if(node instanceof HTMLElement&&node.classList.contains('slash'))drawSlash(node);return result};
    new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node instanceof HTMLElement&&node.classList.contains('slash'))drawSlash(node)}).observe(scene,{childList:true});
  }

  installSwordHook();

  if(!('serviceWorker' in navigator)) return;
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;window.location.reload()});
  window.addEventListener('load',async()=>{
    try{
      const registration=await navigator.serviceWorker.register('./sw.js?v=183',{scope:'./',updateViaCache:'none'});
      await registration.update();
    }catch(error){console.warn(error)}
  });
})();