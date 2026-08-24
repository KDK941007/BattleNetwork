(()=>{
  const field=window.BattleNetworkField;
  if(!field)throw new Error('BattleNetworkRangeGeometry: logical field grid is not loaded.');

  const EPSILON=1e-9;

  function normalizeDirection(direction){
    const x=Number(direction?.x);
    const y=Number(direction?.y);
    const safeX=Number.isFinite(x)?x:1;
    const safeY=Number.isFinite(y)?y:0;
    const length=Math.hypot(safeX,safeY);
    if(length<EPSILON)return {x:1,y:0};
    return {x:safeX/length,y:safeY/length};
  }

  function createForwardRect(rangeTypeId,origin,direction,lengthTiles,widthTiles){
    const dir=normalizeDirection(direction);
    const normal={x:-dir.y,y:dir.x};
    const lengthWorld=field.toWorldDistance(lengthTiles);
    const widthWorld=field.toWorldDistance(widthTiles);
    const halfWidth=widthWorld/2;
    const startLeft={x:origin.x+normal.x*halfWidth,y:origin.y+normal.y*halfWidth};
    const startRight={x:origin.x-normal.x*halfWidth,y:origin.y-normal.y*halfWidth};
    const endX=origin.x+dir.x*lengthWorld;
    const endY=origin.y+dir.y*lengthWorld;
    const endLeft={x:endX+normal.x*halfWidth,y:endY+normal.y*halfWidth};
    const endRight={x:endX-normal.x*halfWidth,y:endY-normal.y*halfWidth};

    return {
      rangeTypeId,
      origin:{x:origin.x,y:origin.y},
      direction:dir,
      normal,
      lengthTiles,
      widthTiles,
      lengthWorld,
      widthWorld,
      points:[startLeft,endLeft,endRight,startRight]
    };
  }

  function createCircle(center,radiusTiles,segments=48){
    const radiusWorld=field.toWorldDistance(radiusTiles);
    const count=Math.max(12,Math.trunc(segments)||48);
    const points=[];
    for(let index=0;index<count;index++){
      const angle=Math.PI*2*index/count;
      points.push({
        x:center.x+Math.cos(angle)*radiusWorld,
        y:center.y+Math.sin(angle)*radiusWorld
      });
    }
    return {
      rangeTypeId:'CIRCLE',
      center:{x:center.x,y:center.y},
      radiusTiles,
      radiusWorld,
      points
    };
  }

  function createFromChip(chip,{origin,direction,center}={}){
    if(!chip)return null;
    const rangeTypeId=chip.rangeTypeId;
    if(rangeTypeId==='LINE'||rangeTypeId==='RECT'){
      if(!origin||chip.rangeTiles==null||chip.widthTiles==null)return null;
      return createForwardRect(rangeTypeId,origin,direction,chip.rangeTiles,chip.widthTiles);
    }
    if(rangeTypeId==='CIRCLE'){
      const rangeCenter=center||origin;
      if(!rangeCenter||chip.radiusTiles==null)return null;
      return createCircle(rangeCenter,chip.radiusTiles);
    }
    if(rangeTypeId==='SELF'){
      return {rangeTypeId:'SELF',origin:origin?{x:origin.x,y:origin.y}:null,points:[]};
    }
    return null;
  }

  function containsPoint(shape,x,y){
    if(!shape||!Number.isFinite(x)||!Number.isFinite(y))return false;
    if(shape.rangeTypeId==='LINE'||shape.rangeTypeId==='RECT'){
      const relX=x-shape.origin.x;
      const relY=y-shape.origin.y;
      const forward=relX*shape.direction.x+relY*shape.direction.y;
      const lateral=relX*shape.normal.x+relY*shape.normal.y;
      return forward>=-EPSILON&&forward<=shape.lengthWorld+EPSILON&&Math.abs(lateral)<=shape.widthWorld/2+EPSILON;
    }
    if(shape.rangeTypeId==='CIRCLE'){
      return Math.hypot(x-shape.center.x,y-shape.center.y)<=shape.radiusWorld+EPSILON;
    }
    return false;
  }

  function getTilesByCenter(shape){
    if(!shape)return [];
    const result=[];
    field.forEachTile(tile=>{
      const center=field.tileToWorldCenter(tile.row,tile.col);
      if(center&&containsPoint(shape,center.x,center.y))result.push(tile);
    });
    return result;
  }

  window.BattleNetworkRangeGeometry=Object.freeze({
    normalizeDirection,
    createForwardRect,
    createCircle,
    createFromChip,
    containsPoint,
    getTilesByCenter
  });
})();