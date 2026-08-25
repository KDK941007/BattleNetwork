(()=>{
  let state={maxHp:null,hp:null};

  function snapshot(){
    const configured=Number.isFinite(state.maxHp)&&state.maxHp>0&&Number.isFinite(state.hp);
    return Object.freeze({
      maxHp:configured?state.maxHp:null,
      hp:configured?state.hp:null,
      isConfigured:configured,
      isDefeated:configured&&state.hp<=0
    });
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
    return Object.freeze({ok:true,reason:null,...snapshot()});
  }

  function clearHealth(){
    state={maxHp:null,hp:null};
    return snapshot();
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
    const after=snapshot();
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

  window.BattleNetworkPlayerHealth=Object.freeze({
    getSnapshot:snapshot,
    configureHealth,
    clearHealth,
    applyDamage
  });
})();
