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
  const HOLE_KIND = Object.freeze({
    PERMANENT: 'PERMANENT',
    RESTORABLE: 'RESTORABLE'
  });

  if (WORLD_SIZE !== TILE_SIZE * GRID_COLS || WORLD_SIZE !== TILE_SIZE * GRID_ROWS) {
    throw new Error('BattleNetworkField: logical grid does not exactly match world size.');
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clampCol = col => clamp(Math.trunc(col), 0, GRID_COLS - 1);
  const clampRow = row => clamp(Math.trunc(row), 0, GRID_ROWS - 1);
  const terrainValues = new Set(Object.values(TERRAIN));
  const occupantTiles = new Map();

  const tiles = Array.from({ length: GRID_ROWS }, (_, row) =>
    Array.from({ length: GRID_COLS }, (_, col) => ({
      row,
      col,
      baseTerrain: TERRAIN.NORMAL,
      currentTerrain: TERRAIN.NORMAL,
      holeKind: null,
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

  function resolveHoleKind(tile, terrain) {
    if (!tile || terrain !== TERRAIN.HOLE) return null;
    return tile.baseTerrain === TERRAIN.HOLE ? HOLE_KIND.PERMANENT : HOLE_KIND.RESTORABLE;
  }

  function emitTerrainChange(tile, previousTerrain, previousHoleKind) {
    if (!tile || (previousTerrain === tile.currentTerrain && previousHoleKind === tile.holeKind)) return;
    window.dispatchEvent(new CustomEvent('battlenetwork:terrainchange', {
      detail: Object.freeze({
        row: tile.row,
        col: tile.col,
        previousTerrain,
        terrain: tile.currentTerrain,
        previousHoleKind: previousHoleKind || null,
        holeKind: tile.holeKind || null
      })
    }));
  }

  function setTerrain(row, col, terrain) {
    const tile = getTile(row, col);
    if (!tile || !terrainValues.has(terrain)) return null;
    const previousTerrain = tile.currentTerrain;
    const previousHoleKind = tile.holeKind;
    tile.currentTerrain = terrain;
    tile.holeKind = resolveHoleKind(tile, terrain);
    tile.walkable = terrain !== TERRAIN.HOLE;
    emitTerrainChange(tile, previousTerrain, previousHoleKind);
    return tile;
  }

  function setBaseTerrain(row, col, terrain) {
    const tile = getTile(row, col);
    if (!tile || !terrainValues.has(terrain)) return null;
    const previousTerrain = tile.currentTerrain;
    const previousHoleKind = tile.holeKind;
    tile.baseTerrain = terrain;
    tile.currentTerrain = terrain;
    tile.holeKind = terrain === TERRAIN.HOLE ? HOLE_KIND.PERMANENT : null;
    tile.walkable = terrain !== TERRAIN.HOLE;
    emitTerrainChange(tile, previousTerrain, previousHoleKind);
    return tile;
  }

  function getHoleKind(row, col) {
    return getTile(row, col)?.holeKind || null;
  }

  function isPermanentHole(row, col) {
    return getHoleKind(row, col) === HOLE_KIND.PERMANENT;
  }

  function isRestorableHole(row, col) {
    return getHoleKind(row, col) === HOLE_KIND.RESTORABLE;
  }

  function canOccupyWorld(x, y, options = {}) {
    const tile = getTileAtWorld(x, y);
    if (!tile) return false;
    if (options.allowHole === true) return true;
    return tile.currentTerrain !== TERRAIN.HOLE;
  }

  function trackOccupant(occupantId, x, y, options = {}) {
    if (!occupantId || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const nextTile = getTileAtWorld(x, y);
    if (!nextTile) return false;
    if (nextTile.currentTerrain === TERRAIN.HOLE && options.allowHole !== true) return false;

    const key = String(occupantId);
    const previous = occupantTiles.get(key) || null;
    const changedTile = !previous || previous.row !== nextTile.row || previous.col !== nextTile.col;
    if (changedTile && previous) {
      const previousTile = getTile(previous.row, previous.col);
      if (previousTile?.currentTerrain === TERRAIN.CRACKED) {
        setTerrain(previousTile.row, previousTile.col, TERRAIN.HOLE);
      }
    }
    occupantTiles.set(key, Object.freeze({ row: nextTile.row, col: nextTile.col }));
    return true;
  }

  function untrackOccupant(occupantId) {
    if (!occupantId) return false;
    return occupantTiles.delete(String(occupantId));
  }

  function resetTerrain() {
    forEachTile(tile => {
      if (tile.currentTerrain !== tile.baseTerrain || tile.holeKind !== resolveHoleKind(tile, tile.baseTerrain)) {
        setTerrain(tile.row, tile.col, tile.baseTerrain);
      }
    });
    occupantTiles.clear();
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
    HOLE_KIND,
    worldToTile,
    getTile,
    getTileAtWorld,
    setTerrain,
    setBaseTerrain,
    getHoleKind,
    isPermanentHole,
    isRestorableHole,
    canOccupyWorld,
    trackOccupant,
    untrackOccupant,
    resetTerrain,
    tileToWorldBounds,
    tileToWorldCenter,
    toWorldDistance,
    forEachTile
  });
})();
