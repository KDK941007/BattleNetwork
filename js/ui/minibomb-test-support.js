(()=>{
  const MASTER=window.BattleNetworkMaster;
  if(!MASTER)throw new Error('BattleNetworkMiniBomb: required master service is missing.');

  const DIAMETER_TILES=2;
  const settings=Object.freeze({diameterTiles:DIAMETER_TILES});
  window.BattleNetworkMiniBombSettings=Object.freeze({getSettings:()=>settings});

  // Finalized MiniBomb parameters: fixed 3-tile throw and 2-tile blast diameter.
  // Visual review changes below do not alter hit/range/damage behavior.
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
    if(!scene||!FIELD||!COMBAT||!PLAYER||scene.dataset.miniBombEffect==='v2')return;
    scene.dataset.miniBombEffect='v2';

    const BOMB_ID='CHIP_0004';
    const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;
    const ART=MASTER.createGameCompatibilityData?.().CHIP?.BOMB?.image||'./assets/chips/ミニボム.png';
    const delayValue=Number(MASTER.createGameCompatibilityData?.().CHIP?.BOMB?.explosionDelay);
    const THROW_MS=Math.max(160,(Number.isFinite(delayValue)?delayValue:.28)*1000);
    const previousAppendChild=scene.appendChild.bind(scene);
    const pendingExplosions=[];
    const projectiles=new Map();
    let lastShotToken=null;

    const style=document.createElement('style');
    style.id='miniBombEffectV2Style';
    style.textContent=`
      #scene .miniBombThrowV2{position:absolute;left:0;top:0;width:116px;height:116px;z-index:11;pointer-events:none;background:transparent!important;overflow:visible;will-change:transform,opacity;backface-visibility:hidden}
      #scene .miniBombSpriteV2{position:absolute;inset:0;background-repeat:no-repeat;background-size:145% 145%;background-position:50% 50%;clip-path:circle(42% at 50% 50%);filter:drop-shadow(0 5px 3px rgba(0,0,0,.55)) drop-shadow(0 0 10px rgba(76,183,255,.78));pointer-events:none}
      #scene .miniBombShadowV2{position:absolute;left:0;top:0;width:78px;height:24px;z-index:9;border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.48) 0 42%,rgba(0,0,0,.2) 66%,rgba(0,0,0,0) 100%);filter:blur(2px);pointer-events:none;will-change:transform,opacity}
      #scene .miniBombExplosionV2{position:absolute;z-index:12;pointer-events:none;border-radius:50%;overflow:visible;transform-origin:50% 50%;will-change:transform,opacity;backface-visibility:hidden}
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

    function removeProjectile(token){
      const entry=projectiles.get(token);
      if(!entry)return;
      projectiles.delete(token);
      [entry.sprite,entry.shadow].forEach(el=>{
        if(!el)return;
        el.getAnimations?.().forEach(animation=>animation.cancel());
        el.remove();
      });
    }

    function launchBomb(context){
      const shape=context?.shape,targetWorld=shape?.center,originWorld=PLAYER.getPosition?.();
      if(!targetWorld||!originWorld)return;
      const start=proj(originWorld.x,originWorld.y),target=proj(targetWorld.x,targetWorld.y);
      const token=context.shotToken;

      const sprite=document.createElement('div');
      sprite.className='miniBombThrowV2';
      const art=document.createElement('div');
      art.className='miniBombSpriteV2';
      art.style.backgroundImage=`url("${ART}")`;
      sprite.appendChild(art);

      const shadow=document.createElement('div');
      shadow.className='miniBombShadowV2';
      previousAppendChild(shadow);
      previousAppendChild(sprite);
      projectiles.set(token,{sprite,shadow});
      pendingExplosions.push({token,shape});

      const sx=start.x-58,sy=start.y-116;
      const tx=target.x-58,ty=target.y-80;
      const mx=(sx+tx)/2,my=(sy+ty)/2-Math.min(170,110+Math.hypot(tx-sx,ty-sy)*.14);
      const ssx=start.x-39,ssy=start.y-9;
      const stx=target.x-39,sty=target.y-8;

      if(typeof sprite.animate==='function'){
        const flight=sprite.animate([
          {transform:`translate3d(${sx}px,${sy}px,0) rotate(-12deg) scale(.78)`,opacity:1,offset:0},
          {transform:`translate3d(${mx}px,${my}px,0) rotate(42deg) scale(1.08)`,opacity:1,offset:.5},
          {transform:`translate3d(${tx}px,${ty}px,0) rotate(92deg) scale(.94)`,opacity:1,offset:1}
        ],{duration:THROW_MS,fill:'forwards',easing:'cubic-bezier(.2,.68,.28,1)'});
        flight.onfinish=()=>{sprite.style.transform=`translate3d(${tx}px,${ty}px,0) rotate(92deg) scale(.94)`};
        shadow.animate([
          {transform:`translate3d(${ssx}px,${ssy}px,0) scale(.58)`,opacity:.34,offset:0},
          {transform:`translate3d(${(ssx+stx)/2}px,${(ssy+sty)/2}px,0) scale(.36)`,opacity:.16,offset:.5},
          {transform:`translate3d(${stx}px,${sty}px,0) scale(.82)`,opacity:.48,offset:1}
        ],{duration:THROW_MS,fill:'forwards',easing:'linear'});
      }else{
        sprite.style.transform=`translate3d(${tx}px,${ty}px,0) scale(.94)`;
        shadow.style.transform=`translate3d(${stx}px,${sty}px,0) scale(.82)`;
      }
    }

    function renderExplosion(shape){
      const center=shape?.center,radius=Number(shape?.radiusWorld);
      if(!center||!(radius>0))return;
      const target=proj(center.x,center.y);
      // Same world-circle -> screen-ellipse projection as the range preview.
      const rx=Math.SQRT2*radius*PX,ry=Math.SQRT2*radius*PY;
      const width=rx*2,height=ry*2;
      const blast=document.createElement('div');
      blast.className='miniBombExplosionV2';
      blast.style.cssText=`width:${width}px;height:${height}px;left:${target.x-rx}px;top:${target.y-ry}px`;

      const core=document.createElement('div');core.className='miniBombBlastCoreV2';
      const ring=document.createElement('div');ring.className='miniBombShockRingV2';
      const flash=document.createElement('div');flash.className='miniBombBlastFlashV2';
      blast.append(core,ring,flash);

      const lobeLayout=[
        [4,8,.84],[28,-10,1.02],[55,6,.88],[9,39,.92],[34,28,1.08],[59,40,.82],[31,51,.76]
      ];
      lobeLayout.forEach(([left,top,scale],index)=>{
        const lobe=document.createElement('span');
        lobe.className='miniBombFireballV2';
        lobe.style.left=left+'%';lobe.style.top=top+'%';
        blast.appendChild(lobe);
        lobe.animate?.([
          {transform:'scale(.12)',opacity:0,offset:0},
          {transform:`scale(${scale})`,opacity:1,offset:.22+(index%3)*.035},
          {transform:`scale(${scale*1.28})`,opacity:.82,offset:.58},
          {transform:`scale(${scale*1.52})`,opacity:0,offset:1}
        ],{duration:560+(index%2)*70,fill:'forwards',easing:'cubic-bezier(.12,.72,.24,1)'});
      });

      const sparkCount=18;
      for(let i=0;i<sparkCount;i++){
        const spark=document.createElement('span');
        spark.className='miniBombSparkV2';
        blast.appendChild(spark);
        const a=i/sparkCount*Math.PI*2+(i%3)*.07;
        const dx=Math.cos(a)*rx*(1.35+(i%4)*.12),dy=Math.sin(a)*ry*(1.62+(i%3)*.16);
        const deg=a*180/Math.PI;
        spark.animate?.([
          {transform:`translate3d(0,0,0) rotate(${deg}deg) scaleX(.2)`,opacity:1},
          {transform:`translate3d(${dx}px,${dy}px,0) rotate(${deg}deg) scaleX(1.8)`,opacity:0}
        ],{duration:390+(i%4)*45,fill:'forwards',easing:'cubic-bezier(.1,.62,.22,1)'});
      }

      const smokeLayout=[[12,18,-18],[38,5,-28],[58,22,-20],[24,42,-34],[50,43,-30]];
      smokeLayout.forEach(([left,top,rise],index)=>{
        const smoke=document.createElement('span');
        smoke.className='miniBombSmokeV2';
        smoke.style.left=left+'%';smoke.style.top=top+'%';
        blast.appendChild(smoke);
        smoke.animate?.([
          {transform:'translate3d(0,0,0) scale(.35)',opacity:0,offset:0},
          {transform:'translate3d(0,-4px,0) scale(.78)',opacity:.46,offset:.28},
          {transform:`translate3d(${(index-2)*8}px,${rise}px,0) scale(1.35)`,opacity:0,offset:1}
        ],{duration:720,fill:'forwards',easing:'ease-out'});
      });

      previousAppendChild(blast);
      flash.animate?.([
        {transform:'scale(.08)',opacity:1,offset:0},
        {transform:'scale(1.25)',opacity:1,offset:.28},
        {transform:'scale(1.65)',opacity:0,offset:1}
      ],{duration:260,fill:'forwards',easing:'ease-out'});
      core.animate?.([
        {transform:'scale(.12)',opacity:1,offset:0},
        {transform:'scale(1.04)',opacity:1,offset:.32},
        {transform:'scale(1.25)',opacity:.72,offset:.62},
        {transform:'scale(1.42)',opacity:0,offset:1}
      ],{duration:610,fill:'forwards',easing:'cubic-bezier(.1,.7,.2,1)'});
      ring.animate?.([
        {transform:'scale(.16)',opacity:1},
        {transform:'scale(1.08)',opacity:.92,offset:.38},
        {transform:'scale(1.5)',opacity:0}
      ],{duration:520,fill:'forwards',easing:'cubic-bezier(.08,.68,.18,1)'});
      setTimeout(()=>blast.remove(),780);
    }

    scene.appendChild=function(node){
      if(node instanceof HTMLElement&&node.classList.contains('boom')){
        const pending=pendingExplosions.shift();
        if(pending){removeProjectile(pending.token);renderExplosion(pending.shape)}
        else{
          const context=COMBAT.getLastAttackContext?.();
          if(context?.sourceId===BOMB_ID){removeProjectile(context.shotToken);renderExplosion(context.shape)}
        }
        return node;
      }
      return previousAppendChild(node);
    };

    function watch(){
      const context=COMBAT.getLastAttackContext?.();
      if(context?.sourceType==='CHIP'&&context.sourceId===BOMB_ID&&context.shotToken!==lastShotToken){
        lastShotToken=context.shotToken;
        launchBomb(context);
      }
      requestAnimationFrame(watch);
    }
    requestAnimationFrame(watch);

    window.BattleNetworkMiniBombEffect=Object.freeze({
      version:'MINIBOMB_THROW_CROPPED_ART_EXPLOSION_V2',
      image:ART,
      projection:'RANGE_CIRCLE_ISOMETRIC',
      renderer:'DOM_TRANSFORM_OPACITY'
    });
  }

  if(document.readyState==='complete')queueMicrotask(installEffect);
  else window.addEventListener('load',installEffect,{once:true});
})();
