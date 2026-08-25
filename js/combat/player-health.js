(()=>{
  const INITIAL_MAX_HP=100;
  let state={maxHp:INITIAL_MAX_HP,hp:INITIAL_MAX_HP};
  const listeners=new Set();

  function snapshot(){
    const configured=Number.isFinite(state.maxHp)&&state.maxHp>0&&Number.isFinite(state.hp);
    return Object.freeze({
      maxHp:configured?state.maxHp:null,
      hp:configured?state.hp:null,
      isConfigured:configured,
      isDefeated:configured&&state.hp<=0
    });
  }

  function emit(){
    const current=snapshot();
    listeners.forEach(listener=>{
      try{listener(current)}catch(error){console.error('BattleNetworkPlayerHealth listener failed.',error)}
    });
    return current;
  }

  function subscribe(listener){
    if(typeof listener!=='function')return()=>{};
    listeners.add(listener);
    listener(snapshot());
    return()=>listeners.delete(listener);
  }

  function configureHealth(health={}){
    const maxHp=Number(health.maxHp);
    if(!Number.isFinite(maxHp)||maxHp<=0){
      return Object.freeze({ok:false,reason:'INVALID_MAX_HP',...snapshot()});
    }

    const rawHp=health.hp===undefined?maxHp:Number(health.hp);
    if(!Number.isFinite(rawHp)){
      return Object.freeze({ok:false,reason:'INVALID_HP',...snapshot()});
    }

    state={maxHp,hp:Math.max(0,Math.min(maxHp,rawHp))};
    const current=emit();
    return Object.freeze({ok:true,reason:null,...current});
  }

  function clearHealth(){
    state={maxHp:null,hp:null};
    return emit();
  }

  function applyDamage(amount){
    const damage=Number(amount);
    const before=snapshot();

    if(!before.isConfigured){
      return Object.freeze({ok:false,reason:'HP_NOT_CONFIGURED',requestedDamage:damage,appliedDamage:0,beforeHp:null,afterHp:null,defeatedNow:false,...before});
    }
    if(!Number.isFinite(damage)||damage<=0){
      return Object.freeze({ok:false,reason:'INVALID_DAMAGE',requestedDamage:damage,appliedDamage:0,beforeHp:before.hp,afterHp:before.hp,defeatedNow:false,...before});
    }
    if(before.isDefeated){
      return Object.freeze({ok:false,reason:'ALREADY_DEFEATED',requestedDamage:damage,appliedDamage:0,beforeHp:before.hp,afterHp:before.hp,defeatedNow:false,...before});
    }

    const afterHp=Math.max(0,before.hp-damage);
    const appliedDamage=before.hp-afterHp;
    state.hp=afterHp;
    const after=emit();
    return Object.freeze({
      ok:true,
      reason:null,
      requestedDamage:damage,
      appliedDamage,
      beforeHp:before.hp,
      afterHp,
      defeatedNow:before.hp>0&&afterHp===0,
      ...after
    });
  }

  function applyHealing(amount){
    const healing=Number(amount);
    const before=snapshot();

    if(!before.isConfigured){
      return Object.freeze({ok:false,reason:'HP_NOT_CONFIGURED',requestedHealing:healing,appliedHealing:0,beforeHp:null,afterHp:null,...before});
    }
    if(!Number.isFinite(healing)||healing<=0){
      return Object.freeze({ok:false,reason:'INVALID_HEALING',requestedHealing:healing,appliedHealing:0,beforeHp:before.hp,afterHp:before.hp,...before});
    }
    if(before.isDefeated){
      return Object.freeze({ok:false,reason:'ALREADY_DEFEATED',requestedHealing:healing,appliedHealing:0,beforeHp:before.hp,afterHp:before.hp,...before});
    }

    const afterHp=Math.min(before.maxHp,before.hp+healing);
    const appliedHealing=afterHp-before.hp;
    if(appliedHealing<=0){
      return Object.freeze({ok:true,reason:'FULL_HP',requestedHealing:healing,appliedHealing:0,beforeHp:before.hp,afterHp:before.hp,...before});
    }

    state.hp=afterHp;
    const after=emit();
    return Object.freeze({
      ok:true,
      reason:null,
      requestedHealing:healing,
      appliedHealing,
      beforeHp:before.hp,
      afterHp,
      ...after
    });
  }

  window.BattleNetworkPlayerHealth=Object.freeze({
    INITIAL_MAX_HP,
    getSnapshot:snapshot,
    subscribe,
    configureHealth,
    clearHealth,
    applyDamage,
    applyHealing
  });
})();
