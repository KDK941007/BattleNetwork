(()=>{
  const RANGE=window.BattleNetworkRangeGeometry;
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  if(!RANGE)throw new Error('BattleNetworkRelativeCellRange: range geometry is not loaded.');
  if(!FIELD)throw new Error('BattleNetworkRelativeCellRange: field grid is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkRelativeCellRange: enemy foundation is not loaded.');

  function createCellShape(center,direction,sizeTiles=1){
    const dir=RANGE.normalizeDirection(direction);
    const normal={x:-dir.y,y:dir.x};
    const sizeWorld=FIELD.toWorldDistance(sizeTiles);
    const half=sizeWorld/2;
    const points=[
      {x:center.x-dir.x*half+normal.x*half,y:center.y-dir.y*half+normal.y*half},
      {x:center.x+dir.x*half+normal.x*half,y:center.y+dir.y*half+normal.y*half},
      {x:center.x+dir.x*half-normal.x*half,y:center.y+dir.y*half-normal.y*half},
      {x:center.x-dir.x*half-normal.x*half,y:center.y-dir.y*half-normal.y*half}
    ];
    return Object.freeze({
      rangeTypeId:'RECT',
      origin:{x:center.x-dir.x*half,y:center.y-dir.y*half},
      center:{x:center.x,y:center.y},
      direction:dir,
      normal,
      lengthTiles:sizeTiles,
      widthTiles:sizeTiles,
      lengthWorld:sizeWorld,
      widthWorld:sizeWorld,
      points:Object.freeze(points)
    });
  }

  function createRelativeCells({center,direction,offsets,cellSizeTiles=1}={}){
    if(!center||!Array.isArray(offsets))return Object.freeze([]);
    const dir=RANGE.normalizeDirection(direction);
    const normal={x:-dir.y,y:dir.x};
    const step=FIELD.toWorldDistance(cellSizeTiles);
    const shapes=[];
    for(const offset of offsets){
      const forward=Number(offset?.forward),lateral=Number(offset?.lateral);
      if(!Number.isFinite(forward)||!Number.isFinite(lateral))continue;
      const cellCenter={
        x:center.x+dir.x*forward*step+normal.x*lateral*step,
        y:center.y+dir.y*forward*step+normal.y*lateral*step
      };
      shapes.push(createCellShape(cellCenter,dir,cellSizeTiles));
    }
    return Object.freeze(shapes);
  }

  function getHitEnemies(shapes,{excludeIds=[]}={}){
    if(!Array.isArray(shapes)||!shapes.length)return Object.freeze([]);
    const excluded=new Set(excludeIds);
    const hits=[];
    for(const enemy of ENEMY.getEnemies()){
      if(enemy.isDefeated||excluded.has(enemy.id))continue;
      if(shapes.some(shape=>RANGE.intersectsBounds(shape,enemy.bounds)))hits.push(enemy);
    }
    return Object.freeze(hits);
  }

  window.BattleNetworkRelativeCellRange=Object.freeze({createCellShape,createRelativeCells,getHitEnemies});
})();
