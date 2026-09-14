(()=>{
  // Temporary Evil-state test setup. Remove this file and its script tag after verification.
  const MASTER=window.BattleNetworkMaster;
  if(!MASTER?.createGameCompatibilityData||MASTER.__evilStateTestCompatInstalled)return;

  const nativeCreateGameCompatibilityData=MASTER.createGameCompatibilityData.bind(MASTER);
  MASTER.createGameCompatibilityData=()=>{
    const compat=nativeCreateGameCompatibilityData();
    const dark=compat?.CHIP?.TEST_DARK;
    const bomb=compat?.CHIP?.BOMB;
    if(dark&&bomb){
      // Keep the existing MiniBomb art only for the temporary test card display.
      // Battle metadata/chipId remain TEST_9003 so Evil-state detection uses the DARK type.
      compat.CHIP.BOMB=Object.freeze({...dark,image:bomb.image});
    }
    return compat;
  };

  MASTER.__evilStateTestCompatInstalled=true;
  window.BattleNetworkEvilTestSetup=Object.freeze({
    enabled:true,
    replacedLegacyType:'BOMB',
    darkChipId:'TEST_9003'
  });
})();
