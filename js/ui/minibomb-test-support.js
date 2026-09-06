(()=>{
  const MASTER=window.BattleNetworkMaster;
  if(!MASTER)throw new Error('BattleNetworkMiniBomb: required master service is missing.');

  const DIAMETER_TILES=2;
  const settings=Object.freeze({diameterTiles:DIAMETER_TILES});
  window.BattleNetworkMiniBombSettings=Object.freeze({getSettings:()=>settings});

  // Finalized MiniBomb parameters: fixed 3-tile throw and 2-tile blast diameter.
  // Visual/performance changes below do not alter hit/range/damage behavior.
  const originalCreate=MASTER.createGameCompatibilityData;
  MASTER.createGameCompatibilityData=()=>{
    const result=originalCreate();
    const bomb=result?.CHIP?.BOMB;
    if(!bomb)return result;
    Object.defineProperty(bomb,'throwDistanceTiles',{enumerable:true,configurable:true,get:()=>3});
    Object.defineProperty(bomb,'radiusTiles',{enumerable:true,configurable:true,get:()=>DIAMETER_TILES/2});
    Object.defineProperty(bomb,'radius',{enumerable:true,configurable:true,get:()=>window.BattleNetworkField?.toWorldDistance?window.BattleNetworkField.toWorldDistance(DIAMETER_TILES/2):undefined});
    bomb.rangeText='向いている方向の固定3マス先へ投げる／爆発直径2マス';
    return result;
  };

  function installEffect(){
    const scene=document.getElementById('scene');
    const FIELD=window.BattleNetworkField;
    const COMBAT=window.BattleNetworkCombatRange;
    const PLAYER=window.BattleNetworkPlayer;
    if(!scene||!FIELD||!COMBAT||!PLAYER||scene.dataset.miniBombEffect==='v5')return;
    scene.dataset.miniBombEffect='v5';

    const BOMB_ID='CHIP_0004';
    const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;
    const ART=MASTER.createGameCompatibilityData?.().CHIP?.BOMB?.image||'./assets/chips/ミニボム.png';
    const delayValue=Number(MASTER.createGameCompatibilityData?.().CHIP?.BOMB?.explosionDelay);
    const BASE_DELAY_MS=Math.max(0,(Number.isFinite(delayValue)?delayValue:.28)*1000);
    const THROW_MS=Math.max(720,BASE_DELAY_MS);
    const SPRITE_SIZE=92,SPRITE_HALF=SPRITE_SIZE/2;
    const SHADOW_W=62,SHADOW_H=19;
    const PROJECTILE_POOL_SIZE=4,EXPLOSION_POOL_SIZE=4,TEMPLATE_SIZE=512;
    const previousAppendChild=scene.appendChild.bind(scene);
    const pendingExplosions=[];
    const projectiles=new Map();
    let lastShotToken=null,projectileCursor=0,explosionCursor=0;

    const style=document.createElement('style');
    style.id='miniBombEffectV5Style';
    style.textContent=`
      #scene .miniBombThrowV5{position:absolute;left:0;top:0;width:${SPRITE_SIZE}px;height:${SPRITE_SIZE}px;z-index:11;display:none;pointer-events:none;background:transparent;will-change:transform,opacity;backface-visibility:hidden;contain:layout paint style}
      #scene .miniBombSpriteV5{position:absolute;inset:8%;border-radius:50%;overflow:hidden;background-repeat:no-repeat;background-size:145% 145%;background-position:50% 50%;pointer-events:none}
      #scene .miniBombShadowV5{position:absolute;left:0;top:0;width:${SHADOW_W}px;height:${SHADOW_H}px;z-index:9;display:none;border-radius:50%;background:rgba(0,0,0,.28);pointer-events:none;will-change:transform,opacity;backface-visibility:hidden;contain:layout paint style}
      #scene .miniBombExplosionV5{position:absolute;left:0;top:0;z-index:12;display:none;pointer-events:none;overflow:visible;contain:layout paint style;backface-visibility:hidden}
      #scene .miniBombExplosionV5 canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;transform-origin:50% 50%;will-change:transform,opacity;backface-visibility:hidden}
    `;
    document.head.appendChild(style);

    function proj(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
    function canvasTemplate(draw){const c=document.createElement('canvas');c.width=TEMPLATE_SIZE;c.height=TEMPLATE_SIZE;draw(c.getContext('2d'));return c}
    function radial(ctx,x,y,r,stops){const g=ctx.createRadialGradient(x,y,0,x,y,r);stops.forEach(([p,color])=>g.addColorStop(p,color));return g}

    // Heavy gradients, glow, sparks and smoke are painted once here.
    const coreTemplate=canvasTemplate(ctx=>{
      const c=TEMPLATE_SIZE/2,r=TEMPLATE_SIZE*.42;
      ctx.save();
      ctx.fillStyle=radial(ctx,c,c,r,[[0,'rgba(255,255,255,1)'],[.12,'rgba(255,250,178,1)'],[.28,'rgba(255,218,75,.98)'],[.52,'rgba(255,138,28,.96)'],[.72,'rgba(242,60,18,.88)'],[1,'rgba(62,5,2,0)']]);
      ctx.shadowColor='rgba(255,95,24,.72)';ctx.shadowBlur=34;ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.fill();ctx.restore();
      const lobes=[[.25,.30,.18],[.46,.22,.21],[.68,.31,.18],[.28,.58,.20],[.50,.53,.23],[.70,.60,.18],[.48,.72,.16]];
      lobes.forEach(([nx,ny,nr])=>{const x=TEMPLATE_SIZE*nx,y=TEMPLATE_SIZE*ny,rr=TEMPLATE_SIZE*nr;ctx.fillStyle=radial(ctx,x,y,rr,[[0,'rgba(255,255,230,.98)'],[.22,'rgba(255,226,82,.95)'],[.52,'rgba(255,128,28,.90)'],[.78,'rgba(226,43,13,.68)'],[1,'rgba(96,8,3,0)']]);ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fill()});
      ctx.save();ctx.translate(c,c);ctx.lineCap='round';
      for(let i=0;i<18;i++){const a=i/18*Math.PI*2+(i%3)*.07,r1=TEMPLATE_SIZE*.15,r2=TEMPLATE_SIZE*(.40+(i%4)*.025);ctx.strokeStyle=i%2?'rgba(255,215,78,.92)':'rgba(255,250,220,.96)';ctx.lineWidth=5+(i%3);ctx.beginPath();ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);ctx.stroke()}
      ctx.restore();
      const smoke=[[.29,.34,.12],[.48,.27,.13],[.65,.36,.11],[.38,.58,.14],[.59,.59,.13]];
      smoke.forEach(([nx,ny,nr])=>{const x=TEMPLATE_SIZE*nx,y=TEMPLATE_SIZE*ny,rr=TEMPLATE_SIZE*nr;ctx.fillStyle=radial(ctx,x,y,rr,[[0,'rgba(78,63,57,.32)'],[.55,'rgba(53,42,38,.20)'],[1,'rgba(34,25,24,0)']]);ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fill()});
    });
    const ringTemplate=canvasTemplate(ctx=>{const c=TEMPLATE_SIZE/2,r=TEMPLATE_SIZE*.40;ctx.save();ctx.strokeStyle='rgba(255,236,147,.96)';ctx.lineWidth=22;ctx.shadowColor='rgba(255,155,38,.92)';ctx.shadowBlur=24;ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.stroke();ctx.restore()});
    const flashTemplate=canvasTemplate(ctx=>{const c=TEMPLATE_SIZE/2,r=TEMPLATE_SIZE*.23;ctx.fillStyle=radial(ctx,c,c,r,[[0,'rgba(255,255,255,1)'],[.32,'rgba(255,255,230,.98)'],[.70,'rgba(255,235,132,.78)'],[1,'rgba(255,177,46,0)']]);ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.fill()});

    function copyTemplate(source,target){target.width=TEMPLATE_SIZE;target.height=TEMPLATE_SIZE;target.getContext('2d').drawImage(source,0,0)}
    function makeProjectileSurface(){
      const sprite=document.createElement('div');sprite.className='miniBombThrowV5';
      const art=document.createElement('div');art.className='miniBombSpriteV5';art.style.backgroundImage=`url("${ART}")`;sprite.appendChild(art);
      const shadow=document.createElement('div');shadow.className='miniBombShadowV5';
      previousAppendChild(shadow);previousAppendChild(sprite);
      return {sprite,shadow,busy:false,token:null,landingAt:0};
    }
    function makeExplosionSurface(){
      const wrapper=document.createElement('div');wrapper.className='miniBombExplosionV5';
      const core=document.createElement('canvas'),ring=document.createElement('canvas'),flash=document.createElement('canvas');
      copyTemplate(coreTemplate,core);copyTemplate(ringTemplate,ring);copyTemplate(flashTemplate,flash);wrapper.append(core,ring,flash);previousAppendChild(wrapper);
      return {wrapper,core,ring,flash,busy:false,releaseTimer:0};
    }
    const projectilePool=Array.from({length:PROJECTILE_POOL_SIZE},makeProjectileSurface);
    const explosionPool=Array.from({length:EXPLOSION_POOL_SIZE},makeExplosionSurface);

    const artPreload=new Image();artPreload.decoding='async';artPreload.src=ART;artPreload.decode?.().catch(()=>{});
    function cancelAnimations(el){el?.getAnimations?.().forEach(animation=>animation.cancel())}
    function acquireProjectile(){
      for(let i=0;i<projectilePool.length;i++){const index=(projectileCursor+i)%projectilePool.length,s=projectilePool[index];if(!s.busy){projectileCursor=(index+1)%projectilePool.length;return s}}
      const s=projectilePool[projectileCursor];projectileCursor=(projectileCursor+1)%projectilePool.length;if(s.token!==null)projectiles.delete(s.token);cancelAnimations(s.sprite);cancelAnimations(s.shadow);return s;
    }
    function removeProjectile(token){
      const surface=projectiles.get(token);if(!surface)return;projectiles.delete(token);cancelAnimations(surface.sprite);cancelAnimations(surface.shadow);surface.sprite.style.display='none';surface.shadow.style.display='none';surface.busy=false;surface.token=null;surface.landingAt=0;
    }

    function launchBomb(context){
      const shape=context?.shape,targetWorld=shape?.center,originWorld=PLAYER.getPosition?.();if(!targetWorld||!originWorld)return;
      const start=proj(originWorld.x,originWorld.y),target=proj(targetWorld.x,targetWorld.y),token=context.shotToken,surface=acquireProjectile();
      surface.busy=true;surface.token=token;surface.landingAt=performance.now()+THROW_MS;projectiles.set(token,surface);pendingExplosions.push({token,shape});
      const {sprite,shadow}=surface;sprite.style.display='block';shadow.style.display='block';
      const sx=start.x-SPRITE_HALF,sy=start.y-88,tx=target.x-SPRITE_HALF,ty=target.y-62,dx=tx-sx,dy=ty-sy;
      const arcHeight=Math.min(205,Math.max(132,112+Math.hypot(dx,dy)*.18)),FRAME_COUNT=31,times=Array.from({length:FRAME_COUNT},(_,i)=>i/(FRAME_COUNT-1));
      const arcFrames=times.map(t=>{const x=sx+dx*t,y=sy+dy*t-4*arcHeight*t*(1-t),scale=.88+.10*(1-Math.abs(t*2-1)),rotation=-8+42*t;return{transform:`translate3d(${x}px,${y}px,0) rotate(${rotation}deg) scale(${scale})`,opacity:1,offset:t}});
      const ssx=start.x-SHADOW_W/2,ssy=start.y-SHADOW_H/2+2,stx=target.x-SHADOW_W/2,sty=target.y-SHADOW_H/2+2;
      const shadowFrames=times.map(t=>{const x=ssx+(stx-ssx)*t,y=ssy+(sty-ssy)*t,apex=1-Math.abs(t*2-1),scale=.78-.36*apex,opacity=.42-.28*apex;return{transform:`translate3d(${x}px,${y}px,0) scale(${scale})`,opacity,offset:t}});
      sprite.style.transform=arcFrames[0].transform;shadow.style.transform=shadowFrames[0].transform;
      cancelAnimations(sprite);cancelAnimations(shadow);
      if(typeof sprite.animate==='function'){
        const flight=sprite.animate(arcFrames,{duration:THROW_MS,fill:'forwards',easing:'linear'});flight.onfinish=()=>{sprite.style.transform=arcFrames[arcFrames.length-1].transform};
        shadow.animate(shadowFrames,{duration:THROW_MS,fill:'forwards',easing:'linear'});
      }else{sprite.style.transform=arcFrames[arcFrames.length-1].transform;shadow.style.transform=shadowFrames[shadowFrames.length-1].transform}
    }

    function acquireExplosion(){
      for(let i=0;i<explosionPool.length;i++){const index=(explosionCursor+i)%explosionPool.length,s=explosionPool[index];if(!s.busy){explosionCursor=(index+1)%explosionPool.length;return s}}
      const s=explosionPool[explosionCursor];explosionCursor=(explosionCursor+1)%explosionPool.length;clearTimeout(s.releaseTimer);[s.core,s.ring,s.flash].forEach(cancelAnimations);return s;
    }
    function renderExplosion(shape){
      const center=shape?.center,radius=Number(shape?.radiusWorld);if(!center||!(radius>0))return;
      const target=proj(center.x,center.y),rx=Math.SQRT2*radius*PX,ry=Math.SQRT2*radius*PY,width=rx*2,height=ry*2,surface=acquireExplosion();
      surface.busy=true;const {wrapper,core,ring,flash}=surface;wrapper.style.cssText=`width:${width}px;height:${height}px;left:${target.x-rx}px;top:${target.y-ry}px;display:block`;
      [core,ring,flash].forEach(el=>{cancelAnimations(el);el.style.opacity='1';el.style.transform='scale(1)'});
      if(typeof core.animate==='function'){
        flash.animate([{transform:'scale(.08)',opacity:1},{transform:'scale(1.25)',opacity:1,offset:.28},{transform:'scale(1.65)',opacity:0}],{duration:260,fill:'forwards',easing:'ease-out'});
        core.animate([{transform:'scale(.12)',opacity:1},{transform:'scale(1.04)',opacity:1,offset:.32},{transform:'scale(1.25)',opacity:.72,offset:.62},{transform:'scale(1.42)',opacity:0}],{duration:610,fill:'forwards',easing:'cubic-bezier(.1,.7,.2,1)'});
        ring.animate([{transform:'scale(.16)',opacity:1},{transform:'scale(1.08)',opacity:.92,offset:.38},{transform:'scale(1.5)',opacity:0}],{duration:520,fill:'forwards',easing:'cubic-bezier(.08,.68,.18,1)'});
      }
      clearTimeout(surface.releaseTimer);surface.releaseTimer=setTimeout(()=>{wrapper.style.display='none';surface.busy=false},780);
    }

    function explodeAtLanding(pending){
      if(!pending)return;const entry=projectiles.get(pending.token),remaining=Math.max(0,(entry?.landingAt??performance.now())-performance.now());
      const finish=()=>{removeProjectile(pending.token);renderExplosion(pending.shape)};if(remaining>4)setTimeout(finish,remaining);else finish();
    }

    scene.appendChild=function(node){
      if(node instanceof HTMLElement&&node.classList.contains('boom')){
        const pending=pendingExplosions.shift();
        if(pending)explodeAtLanding(pending);else{const context=COMBAT.getLastAttackContext?.();if(context?.sourceId===BOMB_ID)explodeAtLanding({token:context.shotToken,shape:context.shape})}
        return node;
      }
      return previousAppendChild(node);
    };

    function watch(){const context=COMBAT.getLastAttackContext?.();if(context?.sourceType==='CHIP'&&context.sourceId===BOMB_ID&&context.shotToken!==lastShotToken){lastShotToken=context.shotToken;launchBomb(context)}requestAnimationFrame(watch)}
    requestAnimationFrame(watch);

    window.BattleNetworkMiniBombEffect=Object.freeze({version:'MINIBOMB_PREPAINTED_COMPOSITOR_V5',image:ART,spriteSize:SPRITE_SIZE,throwMs:THROW_MS,projection:'RANGE_CIRCLE_ISOMETRIC',renderer:'PREPAINTED_CANVAS_COMPOSITOR',projectilePool:PROJECTILE_POOL_SIZE,explosionPool:EXPLOSION_POOL_SIZE});
  }

  if(document.readyState==='complete')queueMicrotask(installEffect);else window.addEventListener('load',installEffect,{once:true});
})();
