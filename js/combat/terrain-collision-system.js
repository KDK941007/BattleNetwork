(()=>{
  const FIELD=window.BattleNetworkField,BASE=window.BattleNetworkEnemy,RANGE=window.BattleNetworkRangeGeometry;
  if(!FIELD||!BASE||!RANGE)return;

  const EPS=.001,HOLE_SLIDE_SLOP=1,BODY_CONTACT_SLOP=3,BODY_TANGENT_RATIO=.35;
  const DEFAULT_DIAMETER_TILES=.7;
  const PLAYER_PROFILE=Object.freeze({body:Object.freeze({diameterTiles:DEFAULT_DIAMETER_TILES,offsetScreenYTiles:0}),hurt:Object.freeze({diameterTiles:DEFAULT_DIAMETER_TILES,offsetScreenYTiles:0})});
  const ENEMY_DEFAULT_PROFILE=Object.freeze({body:Object.freeze({diameterTiles:DEFAULT_DIAMETER_TILES,offsetScreenYTiles:-.3}),hurt:Object.freeze({diameterTiles:DEFAULT_DIAMETER_TILES,offsetScreenYTiles:-.3})});
  const profiles=new Map();

  function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function normalizePart(part,fallback){return Object.freeze({diameterTiles:positive(part?.diameterTiles,fallback.diameterTiles),offsetScreenYTiles:finite(part?.offsetScreenYTiles,fallback.offsetScreenYTiles)})}
  function normalizeProfile(profile,fallback=ENEMY_DEFAULT_PROFILE){return Object.freeze({body:normalizePart(profile?.body,fallback.body),hurt:normalizePart(profile?.hurt,fallback.hurt)})}
  function offsetVector(offsetScreenYTiles){const d=FIELD.toWorldDistance(offsetScreenYTiles)/Math.SQRT2;return{x:d,y:d}}
  function circleAt(position,part){const o=offsetVector(part.offsetScreenYTiles),radius=FIELD.toWorldDistance(part.diameterTiles)/2;return Object.freeze({x:Number(position.x)+o.x,y:Number(position.y)+o.y,radius,diameterTiles:part.diameterTiles,offsetScreenYTiles:part.offsetScreenYTiles})}
  function circleBounds(circle){return Object.freeze({left:circle.x-circle.radius,right:circle.x+circle.radius,top:circle.y-circle.radius,bottom:circle.y+circle.radius,width:circle.radius*2,height:circle.radius*2,centerX:circle.x,centerY:circle.y})}
  function circlesOverlap(a,b){return !!a&&!!b&&Math.hypot(a.x-b.x,a.y-b.y)<a.radius+b.radius-EPS}
  function circlePenetration(a,b){return !a||!b?0:Math.max(0,a.radius+b.radius-Math.hypot(a.x-b.x,a.y-b.y))}
  function pointInCircle(circle,x,y){return !!circle&&Math.hypot(Number(x)-circle.x,Number(y)-circle.y)<=circle.radius+EPS}
  function playerPositionFromBounds(bounds){if(!bounds)return null;const x=Number(bounds.centerX),y=Number(bounds.centerY);if(Number.isFinite(x)&&Number.isFinite(y))return{x,y};const left=Number(bounds.left),right=Number(bounds.right),top=Number(bounds.top),bottom=Number(bounds.bottom);return [left,right,top,bottom].every(Number.isFinite)?{x:(left+right)/2,y:(top+bottom)/2}:null}
  function playerBodyAt(position){return circleAt(position,PLAYER_PROFILE.body)}
  function playerHurtAt(position){return circleAt(position,PLAYER_PROFILE.hurt)}
  function getProfile(id){return profiles.get(id)||ENEMY_DEFAULT_PROFILE}
  function enemyCircleAt(enemy,partName,x=enemy?.x,y=enemy?.y){if(!enemy)return null;return circleAt({x,y},getProfile(enemy.id)[partName])}
  function enemyBodyAt(enemy,x=enemy?.x,y=enemy?.y){return enemyCircleAt(enemy,'body',x,y)}
  function enemyHurtAt(enemy,x=enemy?.x,y=enemy?.y){return enemyCircleAt(enemy,'hurt',x,y)}

  function circleRectPenetration(circle,b){
    if(!circle||!b)return 0;
    const insideX=circle.x>=b.left&&circle.x<=b.right,insideY=circle.y>=b.top&&circle.y<=b.bottom;
    if(insideX&&insideY){const edge=Math.min(circle.x-b.left,b.right-circle.x,circle.y-b.top,b.bottom-circle.y);return circle.radius+Math.max(0,edge)}
    const cx=Math.max(b.left,Math.min(circle.x,b.right)),cy=Math.max(b.top,Math.min(circle.y,b.bottom));
    return Math.max(0,circle.radius-Math.hypot(circle.x-cx,circle.y-cy));
  }
  function holePenetration(circle){
    if(!circle)return Infinity;
    let max=0;
    if(circle.x-circle.radius<0)max=Math.max(max,circle.radius-circle.x);
    if(circle.y-circle.radius<0)max=Math.max(max,circle.radius-circle.y);
    if(circle.x+circle.radius>FIELD.WORLD_SIZE)max=Math.max(max,circle.x+circle.radius-FIELD.WORLD_SIZE);
    if(circle.y+circle.radius>FIELD.WORLD_SIZE)max=Math.max(max,circle.y+circle.radius-FIELD.WORLD_SIZE);
    const minCol=Math.max(0,Math.floor((circle.x-circle.radius)/FIELD.TILE_SIZE)),maxCol=Math.min(FIELD.GRID_COLS-1,Math.floor((circle.x+circle.radius-EPS)/FIELD.TILE_SIZE));
    const minRow=Math.max(0,Math.floor((circle.y-circle.radius)/FIELD.TILE_SIZE)),maxRow=Math.min(FIELD.GRID_ROWS-1,Math.floor((circle.y+circle.radius-EPS)/FIELD.TILE_SIZE));
    for(let row=minRow;row<=maxRow;row++)for(let col=minCol;col<=maxCol;col++){
      if(FIELD.getTile(row,col)?.currentTerrain!==FIELD.TERRAIN.HOLE)continue;
      max=Math.max(max,circleRectPenetration(circle,FIELD.tileToWorldBounds(row,col)));
    }
    return max;
  }
  function blocksProgress(currentPen,nextPen,slop=HOLE_SLIDE_SLOP){return nextPen>slop&&(currentPen<=slop||nextPen>currentPen+slop)}
  function bodyMoveBlocks(current,next,obstacle){
    const currentPen=circlePenetration(current,obstacle),nextPen=circlePenetration(next,obstacle);
    if(nextPen<=BODY_CONTACT_SLOP)return false;
    if(nextPen<=currentPen+BODY_CONTACT_SLOP)return false;
    const mx=next.x-current.x,my=next.y-current.y,ml=Math.hypot(mx,my);
    const tx=obstacle.x-current.x,ty=obstacle.y-current.y,tl=Math.hypot(tx,ty);
    if(ml>EPS&&tl>EPS){
      const inward=(mx*tx+my*ty)/(ml*tl);
      if(inward<=BODY_TANGENT_RATIO&&nextPen<=BODY_CONTACT_SLOP*2)return false;
    }
    return true;
  }
  function circleTouchesHole(circle){return holePenetration(circle)>HOLE_SLIDE_SLOP}
  function circleIntersectsShape(circle,shape){
    if(!circle||!shape)return false;
    if(shape.rangeTypeId==='CIRCLE')return Math.hypot(circle.x-shape.center.x,circle.y-shape.center.y)<=circle.radius+shape.radiusWorld+EPS;
    if(shape.rangeTypeId==='LINE'||shape.rangeTypeId==='RECT'){
      const relX=circle.x-shape.origin.x,relY=circle.y-shape.origin.y;
      const forward=relX*shape.direction.x+relY*shape.direction.y,lateral=relX*shape.normal.x+relY*shape.normal.y;
      const closestForward=Math.max(0,Math.min(shape.lengthWorld,forward)),half=shape.widthWorld/2,closestLateral=Math.max(-half,Math.min(half,lateral));
      return Math.hypot(forward-closestForward,lateral-closestLateral)<=circle.radius+EPS;
    }
    return false;
  }
  function decorate(snapshot){if(!snapshot)return null;const body=enemyBodyAt(snapshot),hurt=enemyHurtAt(snapshot);return Object.freeze({...snapshot,collisionProfile:getProfile(snapshot.id),bodyCircle:body,hurtCircle:hurt,bodyBounds:circleBounds(body),hurtBounds:circleBounds(hurt),bounds:circleBounds(hurt)})}

  function spawn(config={}){
    const profile=normalizeProfile(config.collisionProfile),bodyDiameter=FIELD.toWorldDistance(profile.body.diameterTiles),inscribed=bodyDiameter/Math.SQRT2,o=offsetVector(profile.body.offsetScreenYTiles);
    const id=BASE.spawn({...config,hitBox:{width:inscribed,height:inscribed,offsetX:o.x,offsetY:o.y}});profiles.set(id,profile);return id;
  }
  function getEnemy(id){return decorate(BASE.getEnemy(id))}
  function getEnemies(){return Object.freeze(BASE.getEnemies().map(decorate))}
  function getActiveEnemies(){return Object.freeze(BASE.getActiveEnemies().map(decorate))}
  function setPosition(id,x,y){
    const enemy=getEnemy(id);if(!enemy)return BASE.setPosition(id,x,y);
    const nx=Number(x),ny=Number(y);if(!Number.isFinite(nx)||!Number.isFinite(ny))return BASE.setPosition(id,x,y);
    const clampedX=Math.max(0,Math.min(FIELD.WORLD_SIZE,nx)),clampedY=Math.max(0,Math.min(FIELD.WORLD_SIZE,ny)),current=enemy.bodyCircle,next=enemyBodyAt(enemy,clampedX,clampedY);
    if(blocksProgress(holePenetration(current),holePenetration(next),HOLE_SLIDE_SLOP))return Object.freeze({applied:false,reason:'TERRAIN_BLOCKED',enemy});
    if(enemy.collision?.allowEnemyOverlap!==true){for(const other of getActiveEnemies()){if(other.id===id||other.collision?.allowEnemyOverlap===true)continue;if(bodyMoveBlocks(current,next,other.bodyCircle))return Object.freeze({applied:false,reason:'ENEMY_COLLISION',enemy})}}
    return BASE.setPosition(id,clampedX,clampedY);
  }
  function isPlayerBoundsBlocked(bounds){
    const position=playerPositionFromBounds(bounds);if(!position)return false;
    const next=playerBodyAt(position),currentPosition=window.BattleNetworkPlayer?.getPosition?.()||position,current=playerBodyAt(currentPosition);
    if(blocksProgress(holePenetration(current),holePenetration(next),HOLE_SLIDE_SLOP))return true;
    for(const enemy of getActiveEnemies()){if(enemy.collision?.allowPlayerOverlap===true)continue;if(bodyMoveBlocks(current,next,enemy.bodyCircle))return true}
    return false;
  }
  function wouldOverlapBounds(id,x,y,bounds){
    const enemy=getEnemy(id),position=playerPositionFromBounds(bounds);if(!enemy||!position||enemy.collision?.allowPlayerOverlap===true)return false;
    const playerBody=playerBodyAt(position),current=enemy.bodyCircle,next=enemyBodyAt(enemy,Number(x),Number(y));
    return bodyMoveBlocks(current,next,playerBody);
  }
  function containsPoint(id,x,y){return pointInCircle(getEnemy(id)?.hurtCircle,x,y)}
  function findEnemyIdAtPoint(x,y){for(const enemy of getActiveEnemies())if(pointInCircle(enemy.hurtCircle,x,y))return enemy.id;return null}
  function intersectsRange(id,shape){const enemy=getEnemy(id);return !!enemy&&!enemy.isDefeated&&circleIntersectsShape(enemy.hurtCircle,shape)}
  function getHitEnemies(shape){if(!shape)return Object.freeze([]);return Object.freeze(getActiveEnemies().filter(enemy=>circleIntersectsShape(enemy.hurtCircle,shape)))}
  function clearAll(){profiles.clear();return BASE.clearAll()}

  const trackedPlayer={x:null,y:null};
  function trackOccupant(key,x,y,options={}){
    if(key==='player'){
      const nx=Number(x),ny=Number(y);if(!Number.isFinite(nx)||!Number.isFinite(ny))return false;
      const next=playerBodyAt({x:nx,y:ny});
      const current=Number.isFinite(trackedPlayer.x)&&Number.isFinite(trackedPlayer.y)?playerBodyAt(trackedPlayer):next;
      const currentPen=holePenetration(current),nextPen=holePenetration(next);
      if(blocksProgress(currentPen,nextPen,HOLE_SLIDE_SLOP))return false;
      const escapeOptions=currentPen>HOLE_SLIDE_SLOP&&nextPen<currentPen-HOLE_SLIDE_SLOP?{...options,allowHole:true}:options;
      const applied=FIELD.trackOccupant?FIELD.trackOccupant(key,nx,ny,escapeOptions):true;
      if(applied){trackedPlayer.x=nx;trackedPlayer.y=ny}return applied;
    }
    return FIELD.trackOccupant?FIELD.trackOccupant(key,x,y,options):true;
  }
  function resetTerrain(){trackedPlayer.x=null;trackedPlayer.y=null;return FIELD.resetTerrain?.()}

  window.BattleNetworkEnemy=Object.freeze({...BASE,spawn,getEnemy,getEnemies,getActiveEnemies,setPosition,clearAll,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,isPlayerBoundsBlocked,wouldOverlapBounds});
  window.BattleNetworkField=Object.freeze({...FIELD,trackOccupant,resetTerrain});
  window.BattleNetworkCharacterCollision=Object.freeze({DEFAULT_DIAMETER_TILES,PLAYER_PROFILE,ENEMY_DEFAULT_PROFILE,getEnemyProfile:getProfile,getEnemyBody:id=>getEnemy(id)?.bodyCircle||null,getEnemyHurt:id=>getEnemy(id)?.hurtCircle||null,getPlayerBody:position=>playerBodyAt(position),getPlayerHurt:position=>playerHurtAt(position),circleBounds,circlesOverlap,circlePenetration,holePenetration,circleTouchesHole,circleIntersectsShape});
})();
