(()=>{
  const FIELD=window.BattleNetworkField;
  const MASTER=window.BattleNetworkMaster;
  const FOLDER=window.BattleNetworkFolder;
  if(!MASTER||!FOLDER)throw new Error('BattleNetworkMiniBombTest: required master/folder service is missing.');

  const TEST_TARGET=Object.freeze({
    enabled:true,
    type:'BOMB',
    chipId:'CHIP_0004',
    codes:Object.freeze(['B','L']),
    requiredCards:Object.freeze([])
  });
  const LIMITS=Object.freeze({diameterTiles:Object.freeze({min:1,max:3,step:1})});
  let settings={diameterTiles:1};
  const listeners=new Set();

  function getSettings(){return Object.freeze({...settings})}
  function setDiameterTiles(value){
    const n=Math.round(Number(value));
    if(!Number.isFinite(n))return getSettings();
    settings.diameterTiles=Math.max(LIMITS.diameterTiles.min,Math.min(LIMITS.diameterTiles.max,n));
    const snapshot=getSettings();
    listeners.forEach(listener=>{try{listener(snapshot)}catch(error){console.error('BattleNetworkMiniBombTest listener failed.',error)}});
    return snapshot;
  }
  function subscribe(listener){
    if(typeof listener!=='function')return()=>{};
    listeners.add(listener);listener(getSettings());
    return()=>listeners.delete(listener);
  }
  window.BattleNetworkMiniBombTestSettings=Object.freeze({TEST_TARGET,LIMITS,getSettings,setDiameterTiles,subscribe});

  function buildTestCards(folderId=FOLDER.getEquippedFolderId?.()){
    const codes=TEST_TARGET.codes;
    return Array.from({length:30},(_,index)=>({
      id:index,
      type:TEST_TARGET.type,
      code:codes[index%codes.length],
      chipId:TEST_TARGET.chipId,
      folderId,
      slotNo:index+1
    }));
  }

  // Replace only the active chip-detail test target. The original bridge is invoked once
  // on the legacy folder so it restores Array.prototype.map to its native implementation.
  const inheritedMap=Array.prototype.map;
  Array.prototype.map=function(callback,thisArg){
    const isLegacyBattleFolder=this.length===30&&Array.isArray(this[0])&&this[0][0]==='CANNON'&&this[0][1]==='A';
    if(!isLegacyBattleFolder)return inheritedMap.call(this,callback,thisArg);
    inheritedMap.call(this,callback,thisArg);
    return buildTestCards();
  };
  FOLDER.getTestTarget=()=>TEST_TARGET;
  FOLDER.toLegacyCards=folderId=>buildTestCards(folderId);

  // Keep the existing bomb implementation and make only the confirmed/tested parameters dynamic.
  const originalCreate=MASTER.createGameCompatibilityData;
  MASTER.createGameCompatibilityData=()=>{
    const result=originalCreate();
    const bomb=result?.CHIP?.BOMB;
    if(!bomb)return result;
    Object.defineProperty(bomb,'throwDistanceTiles',{enumerable:true,configurable:true,get:()=>3});
    Object.defineProperty(bomb,'radiusTiles',{enumerable:true,configurable:true,get:()=>getSettings().diameterTiles/2});
    Object.defineProperty(bomb,'radius',{enumerable:true,configurable:true,get:()=>FIELD?.toWorldDistance?FIELD.toWorldDistance(getSettings().diameterTiles/2):undefined});
    bomb.rangeText='向いている方向の固定3マス先へ投げる';
    return result;
  };

  function installPanel(){
    const wrap=document.querySelector('[data-test-only="enemy-debug-tools"]');
    const tools=wrap?.children?.[1];
    if(!tools||document.getElementById('miniBombTestPanel'))return;
    const panel=document.createElement('div');panel.id='miniBombTestPanel';
    panel.style.cssText='display:flex;flex:0 0 auto;flex-direction:column;align-items:stretch;gap:8px;padding:10px;border:1px solid rgba(255,211,82,.68);border-radius:7px;background:rgba(48,36,6,.8);font-variant-numeric:tabular-nums;box-sizing:border-box;';
    const title=document.createElement('strong');title.textContent='ミニボム';title.style.cssText='font-size:14px;color:#fff5bd;';
    const fixed=document.createElement('span');fixed.textContent='投擲距離：向いている方向の3マス先（固定）';fixed.style.cssText='display:block;color:#fff;font-weight:800;';
    const label=document.createElement('span');label.style.cssText='display:block;color:#ffe9a6;font-weight:900;';
    const buttons=document.createElement('div');buttons.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;';
    const buttonByValue=new Map();
    [1,2,3].forEach(value=>{
      const button=document.createElement('button');button.type='button';button.textContent=`直径 ${value}マス`;button.style.cssText='min-height:38px;border:1px solid #ffe27a;border-radius:6px;background:#30270d;color:#fff7c9;font-weight:900;padding:6px 8px;';
      button.addEventListener('click',()=>setDiameterTiles(value));buttonByValue.set(value,button);buttons.appendChild(button);
    });
    const note=document.createElement('span');note.textContent='実機比較用：着弾地点を中心に直径1〜3マスを切替';note.style.cssText='display:block;color:#c8f5ff;font-weight:800;padding-top:2px;';
    const render=snapshot=>{
      label.textContent=`現在：直径 ${snapshot.diameterTiles}マス`;
      buttonByValue.forEach((button,value)=>{const active=value===snapshot.diameterTiles;button.style.background=active?'#14532d':'#30270d';button.style.boxShadow=active?'0 0 0 2px rgba(255,226,122,.28)':'none'});
    };
    panel.append(title,fixed,label,buttons,note);
    const detail=tools.lastElementChild;detail?tools.insertBefore(panel,detail):tools.appendChild(panel);
    subscribe(render);
  }

  setTimeout(installPanel,0);
})();
