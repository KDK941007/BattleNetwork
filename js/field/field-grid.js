(()=>{
  const WORLD_SIZE = 3600;
  const TILE_SIZE = 180;
  const GRID_COLS = 20;
  const GRID_ROWS = 20;

  const TERRAIN = Object.freeze({
    NORMAL: 'NORMAL',
    POISON: 'POISON',
    MAGMA: 'MAGMA',
    HOLE: 'HOLE',
    CRACKED: 'CRACKED',
    ICE: 'ICE',
    GRASS: 'GRASS'
  });

  if (WORLD_SIZE !== TILE_SIZE * GRID_COLS || WORLD_SIZE !== TILE_SIZE * GRID_ROWS) {
    throw new Error('BattleNetworkField: logical grid does not exactly match world size.');
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clampCol = col => clamp(Math.trunc(col), 0, GRID_COLS - 1);
  const clampRow = row => clamp(Math.trunc(row), 0, GRID_ROWS - 1);
  const terrainValues = new Set(Object.values(TERRAIN));

  const tiles = Array.from({ length: GRID_ROWS }, (_, row) =>
    Array.from({ length: GRID_COLS }, (_, col) => ({
      row,
      col,
      baseTerrain: TERRAIN.NORMAL,
      currentTerrain: TERRAIN.NORMAL,
      walkable: true
    }))
  );

  function worldToTile(x, y) {
    const safeX = Number.isFinite(x) ? x : 0;
    const safeY = Number.isFinite(y) ? y : 0;
    return {
      col: clampCol(Math.floor(safeX / TILE_SIZE)),
      row: clampRow(Math.floor(safeY / TILE_SIZE))
    };
  }

  function getTile(row, col) {
    if (!Number.isFinite(row) || !Number.isFinite(col)) return null;
    const r = Math.trunc(row);
    const c = Math.trunc(col);
    if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return null;
    return tiles[r][c];
  }

  function getTileAtWorld(x, y) {
    const { row, col } = worldToTile(x, y);
    return getTile(row, col);
  }

  function setTerrain(row, col, terrain) {
    const tile = getTile(row, col);
    if (!tile || !terrainValues.has(terrain)) return null;
    tile.currentTerrain = terrain;
    tile.walkable = terrain !== TERRAIN.HOLE;
    return tile;
  }

  function tileToWorldBounds(row, col) {
    const tile = getTile(row, col);
    if (!tile) return null;
    const left = tile.col * TILE_SIZE;
    const top = tile.row * TILE_SIZE;
    return {
      left,
      top,
      right: left + TILE_SIZE,
      bottom: top + TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE
    };
  }

  function tileToWorldCenter(row, col) {
    const bounds = tileToWorldBounds(row, col);
    if (!bounds) return null;
    return {
      x: bounds.left + TILE_SIZE / 2,
      y: bounds.top + TILE_SIZE / 2
    };
  }

  function toWorldDistance(tileDistance) {
    const value = Number(tileDistance);
    return Number.isFinite(value) ? value * TILE_SIZE : 0;
  }

  function forEachTile(callback) {
    if (typeof callback !== 'function') return;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        callback(tiles[row][col]);
      }
    }
  }

  window.BattleNetworkField = Object.freeze({
    WORLD_SIZE,
    TILE_SIZE,
    GRID_COLS,
    GRID_ROWS,
    TERRAIN,
    worldToTile,
    getTile,
    getTileAtWorld,
    setTerrain,
    tileToWorldBounds,
    tileToWorldCenter,
    toWorldDistance,
    forEachTile
  });
})();
