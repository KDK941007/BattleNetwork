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
  const STEP=FIELD.TILE_SIZE*.5;
  const NAV_COLS=Math.ceil(FIELD.WORLD_SIZE/STEP);
  const NAV_ROWS=Math.ceil(FIELD.WORLD_SIZE/STEP);
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
  function canStandAt(enemyId,x,y,{ignoreEnemies=false,blockedBounds=null}={}){
    const enemy=ENEMY.getEnemy(enemyId);
    if(!enemy||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const bounds=boundsAt(enemy,x,y);
    if(boundsTouchHole(bounds))return false;
    if(blockedBounds&&overlaps(bounds,blockedBounds))return false;
    if(!ignoreEnemies&&boundsTouchEnemy(enemyId,bounds))return false;
    return true;
  }
  function gridPoint(row,col){return{x:(col+.5)*STEP,y:(row+.5)*STEP}}
  function nodeKey(row,col){return `${row}:${col}`}
  function heuristic(a,b){return Math.hypot(a.row-b.row,a.col-b.col)}
  function inside(row,col){return row>=0&&row<NAV_ROWS&&col>=0&&col<NAV_COLS}
  function nodeFromWorld(x,y){return{row:Math.max(0,Math.min(NAV_ROWS-1,Math.floor(y/STEP))),col:Math.max(0,Math.min(NAV_COLS-1,Math.floor(x/STEP)))}}
  function reconstruct(came,current){
    const path=[];
    while(current){path.push(current);current=came.get(nodeKey(current.row,current.col))||null}
    path.reverse();
    return path;
  }
  function findNearestStandableNode(enemyId,position,{ignoreEnemies=false,blockedBounds=null,maxRadius=8}={}){
    const base=nodeFromWorld(position.x,position.y);
    let best=null,bestDistance=Infinity;
    for(let radius=0;radius<=maxRadius;radius++){
      for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){
        if(radius>0&&Math.max(Math.abs(dr),Math.abs(dc))!==radius)continue;
        const row=base.row+dr,col=base.col+dc;if(!inside(row,col))continue;
        const p=gridPoint(row,col);if(!canStandAt(enemyId,p.x,p.y,{ignoreEnemies,blockedBounds}))continue;
        const distance=Math.hypot(p.x-position.x,p.y-position.y);
        if(distance<bestDistance){bestDistance=distance;best={row,col}}
      }
      if(best)return best;
    }
    return null;
  }
  function canTraverse(enemyId,from,to,{ignoreEnemies=false,blockedBounds=null}={}){
    if(!from||!to)return false;
    const dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy);
    if(distance<=EPS)return canStandAt(enemyId,to.x,to.y,{ignoreEnemies,blockedBounds});
    const samples=Math.max(1,Math.ceil(distance/(STEP*.35)));
    for(let i=1;i<=samples;i++){
      const t=i/samples,x=from.x+dx*t,y=from.y+dy*t;
      if(!canStandAt(enemyId,x,y,{ignoreEnemies,blockedBounds}))return false;
    }
    return true;
  }
  function smoothPath(enemyId,startPosition,points,options){
    if(points.length<=1)return points;
    const result=[];let anchor=startPosition,index=0;
    while(index<points.length){
      let chosen=index;
      for(let i=points.length-1;i>=index;i--){if(canTraverse(enemyId,anchor,points[i],options)){chosen=i;break}}
      const point=points[chosen];result.push(point);anchor=point;index=chosen+1;
    }
    return result;
  }
  function findPath(enemyId,targetPosition,{ignoreEnemies=false,blockedBounds=null}={}){
    const enemy=ENEMY.getEnemy(enemyId);if(!enemy||!targetPosition)return Object.freeze([]);
    const startPosition={x:enemy.x,y:enemy.y};
    const start=findNearestStandableNode(enemyId,startPosition,{ignoreEnemies,maxRadius:8});
    const target=findNearestStandableNode(enemyId,targetPosition,{ignoreEnemies,blockedBounds,maxRadius:20});
    if(!start||!target)return Object.freeze([]);
    const open=[start],openKeys=new Set([nodeKey(start.row,start.col)]),closed=new Set(),came=new Map();
    const g=new Map([[nodeKey(start.row,start.col),0]]),f=new Map([[nodeKey(start.row,start.col),heuristic(start,target)]]);
    while(open.length){
      let bestIndex=0;for(let i=1;i<open.length;i++)if((f.get(nodeKey(open[i].row,open[i].col))??Infinity)<(f.get(nodeKey(open[bestIndex].row,open[bestIndex].col))??Infinity))bestIndex=i;
      const current=open.splice(bestIndex,1)[0],ck=nodeKey(current.row,current.col);openKeys.delete(ck);
      if(closed.has(ck))continue;closed.add(ck);
      if(current.row===target.row&&current.col===target.col){
        const nodes=reconstruct(came,current).slice(1);
        const points=nodes.map(node=>Object.freeze({...node,...gridPoint(node.row,node.col)}));
        const smoothed=smoothPath(enemyId,startPosition,points,{ignoreEnemies,blockedBounds});
        return Object.freeze(smoothed.map(point=>Object.freeze({...point})));
      }
      for(const n of NEIGHBORS){
        const row=current.row+n.dr,col=current.col+n.dc;if(!inside(row,col))continue;
        const nk=nodeKey(row,col);if(closed.has(nk))continue;
        const p=gridPoint(row,col);if(!canStandAt(enemyId,p.x,p.y,{ignoreEnemies,blockedBounds}))continue;
        if(n.dr&&n.dc){
          const a=gridPoint(current.row+n.dr,current.col),b=gridPoint(current.row,current.col+n.dc);
          if(!canStandAt(enemyId,a.x,a.y,{ignoreEnemies,blockedBounds})||!canStandAt(enemyId,b.x,b.y,{ignoreEnemies,blockedBounds}))continue;
        }
        const tentative=(g.get(ck)??Infinity)+n.cost;
        if(tentative>=(g.get(nk)??Infinity))continue;
        came.set(nk,current);g.set(nk,tentative);f.set(nk,tentative+heuristic({row,col},target));
        if(!openKeys.has(nk)){open.push({row,col});openKeys.add(nk)}
      }
    }
    return Object.freeze([]);
  }

  window.BattleNetworkEnemyNavigation=Object.freeze({POLICY,DEFAULT_POLICY,STEP,canStandAt,canTraverse,findPath});
})();
