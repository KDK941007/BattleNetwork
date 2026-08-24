(()=>{
  const field = window.BattleNetworkField;
  const scene = document.getElementById('scene');
  const floor = scene?.querySelector('.floor');

  if (!field || !scene || !floor) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function project(worldX, worldY, width, height) {
    const px = width / (field.WORLD_SIZE * 2);
    const py = height / (field.WORLD_SIZE * 2);
    return {
      x: (worldX - worldY) * px + width / 2,
      y: (worldX + worldY) * py
    };
  }

  function createLine(x1, y1, x2, y2, axis, index, edge) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', `fieldGridLine${edge ? ' edge' : ''}`);
    line.dataset.axis = axis;
    line.dataset.index = String(index);
    return line;
  }

  function render() {
    const width = scene.clientWidth;
    const height = scene.clientHeight;
    if (!width || !height) return;

    floor.querySelector('.fieldGridSvg')?.remove();

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'fieldGridSvg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');

    for (let col = 0; col <= field.GRID_COLS; col++) {
      const x = col * field.TILE_SIZE;
      const start = project(x, 0, width, height);
      const end = project(x, field.WORLD_SIZE, width, height);
      svg.appendChild(createLine(
        start.x,
        start.y,
        end.x,
        end.y,
        'col',
        col,
        col === 0 || col === field.GRID_COLS
      ));
    }

    for (let row = 0; row <= field.GRID_ROWS; row++) {
      const y = row * field.TILE_SIZE;
      const start = project(0, y, width, height);
      const end = project(field.WORLD_SIZE, y, width, height);
      svg.appendChild(createLine(
        start.x,
        start.y,
        end.x,
        end.y,
        'row',
        row,
        row === 0 || row === field.GRID_ROWS
      ));
    }

    floor.appendChild(svg);
  }

  window.BattleNetworkFieldRenderer = Object.freeze({ render });
  render();
})();
