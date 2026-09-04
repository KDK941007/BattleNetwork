(()=>{
  const testTarget=window.BattleNetworkFolder?.getTestTarget?.();
  if(!testTarget?.enabled||testTarget.type!=='AIRSHOT')return;

  const scene=document.getElementById('scene');
  const battle=document.getElementById('battle');
  const A=document.getElementById('A');
  const FIELD=window.BattleNetworkField;
  const PLAYER=window.BattleNetworkPlayer;
  const RANGE=window.BattleNetworkCombatRange;
  if(!scene||!battle||!A||!FIELD||!PLAYER||!RANGE)return;

  const styleSource=document.getElementById('attackEffectReviewStyle')?.textContent||'';
  const imageMatch=styleSource.match(/background-image\s*:\s*url\(["']?(data:image\/webp;base64,[^)"']+)["']?\)/i);
  const projectileImage=imageMatch?.[1]||null;
  if(!projectileImage){
    console.warn('BattleNetwork: AirShot projectile image source was not found.');
    return;
  }

  const style=document.createElement('style');
  style.id='airshotProjectileFixStyle';
  style.textContent=`
    .battle[data-airshot-direct-visual="1"] .bullet.cannon{
      opacity:0!important;
    }
    .airshotDirectVisual{
      position:absolute;
      left:0;
      top:0;
      width:1px;
      height:1px;
      z-index:18;
      pointer-events:none;
      transform-origin:0 0;
      will-change:transform;
    }
    .airshotDirectVisual img{
      position:absolute;
      left:-216px;
      top:-68px;
      width:240px;
      height:136px;
      display:block;
      object-fit:fill;
      opacity:.86;
      pointer-events:none;
      user-select:none;
      -webkit-user-drag:none;
      filter:drop-shadow(0 0 10px rgba(230,252,255,.38));
    }
  `;
  document.head.appendChild(style);
  battle.dataset.airshotDirectVisual='1';

  const PX=.72;
  const PY=.36;
  const WORLD=FIELD.WORLD_SIZE;
  const SW=WORLD*PX*2;
  const SPEED=100;
  const RANGE_WORLD=FIELD.toWorldDistance?.(7)??(FIELD.TILE_SIZE*7);
  const shownTokens=new Set();

  function project(x,y){
    return{x:(x-y)*PX+SW/2,y:(x+y)*PY};
  }

  function screenAngle(dx,dy){
    return Math.atan2((dx+dy)*PY,(dx-dy)*PX)*180/Math.PI;
  }

  function spawnVisual(origin,facing,token){
    if(shownTokens.has(token))return;
    shownTokens.add(token);
    if(shownTokens.size>32){
      const first=shownTokens.values().next().value;
      shownTokens.delete(first);
    }

    let dx=Number(facing?.x)||0,dy=Number(facing?.y)||0;
    const len=Math.hypot(dx,dy)||1;
    dx/=len;dy/=len;
    let x=Number(origin?.x)||0,y=Number(origin?.y)||0,dist=0,last=performance.now();

    const visual=document.createElement('div');
    visual.className='airshotDirectVisual';
    const img=document.createElement('img');
    img.alt='';
    img.draggable=false;
    img.src=projectileImage;
    visual.appendChild(img);
    scene.appendChild(visual);

    const angle=screenAngle(dx,dy);
    function frame(now){
      if(!visual.isConnected)return;
      const dt=Math.min(.05,Math.max(0,(now-last)/1000));
      last=now;
      const step=SPEED*dt;
      x+=dx*step;
      y+=dy*step;
      dist+=step;
      const p=project(x,y);
      visual.style.transform=`translate(${p.x}px,${p.y-34}px) rotate(${angle}deg)`;
      if(dist>=RANGE_WORLD){
        visual.remove();
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function waitForConfirmedShot(beforeToken,origin,facing,startedAt){
    const context=RANGE.getLastAttackContext?.();
    if(context?.sourceId==='CHIP_EXE4_S004'&&context.shotToken!==beforeToken){
      spawnVisual(origin,facing,context.shotToken);
      return;
    }
    if(performance.now()-startedAt<650)requestAnimationFrame(()=>waitForConfirmedShot(beforeToken,origin,facing,startedAt));
  }

  A.addEventListener('pointerdown',()=>{
    const before=RANGE.getLastAttackContext?.();
    const origin=PLAYER.getPosition?.();
    const facing=PLAYER.getFacing?.();
    if(!origin||!facing)return;
    requestAnimationFrame(()=>waitForConfirmedShot(before?.shotToken,origin,facing,performance.now()));
  },true);

  window.BattleNetworkAirShotProjectileFix=Object.freeze({
    isActive:()=>true,
    mode:'DIRECT_REFERENCE_VISUAL'
  });
})();
