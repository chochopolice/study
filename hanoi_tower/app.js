const towerElements = [...document.querySelectorAll('.tower')];
const diskSelect = document.getElementById('diskSelect');
const resetBtn = document.getElementById('resetBtn');
const hintBtn = document.getElementById('hintBtn');
const autoBtn = document.getElementById('autoBtn');
const moveCountEl = document.getElementById('moveCount');
const minMovesEl = document.getElementById('minMoves');
const messageEl = document.getElementById('message');
const clearModal = document.getElementById('clearModal');
const clearText = document.getElementById('clearText');
const closeModalBtn = document.getElementById('closeModalBtn');

let diskCount = Number(diskSelect.value);
let towers = [];
let selectedTower = null;
let moveCount = 0;
let autoRunning = false;

const diskColors = [
  '#ffcf5a', '#ff9f6e', '#ff7b9c', '#c084fc', '#62d6ff', '#7cf5a6', '#e4f05d'
];

function initGame() {
  diskCount = Number(diskSelect.value);
  towers = [[], [], []];
  for (let size = diskCount; size >= 1; size--) towers[0].push(size);
  selectedTower = null;
  moveCount = 0;
  autoRunning = false;
  autoBtn.disabled = false;
  diskSelect.disabled = false;
  clearModal.hidden = true;
  setMessage('円盤をクリックして、移動先の塔を選んでください。');
  updateStats();
  render();
}

function updateStats() {
  moveCountEl.textContent = moveCount;
  minMovesEl.textContent = 2 ** diskCount - 1;
}

function setMessage(text, type = '') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function render() {
  towerElements.forEach((towerEl, towerIndex) => {
    towerEl.querySelectorAll('.disk').forEach(el => el.remove());
    towerEl.classList.toggle('selected', selectedTower === towerIndex);

    towers[towerIndex].forEach(size => {
      const disk = document.createElement('div');
      disk.className = 'disk';
      disk.textContent = size;
      const width = 32 + (size / diskCount) * 58;
      disk.style.width = `${width}%`;
      disk.style.background = diskColors[(size - 1) % diskColors.length];
      if (isTopDisk(towerIndex, size)) disk.classList.add('pickable');
      towerEl.appendChild(disk);
    });
  });
}

function isTopDisk(towerIndex, size) {
  const tower = towers[towerIndex];
  return tower[tower.length - 1] === size;
}

function handleTowerClick(towerIndex) {
  if (autoRunning) return;

  if (selectedTower === null) {
    if (towers[towerIndex].length === 0) {
      setMessage('その塔には動かせる円盤がありません。', 'warn');
      return;
    }
    selectedTower = towerIndex;
    setMessage('移動先の塔を選んでください。');
    render();
    return;
  }

  if (selectedTower === towerIndex) {
    selectedTower = null;
    setMessage('選択を解除しました。');
    render();
    return;
  }

  moveDisk(selectedTower, towerIndex, true);
  selectedTower = null;
  render();
}

function canMove(from, to) {
  if (towers[from].length === 0) return false;
  const movingDisk = towers[from][towers[from].length - 1];
  const targetDisk = towers[to][towers[to].length - 1];
  return targetDisk === undefined || movingDisk < targetDisk;
}

function moveDisk(from, to, countMove) {
  if (!canMove(from, to)) {
    setMessage('大きい円盤を小さい円盤の上には置けません。', 'warn');
    return false;
  }

  const disk = towers[from].pop();
  towers[to].push(disk);
  if (countMove) moveCount++;
  updateStats();
  setMessage(`円盤${disk}を移動しました。`, 'good');
  checkClear();
  return true;
}

function checkClear() {
  if (towers[2].length === diskCount) {
    const minMoves = 2 ** diskCount - 1;
    const perfect = moveCount === minMoves;
    clearText.textContent = perfect
      ? `すごい！最短手数 ${minMoves} 手でクリアしました。`
      : `${moveCount} 手でクリアしました。最短手数は ${minMoves} 手です。`;
    clearModal.hidden = false;
  }
}

function getSolution(n, from, aux, to, result = []) {
  if (n === 0) return result;
  getSolution(n - 1, from, to, aux, result);
  result.push([from, to]);
  getSolution(n - 1, aux, from, to, result);
  return result;
}

function showHint() {
  if (autoRunning) return;
  const next = findNextOptimalMove();
  if (!next) {
    setMessage('もうクリアしています。', 'good');
    return;
  }
  const names = ['左', '中央', '右'];
  setMessage(`ヒント：${names[next[0]]}の塔から${names[next[1]]}の塔へ動かせます。`);
}

function findNextOptimalMove() {
  const stateKey = JSON.stringify(towers);
  const visited = new Set([stateKey]);
  const queue = [{ state: cloneTowers(towers), path: [] }];

  while (queue.length) {
    const current = queue.shift();
    if (current.state[2].length === diskCount) {
      return current.path[0] ?? null;
    }

    for (let from = 0; from < 3; from++) {
      for (let to = 0; to < 3; to++) {
        if (from === to || !canMoveInState(current.state, from, to)) continue;
        const nextState = cloneTowers(current.state);
        nextState[to].push(nextState[from].pop());
        const key = JSON.stringify(nextState);
        if (visited.has(key)) continue;
        visited.add(key);
        queue.push({ state: nextState, path: [...current.path, [from, to]] });
      }
    }
  }
  return null;
}

function canMoveInState(state, from, to) {
  if (state[from].length === 0) return false;
  const movingDisk = state[from][state[from].length - 1];
  const targetDisk = state[to][state[to].length - 1];
  return targetDisk === undefined || movingDisk < targetDisk;
}

function cloneTowers(state) {
  return state.map(tower => [...tower]);
}

async function autoSolve() {
  initGame();
  autoRunning = true;
  autoBtn.disabled = true;
  diskSelect.disabled = true;
  setMessage('自動解答中です。');

  const solution = getSolution(diskCount, 0, 1, 2);
  for (const [from, to] of solution) {
    await sleep(420);
    moveDisk(from, to, true);
    render();
  }

  autoRunning = false;
  autoBtn.disabled = false;
  diskSelect.disabled = false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

towerElements.forEach(towerEl => {
  const towerIndex = Number(towerEl.dataset.tower);
  towerEl.addEventListener('click', () => handleTowerClick(towerIndex));
  towerEl.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTowerClick(towerIndex);
    }
  });
});

diskSelect.addEventListener('change', initGame);
resetBtn.addEventListener('click', initGame);
hintBtn.addEventListener('click', showHint);
autoBtn.addEventListener('click', autoSolve);
closeModalBtn.addEventListener('click', () => {
  clearModal.hidden = true;
});

initGame();
