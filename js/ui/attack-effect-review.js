(()=>{
  const testTarget=window.BattleNetworkFolder?.getTestTarget?.();
  if(!testTarget?.enabled||testTarget.type!=='AIRSHOT')return;

  const battle=document.getElementById('battle');
  if(!battle)return;

  const style=document.createElement('style');
  style.id='attackEffectReviewStyle';
  style.textContent=`
    .attackEffectReview{
      position:absolute;right:8px;top:8px;z-index:76;width:min(318px,45vw);
      padding:8px;border:1px solid rgba(119,228,255,.82);border-radius:10px;
      background:rgba(4,22,31,.94);box-shadow:0 8px 24px rgba(0,0,0,.42),inset 0 0 0 1px rgba(173,244,255,.08);
      color:#effdff;pointer-events:auto;touch-action:none;
    }
    .attackEffectReviewTitle{font-size:12px;font-weight:1000;letter-spacing:.4px;color:#bff5ff;margin-bottom:6px}
    .attackEffectReviewPatterns{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:6px}
    .attackEffectReview button{min-width:0;height:34px;padding:0 6px;border:1px solid #39748a;border-radius:7px;background:#0b3040;color:#eaffff;font-size:11px;font-weight:1000;touch-action:none}
    .attackEffectReview button.active{border-color:#ffe66d;background:#59470d;color:#fff5b6;box-shadow:0 0 9px rgba(255,221,87,.42)}
    .attackEffectReviewDesc{font-size:10px;font-weight:900;color:#d8f8ff;line-height:1.4}
    .airshotWindCanvas{position:absolute;inset:0;z-index:17;width:100%;height:100%;pointer-events:none;touch-action:none}

    .battle[data-airshot-effect] .bullet.cannon{
      overflow:visible!important;
      pointer-events:none!important;
      width:120px!important;
      height:82px!important;
      border-radius:50%!important;
      border:2px solid rgba(220,253,255,.72)!important;
      background:radial-gradient(ellipse at 72% 50%,rgba(255,255,255,.99) 0 10%,rgba(216,253,255,.98) 17%,rgba(135,238,252,.90) 34%,rgba(67,202,235,.50) 56%,rgba(45,168,210,.16) 72%,transparent 82%)!important;
      box-shadow:0 0 18px rgba(190,251,255,.98),0 0 42px rgba(74,220,247,.88),0 0 72px rgba(56,190,228,.48)!important;
      transform-origin:center!important;
      animation:airshotCoreBreath .18s ease-in-out infinite alternate;
    }
    .battle[data-airshot-effect] .bullet.cannon::before,
    .battle[data-airshot-effect] .bullet.cannon::after{content:none!important}
    .battle[data-airshot-effect="B"] .bullet.cannon{
      box-shadow:0 0 22px rgba(205,253,255,1),0 0 48px rgba(76,226,250,.95),0 0 82px rgba(50,188,230,.56)!important;
    }
    .battle[data-airshot-effect="C"] .bullet.cannon{
      background:radial-gradient(ellipse at 70% 50%,rgba(255,255,255,.98) 0 9%,rgba(207,251,255,.92) 18%,rgba(115,230,249,.72) 38%,rgba(70,198,230,.34) 61%,transparent 82%)!important;
      box-shadow:0 0 24px rgba(198,252,255,.94),0 0 58px rgba(97,224,246,.78),0 0 92px rgba(56,178,218,.42)!important;
    }
    @keyframes airshotCoreBreath{from{filter:brightness(.92) saturate(1.04)}to{filter:brightness(1.18) saturate(1.15)}}
  `;
  document.head.appendChild(style);

  const patterns=Object.freeze({
    A:'A：直線的な強風',
    B:'B：渦巻く圧縮風',
    C:'C：暴風・乱流'
  });
  let selected='A';

  const panel=document.createElement('div');
  panel.className='attackEffectReview';
  panel.innerHTML=`
    <div class="attackEffectReviewTitle">エアシュート 風エフェクト比較</div>
    <div class="attackEffectReviewPatterns">
      <button type="button" data-pattern="A">A 強風</button>
      <button type="button" data-pattern="B">B 渦風</button>
      <button type="button" data-pattern="C">C 乱流</button>
    </div>
    <div class="attackEffectReviewDesc"></div>`;
  battle.appendChild(panel);

  const canvas=document.createElement('canvas');
  canvas.className='airshotWindCanvas';
  canvas.setAttribute('aria-hidden','true');
  battle.appendChild(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;

  const desc=panel.querySelector('.attackEffectReviewDesc');
  const particles=[];
  const tracked=new Map();
  let cssWidth=1,cssHeight=1,dpr=1,lastFrame=performance.now();

  const random=(min,max)=>min+Math.random()*(max-min);
  const clamp01=value=>Math.max(0,Math.min(1,value));

  function resizeCanvas(){
    const rect=battle.getBoundingClientRect();
    cssWidth=Math.max(1,rect.width);
    cssHeight=Math.max(1,rect.height);
    dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(cssWidth*dpr);
    canvas.height=Math.round(cssHeight*dpr);
    canvas.style.width=`${cssWidth}px`;
    canvas.style.height=`${cssHeight}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resizeCanvas();
  new ResizeObserver(resizeCanvas).observe(battle);

  function angleFromProjectile(projectile){
    const match=/rotate\((-?[\d.]+)deg\)/.exec(projectile.style.transform||'');
    const degrees=match?Number(match[1]):0;
    return Number.isFinite(degrees)?degrees*Math.PI/180:0;
  }

  function projectileState(projectile){
    const battleRect=battle.getBoundingClientRect();
    const rect=projectile.getBoundingClientRect();
    const angle=angleFromProjectile(projectile);
    const dx=Math.cos(angle),dy=Math.sin(angle),px=-dy,py=dx;
    return{
      x:rect.left-battleRect.left+rect.width/2,
      y:rect.top-battleRect.top+rect.height/2,
      dx,dy,px,py,angle
    };
  }

  function addParticle(p){
    particles.push(p);
    if(particles.length>150)particles.splice(0,particles.length-150);
  }

  function spawnStraightWind(s){
    for(let i=0;i<4;i++){
      const lateral=random(-42,42);
      const back=random(24,78);
      addParticle({
        mode:'line',x:s.x-s.dx*back+s.px*lateral,y:s.y-s.dy*back+s.py*lateral,
        dx:s.dx,dy:s.dy,px:s.px,py:s.py,
        vx:-s.dx*random(85,145)+s.px*random(-16,16),vy:-s.dy*random(85,145)+s.py*random(-16,16),
        life:0,maxLife:random(.28,.42),length:random(72,150),width:random(10,19),bend:random(-18,18),alpha:random(.58,.94)
      });
    }
  }

  function spawnSpiralWind(s,now){
    const phase=now*.010;
    for(let i=0;i<5;i++){
      const sign=i%2?1:-1;
      const offset=random(24,52)*sign;
      const back=random(20,72);
      addParticle({
        mode:'spiral',x:s.x-s.dx*back+s.px*offset,y:s.y-s.dy*back+s.py*offset,
        dx:s.dx,dy:s.dy,px:s.px,py:s.py,
        vx:-s.dx*random(70,120),vy:-s.dy*random(70,120),
        life:0,maxLife:random(.34,.50),length:random(82,148),width:random(11,20),bend:random(38,72)*sign,
        phase:phase+random(0,Math.PI*2),alpha:random(.62,.96)
      });
    }
  }

  function spawnTurbulence(s){
    for(let i=0;i<6;i++){
      const lateral=random(-64,64);
      const back=random(12,90);
      addParticle({
        mode:i%3===0?'curl':'turb',x:s.x-s.dx*back+s.px*lateral,y:s.y-s.dy*back+s.py*lateral,
        dx:s.dx,dy:s.dy,px:s.px,py:s.py,
        vx:-s.dx*random(48,112)+s.px*random(-48,48),vy:-s.dy*random(48,112)+s.py*random(-48,48),
        life:0,maxLife:random(.36,.58),length:random(66,142),width:random(12,23),bend:random(-78,78),
        phase:random(0,Math.PI*2),alpha:random(.46,.86)
      });
    }
  }

  function spawnUseWind(s,now){
    if(selected==='A')spawnStraightWind(s);
    else if(selected==='B')spawnSpiralWind(s,now);
    else spawnTurbulence(s);
  }

  function spawnEndBurst(s){
    const count=selected==='C'?15:11;
    for(let i=0;i<count;i++){
      const fan=random(-.72,.72);
      const cos=Math.cos(fan),sin=Math.sin(fan);
      const dx=s.dx*cos+s.px*sin,dy=s.dy*cos+s.py*sin;
      addParticle({
        mode:selected==='B'?'spiral':'burst',x:s.x+dx*12,y:s.y+dy*12,
        dx,dy,px:-dy,py:dx,vx:dx*random(60,150),vy:dy*random(60,150),
        life:0,maxLife:random(.22,.42),length:random(46,100),width:random(9,18),bend:random(-32,32),phase:random(0,Math.PI*2),alpha:random(.50,.92)
      });
    }
  }

  function strokeWind(p,age){
    const fade=1-age;
    const x=p.x,y=p.y;
    let side=p.bend||0;
    if(p.mode==='spiral')side*=Math.sin((p.phase||0)+age*Math.PI*2.8);
    if(p.mode==='turb'||p.mode==='curl')side*=.55+Math.sin((p.phase||0)+age*Math.PI*3.2)*.45;
    const endX=x-p.dx*p.length+p.px*side;
    const endY=y-p.dy*p.length+p.py*side;
    const controlX=x-p.dx*p.length*.48+p.px*side*1.28;
    const controlY=y-p.dy*p.length*.48+p.py*side*1.28;
    const alpha=p.alpha*fade;
    const width=p.width*(.72+age*.45);

    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(controlX,controlY,endX,endY);
    ctx.strokeStyle=`rgba(71,201,236,${alpha*.26})`;ctx.lineWidth=width*1.85;ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(controlX,controlY,endX,endY);
    ctx.strokeStyle=`rgba(151,238,252,${alpha*.66})`;ctx.lineWidth=width;ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(controlX,controlY,endX,endY);
    ctx.strokeStyle=`rgba(239,255,255,${alpha*.88})`;ctx.lineWidth=Math.max(2,width*.32);ctx.stroke();

    if(p.mode==='curl'){
      const r=18+age*26;
      ctx.beginPath();ctx.arc(x,y,r,(p.phase||0)+age*2.2,(p.phase||0)+Math.PI*1.45+age*2.2);
      ctx.strokeStyle=`rgba(191,248,255,${alpha*.62})`;ctx.lineWidth=Math.max(4,width*.55);ctx.stroke();
    }
  }

  function drawCoreWind(projectiles,now){
    projectiles.forEach(projectile=>{
      const s=projectileState(projectile);
      const pulse=.5+.5*Math.sin(now*.018);
      if(selected==='B'){
        for(let i=0;i<2;i++){
          const r=38+i*19+pulse*7;
          ctx.beginPath();ctx.ellipse(s.x,s.y,r,r*.48,s.angle,Math.PI*.08+i*.35,Math.PI*1.64+i*.35);
          ctx.strokeStyle=`rgba(${i?'117,227,248':'224,254,255'},${.72-i*.18})`;ctx.lineWidth=9-i*2;ctx.stroke();
        }
      }else if(selected==='C'){
        for(let i=0;i<3;i++){
          const r=42+i*21+pulse*9;
          ctx.beginPath();ctx.arc(s.x+s.px*(i-1)*13,s.y+s.py*(i-1)*13,r,-.7,.8);
          ctx.strokeStyle=`rgba(166,241,252,${.44-i*.08})`;ctx.lineWidth=11-i*2;ctx.stroke();
        }
      }else{
        ctx.beginPath();ctx.ellipse(s.x-s.dx*18,s.y-s.dy*18,50+pulse*6,27+pulse*3,s.angle,Math.PI*.55,Math.PI*1.45);
        ctx.strokeStyle='rgba(220,253,255,.66)';ctx.lineWidth=9;ctx.stroke();
      }
    });
  }

  function applyPattern(pattern){
    if(!patterns[pattern])return;
    selected=pattern;
    battle.dataset.airshotEffect=pattern;
    particles.length=0;
    panel.querySelectorAll('[data-pattern]').forEach(button=>button.classList.toggle('active',button.dataset.pattern===pattern));
    desc.textContent=`${patterns[pattern]}　※実際に撃つエアシュートへ反映`;
  }

  panel.addEventListener('pointerdown',event=>event.stopPropagation());
  panel.addEventListener('click',event=>{
    const button=event.target.closest('[data-pattern]');
    if(!button)return;
    event.preventDefault();event.stopPropagation();
    applyPattern(button.dataset.pattern);
  });

  function loop(now){
    const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));
    lastFrame=now;
    ctx.clearRect(0,0,cssWidth,cssHeight);

    const projectiles=[...battle.querySelectorAll('.bullet.cannon')];
    const active=new Set(projectiles);
    projectiles.forEach(projectile=>{
      const s=projectileState(projectile);
      let state=tracked.get(projectile);
      if(!state){state={...s,lastSpawn:0};tracked.set(projectile,state)}
      Object.assign(state,s);
      const interval=selected==='C'?22:selected==='B'?24:26;
      if(now-state.lastSpawn>=interval){spawnUseWind(s,now);state.lastSpawn=now}
    });

    for(const [projectile,state] of tracked){
      if(active.has(projectile))continue;
      spawnEndBurst(state);tracked.delete(projectile);
    }

    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.life+=dt;
      if(p.life>=p.maxLife){particles.splice(i,1);continue}
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      const age=clamp01(p.life/p.maxLife);
      strokeWind(p,age);
    }
    drawCoreWind(projectiles,now);
    requestAnimationFrame(loop);
  }

  applyPattern(selected);
  requestAnimationFrame(loop);

  window.BattleNetworkAttackEffectReview=Object.freeze({
    getChip:()=> 'AIRSHOT',
    getPattern:()=>selected,
    setPattern:applyPattern
  });
})();
