(()=>{
  const original=window.BattleNetworkCombatRange;
  const master=window.BattleNetworkMaster;
  if(!original||!master?.createGameCompatibilityData)return;

  const compat=master.createGameCompatibilityData();
  const runtimeByChipId=new Map();
  Object.values(compat?.CHIP||{}).forEach(chip=>{if(chip?.chipId&&!runtimeByChipId.has(chip.chipId))runtimeByChipId.set(chip.chipId,chip)});

  const wrapped=new WeakMap();
  let burstGroup=null;
  let sequence=0;

  function wrapAttack(attack){
    if(!attack||typeof attack!=='object')return attack;
    if(wrapped.has(attack))return wrapped.get(attack);

    let actionToken=attack.actionToken??attack.kokoroActionToken??attack.shotToken;
    let kokoro=attack.kokoro||null;
    if(attack.sourceType==='CHIP'){
      const runtime=runtimeByChipId.get(attack.sourceId);
      const burstCount=Math.max(1,Math.floor(Number(runtime?.burstCount)||1));
      if(runtime?.type==='vulcan'&&burstCount>1){
        if(!burstGroup||burstGroup.sourceId!==attack.sourceId||burstGroup.remaining<=0){
          burstGroup={sourceId:attack.sourceId,token:`kokoro-chip-action-${++sequence}`,remaining:burstCount};
        }
        actionToken=burstGroup.token;
        burstGroup.remaining--;
        if(!kokoro?.profile)kokoro=Object.freeze({...kokoro,profile:'MULTI'});
        if(burstGroup.remaining<=0)burstGroup=null;
      }
    }

    const result=Object.freeze({...attack,actionToken,kokoro});
    wrapped.set(attack,result);
    return result;
  }

  window.BattleNetworkCombatRange=Object.freeze({
    ...original,
    getLastAttackContext:()=>wrapAttack(original.getLastAttackContext?.()||null)
  });
})();
