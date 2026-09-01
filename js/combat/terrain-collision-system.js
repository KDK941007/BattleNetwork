(()=>{
  const FIELD=window.BattleNetworkField;
  const BASE=window.BattleNetworkEnemy;
  if(!FIELD||!BASE)return;

  const EPS=.001;

  function getBoundsAt(enemy,x,y){
    const hitBox=enemy?.hitBox;
    if(!hitBox)return null;
    const centerX=Number(x)+Number(hitBox.offsetX||0);
    const centerY=Number(y)+Number(hitBox.offsetY||0);
    const halfW=Number(hitBox.width||0)/2;
    const halfH=Number(hitBox.height||0)/2;
    return {left:centerX-halfW,right:centerX+halfW,top:centerY-halfH,bottom:centerY+halfH};
  }

  function overlapArea(a,b){
    const width=Math.min(a.right,b.right)-Math.max(a.left,b.left);
    const height=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    return width>0&&height>0?width*height:0;
  }

  function getHoleOverlapArea(bounds){
    if(!bounds)return 0;
    const minCol=Math.max(0,Math.floor(bounds.left/FIELD.TILE_SIZE));
    const maxCol=Math.min(FIELD.GRID_COLS-1,Math.floor((bounds.right-EPS)/FIELD.TILE_SIZE));
    const minRow=Math.max(0,Math.floor(bounds.top/FIELD.TILE_SIZE));
    const maxRow=Math.min(FIELD.GRID_ROWS-1,Math.floor((bounds.bottom-EPS)/FIELD.TILE_SIZE));
    let total=0;
    for(let row=minRow;row<=maxRow;row++){
      for(let col=minCol;col<=maxCol;col++){
        const tile=FIELD.getTile(row,col);
        if(tile?.currentTerrain!==FIELD.TERRAIN.HOLE)continue;
        const tileBounds=FIELD.tileToWorldBounds(row,col);
        total+=overlapArea(bounds,tileBounds);
      }
    }
    return total;
  }

  function setPosition(id,x,y){
    const enemy=BASE.getEnemy(id);
    if(!enemy)return BASE.setPosition(id,x,y);
    const nextX=Number(x),nextY=Number(y);
    if(!Number.isFinite(nextX)||!Number.isFinite(nextY))return BASE.setPosition(id,x,y);
    const clampedX=Math.max(0,Math.min(FIELD.WORLD_SIZE,nextX));
    const clampedY=Math.max(0,Math.min(FIELD.WORLD_SIZE,nextY));
    const currentOverlap=getHoleOverlapArea(getBoundsAt(enemy,enemy.x,enemy.y));
    const nextOverlap=getHoleOverlapArea(getBoundsAt(enemy,clampedX,clampedY));
    const enteringHole=currentOverlap<=EPS?nextOverlap>EPS:nextOverlap>=currentOverlap-EPS;
    if(enteringHole&&nextOverlap>EPS){
      return Object.freeze({applied:false,reason:'TERRAIN_BLOCKED',enemy});
    }
    return BASE.setPosition(id,clampedX,clampedY);
  }

  window.BattleNetworkEnemy=Object.freeze({...BASE,setPosition});
})();
