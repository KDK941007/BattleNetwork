(()=>{
  const original=window.BattleNetworkCombatRange;
  const master=window.BattleNetworkMaster;
  const fullSynchro=window.BattleNetworkFullSynchro;
  if(!original||!master?.createGameCompatibilityData)return;

  const compat=master.createGameCompatibilityData();
  const runtimeByChipId=new Map();
  Object.values(compat?.CHIP||{}).forEach(chip=>{if(chip?.chipId&&!runtimeByChipId.has(chip.chipId))runtimeByChipId.set(chip.chipId,chip)});

  const wrapped=new WeakMap();
  let burstGroup=null;
  let sequence=0;

  function applyFullSynchroPower(damage){
    const power=Number(damage);
    if(!Number.isFinite(power)||power<=0||!fullSynchro?.applyToChip)return Object.freeze({applied:false,beforePower:Number.isFinite(power)?power:null,afterPower:Number.isFinite(power)?power:null});
    return fullSynchro.applyToChip(Object.freeze({power}));
  }

  function wrapAttack(attack){
    if(!attack||typeof attack!=='object')return attack;
    if(wrapped.has(attack))return wrapped.get(attack);

    let actionToken=attack.actionToken??attack.kokoroActionToken??attack.shotToken;
    let kokoro=attack.kokoro||null;
    let damage=attack.damage;
    let fullSynchroApplied=false;
    let fullSynchroBasePower=null;

    if(attack.sourceType==='CHIP'){
      const runtime=runtimeByChipId.get(attack.sourceId);
      const burstCount=Math.max(1,Math.floor(Number(runtime?.burstCount)||1));
      if(runtime?.type==='vulcan'&&burstCount>1){
        if(!burstGroup||burstGroup.sourceId!==attack.sourceId||burstGroup.remaining<=0){
          const boost=applyFullSynchroPower(attack.damage);
          burstGroup={sourceId:attack.sourceId,token:`kokoro-chip-action-${++sequence}`,remaining:burstCount,fullSynchroApplied:boost.applied===true,multiplier:boost.applied===true?2:1,basePower:boost.beforePower};
        }
        actionToken=burstGroup.token;
        fullSynchroApplied=burstGroup.fullSynchroApplied;
        fullSynchroBasePower=burstGroup.basePower;
        const numericDamage=Number(attack.damage);
        if(Number.isFinite(numericDamage)&&numericDamage>0&&burstGroup.multiplier!==1)damage=numericDamage*burstGroup.multiplier;
        burstGroup.remaining--;
        if(!kokoro?.profile)kokoro=Object.freeze({...kokoro,profile:'MULTI'});
        if(burstGroup.remaining<=0)burstGroup=null;
      }else{
        const boost=applyFullSynchroPower(attack.damage);
        if(boost.applied===true){damage=boost.afterPower;fullSynchroApplied=true;fullSynchroBasePower=boost.beforePower}
      }
    }

    const result=Object.freeze({...attack,damage,actionToken,kokoro,fullSynchroApplied,fullSynchroBasePower});
    wrapped.set(attack,result);
    return result;
  }

  window.BattleNetworkCombatRange=Object.freeze({
    ...original,
    getLastAttackContext:()=>wrapAttack(original.getLastAttackContext?.()||null)
  });
})();
