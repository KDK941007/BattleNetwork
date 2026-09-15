(()=>{
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const COLLISION=window.BattleNetworkCharacterCollision;
  if(!FIELD||!ENEMY)return;

  const POLICY=Object.freeze({PATHFIND_ON_BLOCK:'PATHFIND_ON_BLOCK',DIRECT:'DIRECT'});
  const DEFAULT_POLICY=POLICY.PATHFIND_ON_BLOCK;
  const EPS=.001;
  const STEP=FIELD.TILE_SIZE*.5;
  const NAV_COLS=Math.ceil(FIELD.WORLD_SIZE/STEP);
  const NAV_ROWS=Math.ceil(FIELD.WORLD_SIZE/STEP);
  const FRAME_MS=1000/60;
  const MAX_PATH_SEARCHES_PER_FRAME=2;
  const NEIGHBORS=Object.freeze([
    Object.freeze({dr:-1,dc:0,cost:1}),Object.freeze({dr:1,dc:0,cost:1}),Object.freeze({dr:0,dc:-1,cost:1}),Object.freeze({dr:0,dc:1,cost:1}),
    Object.freeze({dr:-1,dc:-1,cost:Math.SQRT2}),Object.freeze({dr:-1,dc:1,cost:Math.SQRT2}),Object.freeze({dr:1,dc:-1,cost:Math.SQRT2}),Object.freeze({dr:1,dc:1,cost:Math.SQRT2})
  ]);

  let budgetFrame=-1;
  let budgetUsed=0;

  function reservePathSearch(now=performance.now()){
    const frame=Math.floor(now/FRAME_MS);
    if(frame!==budgetFrame){budgetFrame=frame;budgetUsed=0}
    if(budgetUsed>=MAX_PATH_SEARCHES_PER_FRAME)return false;
    budgetUsed+=1;
    return true;
  }

  function bodyShape(enemy){
    if(!enemy)return null;
    if(COLLISION?.getEnemyProfile){
      const part=COLLISION.getEnemyProfile(enemy.id)?.body;
      if(part){
        const offset=FIELD.toWorldDistance(part.offsetScreenYTiles)/Math.SQRT2;
        return Object.freeze({offsetX:offset,offsetY:offset,radius:FIELD.toWorldDistance(part.diameterTiles)/2});
      }
    }
    const hitBox=enemy.hitBox;
    if(!hitBox)return null;
    return Object.freeze({
      offsetX:Number(hitBox.offsetX||0),
      offsetY:Number(hitBox.offsetY||0),
      radius:Math.min(Number(hitBox.width||0),Number(hitBox.height||0))/2
    });
  }

  function circleAt(shape,x,y){
    if(!shape)return null;
    return {x:x+shape.offsetX,y:y+shape.offsetY,radius:shape.radius};
  }

  function circleVsBounds(circle,bounds){
    if(!circle||!bounds)return false;
    const x=Math.max(bounds.left,Math.min(circle.x,bounds.right));
    const y=Math.max(bounds.top,Math.min(circle.y,bounds.bottom));
    return Math.hypot(circle.x-x,circle.y-y)<circle.radius-EPS;
  }

  function circlesOverlap(a,b){
    if(!a||!b)return false;
    return COLLISION?.circlesOverlap?COLLISION.circlesOverlap(a,b):Math.hypot(a.x-b.x,a.y-b.y)<a.radius+b.radius-EPS;
  }

  function buildSearchContext(enemyId,{ignoreEnemies=false,blockedBounds=null}={}){
    const enemy=ENEMY.getEnemy(enemyId);
    if(!enemy)return null;
    const shape=bodyShape(enemy);
    if(!shape)return null;
    let playerBody=null;
    const cx=Number(blockedBounds?.centerX),cy=Number(blockedBounds?.centerY);
    if(COLLISION&&Number.isFinite(cx)&&Number.isFinite(cy))playerBody=COLLISION.getPlayerBody({x:cx,y:cy});
    const blockers=[];
    if(!ignoreEnemies){
      for(const other of ENEMY.getActiveEnemies()){
        if(other.id===enemyId||other.collision?.allowEnemyOverlap)continue;
        const body=circleAt(bodyShape(other),other.x,other.y);
        if(body)blockers.push(body);
      }
    }
    return {
      enemyId,
      enemy,
      shape,
      ignoreEnemies,
      blockedBounds,
      playerBody,
      blockers,
      standableNodes:new Map()
    };
  }

  function canStandWithContext(context,x,y){
    if(!context||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const body=circleAt(context.shape,x,y);
    if(!body)return false;
    if(COLLISION?.circleTouchesHole?COLLISION.circleTouchesHole(body):false)return false;
    if(context.playerBody){if(circlesOverlap(body,context.playerBody))return false}
    else if(circleVsBounds(body,context.blockedBounds))return false;
    if(!context.ignoreEnemies){for(const otherBody of context.blockers)if(circlesOverlap(body,otherBody))return false}
    return true;
  }

  function canStandAt(enemyId,x,y,options={}){
    const context=options.searchContext||buildSearchContext(enemyId,options);
    return !!context&&canStandWithContext(context,x,y);
  }

  function gridPoint(row,col){return{x:(col+.5)*STEP,y:(row+.5)*STEP}}
  function nodeKey(row,col){return `${row}:${col}`}
  function nodeIndex(row,col){return row*NAV_COLS+col}
  function heuristic(a,b){return Math.hypot(a.row-b.row,a.col-b.col)}
  function inside(row,col){return row>=0&&row<NAV_ROWS&&col>=0&&col<NAV_COLS}
  function nodeFromWorld(x,y){return{row:Math.max(0,Math.min(NAV_ROWS-1,Math.floor(y/STEP))),col:Math.max(0,Math.min(NAV_COLS-1,Math.floor(x/STEP)))}}

  function nodeStandable(context,row,col){
    const key=nodeIndex(row,col);
    if(context.standableNodes.has(key))return context.standableNodes.get(key);
    const p=gridPoint(row,col),value=canStandWithContext(context,p.x,p.y);
    context.standableNodes.set(key,value);
    return value;
  }

  function reconstruct(came,current){
    const path=[];
    while(current){path.push(current);current=came.get(nodeKey(current.row,current.col))||null}
    path.reverse();
    return path;
  }

  function findNearestStandableNode(context,position,maxRadius=8){
    const base=nodeFromWorld(position.x,position.y);
    let best=null,bestDistance=Infinity;
    for(let radius=0;radius<=maxRadius;radius++){
      for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){
        if(radius>0&&Math.max(Math.abs(dr),Math.abs(dc))!==radius)continue;
        const row=base.row+dr,col=base.col+dc;
        if(!inside(row,col)||!nodeStandable(context,row,col))continue;
        const p=gridPoint(row,col),distance=Math.hypot(p.x-position.x,p.y-position.y);
        if(distance<bestDistance){bestDistance=distance;best={row,col}}
      }
      if(best)return best;
    }
    return null;
  }

  function canTraverseWithContext(context,from,to){
    if(!context||!from||!to)return false;
    const dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy);
    if(distance<=EPS)return canStandWithContext(context,to.x,to.y);
    const samples=Math.max(1,Math.ceil(distance/(STEP*.35)));
    for(let i=1;i<=samples;i++){
      const t=i/samples;
      if(!canStandWithContext(context,from.x+dx*t,from.y+dy*t))return false;
    }
    return true;
  }

  function canTraverse(enemyId,from,to,options={}){
    const context=options.searchContext||buildSearchContext(enemyId,options);
    return !!context&&canTraverseWithContext(context,from,to);
  }

  function smoothPath(context,startPosition,points){
    if(points.length<=1)return points;
    const result=[];
    let anchor=startPosition,index=0;
    while(index<points.length){
      let chosen=index;
      for(let i=points.length-1;i>=index;i--){if(canTraverseWithContext(context,anchor,points[i])){chosen=i;break}}
      const point=points[chosen];
      result.push(point);anchor=point;index=chosen+1;
    }
    return result;
  }

  class MinHeap{
    constructor(){this.items=[]}
    get size(){return this.items.length}
    push(node,priority){
      const item={node,priority};
      const items=this.items;
      items.push(item);
      let index=items.length-1;
      while(index>0){
        const parent=(index-1)>>1;
        if(items[parent].priority<=priority)break;
        items[index]=items[parent];index=parent;
      }
      items[index]=item;
    }
    pop(){
      const items=this.items;
      if(!items.length)return null;
      const root=items[0],last=items.pop();
      if(items.length&&last){
        let index=0;
        while(true){
          const left=index*2+1,right=left+1;
          if(left>=items.length)break;
          let child=left;
          if(right<items.length&&items[right].priority<items[left].priority)child=right;
          if(items[child].priority>=last.priority)break;
          items[index]=items[child];index=child;
        }
        items[index]=last;
      }
      return root;
    }
  }

  function findPathInternal(enemyId,targetPosition,{ignoreEnemies=false,blockedBounds=null}={}){
    const context=buildSearchContext(enemyId,{ignoreEnemies,blockedBounds});
    if(!context||!targetPosition)return Object.freeze([]);
    const startPosition={x:context.enemy.x,y:context.enemy.y};
    const start=findNearestStandableNode(context,startPosition,8);
    const target=findNearestStandableNode(context,targetPosition,20);
    if(!start||!target)return Object.freeze([]);

    const open=new MinHeap(),closed=new Set(),came=new Map(),g=new Map();
    const startKey=nodeKey(start.row,start.col);
    g.set(startKey,0);
    open.push(start,heuristic(start,target));

    while(open.size){
      const item=open.pop();
      if(!item)break;
      const current=item.node,ck=nodeKey(current.row,current.col);
      if(closed.has(ck))continue;
      closed.add(ck);
      if(current.row===target.row&&current.col===target.col){
        const nodes=reconstruct(came,current).slice(1);
        const points=nodes.map(node=>Object.freeze({...node,...gridPoint(node.row,node.col)}));
        const smoothed=smoothPath(context,startPosition,points);
        return Object.freeze(smoothed.map(point=>Object.freeze({...point})));
      }
      const currentG=g.get(ck)??Infinity;
      for(const n of NEIGHBORS){
        const row=current.row+n.dr,col=current.col+n.dc;
        if(!inside(row,col))continue;
        const nk=nodeKey(row,col);
        if(closed.has(nk)||!nodeStandable(context,row,col))continue;
        if(n.dr&&n.dc){
          if(!nodeStandable(context,current.row+n.dr,current.col)||!nodeStandable(context,current.row,current.col+n.dc))continue;
        }
        const tentative=currentG+n.cost;
        if(tentative>=(g.get(nk)??Infinity))continue;
        came.set(nk,current);
        g.set(nk,tentative);
        open.push({row,col},tentative+heuristic({row,col},target));
      }
    }
    return Object.freeze([]);
  }

  function findPath(enemyId,targetPosition,options={}){return findPathInternal(enemyId,targetPosition,options)}
  function findPathBudgeted(enemyId,targetPosition,options={}){
    if(!reservePathSearch())return null;
    return findPathInternal(enemyId,targetPosition,options);
  }

  window.BattleNetworkEnemyNavigation=Object.freeze({
    POLICY,
    DEFAULT_POLICY,
    STEP,
    MAX_PATH_SEARCHES_PER_FRAME,
    canStandAt,
    canTraverse,
    findPath,
    findPathBudgeted
  });
})();