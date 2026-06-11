const doorCountRange = document.getElementById('doorCount');
const doorCountNumber = document.getElementById('doorCountNumber');
const doorCountText = document.getElementById('doorCountText');
const probabilityText = document.getElementById('probabilityText');
const initialProbability = document.getElementById('initialProbability');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const doorsEl = document.getElementById('doors');
const stepText = document.getElementById('stepText');
const firstChoiceText = document.getElementById('firstChoiceText');
const remainingText = document.getElementById('remainingText');
const message = document.getElementById('message');
const switchPanel = document.getElementById('switchPanel');
const switchRateText = document.getElementById('switchRateText');
const stayBtn = document.getElementById('stayBtn');
const switchBtn = document.getElementById('switchBtn');
const resultPanel = document.getElementById('resultPanel');
const resultBadge = document.getElementById('resultBadge');
const resultText = document.getElementById('resultText');
const playAgainBtn = document.getElementById('playAgainBtn');

let state = {
  doorCount: 5,
  prizeDoor: null,
  firstChoice: null,
  finalChoice: null,
  remainingDoors: [],
  openedDoors: [],
  phase: 'setup'
};

function randomInt(max) {
  return Math.floor(Math.random() * max) + 1;
}

function clampDoorCount(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 3;
  return Math.max(3, Math.min(100, Math.floor(n)));
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function updateProbability() {
  state.doorCount = clampDoorCount(doorCountNumber.value);
  if (state.doorCount <= 30) doorCountRange.value = state.doorCount;
  doorCountNumber.value = state.doorCount;

  const probability = 1 / state.doorCount;
  doorCountText.textContent = state.doorCount;
  probabilityText.textContent = formatPercent(probability);
  initialProbability.textContent = formatPercent(probability);
  switchRateText.textContent = formatPercent((state.doorCount - 1) / state.doorCount / 2);
}

function resetGame(keepDoorCount = true) {
  const count = keepDoorCount ? clampDoorCount(doorCountNumber.value) : 5;
  state = {
    doorCount: count,
    prizeDoor: null,
    firstChoice: null,
    finalChoice: null,
    remainingDoors: [],
    openedDoors: [],
    phase: 'setup'
  };
  doorCountNumber.value = count;
  if (count <= 30) doorCountRange.value = count;
  updateProbability();
  doorsEl.innerHTML = '';
  stepText.textContent = 'ドア数を選んでください';
  firstChoiceText.textContent = '未選択';
  remainingText.textContent = '-';
  message.textContent = 'ドア数を選んで「ゲーム開始」を押してください。';
  switchPanel.classList.add('hidden');
  resultPanel.classList.add('hidden');
}

function startGame() {
  updateProbability();
  state.prizeDoor = randomInt(state.doorCount);
  state.firstChoice = null;
  state.finalChoice = null;
  state.remainingDoors = [];
  state.openedDoors = [];
  state.phase = 'selecting';

  switchPanel.classList.add('hidden');
  resultPanel.classList.add('hidden');
  stepText.textContent = '最初のドアを選択中';
  firstChoiceText.textContent = '未選択';
  remainingText.textContent = '-';
  message.textContent = `ドアは${state.doorCount}枚です。最初に当たりを選ぶ確率は ${formatPercent(1 / state.doorCount)} です。好きなドアを1枚選んでください。`;
  renderDoors();
}

function renderDoors(reveal = false) {
  doorsEl.innerHTML = '';

  for (let i = 1; i <= state.doorCount; i++) {
    const door = document.createElement('button');
    door.className = 'door';
    door.type = 'button';
    door.textContent = i;
    door.dataset.door = i;

    if (state.firstChoice === i) door.classList.add('selected');
    if (state.finalChoice === i) door.classList.add('final-selected');
    if (state.openedDoors.includes(i)) door.classList.add('opened');

    if (reveal) {
      if (i === state.prizeDoor) {
        door.classList.add('win');
        door.textContent = `★ ${i}`;
      } else if (i === state.finalChoice) {
        door.classList.add('lose-final');
      }
    }

    door.addEventListener('click', () => handleDoorClick(i));
    doorsEl.appendChild(door);
  }
}

function handleDoorClick(doorNumber) {
  if (state.phase !== 'selecting') return;
  chooseFirstDoor(doorNumber);
}

function chooseFirstDoor(doorNumber) {
  state.firstChoice = doorNumber;
  state.phase = 'switching';

  const keepDoors = new Set();
  keepDoors.add(state.firstChoice);
  keepDoors.add(state.prizeDoor);

  const loserCandidates = [];
  for (let i = 1; i <= state.doorCount; i++) {
    if (i !== state.firstChoice && i !== state.prizeDoor) loserCandidates.push(i);
  }

  // 主催者は「ユーザのドア」「当たりのドア」「ハズレのドア」の3枚を残す。
  // 最初の選択が当たりの場合は、ハズレドアを2枚残して合計3枚にする。
  while (keepDoors.size < 3 && loserCandidates.length > 0) {
    const index = Math.floor(Math.random() * loserCandidates.length);
    keepDoors.add(loserCandidates.splice(index, 1)[0]);
  }

  state.remainingDoors = Array.from(keepDoors).sort((a, b) => a - b);
  state.openedDoors = [];

  for (let i = 1; i <= state.doorCount; i++) {
    if (!keepDoors.has(i)) state.openedDoors.push(i);
  }

  firstChoiceText.textContent = `${state.firstChoice}番`;
  remainingText.textContent = state.remainingDoors.map(n => `${n}番`).join(' / ');
  stepText.textContent = '変更するか選択中';
  message.textContent = `あなたは${state.firstChoice}番を選びました。主催者がハズレのドアを開け、残りは ${state.remainingDoors.join('番・')}番 です。選択を変えるか決めてください。`;
  switchPanel.classList.remove('hidden');
  resultPanel.classList.add('hidden');
  renderDoors();
}

function stay() {
  if (state.phase !== 'switching') return;
  state.finalChoice = state.firstChoice;
  finishGame(false);
}

function switchDoor() {
  if (state.phase !== 'switching') return;
  const switchCandidates = state.remainingDoors.filter(n => n !== state.firstChoice);
  const selected = window.prompt(
    `変更先のドア番号を入力してください。候補：${switchCandidates.join(', ')}`,
    String(switchCandidates[0])
  );

  const selectedNumber = Number(selected);
  if (!switchCandidates.includes(selectedNumber)) {
    message.textContent = `変更先は ${switchCandidates.join('番・')}番 の中から選んでください。`;
    return;
  }

  state.finalChoice = selectedNumber;
  finishGame(true);
}

function finishGame(switched) {
  state.phase = 'finished';
  const isWin = state.finalChoice === state.prizeDoor;

  stepText.textContent = '結果表示';
  remainingText.textContent = state.remainingDoors.map(n => `${n}番`).join(' / ');
  switchPanel.classList.add('hidden');
  resultPanel.classList.remove('hidden');

  resultBadge.className = `result-badge ${isWin ? 'success' : 'danger'}`;
  resultBadge.textContent = isWin ? '当' : '外';

  const actionText = switched ? '選択を変更しました' : '最初の選択を維持しました';
  resultText.innerHTML = `
    ${actionText}。<br>
    最初の選択：<strong>${state.firstChoice}番</strong><br>
    最終選択：<strong>${state.finalChoice}番</strong><br>
    当たりのドア：<strong>${state.prizeDoor}番</strong><br>
    結果：<strong>${isWin ? '当たりです！' : 'ハズレです。'}</strong>
  `;

  message.textContent = isWin
    ? 'おめでとうございます。当たりのドアを選びました。'
    : '残念。当たりのドアではありませんでした。もう一度試してみましょう。';

  renderDoors(true);
}

doorCountRange.addEventListener('input', () => {
  doorCountNumber.value = doorCountRange.value;
  updateProbability();
});

doorCountNumber.addEventListener('input', updateProbability);
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', () => resetGame(true));
stayBtn.addEventListener('click', stay);
switchBtn.addEventListener('click', switchDoor);
playAgainBtn.addEventListener('click', startGame);

updateProbability();
