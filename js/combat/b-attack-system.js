(()=>{
  const DEFAULT_PROFILE=Object.freeze({
    profileId:'ROCK_BUSTER',
    displayName:'ロックバスター',
    tapAction:Object.freeze({
      actionId:'ROCK_BUSTER_NORMAL',
      actionType:'PROJECTILE',
      projectileKind:'normal',
      damage:1,
      rangeWorld:750,
      speed:1050,
      fireInterval:.67
    }),
    holdAction:Object.freeze({
      actionId:'ROCK_BUSTER_CHARGED',
      actionType:'PROJECTILE',
      projectileKind:'charged',
      damageMultiplier:10,
      rangeWorld:750,
      speed:820,
      chargeTime:.85
    })
  });

  function finitePositive(value,fallback){
    const n=Number(value);
    return Number.isFinite(n)&&n>0?n:fallback;
  }

  function normalizeAction(action,mode,tapDamage){
    if(!action||typeof action!=='object')return null;
    const actionId=String(action.actionId||'').trim();
    const actionType=String(action.actionType||'').trim();
    if(!actionId||!actionType)throw new Error(`BattleNetworkBAttack: ${mode} action requires actionId/actionType.`);

    let damage=Number(action.damage);
    if(!Number.isFinite(damage)&&mode==='hold'){
      const multiplier=Number(action.damageMultiplier);
      if(Number.isFinite(multiplier)&&Number.isFinite(tapDamage))damage=tapDamage*multiplier;
    }

    return Object.freeze({
      ...action,
      actionId,
      actionType,
      damage:Number.isFinite(damage)?damage:null,
      rangeWorld:finitePositive(action.rangeWorld,null),
      speed:finitePositive(action.speed,null),
      fireInterval:finitePositive(action.fireInterval,0),
      chargeTime:finitePositive(action.chargeTime,0)
    });
  }

  function normalizeProfile(profile){
    if(!profile||typeof profile!=='object')throw new Error('BattleNetworkBAttack: profile is required.');
    const profileId=String(profile.profileId||'').trim();
    if(!profileId)throw new Error('BattleNetworkBAttack: profileId is required.');

    const tap=normalizeAction(profile.tapAction,'tap',null);
    const hold=normalizeAction(profile.holdAction,'hold',tap?.damage??null);
    if(!tap&&!hold)throw new Error('BattleNetworkBAttack: tapAction or holdAction is required.');

    return Object.freeze({
      ...profile,
      profileId,
      displayName:String(profile.displayName||profileId),
      tapAction:tap,
      holdAction:hold
    });
  }

  const normalizedDefault=normalizeProfile(DEFAULT_PROFILE);
  let activeProfile=normalizedDefault;

  function getActiveProfile(){return activeProfile}
  function getAction(mode){
    if(mode==='tap')return activeProfile.tapAction;
    if(mode==='hold')return activeProfile.holdAction;
    return null;
  }
  function setActiveProfile(profile){
    activeProfile=normalizeProfile(profile);
    return activeProfile;
  }
  function resetToDefault(){activeProfile=normalizedDefault;return activeProfile}
  function getDefaultProfile(){return normalizedDefault}

  window.BattleNetworkBAttack=Object.freeze({
    getActiveProfile,
    getAction,
    setActiveProfile,
    resetToDefault,
    getDefaultProfile
  });
})();
