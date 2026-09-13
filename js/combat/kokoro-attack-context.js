(()=>{
  const original=window.BattleNetworkCombatRange;
  const master=window.BattleNetworkMaster;
  const fullSynchro=window.BattleNetworkFullSynchro;
  const anger=window.BattleNetworkAnger;
  if(!original||!master?.createGameCompatibilityData)return;

  const compat=master.createGameCompatibilityData();
  const runtimeByChipId=new Map();
  Object.values(compat?.CHIP||{}).forEach(chip=>{if(chip?.chipId&&!runtimeByChipId.has(chip.chipId))runtimeByChipId.set(chip.chipId,chip)});

  const wrapped=new WeakMap();
  let burstGroup=null;
  let sequence=0;

  function noBoost(power){return Object.freeze({applied:false,kind:null,beforePower:Number.isFinite(power)?power:null,afterPower:Number.isFinite(power)?power:null})}
  function applyEmotionPower(damage,sourceId){
    const power=Number(damage);
    if(!Number.isFinite(power)||power<=0)return noBoost(power);
    const packet=Object.freeze({power,chipId:sourceId,sourceId});
    if(fullSynchro?.applyToChip){
      const result=fullSynchro.applyToChip(packet);
      if(result?.applied===true)return Object.freeze({...result,kind:'FULL_SYNCHRO'});
      if(result?.reason==='DARK_CHIP')return Object.freeze({...result,kind:null});
    }
    if(anger?.applyToChip){
      const result=anger.applyToChip(packet);
      if(result?.applied===true)return Object.freeze({...result,kind:'ANGRY'});
      if(result?.reason==='DARK_CHIP')return Object.freeze({...result,kind:null});
    }
    return noBoost(power);
  }

  function wrapAttack(attack){
    if(!attack||typeof attack!=='object')return attack;
    if(wrapped.has(attack))return wrapped.get(attack);

    let actionToken=attack.actionToken??attack.kokoroActionToken??attack.shotToken;
    let kokoro=attack.kokoro||null;
    let damage=attack.damage;
    let fullSynchroApplied=false;
    let fullSynchroBasePower=null;
    let angerApplied=false;
    let angerBasePower=null;

    const sourceType=String(attack.sourceType||'');
    const emotionEligible=sourceType==='CHIP'||sourceType==='PROGRAM_ADVANCE'||sourceType==='PA';
    if(emotionEligible){
      const runtime=runtimeByChipId.get(attack.sourceId);
      const burstCount=Math.max(1,Math.floor(Number(runtime?.burstCount)||1));
      if(sourceType==='CHIP'&&runtime?.type==='vulcan'&&burstCount>1){
        if(!burstGroup||burstGroup.sourceId!==attack.sourceId||burstGroup.remaining<=0){
          const boost=applyEmotionPower(attack.damage,attack.sourceId);
          burstGroup={
            sourceId:attack.sourceId,
            token:`kokoro-chip-action-${++sequence}`,
            remaining:burstCount,
            fullSynchroApplied:boost.kind==='FULL_SYNCHRO',
            angerApplied:boost.kind==='ANGRY',
            multiplier:boost.applied===true?2:1,
            basePower:boost.beforePower
          };
        }
        actionToken=burstGroup.token;
        fullSynchroApplied=burstGroup.fullSynchroApplied;
        angerApplied=burstGroup.angerApplied;
        if(fullSynchroApplied)fullSynchroBasePower=burstGroup.basePower;
        if(angerApplied)angerBasePower=burstGroup.basePower;
        const numericDamage=Number(attack.damage);
        if(Number.isFinite(numericDamage)&&numericDamage>0&&burstGroup.multiplier!==1)damage=numericDamage*burstGroup.multiplier;
        burstGroup.remaining--;
        if(!kokoro?.profile)kokoro=Object.freeze({...kokoro,profile:'MULTI'});
        if(burstGroup.remaining<=0)burstGroup=null;
      }else{
        const boost=applyEmotionPower(attack.damage,attack.sourceId);
        if(boost.applied===true){
          damage=boost.afterPower;
          if(boost.kind==='FULL_SYNCHRO'){fullSynchroApplied=true;fullSynchroBasePower=boost.beforePower}
          if(boost.kind==='ANGRY'){angerApplied=true;angerBasePower=boost.beforePower}
        }
      }
    }

    const result=Object.freeze({...attack,damage,actionToken,kokoro,fullSynchroApplied,fullSynchroBasePower,angerApplied,angerBasePower});
    wrapped.set(attack,result);
    return result;
  }

  window.BattleNetworkCombatRange=Object.freeze({
    ...original,
    getLastAttackContext:()=>wrapAttack(original.getLastAttackContext?.()||null)
  });
})();
