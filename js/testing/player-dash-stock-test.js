(()=>{
  const PARAMS=window.BattleNetworkParameters;
  if(!PARAMS)throw new Error('BattleNetworkDashStockTest: parameter system is not loaded.');
  PARAMS.setAdditive('player','TEST_DASH_STOCK',{dashConsecutiveCount:1});
})();
