(()=>{
  const scene=document.getElementById('scene');
  if(!scene)throw new Error('BattleNetworkProjectileShadow: scene is not available.');

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

    // B攻撃は連打時の描画負荷を優先し、床影DOMを持たせない。
    // キャノンのみ従来の床影を維持する。
    if(resolvedKind==='normal'||resolvedKind==='charged'){
      tracked.set(bullet,{shadow:null,config});
      return true;
    }

    const shadow=document.createElement('div');
    shadow.className=`projectileFloorShadow ${resolvedKind}`;
    shadow.style.cssText=`position:absolute;width:${config.shadowWidth}px;height:${config.shadowHeight}px;border-radius:50%;background:rgba(0,0,0,${config.opacity});filter:blur(1.4px);z-index:5;pointer-events:none;transform-origin:center;will-change:transform;`;
    scene.appendChild(shadow);
    tracked.set(bullet,{shadow,config});
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

  // iPhone Safariで連続タップ時に再描画負荷が高くなりやすい発光・filterを
  // B攻撃と短間隔で3連射するバルカンだけ軽量表現へ置き換える。
  // 戦闘仕様・弾速・当たり判定・連射間隔には影響しない。
  const performanceStyle=document.createElement('style');
  performanceStyle.textContent=`
    .bullet.normal,.bullet.charged,.bullet.vulcan{
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
