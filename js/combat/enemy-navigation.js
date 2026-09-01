(()=>{
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  if(!FIELD||!ENEMY)return;

  const POLICY=Object.freeze({
    PATHFIND_ON_BLOCK:'PATHFIND_ON_BLOCK',
    DIRECT:'DIRECT'
  });
  const DEFAULT_POLICY=POLICY.PATHFIND_ON_BLOCK;
  const EPS=.001;
  const NEIGHBORS=Object.freeze([
    Object.freeze({dr:-1,dc:0,cost:1}),Object.freeze({dr:1,dc:0,cost:1}),
    Object.freeze({dr:0,dc:-1,cost:1}),Object.freeze({dr:0,dc:1,cost:1}),
    Object.freeze({dr:-1,dc:-1,cost:Math.SQRT2}),Object.freeze({dr:-1,dc:1,cost:Math.SQRT2}),
    Object.freeze({dr:1,dc:-1,cost:Math.SQRT2}),Object.freeze({dr:1,dc:1,cost:Math.SQRT2})
  ]);

  function boundsAt(enemy,x,y){
    const hitBox=enemy?.hitBox;
    if(!hitBox)return null;
    const centerX=x+Number(hitBox.offsetX||0),centerY=y+Number(hitBox.offsetY||0);
    const halfW=Number(hitBox.width||0)/2,halfH=Number(hitBox.height||0)/2;
    return {left:centerX-halfW,right:centerX+halfW,top:centerY-halfH,bottom:centerY+halfH};
  }
  function overlaps(a,b){return !!a&&!!b&&a.left<b.right-EPS&&a.right>b.left+EPS&&a.top<b.bottom-EPS&&a.bottom>b.top+EPS}
  function boundsTouchHole(bounds){
    if(!bounds)return true;
    if(bounds.left<0||bounds.top<0||bounds.right>FIELD.WORLD_SIZE||bounds.bottom>FIELD.WORLD_SIZE)return true;
    const minCol=Math.max(0,Math.floor(bounds.left/FIELD.TILE_SIZE));
    const maxCol=Math.min(FIELD.GRID_COLS-1,Math.floor((bounds.right-EPS)/FIELD.TILE_SIZE));
    const minRow=Math.max(0,Math.floor(bounds.top/FIELD.TILE_SIZE));
    const maxRow=Math.min(FIELD.GRID_ROWS-1,Math.floor((bounds.bottom-EPS)/FIELD.TILE_SIZE));
    for(let row=minRow;row<=maxRow;row++)for(let col=minCol;col<=maxCol;col++)if(FIELD.getTile(row,col)?.currentTerrain===FIELD.TERRAIN.HOLE)return true;
    return false;
  }
  function boundsTouchEnemy(enemyId,bounds){
    return ENEMY.getActiveEnemies().some(other=>other.id!==enemyId&&!other.collision?.allowEnemyOverlap&&overlaps(bounds,other.bounds));
  }
  function canStandAt(enemyId,x,y,{ignoreEnemies=false}={}){
    const enemy=ENEMY.getEnemy(enemyId);
    if(!enemy)return false;
    const bounds=boundsAt(enemy,x,y);
    if(boundsTouchHole(bounds))return false;
    if(!ignoreEnemies&&boundsTouchEnemy(enemyId,bounds))return false;
    return true;
  }
  function nodeKey(row,col){return `${row}:${col}`}
  function heuristic(a,b){return Math.hypot(a.row-b.row,a.col-b.col)}
  function reconstruct(came,current){
    const path=[];
    while(current){path.push(current);current=came.get(nodeKey(current.row,current.col))||null}
    path.reverse();
    return path;
  }
  function nearestReachableTarget(enemyId,targetTile,startTile){
    if(canStandAt(enemyId,...Object.values(FIELD.tileToWorldCenter(targetTile.row,targetTile.col))))return targetTile;
    let best=null,bestScore=Infinity;
    for(let radius=1;radius<=3;radius++){
      for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){
        if(Math.max(Math.abs(dr),Math.abs(dc))!==radius)continue;
        const row=targetTile.row+dr,col=targetTile.col+dc,tile=FIELD.getTile(row,col);if(!tile)continue;
        const p=FIELD.tileToWorldCenter(row,col);if(!canStandAt(enemyId,p.x,p.y))continue;
        const score=Math.hypot(row-targetTile.row,col-targetTile.col)+heuristic({row,col},startTile)*.001;
        if(score<bestScore){bestScore=score;best=tile}
      }
      if(best)return best;
    }
    return null;
  }
  function findPath(enemyId,targetPosition,{ignoreEnemies=false}={}){
    const enemy=ENEMY.getEnemy(enemyId);if(!enemy||!targetPosition)return Object.freeze([]);
    const start=FIELD.getTileAtWorld(enemy.x,enemy.y),requested=FIELD.getTileAtWorld(targetPosition.x,targetPosition.y);if(!start||!requested)return Object.freeze([]);
    const target=nearestReachableTarget(enemyId,requested,start);if(!target)return Object.freeze([]);
    const startNode={row:start.row,col:start.col},targetNode={row:target.row,col:target.col};
    const open=[startNode],openKeys=new Set([nodeKey(startNode.row,startNode.col)]),came=new Map(),g=new Map([[nodeKey(startNode.row,startNode.col),0]]),f=new Map([[nodeKey(startNode.row,startNode.col),heuristic(startNode,targetNode)]]);
    while(open.length){
      let bestIndex=0;for(let i=1;i<open.length;i++)if((f.get(nodeKey(open[i].row,open[i].col))??Infinity)<(f.get(nodeKey(open[bestIndex].row,open[bestIndex].col))??Infinity))bestIndex=i;
      const current=open.splice(bestIndex,1)[0],ck=nodeKey(current.row,current.col);openKeys.delete(ck);
      if(current.row===targetNode.row&&current.col===targetNode.col){
        const nodes=reconstruct(came,current).slice(1);
        return Object.freeze(nodes.map(node=>Object.freeze({...node,...FIELD.tileToWorldCenter(node.row,node.col)})));
      }
      for(const n of NEIGHBORS){
        const row=current.row+n.dr,col=current.col+n.dc,tile=FIELD.getTile(row,col);if(!tile)continue;
        const p=FIELD.tileToWorldCenter(row,col);if(!canStandAt(enemyId,p.x,p.y,{ignoreEnemies}))continue;
        if(n.dr&&n.dc){
          const a=FIELD.tileToWorldCenter(current.row+n.dr,current.col),b=FIELD.tileToWorldCenter(current.row,current.col+n.dc);
          if(!canStandAt(enemyId,a.x,a.y,{ignoreEnemies})||!canStandAt(enemyId,b.x,b.y,{ignoreEnemies}))continue;
        }
        const nk=nodeKey(row,col),tentative=(g.get(ck)??Infinity)+n.cost;
        if(tentative>=(g.get(nk)??Infinity))continue;
        came.set(nk,current);g.set(nk,tentative);f.set(nk,tentative+heuristic({row,col},targetNode));
        if(!openKeys.has(nk)){open.push({row,col});openKeys.add(nk)}
      }
    }
    return Object.freeze([]);
  }

  window.BattleNetworkEnemyNavigation=Object.freeze({POLICY,DEFAULT_POLICY,canStandAt,findPath});
})();
