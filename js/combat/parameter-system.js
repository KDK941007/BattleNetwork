(()=>{
  const BASE=Object.freeze({
    player:Object.freeze({
      moveSpeed:300,
      dashDistance:180,
      dashDuration:0.13,
      dashCooldown:0.65,
      dashConsecutiveCount:1
    }),
    enemy:Object.freeze({
      moveSpeed:95,
      attackCooldownMs:3000,
      attackRecoveryMs:250,
      attackTelegraphMs:850,
      fullSyncWindowMs:180,
      approachStopTiles:1
    })
  });
  const modifiers=Object.freeze({player:new Map(),enemy:new Map()});
  function scopeMap(scope){const map=modifiers[scope];if(!map)throw new Error(`BattleNetworkParameters: unknown scope ${scope}`);return map}
  function baseOf(scope){const base=BASE[scope];if(!base)throw new Error(`BattleNetworkParameters: unknown scope ${scope}`);return base}
  function normalize(scope,values){const base=baseOf(scope),result={};if(!values||typeof values!=='object')return result;for(const key of Object.keys(base)){if(!Object.prototype.hasOwnProperty.call(values,key))continue;const value=Number(values[key]);if(Number.isFinite(value))result[key]=value}return result}
  function getBase(scope){return Object.freeze({...baseOf(scope)})}
  function resolve(scope,extraAdditive=null){const base=baseOf(scope),result={...base};for(const values of scopeMap(scope).values())for(const [key,value] of Object.entries(values))result[key]+=value;const extra=normalize(scope,extraAdditive);for(const [key,value] of Object.entries(extra))result[key]+=value;return Object.freeze(result)}
  function setAdditive(scope,sourceId,values){const id=String(sourceId||'').trim();if(!id)throw new Error('BattleNetworkParameters: sourceId is required.');scopeMap(scope).set(id,Object.freeze(normalize(scope,values)));return resolve(scope)}
  function removeAdditive(scope,sourceId){scopeMap(scope).delete(String(sourceId||''));return resolve(scope)}
  function clearAdditives(scope){scopeMap(scope).clear();return resolve(scope)}
  function getAdditives(scope){const out={};for(const [sourceId,values] of scopeMap(scope))out[sourceId]={...values};return Object.freeze(out)}
  setAdditive('player','TEST_DASH_STOCK',{dashConsecutiveCount:1});
  window.BattleNetworkParameters=Object.freeze({BASE,getBase,resolve,getEffective:resolve,setAdditive,removeAdditive,clearAdditives,getAdditives});
})();
