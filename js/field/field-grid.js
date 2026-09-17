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
  const RESTORABLE_HOLE_LIFETIME_SECONDS = 10;
  const RESTORABLE_HOLE_WARNING_SECONDS = 2;
  const RESTORABLE_HOLE_BLINK_INTERVAL_SECONDS = 0.2;

  if (WORLD_SIZE !== TILE_SIZE * GRID_COLS || WORLD_SIZE !== TILE_SIZE * GRID_ROWS) {
    throw new Error('BattleNetworkField: logical grid does not exactly match world size.');
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clampCol = col => clamp(Math.trunc(col), 0, GRID_COLS - 1);
  const clampRow = row => clamp(Math.trunc(row), 0, GRID_ROWS - 1);
  const terrainValues = new Set(Object.values(TERRAIN));
  const occupantTiles = new Map();
  const restorableHoleTimers = new Map();

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

  function tileKey(row, col) {
    return `${Math.trunc(row)}:${Math.trunc(col)}`;
  }

  function syncRestorableHoleTimer(tile, previousTerrain, previousHoleKind) {
    if (!tile) return;
    const key = tileKey(tile.row, tile.col);
    if (tile.currentTerrain !== TERRAIN.HOLE || tile.holeKind !== HOLE_KIND.RESTORABLE) {
      restorableHoleTimers.delete(key);
      return;
    }
    if (previousTerrain === TERRAIN.HOLE && previousHoleKind === HOLE_KIND.RESTORABLE && restorableHoleTimers.has(key)) return;
    restorableHoleTimers.set(key, {
      row: tile.row,
      col: tile.col,
      remaining: RESTORABLE_HOLE_LIFETIME_SECONDS,
      blinkPhase: null
    });
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

  function emitHoleRestoreBlink(tile, visible, remaining) {
    if (!tile || tile.currentTerrain !== TERRAIN.HOLE || tile.holeKind !== HOLE_KIND.RESTORABLE) return;
    window.dispatchEvent(new CustomEvent('battlenetwork:holerestoreblink', {
      detail: Object.freeze({
        row: tile.row,
        col: tile.col,
        visible: visible === true,
        remaining: Math.max(0, Number(remaining) || 0)
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
    syncRestorableHoleTimer(tile, previousTerrain, previousHoleKind);
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
    restorableHoleTimers.delete(tileKey(tile.row, tile.col));
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
        const anotherOccupantRemains = Array.from(occupantTiles.entries()).some(([occupantId, position]) =>
          occupantId !== key && position.row === previousTile.row && position.col === previousTile.col
        );
        if (!anotherOccupantRemains) setTerrain(previousTile.row, previousTile.col, TERRAIN.HOLE);
      }
    }
    occupantTiles.set(key, Object.freeze({ row: nextTile.row, col: nextTile.col }));
    return true;
  }

  function untrackOccupant(occupantId) {
    if (!occupantId) return false;
    return occupantTiles.delete(String(occupantId));
  }

  function getOccupantsAt(row, col) {
    const tile = getTile(row, col);
    if (!tile) return Object.freeze([]);
    const ids = [];
    for (const [occupantId, position] of occupantTiles) {
      if (position.row === tile.row && position.col === tile.col) ids.push(occupantId);
    }
    return Object.freeze(ids);
  }

  function resetTerrain() {
    forEachTile(tile => {
      if (tile.currentTerrain !== tile.baseTerrain || tile.holeKind !== resolveHoleKind(tile, tile.baseTerrain)) {
        setTerrain(tile.row, tile.col, tile.baseTerrain);
      }
    });
    restorableHoleTimers.clear();
    occupantTiles.clear();
  }

  function isBattleTimeAdvancing() {
    if (document.hidden) return false;
    const wave = window.BattleNetworkWave?.getSnapshot?.();
    if (!wave || wave.status !== 'ACTIVE') return false;
    if (document.getElementById('customModal')?.classList.contains('open')) return false;
    if (document.getElementById('settingsModal')?.classList.contains('open')) return false;
    if (document.getElementById('battle')?.classList.contains('editMode')) return false;
    if (window.BattleNetworkAreaSteal?.isActive?.() === true) return false;
    if (window.BattleNetworkPlayer?.isDefeated?.() === true) return false;
    return true;
  }

  function advanceRestorableHoleTimers(seconds) {
    if (!(seconds > 0) || !restorableHoleTimers.size) return;
    for (const [key, entry] of Array.from(restorableHoleTimers.entries())) {
      const tile = getTile(entry.row, entry.col);
      if (!tile || tile.currentTerrain !== TERRAIN.HOLE || tile.holeKind !== HOLE_KIND.RESTORABLE) {
        restorableHoleTimers.delete(key);
        continue;
      }
      const remaining = entry.remaining - seconds;
      if (remaining <= 0) {
        restorableHoleTimers.delete(key);
        setTerrain(entry.row, entry.col, TERRAIN.NORMAL);
        continue;
      }
      let blinkPhase = null;
      if (remaining <= RESTORABLE_HOLE_WARNING_SECONDS) {
        blinkPhase = Math.floor(remaining / RESTORABLE_HOLE_BLINK_INTERVAL_SECONDS) % 2;
        if (entry.blinkPhase !== blinkPhase) emitHoleRestoreBlink(tile, blinkPhase === 0, remaining);
      }
      restorableHoleTimers.set(key, { ...entry, remaining, blinkPhase });
    }
  }

  let lastHoleTimerTick = performance.now();
  let holeTimerWasAdvancing = false;
  function tickRestorableHoles(now) {
    const advancing = isBattleTimeAdvancing();
    const elapsed = Math.max(0, (now - lastHoleTimerTick) / 1000);
    lastHoleTimerTick = now;
    if (advancing && holeTimerWasAdvancing) advanceRestorableHoleTimers(elapsed);
    holeTimerWasAdvancing = advancing;
    requestAnimationFrame(tickRestorableHoles);
  }

  document.addEventListener('visibilitychange', () => {
    lastHoleTimerTick = performance.now();
    if (document.hidden) holeTimerWasAdvancing = false;
  });
  requestAnimationFrame(tickRestorableHoles);

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
    RESTORABLE_HOLE_LIFETIME_SECONDS,
    RESTORABLE_HOLE_WARNING_SECONDS,
    RESTORABLE_HOLE_BLINK_INTERVAL_SECONDS,
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
    getOccupantsAt,
    resetTerrain,
    tileToWorldBounds,
    tileToWorldCenter,
    toWorldDistance,
    forEachTile
  });
})();