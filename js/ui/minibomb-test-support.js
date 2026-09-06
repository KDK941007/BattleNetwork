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
    if(!scene||!FIELD||!COMBAT||!PLAYER||scene.dataset.miniBombEffect==='v1')return;
    scene.dataset.miniBombEffect='v1';

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
    style.id='miniBombEffectV1Style';
    style.textContent=`
      #scene .miniBombThrowV1{position:absolute;left:0;top:0;width:76px;height:76px;z-index:11;pointer-events:none;border-radius:50%;overflow:hidden;background:rgba(18,30,36,.7);box-shadow:0 0 14px rgba(255,185,64,.82);will-change:transform,opacity;backface-visibility:hidden}
      #scene .miniBombThrowV1 img{display:block;width:100%;height:100%;object-fit:cover;object-position:center;transform:scale(1.12);pointer-events:none}
      #scene .miniBombExplosionV1{position:absolute;z-index:12;pointer-events:none;border-radius:50%;overflow:visible;transform-origin:50% 50%;will-change:transform,opacity;backface-visibility:hidden}
      #scene .miniBombExplosionCoreV1,#scene .miniBombExplosionRingV1,#scene .miniBombExplosionFlashV1{position:absolute;inset:0;border-radius:50%;pointer-events:none;transform-origin:50% 50%;will-change:transform,opacity}
      #scene .miniBombExplosionCoreV1{background:radial-gradient(ellipse at center,rgba(255,255,244,1) 0 12%,rgba(255,239,111,.98) 20%,rgba(255,166,45,.96) 43%,rgba(255,73,24,.82) 66%,rgba(121,20,8,.30) 78%,rgba(70,8,4,0) 100%);box-shadow:0 0 22px rgba(255,177,48,.95),0 0 48px rgba(255,72,24,.68)}
      #scene .miniBombExplosionRingV1{inset:-8%;border:8px solid rgba(255,231,122,.92);box-shadow:0 0 16px rgba(255,124,34,.9),inset 0 0 12px rgba(255,250,210,.7)}
      #scene .miniBombExplosionFlashV1{inset:24%;background:rgba(255,255,236,.98);box-shadow:0 0 24px rgba(255,248,170,.98)}
      #scene .miniBombExplosionSparkV1{position:absolute;left:50%;top:50%;width:18px;height:6px;margin-left:-9px;margin-top:-3px;border-radius:4px;background:linear-gradient(90deg,rgba(255,255,236,1),rgba(255,205,74,.98) 45%,rgba(255,86,27,.9));box-shadow:0 0 8px rgba(255,165,43,.9);transform-origin:50% 50%;pointer-events:none;will-change:transform,opacity}
    `;
    document.head.appendChild(style);

    function proj(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}

    function removeProjectile(token){
      const el=projectiles.get(token);
      if(!el)return;
      projectiles.delete(token);
      el.getAnimations?.().forEach(animation=>animation.cancel());
      el.remove();
    }

    function launchBomb(context){
      const shape=context?.shape,targetWorld=shape?.center,originWorld=PLAYER.getPosition?.();
      if(!targetWorld||!originWorld)return;
      const start=proj(originWorld.x,originWorld.y),target=proj(targetWorld.x,targetWorld.y);
      const token=context.shotToken;
      const el=document.createElement('div');
      el.className='miniBombThrowV1';
      const img=document.createElement('img');
      img.src=ART;img.alt='';img.draggable=false;
      el.appendChild(img);
      previousAppendChild(el);
      projectiles.set(token,el);
      pendingExplosions.push({token,shape});

      const sx=start.x-38,sy=start.y-92;
      const tx=target.x-38,ty=target.y-50;
      const mx=(sx+tx)/2,my=(sy+ty)/2-Math.min(150,92+Math.hypot(tx-sx,ty-sy)*.12);
      if(typeof el.animate==='function'){
        const animation=el.animate([
          {transform:`translate3d(${sx}px,${sy}px,0) rotate(-18deg) scale(.72)`,opacity:.96,offset:0},
          {transform:`translate3d(${mx}px,${my}px,0) rotate(150deg) scale(1.02)`,opacity:1,offset:.48},
          {transform:`translate3d(${tx}px,${ty}px,0) rotate(330deg) scale(.88)`,opacity:1,offset:1}
        ],{duration:THROW_MS,fill:'forwards',easing:'cubic-bezier(.23,.72,.34,1)'});
        animation.onfinish=()=>{el.style.transform=`translate3d(${tx}px,${ty}px,0) rotate(330deg) scale(.88)`};
      }else{
        el.style.transform=`translate3d(${tx}px,${ty}px,0) scale(.88)`;
      }
    }

    function renderExplosion(shape){
      const center=shape?.center,radius=Number(shape?.radiusWorld);
      if(!center||!(radius>0))return;
      const target=proj(center.x,center.y);
      // Match the same world-circle -> screen-ellipse projection used by range-preview-renderer.
      const rx=Math.SQRT2*radius*PX,ry=Math.SQRT2*radius*PY;
      const width=rx*2,height=ry*2;
      const blast=document.createElement('div');
      blast.className='miniBombExplosionV1';
      blast.style.cssText=`width:${width}px;height:${height}px;left:${target.x-rx}px;top:${target.y-ry}px`;

      const core=document.createElement('div');core.className='miniBombExplosionCoreV1';
      const ring=document.createElement('div');ring.className='miniBombExplosionRingV1';
      const flash=document.createElement('div');flash.className='miniBombExplosionFlashV1';
      blast.append(core,ring,flash);

      const sparkCount=12;
      for(let i=0;i<sparkCount;i++){
        const spark=document.createElement('span');
        spark.className='miniBombExplosionSparkV1';
        blast.appendChild(spark);
        const angle=i/sparkCount*Math.PI*2+(i%2?.11:0);
        const dx=Math.cos(angle)*rx*1.45,dy=Math.sin(angle)*ry*1.65;
        const deg=angle*180/Math.PI;
        spark.animate?.([
          {transform:`translate3d(0,0,0) rotate(${deg}deg) scaleX(.25)`,opacity:1},
          {transform:`translate3d(${dx}px,${dy}px,0) rotate(${deg}deg) scaleX(1.55)`,opacity:0}
        ],{duration:430+((i%3)*35),fill:'forwards',easing:'cubic-bezier(.12,.64,.3,1)'});
      }

      previousAppendChild(blast);
      core.animate?.([
        {transform:'scale(.18)',opacity:1,offset:0},
        {transform:'scale(1.02)',opacity:1,offset:.38},
        {transform:'scale(1.34)',opacity:0,offset:1}
      ],{duration:560,fill:'forwards',easing:'cubic-bezier(.12,.72,.25,1)'});
      ring.animate?.([
        {transform:'scale(.22)',opacity:1},
        {transform:'scale(1.42)',opacity:0}
      ],{duration:470,fill:'forwards',easing:'cubic-bezier(.08,.7,.2,1)'});
      flash.animate?.([
        {transform:'scale(.2)',opacity:1},
        {transform:'scale(1.35)',opacity:.9,offset:.32},
        {transform:'scale(1.72)',opacity:0}
      ],{duration:300,fill:'forwards',easing:'ease-out'});
      setTimeout(()=>blast.remove(),620);
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
      version:'MINIBOMB_THROW_ART_EXPLOSION_V1',
      image:ART,
      projection:'RANGE_CIRCLE_ISOMETRIC',
      renderer:'DOM_TRANSFORM_OPACITY'
    });
  }

  if(document.readyState==='complete')queueMicrotask(installEffect);
  else window.addEventListener('load',installEffect,{once:true});
})();
