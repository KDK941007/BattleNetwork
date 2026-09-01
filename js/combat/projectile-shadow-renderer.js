(()=>{
  const battle=document.getElementById('battle');
  const scene=document.getElementById('scene');
  if(!battle||!scene)throw new Error('BattleNetworkProjectileShadow: battle/scene is not available.');

  const tracked=new Map();
  const LEGACY_TRANSLATE_X=9;
  const LEGACY_TRANSLATE_Y=34;
  const FLOOR_CLEARANCE=20;
  const bulletConfig={
    cannon:{bulletWidth:132,bulletHeight:66,shadowWidth:114,shadowHeight:39,opacity:.48},
    normal:{bulletWidth:30,bulletHeight:15,shadowWidth:28,shadowHeight:10,opacity:.4},
    charged:{bulletWidth:52,bulletHeight:26,shadowWidth:50,shadowHeight:16,opacity:.5}
  };

  function getKind(bullet){
    if(bullet.classList.contains('cannon'))return 'cannon';
    if(bullet.classList.contains('charged'))return 'charged';
    if(bullet.classList.contains('normal'))return 'normal';
    return null;
  }

  function attach(bullet,kind=null){
    if(tracked.has(bullet))return true;
    const resolvedKind=kind||getKind(bullet),config=bulletConfig[resolvedKind];
    if(!config)return false;

    bullet.style.marginLeft=`${LEGACY_TRANSLATE_X-config.bulletWidth/2}px`;
    bullet.style.marginTop=`${LEGACY_TRANSLATE_Y-config.bulletHeight-FLOOR_CLEARANCE}px`;

    if(resolvedKind==='cannon'){
      const projectileLayer=document.getElementById('busterProjectileLayer');
      if(projectileLayer&&bullet.parentElement!==projectileLayer)projectileLayer.appendChild(bullet);
    }

    tracked.set(bullet,{shadow:null,config});
    return true;
  }

  function update(bullet,floorX,floorY){
    const entry=tracked.get(bullet);
    if(!entry||!entry.shadow||!Number.isFinite(floorX)||!Number.isFinite(floorY))return;
    const cfg=entry.config;
    entry.shadow.style.transform=`translate3d(${floorX-cfg.shadowWidth/2}px,${floorY-cfg.shadowHeight/2}px,0)`;
  }

  function detach(bullet){
    const entry=tracked.get(bullet);
    if(!entry)return;
    entry.shadow?.remove();
    tracked.delete(bullet);
  }

  // 一時チップエフェクトは巨大sceneから分離し、さらにDOMを破棄せず再利用する。
  // iPhone Safariでは大きいslash（ワイドソード等）のレイヤー破棄時に全rAFが止まるケースがあるため、
  // display:noneでプールへ戻し、次回同種エフェクトで再使用する。
  const effectLayer=document.createElement('div');
  effectLayer.id='chipEffectLayer';
  effectLayer.style.cssText=`position:absolute;left:0;top:0;width:${scene.clientWidth}px;height:${scene.clientHeight}px;transform-origin:0 0;pointer-events:none;contain:layout paint style;z-index:8;`;
  battle.appendChild(effectLayer);

  const nativeSceneAppend=scene.appendChild.bind(scene);
  const effectPools=new Map([['slash',[]],['boom',[]],['healPulse',[]]]);
  let effectSyncFrame=null,lastEffectTransform='',activeEffectCount=0;

  function temporaryEffectKind(node){
    if(!(node instanceof HTMLElement))return null;
    if(node.classList.contains('slash'))return 'slash';
    if(node.classList.contains('boom'))return 'boom';
    if(node.classList.contains('healPulse'))return 'healPulse';
    return null;
  }

  function syncEffectLayer(){
    effectSyncFrame=null;
    const next=scene.style.transform||'';
    if(next!==lastEffectTransform){effectLayer.style.transform=next;lastEffectTransform=next}
    if(activeEffectCount>0)effectSyncFrame=requestAnimationFrame(syncEffectLayer);
  }

  function ensureEffectSync(){
    const next=scene.style.transform||'';
    if(next!==lastEffectTransform){effectLayer.style.transform=next;lastEffectTransform=next}
    if(effectSyncFrame===null&&activeEffectCount>0)effectSyncFrame=requestAnimationFrame(syncEffectLayer);
  }

  function releaseEffect(target,kind){
    if(target.dataset.effectPoolActive!=='true')return;
    target.dataset.effectPoolActive='false';
    target.style.display='none';
    target.getAnimations?.().forEach(animation=>animation.cancel());
    activeEffectCount=Math.max(0,activeEffectCount-1);
    effectPools.get(kind)?.push(target);
  }

  function activateEffect(target,source,kind){
    target.className=source.className;
    target.style.cssText=source.style.cssText;
    target.style.display='block';
    target.dataset.effectPoolActive='true';
    activeEffectCount+=1;
    ensureEffectSync();
    return target;
  }

  scene.appendChild=function(node){
    const kind=temporaryEffectKind(node);
    if(!kind)return nativeSceneAppend(node);

    const pool=effectPools.get(kind);
    const reusable=pool?.pop()||null;
    const target=reusable||node;
    if(!reusable)effectLayer.appendChild(target);
    activateEffect(target,node,kind);

    // game.js側は700ms後に生成したnode.remove()を呼ぶため、
    // 実DOMの削除ではなく対応するプール要素を解放するよう差し替える。
    node.remove=()=>releaseEffect(target,kind);
    return target;
  };

  const performanceStyle=document.createElement('style');
  performanceStyle.textContent=`
    .bullet.normal,.bullet.charged,.bullet.vulcan,.bullet.cannon{
      box-shadow:none!important;
      filter:none!important;
      will-change:transform;
      contain:layout paint style;
    }
    .bullet.normal{
      border:2px solid rgba(205,248,255,.9);
      background:#66ddff!important;
    }
    .bullet.charged{
      border:2px solid rgba(255,220,210,.92);
      background:#ff514e!important;
    }
    .bullet.vulcan{
      border:2px solid rgba(255,250,190,.92);
      background:#ffe97a!important;
    }
    .bullet.cannon{
      border:2px solid rgba(255,242,176,.94);
      background:#ffd55a!important;
    }
    .slash,.boom,.healPulse{
      box-shadow:none!important;
      filter:none!important;
      will-change:transform,opacity;
      contain:layout paint style;
    }
    #B.pressed{
      filter:none!important;
      outline:2px solid rgba(194,247,255,.9);
      outline-offset:1px;
    }
    .arrow.charging:before{
      display:none!important;
    }
    .arrow.ready:before{
      box-shadow:none!important;
      filter:none!important;
      border:3px solid rgba(255,220,210,.95);
    }
    .enemyPrototype{
      filter:none!important;
      box-shadow:0 0 0 3px rgba(255,255,255,.18) inset!important;
    }
    .enemyPrototypeHp{
      text-shadow:none!important;
    }
  `;
  document.head.appendChild(performanceStyle);

  window.BattleNetworkProjectileShadow=Object.freeze({attach,update,detach});
  scene.querySelectorAll('.bullet').forEach(bullet=>attach(bullet));
})();
