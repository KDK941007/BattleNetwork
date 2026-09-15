(()=>{
  const FIELD=window.BattleNetworkField;
  const RANGE=window.BattleNetworkRangeGeometry;
  if(!FIELD)throw new Error('BattleNetworkEnemy: logical field grid is not loaded.');
  if(!RANGE)throw new Error('BattleNetworkEnemy: range geometry is not loaded.');

  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2,DEPTH_Z_BASE=100;
  const enemies=[];
  const listeners=new Set();
  const DEFEAT_BANDS=Object.freeze([
    Object.freeze({start:0,end:.31,duration:220,hold:.42,dx:-2,dy:-1,lineX:-5}),
    Object.freeze({start:.31,end:.67,duration:320,hold:.55,dx:2,dy:0,lineX:6}),
    Object.freeze({start:.67,end:1,duration:400,hold:.66,dx:-1,dy:2,lineX:-2})
  ]);
  let nextId=1;

  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function depthZAtWorld(x,y,tie=0){const p=project(x,y);return DEPTH_Z_BASE+Math.max(0,Math.round(p.y*10))+Math.trunc(Number(tie)||0)}
  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function normalizeVisual(visual){
    return Object.freeze({
      width:positive(visual?.width,116),
      height:positive(visual?.height,140),
      offsetX:finite(visual?.offsetX),
      offsetY:finite(visual?.offsetY,-29)
    });
  }
  function normalizeHitBox(hitBox){
    return Object.freeze({
      width:positive(hitBox?.width,FIELD.TILE_SIZE*1.32),
      height:positive(hitBox?.height,FIELD.TILE_SIZE*1.32),
      offsetX:finite(hitBox?.offsetX),
      offsetY:finite(hitBox?.offsetY)
    });
  }
  function normalizeCollision(collision){
    return Object.freeze({
      allowPlayerOverlap:collision?.allowPlayerOverlap===true,
      allowEnemyOverlap:collision?.allowEnemyOverlap===true
    });
  }
  function normalizeHealth(health){
    const maxHp=positive(health?.maxHp,null);
    if(maxHp===null)return Object.freeze({maxHp:null,hp:null});
    const requested=Number(health?.hp);
    const hp=Number.isFinite(requested)?Math.max(0,Math.min(maxHp,requested)):maxHp;
    return Object.freeze({maxHp,hp});
  }
  function hasHealth(enemy){return !!enemy&&enemy.maxHp!==null&&enemy.hp!==null}
  function isDefeatedRaw(enemy){return hasHealth(enemy)&&enemy.hp<=0}
  function getBattleState(){
    const total=enemies.length;
    let active=0,defeated=0;
    enemies.forEach(enemy=>{if(isDefeatedRaw(enemy))defeated++;else active++});
    return Object.freeze({total,active,defeated,allDefeated:total>0&&active===0});
  }
  function emitBattleState(){
    const state=getBattleState();
    listeners.forEach(listener=>{try{listener(state)}catch(error){console.error('BattleNetworkEnemy listener failed.',error)}});
    return state;
  }
  function subscribe(listener){
    if(typeof listener!=='function')return()=>{};
    listeners.add(listener);
    listener(getBattleState());
    return()=>listeners.delete(listener);
  }
  function getBoundsAt(enemy,x=enemy.x,y=enemy.y){
    const centerX=x+enemy.hitBox.offsetX,centerY=y+enemy.hitBox.offsetY;
    const halfW=enemy.hitBox.width/2,halfH=enemy.hitBox.height/2;
    return Object.freeze({left:centerX-halfW,right:centerX+halfW,top:centerY-halfH,bottom:centerY+halfH,width:enemy.hitBox.width,height:enemy.hitBox.height,centerX,centerY});
  }
  function getBounds(enemy){return getBoundsAt(enemy)}
  function boundsOverlap(a,b){return !!a&&!!b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top}
  function isEnemyPositionBlocked(enemy,x,y){
    if(!enemy||enemy.collision.allowEnemyOverlap)return false;
    const bounds=getBoundsAt(enemy,x,y);
    return enemies.some(other=>other.id!==enemy.id&&!isDefeatedRaw(other)&&!other.collision.allowEnemyOverlap&&boundsOverlap(bounds,getBounds(other)));
  }
  function render(enemy){
    const p=project(enemy.x,enemy.y),v=enemy.visual;
    enemy.el.style.width=v.width+'px';
    enemy.el.style.height=v.height+'px';
    enemy.el.style.transform=`translate(${p.x-v.width/2+v.offsetX}px,${p.y-v.height+v.offsetY}px)`;
    enemy.el.style.zIndex=String(depthZAtWorld(enemy.x,enemy.y));
  }
  function createDefeatLabel(){
    const defeatEl=document.createElement('div');
    defeatEl.className='enemyPrototypeDefeat';
    defeatEl.textContent='DELETED';
    defeatEl.style.cssText="display:none;position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);padding:4px 8px;border:2px solid rgba(255,228,130,.92);border-radius:6px;background:rgba(12,14,20,.86);color:#fff0b0;font-family:'Orbitron',var(--bn-ui-font),system-ui,sans-serif;font-size:16px;font-weight:900;line-height:1;letter-spacing:.08em;white-space:nowrap;pointer-events:none;z-index:3;";
    return defeatEl;
  }
  function createHealthLabel(){
    const hpEl=document.createElement('div');
    hpEl.className='enemyPrototypeHp enemyPrototypeHp-bottom';
    hpEl.style.cssText="position:absolute;left:50%;bottom:-49px;transform:translateX(-50%);min-width:104px;color:#fff;font-family:'Orbitron',var(--bn-ui-font),system-ui,sans-serif;font-size:40px;font-weight:800;line-height:1;letter-spacing:.015em;font-variant-numeric:tabular-nums;text-align:center;white-space:nowrap;-webkit-text-stroke:3px #050505;text-shadow:-2px -2px 0 #050505,2px -2px 0 #050505,-2px 2px 0 #050505,2px 2px 0 #050505,0 4px 0 #050505;pointer-events:none;z-index:2;";
    return hpEl;
  }
  function createHitFlash(){
    const hitFlashEl=document.createElement('div');
    hitFlashEl.className='enemyPrototypeHitFlash';
    hitFlashEl.style.cssText='position:absolute;inset:-3px;border:2px solid rgba(255,248,178,.96);border-radius:18px;background:rgba(255,244,150,.58);opacity:0;pointer-events:none;z-index:4;will-change:opacity;transform:translateZ(0);';
    return hitFlashEl;
  }
  function renderHealth(enemy){
    if(!enemy.hpEl)return;
    if(!hasHealth(enemy)||isDefeatedRaw(enemy)){if(enemy.hpEl.style.display!=='none')enemy.hpEl.style.display='none';return}
    if(enemy.hpEl.style.display!=='block')enemy.hpEl.style.display='block';
    const text=String(Math.ceil(enemy.hp));
    if(enemy.hpEl.textContent!==text)enemy.hpEl.textContent=text;
  }
  function clearDefeatTimer(enemy){
    if(enemy.defeatTimer!==null){clearTimeout(enemy.defeatTimer);enemy.defeatTimer=null}
  }
  function clearDefeatFallbackTimers(enemy){
    for(const timer of enemy.defeatFallbackTimers||[])clearTimeout(timer);
    enemy.defeatFallbackTimers?.clear?.();
  }
  function scheduleDefeatFallback(enemy,fn,delay){
    const timer=setTimeout(()=>{enemy.defeatFallbackTimers.delete(timer);fn()},delay);
    enemy.defeatFallbackTimers.add(timer);
    return timer;
  }
  function clearActiveDefeatAnimations(enemy){
    const fx=enemy.defeatFx;if(!fx)return;
    for(const animation of fx.activeAnimations||[]){try{animation.cancel()}catch{}}
    fx.activeAnimations.length=0;
    enemy.defeatAnimation=null;
  }
  function startFxAnimation(fx,target,keyframes,options){
    if(typeof target?.animate!=='function')return null;
    try{
      const animation=target.animate(keyframes,options);
      fx.activeAnimations.push(animation);
      return animation;
    }catch{return null}
  }
  function positionDefeatFx(enemy){
    const fx=enemy.defeatFx;if(!fx)return;
    const p=project(enemy.x,enemy.y),v=enemy.visual;
    fx.root.style.width=v.width+'px';
    fx.root.style.height=v.height+'px';
    fx.root.style.transform=`translate(${p.x-v.width/2+v.offsetX}px,${p.y-v.height+v.offsetY}px)`;
    fx.root.style.zIndex=String(depthZAtWorld(enemy.x,enemy.y,1));
  }
  function createDefeatFx(enemy,scene){
    const v=enemy.visual,root=document.createElement('div'),fragmentEntries=[];
    root.dataset.enemyDeleteFx='1';
    root.style.cssText='position:absolute;visibility:hidden;opacity:1;pointer-events:none;contain:layout paint style;';

    DEFEAT_BANDS.forEach(band=>{
      const y=Math.round(v.height*band.start),height=Math.max(1,Math.ceil(v.height*(band.end-band.start))+1);
      const wrapper=document.createElement('div');
      wrapper.dataset.enemyDeleteFragment='1';
      wrapper.style.cssText=`position:absolute;left:0;top:${y}px;width:${v.width}px;height:${height}px;overflow:hidden;pointer-events:none;opacity:0;will-change:transform,opacity;contain:layout paint style;`;
      const clone=enemy.el.cloneNode(false);
      clone.removeAttribute('id');
      clone.style.position='absolute';
      clone.style.left='0';
      clone.style.top=`${-y}px`;
      clone.style.width=`${v.width}px`;
      clone.style.height=`${v.height}px`;
      clone.style.transform='none';
      clone.style.zIndex='auto';
      clone.style.visibility='visible';
      clone.style.opacity='1';
      clone.style.clipPath='';
      clone.style.pointerEvents='none';
      clone.style.willChange='auto';
      clone.style.boxShadow='none';
      wrapper.appendChild(clone);

      const pixelCloud=document.createElement('span');
      pixelCloud.dataset.enemyDeletePixels='1';
      pixelCloud.style.cssText=`position:absolute;left:0;top:50%;width:${v.width}px;height:32px;margin:-16px 0 0 0;opacity:0;transform:translate3d(0,4px,0);pointer-events:none;will-change:transform,opacity;`;
      const pixelSpecs=[
        {x:.03,y:21,size:3,color:'rgba(154,235,255,.86)'},
        {x:.11,y:9,size:4,color:'rgba(235,253,255,.98)'},
        {x:.19,y:17,size:2,color:'rgba(183,244,255,.90)'},
        {x:.27,y:5,size:3,color:'rgba(235,253,255,.96)'},
        {x:.35,y:22,size:3,color:'rgba(154,235,255,.82)'},
        {x:.43,y:12,size:4,color:'rgba(206,249,255,.96)'},
        {x:.52,y:4,size:2,color:'rgba(154,235,255,.88)'},
        {x:.60,y:19,size:3,color:'rgba(235,253,255,.98)'},
        {x:.68,y:8,size:3,color:'rgba(183,244,255,.94)'},
        {x:.76,y:23,size:2,color:'rgba(154,235,255,.84)'},
        {x:.84,y:13,size:4,color:'rgba(235,253,255,.96)'},
        {x:.93,y:6,size:3,color:'rgba(183,244,255,.92)'}
      ];
      pixelSpecs.forEach(spec=>{
        const pixel=document.createElement('i');
        pixel.style.cssText=`position:absolute;left:${Math.round(v.width*spec.x)}px;top:${spec.y}px;width:${spec.size}px;height:${spec.size}px;background:${spec.color};pointer-events:none;`;
        pixelCloud.appendChild(pixel);
      });
      wrapper.appendChild(pixelCloud);
      root.appendChild(wrapper);
      fragmentEntries.push({band,wrapper,pixelCloud});
    });

    const flash=document.createElement('div');
    flash.dataset.enemyDeleteFlash='1';
    flash.style.cssText='position:absolute;inset:-3px;border:2px solid rgba(255,255,255,1);border-radius:18px;background:rgba(255,255,255,.98);opacity:0;pointer-events:none;z-index:4;will-change:opacity;transform:translateZ(0);';
    root.appendChild(flash);

    enemy.defeatEl.style.display='block';
    enemy.defeatEl.style.opacity='1';
    enemy.defeatEl.style.zIndex='5';
    root.appendChild(enemy.defeatEl);
    scene.appendChild(root);

    return{root,flash,fragmentEntries,activeAnimations:[]};
  }
  function finishDefeatVisual(enemy){
    enemy.defeatTimer=null;
    if(!isDefeatedRaw(enemy))return;
    enemy.el.style.opacity='0';
    enemy.el.style.visibility='hidden';
    if(enemy.defeatFx)enemy.defeatFx.root.style.visibility='hidden';
  }
  function resetDefeatVisual(enemy){
    clearDefeatTimer(enemy);
    clearDefeatFallbackTimers(enemy);
    clearActiveDefeatAnimations(enemy);
    if(enemy.defeatFx){
      enemy.defeatFx.root.style.visibility='hidden';
      enemy.defeatFx.fragmentEntries.forEach(entry=>{
        entry.wrapper.style.opacity='0';
        entry.wrapper.style.transform='translate3d(0,0,0)';
        entry.pixelCloud.style.opacity='0';
        entry.pixelCloud.style.transform='translate3d(0,4px,0)';
      });
      enemy.defeatFx.flash.style.opacity='0';
    }
    enemy.defeatVisualStarted=false;
    enemy.el.style.visibility='visible';
    enemy.el.style.opacity='1';
    enemy.el.style.filter='';
    enemy.el.style.clipPath='';
    enemy.el.style.borderColor='#ff5b67';
    enemy.el.style.background='rgba(96,10,24,.88)';
  }
  function playDefeatFxFallback(enemy){
    const fx=enemy.defeatFx;if(!fx)return;
    fx.fragmentEntries.forEach(entry=>{
      const {band,wrapper,pixelCloud}=entry;
      scheduleDefeatFallback(enemy,()=>{wrapper.style.opacity='1'},140);
      const pixelAt=Math.max(140,140+Math.round(band.duration*band.hold)-20);
      scheduleDefeatFallback(enemy,()=>{pixelCloud.style.opacity='1';pixelCloud.style.transform='translate3d(0,-6px,0)'},pixelAt);
      scheduleDefeatFallback(enemy,()=>{pixelCloud.style.opacity='0';pixelCloud.style.transform='translate3d(0,-15px,0)'},pixelAt+120);
      scheduleDefeatFallback(enemy,()=>{wrapper.style.opacity='0'},140+band.duration);
    });
    fx.flash.style.opacity='1';
    scheduleDefeatFallback(enemy,()=>{fx.flash.style.opacity='0'},180);
    scheduleDefeatFallback(enemy,()=>{enemy.el.style.opacity='0'},168);
    enemy.defeatTimer=setTimeout(()=>finishDefeatVisual(enemy),600);
  }
  function playDefeatFx(enemy){
    const fx=enemy.defeatFx;if(!fx)return false;
    clearActiveDefeatAnimations(enemy);
    clearDefeatFallbackTimers(enemy);
    fx.fragmentEntries.forEach(entry=>{
      entry.wrapper.style.opacity='0';
      entry.wrapper.style.transform='translate3d(0,0,0)';
      entry.pixelCloud.style.opacity='0';
      entry.pixelCloud.style.transform='translate3d(0,4px,0)';
    });
    fx.flash.style.opacity='0';
    enemy.el.style.opacity='1';

    let ok=true;
    for(const entry of fx.fragmentEntries){
      const {band,wrapper,pixelCloud}=entry;
      const fragmentAnimation=startFxAnimation(fx,wrapper,[
        {opacity:1,transform:'translate3d(0,0,0)'},
        {opacity:1,transform:'translate3d(0,0,0)',offset:band.hold},
        {opacity:.82,transform:`translate3d(${band.dx*.35}px,${band.dy*.35}px,0)`,offset:Math.min(.9,band.hold+.18)},
        {opacity:0,transform:`translate3d(${band.dx}px,${band.dy}px,0)`}
      ],{duration:band.duration,delay:140,easing:'linear',fill:'forwards'});
      const pixelAnimation=startFxAnimation(fx,pixelCloud,[
        {opacity:0,transform:'translate3d(0,4px,0)'},
        {opacity:1,transform:'translate3d(0,-3px,0)',offset:.4},
        {opacity:.86,transform:'translate3d(0,-8px,0)',offset:.7},
        {opacity:0,transform:'translate3d(0,-15px,0)'}
      ],{duration:120,delay:Math.max(140,140+Math.round(band.duration*band.hold)-20),easing:'ease-out',fill:'both'});
      if(!fragmentAnimation||!pixelAnimation)ok=false;
    }

    const flashAnimation=startFxAnimation(fx,fx.flash,[
      {opacity:0},
      {opacity:1,offset:.42},
      {opacity:0}
    ],{duration:180,easing:'ease-out',fill:'both'});
    const fadeAnimation=startFxAnimation(fx,enemy.el,[
      {opacity:1},
      {opacity:1,offset:.23},
      {opacity:0,offset:.28},
      {opacity:0}
    ],{duration:600,easing:'linear',fill:'forwards'});
    if(!flashAnimation||!fadeAnimation)ok=false;
    if(!ok){
      clearActiveDefeatAnimations(enemy);
      fx.fragmentEntries.forEach(entry=>{entry.wrapper.style.opacity='0';entry.pixelCloud.style.opacity='0'});
      fx.flash.style.opacity='0';
      enemy.el.style.opacity='1';
      return false;
    }
    enemy.defeatAnimation=fadeAnimation;
    fadeAnimation.onfinish=()=>finishDefeatVisual(enemy);
    return true;
  }
  function startDefeatVisual(enemy){
    if(!enemy||enemy.defeatVisualStarted)return;
    enemy.defeatVisualStarted=true;
    enemy.flashToken++;
    enemy.hitFlashAnimation?.cancel?.();enemy.hitFlashAnimation=null;
    if(enemy.hpEl)enemy.hpEl.style.display='none';
    positionDefeatFx(enemy);
    if(enemy.defeatFx)enemy.defeatFx.root.style.visibility='visible';
    if(!playDefeatFx(enemy))playDefeatFxFallback(enemy);
  }
  function syncDefeatPresentation(enemy){
    const defeated=isDefeatedRaw(enemy);
    enemy.el.classList.toggle('defeated',defeated);
    if(defeated)startDefeatVisual(enemy);else resetDefeatVisual(enemy);
    renderHealth(enemy);
    return defeated;
  }
  function spawn(config={}){
    const x=Number(config.x),y=Number(config.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('BattleNetworkEnemy: spawn requires finite world x/y.');
    if(x<0||x>FIELD.WORLD_SIZE||y<0||y>FIELD.WORLD_SIZE)throw new Error('BattleNetworkEnemy: spawn position is outside the world.');
    if(FIELD.canOccupyWorld&&!FIELD.canOccupyWorld(x,y))throw new Error('BattleNetworkEnemy: spawn position is not walkable.');
    const scene=document.getElementById('scene');
    if(!scene)throw new Error('BattleNetworkEnemy: scene is not available.');
    const el=document.createElement('div');
    el.className='enemyPrototype';
    el.setAttribute('aria-label','テスト敵');
    el.style.cssText='position:absolute;will-change:transform,opacity;border:3px solid #ff5b67;border-radius:18px;background:rgba(96,10,24,.88);box-shadow:0 0 0 3px rgba(255,255,255,.18) inset,0 0 20px rgba(255,70,90,.55);pointer-events:none;';
    const hpEl=createHealthLabel(),defeatEl=createDefeatLabel(),hitFlashEl=createHitFlash();
    el.appendChild(hpEl);el.appendChild(hitFlashEl);
    const health=normalizeHealth(config.health);
    const enemy={id:nextId++,x,y,visual:normalizeVisual(config.visual),hitBox:normalizeHitBox(config.hitBox),collision:normalizeCollision(config.collision),maxHp:health.maxHp,hp:health.hp,el,hpEl,defeatEl,hitFlashEl,hitFlashAnimation:null,flashToken:0,defeatVisualStarted:false,defeatAnimation:null,defeatTimer:null,defeatFallbackTimers:new Set(),defeatFx:null};
    scene.appendChild(el);
    enemy.defeatFx=createDefeatFx(enemy,scene);
    enemies.push(enemy);FIELD.trackOccupant?.(`enemy:${enemy.id}`,x,y);syncDefeatPresentation(enemy);render(enemy);emitBattleState();
    return enemy.id;
  }
  function getById(id){return enemies.find(enemy=>enemy.id===id)||null}
  function getSnapshot(enemy){return enemy?Object.freeze({id:enemy.id,x:enemy.x,y:enemy.y,visual:enemy.visual,hitBox:enemy.hitBox,collision:enemy.collision,maxHp:enemy.maxHp,hp:enemy.hp,isDefeated:isDefeatedRaw(enemy),bounds:getBounds(enemy)}):null}
  function getEnemy(id){return getSnapshot(getById(id))}
  function getEnemies(){return Object.freeze(enemies.map(getSnapshot))}
  function getActiveEnemies(){return Object.freeze(enemies.filter(enemy=>!isDefeatedRaw(enemy)).map(getSnapshot))}
  function setPosition(id,x,y){
    const enemy=getById(id);
    if(!enemy)return Object.freeze({applied:false,reason:'ENEMY_NOT_FOUND',enemy:null});
    const nextX=Number(x),nextY=Number(y);
    if(!Number.isFinite(nextX)||!Number.isFinite(nextY))return Object.freeze({applied:false,reason:'INVALID_POSITION',enemy:getSnapshot(enemy)});
    const clampedX=Math.max(0,Math.min(FIELD.WORLD_SIZE,nextX)),clampedY=Math.max(0,Math.min(FIELD.WORLD_SIZE,nextY));
    if(isEnemyPositionBlocked(enemy,clampedX,clampedY))return Object.freeze({applied:false,reason:'ENEMY_COLLISION',enemy:getSnapshot(enemy)});
    if(FIELD.trackOccupant&&!FIELD.trackOccupant(`enemy:${enemy.id}`,clampedX,clampedY))return Object.freeze({applied:false,reason:'TERRAIN_BLOCKED',enemy:getSnapshot(enemy)});
    enemy.x=clampedX;
    enemy.y=clampedY;
    render(enemy);
    return Object.freeze({applied:true,reason:null,enemy:getSnapshot(enemy)});
  }
  function clearAll(){
    enemies.forEach(enemy=>{FIELD.untrackOccupant?.(`enemy:${enemy.id}`);enemy.flashToken++;clearDefeatTimer(enemy);clearDefeatFallbackTimers(enemy);enemy.hitFlashAnimation?.cancel?.();clearActiveDefeatAnimations(enemy);enemy.defeatFx?.root?.remove();enemy.el?.remove()});
    enemies.length=0;
    return emitBattleState();
  }
  function configureHealth(id,health={}){
    const enemy=getById(id);if(!enemy)return Object.freeze({applied:false,reason:'ENEMY_NOT_FOUND',enemy:null});
    const normalized=normalizeHealth(health);
    if(normalized.maxHp===null)return Object.freeze({applied:false,reason:'INVALID_MAX_HP',enemy:getSnapshot(enemy)});
    enemy.maxHp=normalized.maxHp;enemy.hp=normalized.hp;syncDefeatPresentation(enemy);emitBattleState();
    return Object.freeze({applied:true,reason:null,enemy:getSnapshot(enemy)});
  }
  function applyDamage(id,amount){
    const enemy=getById(id);if(!enemy)return Object.freeze({applied:false,reason:'ENEMY_NOT_FOUND',amount:0,before:null,after:null,defeatedNow:false,enemy:null});
    const damage=Number(amount);
    if(!Number.isFinite(damage)||damage<=0)return Object.freeze({applied:false,reason:'INVALID_DAMAGE',amount:0,before:enemy.hp,after:enemy.hp,defeatedNow:false,enemy:getSnapshot(enemy)});
    if(!hasHealth(enemy))return Object.freeze({applied:false,reason:'HP_NOT_CONFIGURED',amount:0,before:null,after:null,defeatedNow:false,enemy:getSnapshot(enemy)});
    if(enemy.hp<=0)return Object.freeze({applied:false,reason:'ALREADY_DEFEATED',amount:0,before:enemy.hp,after:enemy.hp,defeatedNow:false,enemy:getSnapshot(enemy)});
    const before=enemy.hp;
    enemy.hp=Math.max(0,before-damage);
    const applied=before-enemy.hp,defeatedNow=before>0&&enemy.hp<=0;
    if(defeatedNow){syncDefeatPresentation(enemy);emitBattleState()}
    else renderHealth(enemy);
    return Object.freeze({applied:true,reason:null,amount:applied,before,after:enemy.hp,defeatedNow,enemy:getSnapshot(enemy)});
  }
  function containsPointRaw(enemy,x,y){
    if(!enemy||isDefeatedRaw(enemy)||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const centerX=enemy.x+enemy.hitBox.offsetX,centerY=enemy.y+enemy.hitBox.offsetY;
    const halfW=enemy.hitBox.width/2,halfH=enemy.hitBox.height/2;
    return x>=centerX-halfW&&x<=centerX+halfW&&y>=centerY-halfH&&y<=centerY+halfH;
  }
  function containsPoint(id,x,y){return containsPointRaw(getById(id),x,y)}
  function findEnemyIdAtPoint(x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    for(const enemy of enemies){if(!isDefeatedRaw(enemy)&&containsPointRaw(enemy,x,y))return enemy.id}
    return null;
  }
  function intersectsRange(id,shape){const enemy=getById(id);return !!enemy&&!isDefeatedRaw(enemy)&&RANGE.intersectsBounds(shape,getBounds(enemy))}
  function getHitEnemies(shape){if(!shape)return Object.freeze([]);return Object.freeze(enemies.filter(enemy=>!isDefeatedRaw(enemy)&&RANGE.intersectsBounds(shape,getBounds(enemy))).map(getSnapshot))}
  function isPlayerBoundsBlocked(bounds){
    if(!bounds)return false;
    return enemies.some(enemy=>!isDefeatedRaw(enemy)&&!enemy.collision.allowPlayerOverlap&&boundsOverlap(getBounds(enemy),bounds));
  }
  function wouldOverlapBounds(id,x,y,bounds){
    const enemy=getById(id);
    return !!enemy&&!isDefeatedRaw(enemy)&&!enemy.collision.allowPlayerOverlap&&boundsOverlap(getBoundsAt(enemy,Number(x),Number(y)),bounds);
  }
  function pushBlockingEnemiesFromBounds(bounds,direction={x:0,y:0}){
    if(!bounds)return Object.freeze([]);
    const pushed=[];
    const dx=finite(direction?.x),dy=finite(direction?.y),dl=Math.hypot(dx,dy),ux=dl>0?dx/dl:0,uy=dl>0?dy/dl:0;
    for(const enemy of enemies){
      if(isDefeatedRaw(enemy)||enemy.collision.allowPlayerOverlap)continue;
      const eb=getBounds(enemy);if(!boundsOverlap(eb,bounds))continue;
      const candidates=[
        {x:bounds.left-enemy.hitBox.width/2-enemy.hitBox.offsetX,y:enemy.y},
        {x:bounds.right+enemy.hitBox.width/2-enemy.hitBox.offsetX,y:enemy.y},
        {x:enemy.x,y:bounds.top-enemy.hitBox.height/2-enemy.hitBox.offsetY},
        {x:enemy.x,y:bounds.bottom+enemy.hitBox.height/2-enemy.hitBox.offsetY}
      ].map(c=>({x:Math.max(0,Math.min(FIELD.WORLD_SIZE,c.x)),y:Math.max(0,Math.min(FIELD.WORLD_SIZE,c.y))}))
       .filter(c=>!boundsOverlap(getBoundsAt(enemy,c.x,c.y),bounds)&&!isEnemyPositionBlocked(enemy,c.x,c.y)&&(!FIELD.canOccupyWorld||FIELD.canOccupyWorld(c.x,c.y)));
      if(!candidates.length)continue;
      candidates.sort((a,b)=>{
        const adx=a.x-enemy.x,ady=a.y-enemy.y,bdx=b.x-enemy.x,bdy=b.y-enemy.y;
        const da=Math.hypot(adx,ady),db=Math.hypot(bdx,bdy);if(Math.abs(da-db)>.001)return da-db;
        return (bdx*ux+bdy*uy)-(adx*ux+ady*uy);
      });
      const chosen=candidates[0],result=setPosition(enemy.id,chosen.x,chosen.y);if(result.applied)pushed.push(enemy.id);
    }
    return Object.freeze(pushed);
  }
  function debugFlash(id){
    const enemy=getById(id);if(!enemy||isDefeatedRaw(enemy)||!enemy.hitFlashEl)return;
    const el=enemy.hitFlashEl;enemy.flashToken++;enemy.hitFlashAnimation?.cancel?.();
    if(typeof el.animate==='function'){
      const animation=el.animate([{opacity:.88},{opacity:0}],{duration:140,easing:'ease-out'});enemy.hitFlashAnimation=animation;
      animation.onfinish=()=>{if(enemy.hitFlashAnimation===animation){enemy.hitFlashAnimation=null;el.style.opacity='0'}};
      animation.oncancel=()=>{if(enemy.hitFlashAnimation===animation)enemy.hitFlashAnimation=null};return;
    }
    const token=enemy.flashToken;el.style.opacity='.88';setTimeout(()=>{if(enemy.flashToken===token)el.style.opacity='0'},140);
  }

  window.BattleNetworkEnemy=Object.freeze({spawn,getEnemy,getEnemies,getActiveEnemies,setPosition,getBattleState,subscribe,clearAll,configureHealth,applyDamage,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,isPlayerBoundsBlocked,wouldOverlapBounds,pushBlockingEnemiesFromBounds,debugFlash,getDepthZAtWorld:(x,y)=>depthZAtWorld(x,y)});
})();
