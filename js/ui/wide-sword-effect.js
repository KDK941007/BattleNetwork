(()=>{
  const unified=window.BattleNetworkSwordEffectDirect;
  if(unified?.handlesWide===true){
    window.BattleNetworkWideSwordEffect=Object.freeze({
      version:'WIDE_UNIFIED_V3_APPROVED_HEAVY_BOLD_PROJECTED',
      renderer:'BattleNetworkSwordEffectDirect',
      projection:unified.projection
    });
    return;
  }
  console.warn('BattleNetworkWideSwordEffect: unified sword renderer is not available.');
})();
