(()=>{
  const MASTER=window.BattleNetworkMaster;
  if(!MASTER)throw new Error('BattleNetworkMiniBomb: required master service is missing.');

  const DIAMETER_TILES=2;
  const settings=Object.freeze({diameterTiles:DIAMETER_TILES});
  window.BattleNetworkMiniBombSettings=Object.freeze({getSettings:()=>settings});

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
    if(!scene||!FIELD||!COMBAT||!PLAYER||scene.dataset.miniBombEffect==='v8')return;
    scene.dataset.miniBombEffect='v8';

    const BOMB_ID='CHIP_0004';
    const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;
    const ART=MASTER.createGameCompatibilityData?.().CHIP?.BOMB?.image||'./assets/chips/ミニボム.png';
    const delayValue=Number(MASTER.createGameCompatibilityData?.().CHIP?.BOMB?.explosionDelay);
    const BASE_DELAY_MS=Math.max(0,(Number.isFinite(delayValue)?delayValue:.28)*1000);
    const THROW_MS=Math.max(720,BASE_DELAY_MS);
    const SPRITE_SIZE=92,SPRITE_HALF=SPRITE_SIZE/2;
    const SHADOW_W=62,SHADOW_H=19;
    const POOL_SIZE=2;
    const PARK='translate3d(-2400px,-2400px,0)';
    const previousAppendChild=scene.appendChild.bind(scene);
    const pendingExplosions=[];
    const projectiles=new Map();
    let lastShotToken=null,projectileCursor=0,explosionCursor=0,prewarmed=false;

    const fixedRadius=FIELD.toWorldDistance(DIAMETER_TILES/2);
    const fixedRx=Math.SQRT2*fixedRadius*PX,fixedRy=Math.SQRT2*fixedRadius*PY;
    const blastWidth=fixedRx*2,blastHeight=fixedRy*2;

    const artPreload=new Image();
    artPreload.decoding='async';
    artPreload.src=ART;
    artPreload.decode?.().catch(()=>{});

    const style=document.createElement('style');
    style.id='miniBombEffectV8Style';
    style.textContent=`
      #scene .miniBombThrowV4{position:absolute;left:0;top:0;width:${SPRITE_SIZE}px;height:${SPRITE_SIZE}px;z-index:11;pointer-events:none;background:transparent!important;overflow:visible;will-change:transform,opacity;backface-visibility:hidden;contain:layout paint style;opacity:0;transform:${PARK}}
      #scene .miniBombSpriteV4{position:absolute;inset:0;background-repeat:no-repeat;background-size:145% 145%;background-position:50% 50%;clip-path:circle(42% at 50% 50%);filter:drop-shadow(0 4px 3px rgba(0,0,0,.55)) drop-shadow(0 0 8px rgba(76,183,255,.72));pointer-events:none}
      #scene .miniBombShadowV4{position:absolute;left:0;top:0;width:${SHADOW_W}px;height:${SHADOW_H}px;z-index:9;border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.48) 0 42%,rgba(0,0,0,.2) 66%,rgba(0,0,0,0) 100%);filter:blur(2px);pointer-events:none;will-change:transform,opacity;contain:layout paint style;opacity:0;transform:${PARK}}
      #scene .miniBombExplosionV2{position:absolute;left:0;top:0;width:${blastWidth}px;height:${blastHeight}px;z-index:12;pointer-events:none;border-radius:50%;overflow:visible;transform-origin:0 0;will-change:transform,opacity;backface-visibility:hidden;contain:layout paint style;opacity:0;transform:${PARK}}
      #scene .miniBombBlastCoreV2,#scene .miniBombShockRingV2,#scene .miniBombBlastFlashV2{position:absolute;inset:0;border-radius:50%;pointer-events:none;transform-origin:50% 50%;will-change:transform,opacity}
      #scene .miniBombBlastCoreV2{background:radial-gradient(ellipse at center,rgba(255,255,255,1) 0 8%,rgba(255,250,178,1) 13%,rgba(255,218,75,.98) 25%,rgba(255,138,28,.96) 48%,rgba(242,60,18,.88) 67%,rgba(91,9,3,.25) 82%,rgba(62,5,2,0) 100%);box-shadow:0 0 34px rgba(255,182,54,.98),0 0 70px rgba(255,72,18,.72)}
      #scene .miniBombShockRingV2{inset:-6%;border:10px solid rgba(255,236,147,.96);box-shadow:0 0 20px rgba(255,155,38,.98),inset 0 0 18px rgba(255,250,208,.9)}
      #scene .miniBombBlastFlashV2{inset:25%;background:rgba(255,255,245,1);box-shadow:0 0 32px rgba(255,252,194,1),0 0 64px rgba(255,177,46,.86)}
      #scene .miniBombFireballV2{position:absolute;width:48%;height:72%;border-radius:50%;background:radial-gradient(ellipse at 42% 38%,rgba(255,255,230,1) 0 9%,rgba(255,226,82,.98) 22%,rgba(255,128,28,.96) 50%,rgba(226,43,13,.82) 72%,rgba(96,8,3,0) 100%);box-shadow:0 0 18px rgba(255,132,30,.82);pointer-events:none;will-change:transform,opacity}
      #scene .miniBombSparkV2{position:absolute;left:50%;top:50%;width:24px;height:7px;margin-left:-12px;margin-top:-3.5px;border-radius:5px;background:linear-gradient(90deg,rgba(255,255,244,1),rgba(255,220,86,1) 42%,rgba(255,87,22,.94));box-shadow:0 0 10px rgba(255,162,38,.96);transform-origin:50% 50%;pointer-events:none;will-change:transform,opacity}
      #scene .miniBombSmokeV2{position:absolute;width:34%;height:52%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(92,74,64,.56) 0 30%,rgba(55,44,40,.38) 58%,rgba(34,25,24,0) 100%);filter:blur(3px);pointer-events:none;will-change:transform,opacity}
    `;
    document.head.appendChild(style);

    function proj(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
    function cancelAnimation(a){try{a?.cancel?.()}catch{}}

    function makeProjectileSurface(){
      const sprite=document.createElement('div');
      sprite.className='miniBombThrowV4';
      const art=document.createElement('div');
      art.className='miniBombSpriteV4';
      art.style.backgroundImage=`url("${ART}")`;
      sprite.appendChild(art);
      const shadow=document.createElement('div');
      shadow.className='miniBombShadowV4';
      previousAppendChild(shadow);previousAppendChild(sprite);
      return {sprite,shadow,busy:false,token:null,landingAt:0,flight:null,shadowFlight:null};
    }

    const lobeLayout=[[4,8,.84],[28,-10,1.02],[55,6,.88],[9,39,.92],[34,28,1.08],[59,40,.82],[31,51,.76]];
    const smokeLayout=[[12,18,-18],[38,5,-28],[58,22,-20],[24,42,-34],[50,43,-30]];

    function makePausedAnimation(el,frames,options){
      if(typeof el.animate!=='function')return null;
      const a=el.animate(frames,options);a.pause();a.currentTime=0;return a;
    }

    function makeExplosionSurface(){
      const blast=document.createElement('div');blast.className='miniBombExplosionV2';
      const core=document.createElement('div');core.className='miniBombBlastCoreV2';
      const ring=document.createElement('div');ring.className='miniBombShockRingV2';
      const flash=document.createElement('div');flash.className='miniBombBlastFlashV2';
      blast.append(core,ring,flash);

      const lobes=lobeLayout.map(([left,top,scale],index)=>{
        const el=document.createElement('span');el.className='miniBombFireballV2';el.style.left=left+'%';el.style.top=top+'%';blast.appendChild(el);
        const animation=makePausedAnimation(el,[
          {transform:'scale(.12)',opacity:0,offset:0},
          {transform:`scale(${scale})`,opacity:1,offset:.22+(index%3)*.035},
          {transform:`scale(${scale*1.28})`,opacity:.82,offset:.58},
          {transform:`scale(${scale*1.52})`,opacity:0,offset:1}
        ],{duration:560+(index%2)*70,fill:'forwards',easing:'cubic-bezier(.12,.72,.24,1)'});
        return {el,animation};
      });

      const sparks=Array.from({length:18},(_,i)=>{
        const el=document.createElement('span');el.className='miniBombSparkV2';blast.appendChild(el);
        const a=i/18*Math.PI*2+(i%3)*.07;
        const dx=Math.cos(a)*fixedRx*(1.35+(i%4)*.12),dy=Math.sin(a)*fixedRy*(1.62+(i%3)*.16),deg=a*180/Math.PI;
        const animation=makePausedAnimation(el,[
          {transform:`translate3d(0,0,0) rotate(${deg}deg) scaleX(.2)`,opacity:1},
          {transform:`translate3d(${dx}px,${dy}px,0) rotate(${deg}deg) scaleX(1.8)`,opacity:0}
        ],{duration:390+(i%4)*45,fill:'forwards',easing:'cubic-bezier(.1,.62,.22,1)'});
        return {el,animation};
      });

      const smoke=smokeLayout.map(([left,top,rise],index)=>{
        const el=document.createElement('span');el.className='miniBombSmokeV2';el.style.left=left+'%';el.style.top=top+'%';blast.appendChild(el);
        const animation=makePausedAnimation(el,[
          {transform:'translate3d(0,0,0) scale(.35)',opacity:0,offset:0},
          {transform:'translate3d(0,-4px,0) scale(.78)',opacity:.46,offset:.28},
          {transform:`translate3d(${(index-2)*8}px,${rise}px,0) scale(1.35)`,opacity:0,offset:1}
        ],{duration:720,fill:'forwards',easing:'ease-out'});
        return {el,animation};
      });

      const flashAnimation=makePausedAnimation(flash,[
        {transform:'scale(.08)',opacity:1,offset:0},{transform:'scale(1.25)',opacity:1,offset:.28},{transform:'scale(1.65)',opacity:0,offset:1}
      ],{duration:260,fill:'forwards',easing:'ease-out'});
      const coreAnimation=makePausedAnimation(core,[
        {transform:'scale(.12)',opacity:1,offset:0},{transform:'scale(1.04)',opacity:1,offset:.32},{transform:'scale(1.25)',opacity:.72,offset:.62},{transform:'scale(1.42)',opacity:0,offset:1}
      ],{duration:610,fill:'forwards',easing:'cubic-bezier(.1,.7,.2,1)'});
      const ringAnimation=makePausedAnimation(ring,[
        {transform:'scale(.16)',opacity:1},{transform:'scale(1.08)',opacity:.92,offset:.38},{transform:'scale(1.5)',opacity:0}
      ],{duration:520,fill:'forwards',easing:'cubic-bezier(.08,.68,.18,1)'});

      previousAppendChild(blast);
      return {blast,busy:false,releaseTimer:0,animations:[flashAnimation,coreAnimation,ringAnimation,...lobes.map(v=>v.animation),...sparks.map(v=>v.animation),...smoke.map(v=>v.animation)].filter(Boolean)};
    }

    const projectilePool=Array.from({length:POOL_SIZE},makeProjectileSurface);
    const explosionPool=Array.from({length:POOL_SIZE},makeExplosionSurface);

    function parkProjectile(surface){
      cancelAnimation(surface.flight);cancelAnimation(surface.shadowFlight);surface.flight=surface.shadowFlight=null;
      surface.sprite.style.opacity='0';surface.sprite.style.transform=PARK;
      surface.shadow.style.opacity='0';surface.shadow.style.transform=PARK;
      surface.busy=false;surface.token=null;surface.landingAt=0;
    }
    function acquireProjectile(){
      for(let i=0;i<POOL_SIZE;i++){const index=(projectileCursor+i)%POOL_SIZE,s=projectilePool[index];if(!s.busy){projectileCursor=(index+1)%POOL_SIZE;return s}}
      const s=projectilePool[projectileCursor];projectileCursor=(projectileCursor+1)%POOL_SIZE;if(s.token!==null)projectiles.delete(s.token);parkProjectile(s);return s;
    }
    function removeProjectile(token){const s=projectiles.get(token);if(!s)return;projectiles.delete(token);parkProjectile(s)}

    function acquireExplosion(){
      for(let i=0;i<POOL_SIZE;i++){const index=(explosionCursor+i)%POOL_SIZE,s=explosionPool[index];if(!s.busy){explosionCursor=(index+1)%POOL_SIZE;return s}}
      const s=explosionPool[explosionCursor];explosionCursor=(explosionCursor+1)%POOL_SIZE;clearTimeout(s.releaseTimer);s.animations.forEach(a=>{a.pause();a.currentTime=0});return s;
    }
    function parkExplosion(surface){
      clearTimeout(surface.releaseTimer);
      surface.animations.forEach(a=>{a.pause();a.currentTime=0});
      surface.blast.style.opacity='0';surface.blast.style.transform=PARK;surface.busy=false;
    }

    function prewarmVisualLayers(){
      if(prewarmed)return;prewarmed=true;
      projectilePool.forEach((surface,index)=>{
        surface.sprite.style.transform=`translate3d(${80+index*110}px,80px,0)`;
        surface.sprite.style.opacity='.001';
        surface.shadow.style.transform=`translate3d(${80+index*110}px,170px,0)`;
        surface.shadow.style.opacity='.001';
      });
      explosionPool.forEach((surface,index)=>{
        surface.blast.style.transform=`translate3d(${160+index*260}px,160px,0)`;
        surface.blast.style.opacity='.001';
        surface.animations.forEach(a=>{
          const timing=a.effect?.getTiming?.();
          const duration=Number(timing?.duration);
          a.pause();a.currentTime=Number.isFinite(duration)&&duration>0?duration*.55:180;
        });
      });
      scene.getBoundingClientRect();
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        projectilePool.forEach(parkProjectile);
        explosionPool.forEach(parkExplosion);
      }));
    }

    requestAnimationFrame(()=>requestAnimationFrame(prewarmVisualLayers));

    function launchBomb(context){
      const shape=context?.shape,targetWorld=shape?.center,originWorld=PLAYER.getPosition?.();
      if(!targetWorld||!originWorld)return;
      const start=proj(originWorld.x,originWorld.y),target=proj(targetWorld.x,targetWorld.y),token=context.shotToken,surface=acquireProjectile();
      surface.busy=true;surface.token=token;surface.landingAt=performance.now()+THROW_MS;projectiles.set(token,surface);pendingExplosions.push({token,shape});
      const sx=start.x-SPRITE_HALF,sy=start.y-88,tx=target.x-SPRITE_HALF,ty=target.y-62,dx=tx-sx,dy=ty-sy;
      const arcHeight=Math.min(205,Math.max(132,112+Math.hypot(dx,dy)*.18)),FRAME_COUNT=31,times=Array.from({length:FRAME_COUNT},(_,i)=>i/(FRAME_COUNT-1));
      const arcFrames=times.map(t=>{const x=sx+dx*t,y=sy+dy*t-4*arcHeight*t*(1-t),scale=.88+.10*(1-Math.abs(t*2-1)),rotation=-8+42*t;return{transform:`translate3d(${x}px,${y}px,0) rotate(${rotation}deg) scale(${scale})`,opacity:1,offset:t}});
      const ssx=start.x-SHADOW_W/2,ssy=start.y-SHADOW_H/2+2,stx=target.x-SHADOW_W/2,sty=target.y-SHADOW_H/2+2;
      const shadowFrames=times.map(t=>{const x=ssx+(stx-ssx)*t,y=ssy+(sty-ssy)*t,apex=1-Math.abs(t*2-1),scale=.78-.36*apex,opacity=.46-.30*apex;return{transform:`translate3d(${x}px,${y}px,0) scale(${scale})`,opacity,offset:t}});
      surface.sprite.style.transform=arcFrames[0].transform;surface.sprite.style.opacity='1';surface.shadow.style.transform=shadowFrames[0].transform;surface.shadow.style.opacity=String(shadowFrames[0].opacity);
      if(typeof surface.sprite.animate==='function'){
        surface.flight=surface.sprite.animate(arcFrames,{duration:THROW_MS,fill:'forwards',easing:'linear'});
        surface.shadowFlight=surface.shadow.animate(shadowFrames,{duration:THROW_MS,fill:'forwards',easing:'linear'});
      }
    }

    function renderExplosion(shape){
      const center=shape?.center,radius=Number(shape?.radiusWorld);if(!center||!(radius>0))return;
      const target=proj(center.x,center.y),surface=acquireExplosion();surface.busy=true;
      surface.blast.style.transform=`translate3d(${target.x-fixedRx}px,${target.y-fixedRy}px,0)`;surface.blast.style.opacity='1';
      surface.animations.forEach(a=>{a.pause();a.currentTime=0;a.play()});
      surface.releaseTimer=setTimeout(()=>parkExplosion(surface),780);
    }

    function explodeAtLanding(pending){
      if(!pending)return;const entry=projectiles.get(pending.token),remaining=Math.max(0,(entry?.landingAt??performance.now())-performance.now());
      const finish=()=>{removeProjectile(pending.token);renderExplosion(pending.shape)};
      if(remaining>4)setTimeout(finish,remaining);else finish();
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

    window.BattleNetworkMiniBombEffect=Object.freeze({version:'MINIBOMB_V4_VISUAL_PREWARMED_POOL_V8',image:ART,spriteSize:SPRITE_SIZE,throwMs:THROW_MS,projection:'RANGE_CIRCLE_ISOMETRIC',renderer:'PREWARMED_RESIDENT_V4_DOM_POOL',projectilePool:POOL_SIZE,explosionPool:POOL_SIZE});
  }

  if(document.readyState==='complete')queueMicrotask(installEffect);else window.addEventListener('load',installEffect,{once:true});
})();