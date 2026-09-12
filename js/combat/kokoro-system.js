(()=>{
  const HUD=window.BattleNetworkPlayerHud;
  if(!HUD||typeof HUD.getKokoroValue!=='function'||typeof HUD.setKokoroValue!=='function'){
    throw new Error('BattleNetworkKokoro: player HUD kokoro API is not loaded.');
  }

  const DEFAULT_CONFIG=Object.freeze({
    profiles:Object.freeze({LIGHT:.75,NORMAL:1,HEAVY:1.25,MULTI:.65}),
    enemy:Object.freeze({enabled:true,base:8,damageRate:.25,maxPerAction:50,defaultProfile:'NORMAL'}),
    chip:Object.freeze({enabled:true,base:10,damageRate:.5,maxPerAction:50,defaultProfile:'NORMAL'}),
    support:Object.freeze({enabled:false,base:0,damageRate:0,maxPerAction:50,defaultProfile:'NORMAL'})
  });

  let config={
    profiles:{...DEFAULT_CONFIG.profiles},
    enemy:{...DEFAULT_CONFIG.enemy},
    chip:{...DEFAULT_CONFIG.chip},
    support:{...DEFAULT_CONFIG.support}
  };
  const exclusions=new Map();
  const actionTotals=new Map();
  const ACTION_MEMORY_MS=30000;

  function finite(value,fallback){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>=0?n:fallback}
  function normalizeProfile(value,fallback='NORMAL'){const key=String(value||fallback).toUpperCase();return Object.prototype.hasOwnProperty.call(config.profiles,key)?key:fallback}
  function snapshotConfig(){return Object.freeze({profiles:Object.freeze({...config.profiles}),enemy:Object.freeze({...config.enemy}),chip:Object.freeze({...config.chip}),support:Object.freeze({...config.support})})}

  function configure(next={}){
    if(next.profiles&&typeof next.profiles==='object'){
      const merged={...config.profiles};
      for(const [key,value] of Object.entries(next.profiles)){
        const numeric=Number(value);
        if(Number.isFinite(numeric)&&numeric>=0)merged[String(key).toUpperCase()]=numeric;
      }
      config.profiles=merged;
    }
    for(const kind of ['enemy','chip','support']){
      const patch=next[kind];
      if(!patch||typeof patch!=='object')continue;
      config[kind]={
        ...config[kind],
        ...(typeof patch.enabled==='boolean'?{enabled:patch.enabled}:{}),
        ...(Number.isFinite(Number(patch.base))?{base:Number(patch.base)}:{}),
        ...(Number.isFinite(Number(patch.damageRate))?{damageRate:Number(patch.damageRate)}:{}),
        ...(Number.isFinite(Number(patch.maxPerAction))&&Number(patch.maxPerAction)>=0?{maxPerAction:Number(patch.maxPerAction)}:{}),
        ...(patch.defaultProfile?{defaultProfile:String(patch.defaultProfile).toUpperCase()}:{}),
      };
    }
    return snapshotConfig();
  }

  function registerExclusion(id,predicate){
    const key=String(id||'').trim();
    if(!key||typeof predicate!=='function')return false;
    exclusions.set(key,predicate);
    return true;
  }
  function unregisterExclusion(id){return exclusions.delete(String(id||''))}

  function shouldApply(context={}){
    if(context.excludeKokoro===true||context.kokoro?.enabled===false)return false;
    for(const predicate of exclusions.values()){
      try{if(predicate(context)===true)return false}catch(error){console.error('BattleNetworkKokoro exclusion failed.',error)}
    }
    return true;
  }

  function calculate(kind,basePower,context={}){
    const source=config[kind];
    if(!source||source.enabled!==true||!shouldApply(context))return Object.freeze({enabled:false,amount:0,maxPerAction:0,profile:null});
    const power=Number(basePower);
    if(!Number.isFinite(power)||power<=0)return Object.freeze({enabled:false,amount:0,maxPerAction:source.maxPerAction,profile:null});
    const override=Number(context.kokoro?.override??context.override);
    const profile=normalizeProfile(context.kokoro?.profile??context.profile,source.defaultProfile);
    const profileMultiplier=positive(config.profiles[profile],1);
    const extraMultiplier=positive(context.kokoro?.multiplier??context.multiplier,1);
    const raw=Number.isFinite(override)?override:(source.base+power*source.damageRate);
    const amount=Math.max(0,Math.round(raw*profileMultiplier*extraMultiplier));
    const requestedMax=Number(context.kokoro?.maxPerAction??context.maxPerAction);
    const maxPerAction=Number.isFinite(requestedMax)&&requestedMax>=0?requestedMax:source.maxPerAction;
    return Object.freeze({enabled:true,amount,maxPerAction,profile,raw});
  }

  function cleanupActions(now=performance.now()){
    for(const [key,entry] of actionTotals){if(now-entry.updatedAt>ACTION_MEMORY_MS)actionTotals.delete(key)}
  }

  function actionKey(kind,context={}){
    const token=context.actionToken??context.kokoroActionToken??context.shotToken;
    if(token===undefined||token===null)return null;
    return [kind,context.sourceType||'',context.sourceId||'',context.attackId||'',String(token)].join('|');
  }

  function applyActionCap(kind,amount,maxPerAction,context={}){
    const max=Math.max(0,Math.round(finite(maxPerAction,0)));
    const requested=Math.max(0,Math.round(finite(amount,0)));
    if(max===0||requested===0)return Object.freeze({applied:0,used:0,max});
    const key=actionKey(kind,context);
    if(!key)return Object.freeze({applied:Math.min(requested,max),used:Math.min(requested,max),max});
    const now=performance.now();cleanupActions(now);
    const previous=actionTotals.get(key)?.used||0;
    const applied=Math.max(0,Math.min(requested,max-previous));
    const used=Math.min(max,previous+applied);
    actionTotals.set(key,{used,updatedAt:now});
    return Object.freeze({applied,used,max});
  }

  function apply(kind,direction,context={}){
    const basePower=context.basePower??context.damage??context.power;
    const calculated=calculate(kind,basePower,context);
    if(!calculated.enabled||calculated.amount<=0)return Object.freeze({applied:false,reason:'EXCLUDED_OR_ZERO',kind,before:HUD.getKokoroValue(),after:HUD.getKokoroValue(),change:0,calculated});
    const capped=applyActionCap(kind,calculated.amount,calculated.maxPerAction,context);
    if(capped.applied<=0)return Object.freeze({applied:false,reason:'ACTION_CAP',kind,before:HUD.getKokoroValue(),after:HUD.getKokoroValue(),change:0,calculated,capped});
    const before=HUD.getKokoroValue();
    const signed=direction<0?-capped.applied:capped.applied;
    const after=HUD.setKokoroValue(before+signed);
    return Object.freeze({applied:true,reason:null,kind,before,after,change:after-before,calculated,capped});
  }

  function clearActionTracking(){actionTotals.clear()}

  window.BattleNetworkKokoro=Object.freeze({
    DEFAULT_CONFIG,
    getConfig:snapshotConfig,
    configure,
    calculateEnemy:(basePower,context={})=>calculate('enemy',basePower,context),
    calculateChip:(basePower,context={})=>calculate('chip',basePower,context),
    applyEnemyHit:context=>apply('enemy',-1,context||{}),
    applyChipHit:context=>apply('chip',1,context||{}),
    registerExclusion,
    unregisterExclusion,
    clearActionTracking
  });
})();
