(()=>{
  const testTarget=window.BattleNetworkFolder?.getTestTarget?.();
  if(!testTarget?.enabled)return;

  const FIELD=window.BattleNetworkField;
  const PLAYER=window.BattleNetworkPlayer;
  const MASTER=window.BattleNetworkMaster;
  const battle=document.getElementById('battle');
  const scene=document.getElementById('scene');
  if(!FIELD||!PLAYER||!MASTER||!battle||!scene)return;

  const PX=.72,PY=.36;
  const WORLD=FIELD.WORLD_SIZE;
  const TILE=FIELD.TILE_SIZE;
  const SW=WORLD*PX*2;
  const CHIP=MASTER.createGameCompatibilityData?.().CHIP||{};
  const definitions=Object.freeze({
    AIRSHOT:Object.freeze({
      label:'エアシュート',
      chipId:'CHIP_EXE4_S004',
      runtime:CHIP.AIRSHOT,
      patterns:Object.freeze({A:'圧縮空気弾',B:'風刃',C:'衝撃波'})
    }),
    BOMB:Object.freeze({
      label:'ミニボム',
      chipId:'CHIP_0004',
      runtime:CHIP.BOMB,
      patterns:Object.freeze({A:'コンパクト爆発',B:'爆風リング',C:'爆炎'})
    }),
    SWORD:Object.freeze({
      label:'ソード',
      chipId:'CHIP_0002',
      runtime:CHIP.SWORD,
      patterns:Object.freeze({A:'高速斬撃',B:'エネルギー剣',C:'光刃'})
    }),
    WIDE:Object.freeze({
      label:'ワイドソード',
      chipId:'CHIP_0003',
      runtime:CHIP.WIDE,
      patterns:Object.freeze({A:'ワイドエネルギー剣',B:'扇状斬撃',C:'三重残像'})
    })
  });

  const style=document.createElement('style');
  style.id='attackEffectReviewStyle';
  style.textContent=`
    .attackEffectReview{
      position:absolute;right:8px;top:8px;z-index:76;width:min(304px,42vw);
      padding:8px;border:1px solid rgba(119,228,255,.82);border-radius:10px;
      background:rgba(4,22,31,.94);box-shadow:0 8px 24px rgba(0,0,0,.42),inset 0 0 0 1px rgba(173,244,255,.08);
      color:#effdff;pointer-events:auto;touch-action:none;
    }
    .attackEffectReviewTitle{font-size:11px;font-weight:1000;letter-spacing:.4px;color:#bff5ff;margin-bottom:6px}
    .attackEffectReviewChips{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:5px}
    .attackEffectReviewPatterns{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:5px}
    .attackEffectReview button{min-width:0;height:30px;padding:0 5px;border:1px solid #39748a;border-radius:7px;background:#0b3040;color:#eaffff;font-size:10px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;touch-action:none}
    .attackEffectReview button.active{border-color:#ffe66d;background:#59470d;color:#fff5b6;box-shadow:0 0 9px rgba(255,221,87,.42)}
    .attackEffectReviewPatterns button{font-size:13px}
    .attackEffectReviewFooter{display:grid;grid-template-columns:1fr 64px;align-items:center;gap:6px}
    .attackEffectReviewDesc{min-width:0;font-size:10px;font-weight:800;color:#d8f8ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .attackEffectReplay{border-color:#68e7ff!important;background:#124a5c!important;color:#dffcff!important}

    .attackFxPreview{position:absolute;z-index:18;pointer-events:none;transform-origin:center;will-change:transform,opacity;contain:layout paint style}

    .attackFxAirA{width:44px;height:20px;border-radius:50%;border:2px solid rgba(198,249,255,.9);background:radial-gradient(ellipse at 66% 50%,rgba(255,255,255,.98) 0 13%,rgba(173,245,255,.95) 22%,rgba(83,218,246,.78) 45%,rgba(52,183,221,.2) 68%,transparent 74%);box-shadow:0 0 10px rgba(116,235,255,.95),0 0 22px rgba(70,210,244,.65)}
    .attackFxAirA:before{content:"";position:absolute;right:72%;top:50%;width:66px;height:12px;transform:translateY(-50%);background:linear-gradient(90deg,transparent 0%,rgba(96,220,247,.08) 18%,rgba(126,235,255,.5) 67%,rgba(216,251,255,.9) 100%);clip-path:polygon(0 42%,100% 0,100% 100%,0 58%);filter:blur(.4px)}
    .attackFxAirA:after{content:"";position:absolute;left:-8px;top:50%;width:29px;height:29px;border:2px solid rgba(166,245,255,.62);border-radius:50%;transform:translate(-50%,-50%) scaleX(.42);box-shadow:0 0 8px rgba(95,228,255,.55)}

    .attackFxAirB{width:58px;height:26px;background:transparent;filter:drop-shadow(0 0 8px rgba(101,234,255,.9))}
    .attackFxAirB:before{content:"";position:absolute;inset:1px;background:linear-gradient(180deg,rgba(236,255,255,.98),rgba(99,228,251,.86) 42%,rgba(54,174,219,.24));clip-path:polygon(0 50%,24% 18%,100% 3%,72% 48%,100% 96%,24% 82%);border-radius:50%}
    .attackFxAirB:after{content:"";position:absolute;right:77%;top:4px;width:55px;height:18px;background:repeating-linear-gradient(180deg,transparent 0 4px,rgba(113,229,251,.58) 4px 6px);clip-path:polygon(0 30%,100% 0,100% 100%,0 70%);opacity:.8}

    .attackFxAirC{width:34px;height:34px;border-radius:50%;border:4px solid rgba(192,250,255,.9);background:rgba(77,208,238,.08);box-shadow:0 0 12px rgba(108,235,255,.85),inset 0 0 10px rgba(167,246,255,.58)}
    .attackFxAirC:before,.attackFxAirC:after{content:"";position:absolute;left:50%;top:50%;border-radius:50%;border:3px solid rgba(135,236,255,.68);transform:translate(-50%,-50%) scaleX(.45)}
    .attackFxAirC:before{width:58px;height:58px}
    .attackFxAirC:after{width:84px;height:84px;border-color:rgba(87,210,242,.36)}

    .attackFxBomb{border-radius:50%;background:transparent}
    .attackFxBombA:before{content:"";position:absolute;left:50%;top:50%;width:58%;height:58%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#fff7ca 0 12%,#ffe05b 20%,#ff9f33 44%,rgba(255,91,32,.76) 64%,transparent 72%);box-shadow:0 0 18px #ffdc58,0 0 34px rgba(255,104,42,.9);animation:attackFxBombCore .44s ease-out forwards}
    .attackFxBombA:after{content:"";position:absolute;inset:28%;border-radius:50%;border:4px solid rgba(255,236,143,.9);animation:attackFxBombRingSmall .44s ease-out forwards}
    .attackFxBombB:before{content:"";position:absolute;inset:4%;border:7px solid rgba(255,208,76,.96);border-radius:50%;box-shadow:0 0 16px rgba(255,162,47,.95),inset 0 0 18px rgba(255,116,32,.42);animation:attackFxBombRing .48s ease-out forwards}
    .attackFxBombB:after{content:"";position:absolute;left:50%;top:50%;width:28%;height:28%;transform:translate(-50%,-50%);border-radius:50%;background:#fff3a4;box-shadow:0 0 18px #ffc942;animation:attackFxBombCore .4s ease-out forwards}
    .attackFxBombC{background:radial-gradient(circle at 50% 62%,rgba(255,241,127,.98) 0 9%,rgba(255,149,34,.9) 17%,transparent 33%),radial-gradient(circle at 33% 49%,rgba(255,116,31,.9) 0 18%,transparent 31%),radial-gradient(circle at 68% 42%,rgba(255,90,29,.9) 0 20%,transparent 35%),radial-gradient(circle at 48% 24%,rgba(255,190,50,.88) 0 16%,transparent 31%);filter:drop-shadow(0 0 18px rgba(255,105,31,.9));animation:attackFxBombFlame .52s ease-out forwards}
    .attackFxBombC:before,.attackFxBombC:after{content:"";position:absolute;border-radius:50%;background:rgba(92,47,38,.62);filter:blur(2px)}
    .attackFxBombC:before{width:28%;height:28%;left:22%;top:2%}
    .attackFxBombC:after{width:34%;height:34%;right:14%;top:8%}
    @keyframes attackFxBombCore{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.3)}}
    @keyframes attackFxBombRingSmall{0%{opacity:1;transform:scale(.35)}100%{opacity:0;transform:scale(1.5)}}
    @keyframes attackFxBombRing{0%{opacity:1;transform:scale(.18);border-width:10px}100%{opacity:0;transform:scale(1.06);border-width:2px}}
    @keyframes attackFxBombFlame{0%{opacity:0;transform:scale(.35)}24%{opacity:1;transform:scale(.92)}58%{opacity:.96;transform:scale(1.08)}100%{opacity:0;transform:scale(1.28)}}

    .attackFxMelee{position:absolute;z-index:18;pointer-events:none;transform-origin:0 50%;will-change:transform,opacity;contain:layout paint style;background:transparent}
    .attackFxSwordA:before{content:"";position:absolute;left:0;right:0;top:15%;bottom:15%;border-top:6px solid rgba(218,253,255,.98);border-right:4px solid rgba(104,229,255,.8);border-radius:50%;box-shadow:0 -3px 8px rgba(117,232,255,.95);transform:skewY(-7deg)}
    .attackFxSwordB:before{content:"";position:absolute;left:0;top:50%;width:100%;height:20px;transform:translateY(-50%);clip-path:polygon(0 34%,88% 10%,100% 50%,88% 90%,0 66%);background:linear-gradient(180deg,#eaffff 0 22%,#72e9ff 35% 68%,#198fcc 100%);box-shadow:0 0 8px rgba(216,253,255,.98),0 0 20px rgba(64,210,255,.9)}
    .attackFxSwordB:after{content:"";position:absolute;left:-7px;top:50%;width:15px;height:32px;transform:translateY(-50%);border-radius:5px;background:#ffe46d;box-shadow:0 0 8px rgba(255,224,90,.75)}
    .attackFxSwordC:before{content:"";position:absolute;left:0;top:50%;width:100%;height:8px;transform:translateY(-50%);background:#f6ffff;box-shadow:0 0 7px #d7fbff,0 0 18px #62e2ff,0 0 30px rgba(36,174,255,.9);clip-path:polygon(0 35%,94% 0,100% 50%,94% 100%,0 65%)}

    .attackFxWideA:before{content:"";position:absolute;left:0;top:50%;width:100%;height:38px;transform:translateY(-50%);clip-path:polygon(0 27%,84% 4%,100% 50%,84% 96%,0 73%);background:linear-gradient(180deg,#efffff 0 15%,#8cf1ff 28% 67%,#1f9ed6 100%);box-shadow:0 0 10px #dffcff,0 0 25px rgba(63,216,255,.95)}
    .attackFxWideA:after{content:"";position:absolute;left:-8px;top:50%;width:18px;height:48px;transform:translateY(-50%);border-radius:6px;background:#ffe568;box-shadow:0 0 9px rgba(255,228,94,.8)}
    .attackFxWideB:before{content:"";position:absolute;left:-4%;top:-48%;width:108%;height:196%;border-radius:0 100% 100% 0;background:radial-gradient(ellipse at 0 50%,transparent 0 35%,rgba(206,252,255,.96) 37% 40%,rgba(76,219,255,.66) 42% 49%,transparent 52%);filter:drop-shadow(0 0 10px rgba(78,220,255,.9))}
    .attackFxWideC:before{content:"";position:absolute;left:0;top:50%;width:100%;height:7px;transform:translateY(-50%);background:#eaffff;box-shadow:0 -24px 0 rgba(119,232,255,.8),0 24px 0 rgba(71,190,246,.68),0 0 10px #8beaff,0 -24px 12px rgba(72,203,255,.72),0 24px 12px rgba(72,203,255,.65);clip-path:polygon(0 36%,94% 0,100% 50%,94% 100%,0 64%)}
  `;
  document.head.appendChild(style);

  let selectedKey='AIRSHOT';
  const selectedPattern={AIRSHOT:'A',BOMB:'A',SWORD:'A',WIDE:'A'};
  const liveEffects=new Set();

  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function normalizeFacing(){
    const facing=PLAYER.getFacing?.()||{x:1,y:0};
    const length=Math.hypot(Number(facing.x)||0,Number(facing.y)||0)||1;
    return{x:(Number(facing.x)||0)/length,y:(Number(facing.y)||0)/length};
  }
  function screenAngle(direction){return Math.atan2((direction.x+direction.y)*PY,(direction.x-direction.y)*PX)*180/Math.PI}
  function track(el,duration=900){
    liveEffects.add(el);
    const remove=()=>{liveEffects.delete(el);el.remove()};
    setTimeout(remove,duration);
    return el;
  }
  function clearEffects(){liveEffects.forEach(el=>el.remove());liveEffects.clear()}

  function previewAir(pattern){
    const position=PLAYER.getPosition();
    const direction=normalizeFacing();
    const start=project(position.x,position.y);
    const rangeWorld=Number(definitions.AIRSHOT.runtime?.range)||FIELD.toWorldDistance?.(7)||TILE*7;
    const endWorld={x:Math.max(0,Math.min(WORLD,position.x+direction.x*rangeWorld)),y:Math.max(0,Math.min(WORLD,position.y+direction.y*rangeWorld))};
    const end=project(endWorld.x,endWorld.y);
    const dx=end.x-start.x,dy=end.y-start.y;
    const angle=screenAngle(direction);
    const el=track(document.createElement('div'),760);
    el.className=`attackFxPreview attackFxAir${pattern}`;
    el.style.left=`${start.x}px`;
    el.style.top=`${start.y-34}px`;
    scene.appendChild(el);
    el.animate([
      {opacity:0,transform:`translate(-50%,-50%) rotate(${angle}deg) scale(.72)`},
      {opacity:1,offset:.08,transform:`translate(-50%,-50%) rotate(${angle}deg) scale(1)`},
      {opacity:1,offset:.82,transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${angle}deg) scale(1)`},
      {opacity:0,transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${angle}deg) scale(.88)`}
    ],{duration:620,easing:'linear',fill:'forwards'});
  }

  function previewBomb(pattern){
    const position=PLAYER.getPosition();
    const direction=normalizeFacing();
    const throwTiles=Number(definitions.BOMB.runtime?.throwDistanceTiles)||3;
    const distance=FIELD.toWorldDistance?.(throwTiles)||TILE*throwTiles;
    const targetWorld={x:Math.max(0,Math.min(WORLD,position.x+direction.x*distance)),y:Math.max(0,Math.min(WORLD,position.y+direction.y*distance))};
    const target=project(targetWorld.x,targetWorld.y);
    const radiusWorld=Number(definitions.BOMB.runtime?.radius)||FIELD.toWorldDistance?.(1)||TILE;
    const size=Math.max(138,radiusWorld*PX*2);
    const el=track(document.createElement('div'),820);
    el.className=`attackFxPreview attackFxBomb attackFxBomb${pattern}`;
    el.style.width=`${size}px`;
    el.style.height=`${size}px`;
    el.style.left=`${target.x-size/2}px`;
    el.style.top=`${target.y-34-size/2}px`;
    scene.appendChild(el);
  }

  function previewMelee(key,pattern){
    const definition=definitions[key];
    const runtime=definition.runtime||{};
    const position=PLAYER.getPosition();
    const direction=normalizeFacing();
    const start=project(position.x,position.y);
    const rangeWorld=Number(runtime.range)||FIELD.toWorldDistance?.(1)||TILE;
    const end=project(position.x+direction.x*rangeWorld,position.y+direction.y*rangeWorld);
    const screenLength=Math.max(92,Math.hypot(end.x-start.x,end.y-start.y));
    const angle=screenAngle(direction);
    const isWide=key==='WIDE';
    const height=isWide?Math.max(104,(Number(runtime.width)||TILE*3)*PY):Math.max(68,(Number(runtime.width)||TILE)*PY);
    const prefix=isWide?'Wide':'Sword';
    const el=track(document.createElement('div'),720);
    el.className=`attackFxMelee attackFx${prefix}${pattern}`;
    el.style.width=`${screenLength}px`;
    el.style.height=`${height}px`;
    el.style.left=`${start.x}px`;
    el.style.top=`${start.y-42}px`;
    scene.appendChild(el);
    el.animate([
      {opacity:0,transform:`translateY(-50%) rotate(${angle-12}deg) scaleX(.52)`},
      {opacity:1,offset:.18,transform:`translateY(-50%) rotate(${angle}deg) scaleX(1)`},
      {opacity:.92,offset:.52,transform:`translateY(-50%) rotate(${angle+5}deg) scaleX(1.05)`},
      {opacity:0,transform:`translateY(-50%) rotate(${angle+9}deg) scaleX(1.12)`}
    ],{duration:isWide?430:350,easing:'cubic-bezier(.16,.8,.24,1)',fill:'forwards'});
  }

  function preview(){
    clearEffects();
    const pattern=selectedPattern[selectedKey];
    if(selectedKey==='AIRSHOT')previewAir(pattern);
    else if(selectedKey==='BOMB')previewBomb(pattern);
    else previewMelee(selectedKey,pattern);
  }

  const panel=document.createElement('div');
  panel.className='attackEffectReview';
  panel.dataset.testOnly='attack-effect-review';
  panel.innerHTML=`
    <div class="attackEffectReviewTitle">攻撃エフェクト確認</div>
    <div class="attackEffectReviewChips"></div>
    <div class="attackEffectReviewPatterns"></div>
    <div class="attackEffectReviewFooter"><div class="attackEffectReviewDesc"></div><button class="attackEffectReplay" type="button">再生</button></div>`;
  battle.appendChild(panel);

  const chipButtons=panel.querySelector('.attackEffectReviewChips');
  const patternButtons=panel.querySelector('.attackEffectReviewPatterns');
  const description=panel.querySelector('.attackEffectReviewDesc');
  const replay=panel.querySelector('.attackEffectReplay');

  function renderPanel(){
    chipButtons.innerHTML='';
    Object.entries(definitions).forEach(([key,definition])=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=definition.label.replace('エアシュート','エア').replace('ミニボム','ボム').replace('ワイドソード','ワイド');
      button.classList.toggle('active',key===selectedKey);
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();selectedKey=key;renderPanel();preview()});
      chipButtons.appendChild(button);
    });

    patternButtons.innerHTML='';
    const definition=definitions[selectedKey];
    ['A','B','C'].forEach(pattern=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=pattern;
      button.title=definition.patterns[pattern];
      button.classList.toggle('active',selectedPattern[selectedKey]===pattern);
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();selectedPattern[selectedKey]=pattern;renderPanel();preview()});
      patternButtons.appendChild(button);
    });
    const pattern=selectedPattern[selectedKey];
    description.textContent=`${definition.label} / ${pattern}：${definition.patterns[pattern]}`;
  }

  panel.addEventListener('pointerdown',event=>event.stopPropagation());
  panel.addEventListener('pointerup',event=>event.stopPropagation());
  replay.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();preview()});
  renderPanel();

  window.BattleNetworkAttackEffectReview=Object.freeze({
    preview,
    clear:clearEffects,
    selectChip:key=>{if(definitions[key]){selectedKey=key;renderPanel()}},
    setPattern:(key,pattern)=>{if(definitions[key]&&['A','B','C'].includes(pattern)){selectedPattern[key]=pattern;renderPanel()}},
    getSelection:()=>Object.freeze({chipKey:selectedKey,pattern:selectedPattern[selectedKey]})
  });
})();