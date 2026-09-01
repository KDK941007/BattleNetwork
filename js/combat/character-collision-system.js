(()=>{
  const FIELD=window.BattleNetworkField,BASE=window.BattleNetworkEnemy,RANGE=window.BattleNetworkRangeGeometry;
  if(!FIELD||!BASE||!RANGE)throw new Error('BattleNetworkCharacterCollision: required dependency is missing.');

  const EPS=.001;
  const DEFAULT_DIAMETER_TILES=.7;
  const PLAYER_PROFILE=Object.freeze({
    body:Object.freeze({diameterTiles:DEFAULT_DIAMETER_TILES,offsetScreenYTiles:0}),
    hurt:Object.freeze({diameterTiles:DEFAULT_DIAMETER_TILES,offsetScreenYTiles:0})
  });
  const ENEMY_DEFAULT_PROFILE=Object.freeze({
    body:Object.freeze({diameterTiles:DEFAULT_DIAMETER_TILES,offsetScreenYTiles:-.3}),
    hurt:Object.freeze({diameterTiles:DEFAULT_DIAMETER_TILES,offsetScreenYTiles:-.3})
  });
  const profiles=new Map();

  function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function normalizePart(part,fallback){return Object.freeze({diameterTiles:positive(part?.diameterTiles,fallback.diameterTiles),offsetScreenYTiles:finite(part?.offsetScreenYTiles,fallback.offsetScreenYTiles)})}
  function normalizeProfile(profile,fallback=ENEMY_DEFAULT_PROFILE){return Object.freeze({body:normalizePart(profile?.body,fallback.body),hurt:normalizePart(profile?.hurt,fallback.hurt)})}
  function offsetVector(offsetScreenYTiles){const d=FIELD.toWorldDistance(offsetScreenYTiles)/Math.SQRT2;return{x:d,y:d}}
  function circleAt(position,part){const o=offsetVector(part.offsetScreenYTiles),radius=FIELD.toWorldDistance(part.diameterTiles)/2;return Object.freeze({x:Number(position.x)+o.x,y:Number(position.y)+o.y,radius,diameterTiles:part.diameterTiles,offsetScreenYTiles:part.offsetScreenYTiles})}
  function circleBounds(circle){return Object.freeze({left:circle.x-circle.radius,right:circle.x+circle.radius,top:circle.y-circle.radius,bottom:circle.y+circle.radius,width:circle.radius*2,height:circle.radius*2,centerX:circle.x,centerY:circle.y})}
  function circlesOverlap(a,b){return !!a&&!!b&&Math.hypot(a.x-b.x,a.y-b.y)<a.radius+b.radius-EPS}
  function pointInCircle(circle,x,y){return !!circle&&Math.hypot(Number(x)-circle.x,Number(y)-circle.y)<=circle.radius+EPS}
  function playerPositionFromBounds(bounds){if(!bounds)return null;const x=Number(bounds.centerX),y=Number(bounds.centerY);if(Number.isFinite(x)&&Number.isFinite(y))return{x,y};const left=Number(bounds.left),right=Number(bounds.right),top=Number(bounds.top),bottom=Number(bounds.bottom);if([left,right,top,bottom].every(Number.isFinite))return{x:(left+right)/2,y:(top+bottom)/2};return null}
  function playerBodyAt(position){return circleAt(position,PLAYER_PROFILE.body)}
  function playerHurtAt(position){return circleAt(position,PLAYER_PROFILE.hurt)}
  function getProfile(id){return profiles.get(id)||ENEMY_DEFAULT_PROFILE}
  function enemyCircleAt(enemy,partName,x=enemy?.x,y=enemy?.y){if(!enemy)return null;return circleAt({x,y},getProfile(enemy.id)[partName])}
  function enemyBodyAt(enemy,x=enemy?.x,y=enemy?.y){return enemyCircleAt(enemy,'body',x,y)}
  function enemyHurtAt(enemy,x=enemy?.x,y=enemy?.y){return enemyCircleAt(enemy,'hurt',x,y)}
  function circleTouchesHole(circle){
    if(!circle)return true;
    if(circle.x-circle.radius<0||circle.y-circle.radius<0||circle.x+circle.radius>FIELD.WORLD_SIZE||circle.y+circle.radius>FIELD.WORLD_SIZE)return true;
    const minCol=Math.max(0,Math.floor((circle.x-circle.radius)/FIELD.TILE_SIZE)),maxCol=Math.min(FIELD.GRID_COLS-1,Math.floor((circle.x+circle.radius-EPS)/FIELD.TILE_SIZE));
    const minRow=Math.max(0,Math.floor((circle.y-circle.radius)/FIELD.TILE_SIZE)),maxRow=Math.min(FIELD.GRID_ROWS-1,Math.floor((circle.y+circle.radius-EPS)/FIELD.TILE_SIZE));
    for(let row=minRow;row<=maxRow;row++)for(let col=minCol;col<=maxCol;col++){
      const tile=FIELD.getTile(row,col);if(tile?.currentTerrain!==FIELD.TERRAIN.HOLE)continue;
      const b=FIELD.tileToWorldBounds(row,col),cx=Math.max(b.left,Math.min(circle.x,b.right)),cy=Math.max(b.top,Math.min(circle.y,b.bottom));
      if(Math.hypot(circle.x-cx,circle.y-cy)<circle.radius-EPS)return true;
    }
    return false;
  }
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
    const profile=normalizeProfile(config.collisionProfile);
    const bodyDiameter=FIELD.toWorldDistance(profile.body.diameterTiles),inscribed=bodyDiameter/Math.SQRT2,o=offsetVector(profile.body.offsetScreenYTiles);
    const id=BASE.spawn({...config,hitBox:{width:inscribed,height:inscribed,offsetX:o.x,offsetY:o.y}});
    profiles.set(id,profile);return id;
  }
  function getEnemy(id){return decorate(BASE.getEnemy(id))}
  function getEnemies(){return Object.freeze(BASE.getEnemies().map(decorate))}
  function getActiveEnemies(){return Object.freeze(BASE.getActiveEnemies().map(decorate))}
  function setPosition(id,x,y){
    const enemy=getEnemy(id);if(!enemy)return BASE.setPosition(id,x,y);
    const nx=Number(x),ny=Number(y);if(!Number.isFinite(nx)||!Number.isFinite(ny))return BASE.setPosition(id,x,y);
    const clampedX=Math.max(0,Math.min(FIELD.WORLD_SIZE,nx)),clampedY=Math.max(0,Math.min(FIELD.WORLD_SIZE,ny)),next=enemyBodyAt(enemy,clampedX,clampedY),current=enemy.bodyCircle;
    const currentHole=circleTouchesHole(current),nextHole=circleTouchesHole(next);if(nextHole&&(!currentHole||nextHole))return Object.freeze({applied:false,reason:'TERRAIN_BLOCKED',enemy});
    if(enemy.collision?.allowEnemyOverlap!==true){for(const other of getActiveEnemies()){if(other.id===id||other.collision?.allowEnemyOverlap===true)continue;if(circlesOverlap(next,other.bodyCircle))return Object.freeze({applied:false,reason:'ENEMY_COLLISION',enemy})}}
    return BASE.setPosition(id,clampedX,clampedY);
  }
  function isPlayerBoundsBlocked(bounds){const position=playerPositionFromBounds(bounds);if(!position)return false;const body=playerBodyAt(position);return getActiveEnemies().some(enemy=>enemy.collision?.allowPlayerOverlap!==true&&circlesOverlap(body,enemy.bodyCircle))}
  function wouldOverlapBounds(id,x,y,bounds){const enemy=getEnemy(id),position=playerPositionFromBounds(bounds);if(!enemy||!position||enemy.collision?.allowPlayerOverlap===true)return false;return circlesOverlap(enemyBodyAt(enemy,Number(x),Number(y)),playerBodyAt(position))}
  function containsPoint(id,x,y){return pointInCircle(getEnemy(id)?.hurtCircle,x,y)}
  function findEnemyIdAtPoint(x,y){for(const enemy of getActiveEnemies())if(pointInCircle(enemy.hurtCircle,x,y))return enemy.id;return null}
  function intersectsRange(id,shape){const enemy=getEnemy(id);return !!enemy&&!enemy.isDefeated&&circleIntersectsShape(enemy.hurtCircle,shape)}
  function getHitEnemies(shape){if(!shape)return Object.freeze([]);return Object.freeze(getActiveEnemies().filter(enemy=>circleIntersectsShape(enemy.hurtCircle,shape)))}
  function clearAll(){profiles.clear();return BASE.clearAll()}

  const API=Object.freeze({...BASE,spawn,getEnemy,getEnemies,getActiveEnemies,setPosition,clearAll,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,isPlayerBoundsBlocked,wouldOverlapBounds});
  window.BattleNetworkEnemy=API;
  window.BattleNetworkCharacterCollision=Object.freeze({DEFAULT_DIAMETER_TILES,PLAYER_PROFILE,ENEMY_DEFAULT_PROFILE,getEnemyProfile:getProfile,getEnemyBody:id=>getEnemy(id)?.bodyCircle||null,getEnemyHurt:id=>getEnemy(id)?.hurtCircle||null,getPlayerBody:position=>playerBodyAt(position),getPlayerHurt:position=>playerHurtAt(position),circleBounds,circlesOverlap,circleTouchesHole,circleIntersectsShape});
})();
