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

let audioContext = null;
let activeOscillators = [];

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

function getAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) return null;
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function stopActiveSounds() {
  activeOscillators.forEach(oscillator => oscillator.stop());
  activeOscillators = [];
}

function playTone(frequency, startTime, duration, options = {}) {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = options.type || 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(options.volume || 0.08, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.addEventListener('ended', () => {
    activeOscillators = activeOscillators.filter(active => active !== oscillator);
  });
  activeOscillators.push(oscillator);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function playMelody(notes, options = {}) {
  const context = getAudioContext();
  if (!context) return;
  stopActiveSounds();

  const startTime = context.currentTime + 0.02;
  let cursor = startTime;
  notes.forEach(note => {
    if (note.frequency) {
      playTone(note.frequency, cursor, note.duration, options);
    }
    cursor += note.duration + (note.gap || 0.03);
  });
}

function playDoorSelectionBgm() {
  playMelody([
    { frequency: 392, duration: 0.12 },
    { frequency: 494, duration: 0.12 },
    { frequency: 587, duration: 0.12 },
    { frequency: 784, duration: 0.18 },
    { frequency: 587, duration: 0.12 },
    { frequency: 494, duration: 0.16 }
  ], { type: 'triangle', volume: 0.06 });
}

function playWinBgm() {
  playMelody([
    { frequency: 523.25, duration: 0.12 },
    { frequency: 659.25, duration: 0.12 },
    { frequency: 783.99, duration: 0.12 },
    { frequency: 1046.5, duration: 0.28 },
    { frequency: 783.99, duration: 0.12 },
    { frequency: 1046.5, duration: 0.42 }
  ], { type: 'square', volume: 0.07 });
}

function playLoseBgm() {
  playMelody([
    { frequency: 392, duration: 0.18 },
    { frequency: 349.23, duration: 0.18 },
    { frequency: 329.63, duration: 0.18 },
    { frequency: 261.63, duration: 0.42 }
  ], { type: 'sawtooth', volume: 0.045 });
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 1;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

function speakGameIntro() {
  const probability = formatPercent(1 / state.doorCount);
  speak(
    `問題です。${state.doorCount}枚のドアのうち、当たりは1枚だけです。` +
    `まず好きなドアを1枚選んでください。` +
    `いま当たりを選ぶ確率は${probability}です。`
  );
}

function speakSwitchPrompt() {
  speak('選択を変えますか？');
}

function speakResult(isWin) {
  speak(isWin ? '当たり。おめでとう。' : 'はずれ。');
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
  stopActiveSounds();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
  getAudioContext();
  speakGameIntro();
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

    const isOpened = state.openedDoors.includes(i);
    const isSwitchCandidate = state.phase === 'switching' && state.remainingDoors.includes(i);

    if (state.firstChoice === i) door.classList.add('selected');
    if (state.finalChoice === i) door.classList.add('final-selected');
    if (isOpened) door.classList.add('opened');
    if (isSwitchCandidate) door.classList.add('switch-candidate');

    if (isOpened || (state.phase === 'switching' && !isSwitchCandidate)) {
      door.disabled = true;
    }

    if (state.phase === 'switching') {
      door.setAttribute(
        'aria-label',
        state.firstChoice === i
          ? `${i}番のドア。最初の選択を維持する`
          : `${i}番のドアへ変更する`
      );
    }

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
  if (state.phase === 'selecting') {
    chooseFirstDoor(doorNumber);
    return;
  }

  if (state.phase !== 'switching' || !state.remainingDoors.includes(doorNumber)) return;

  if (doorNumber === state.firstChoice) {
    stay();
    return;
  }

  chooseFinalDoor(doorNumber);
}

function chooseFirstDoor(doorNumber) {
  playDoorSelectionBgm();
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
  message.textContent = `あなたは${state.firstChoice}番を選びました。主催者がハズレのドアを開け、残りは ${state.remainingDoors.join('番・')}番 です。選択を変えるか決めてください。残ったドアのイラストをクリックして最終選択できます。`;
  speakSwitchPrompt();
  switchPanel.classList.remove('hidden');
  resultPanel.classList.add('hidden');
  renderDoors();
}

function stay() {
  if (state.phase !== 'switching') return;
  state.finalChoice = state.firstChoice;
  finishGame(false);
}

function chooseFinalDoor(doorNumber) {
  state.finalChoice = doorNumber;
  finishGame(doorNumber !== state.firstChoice);
}

function switchDoor() {
  if (state.phase !== 'switching') return;
  const switchCandidates = state.remainingDoors.filter(n => n !== state.firstChoice);
  message.textContent = `変更する場合は、${switchCandidates.join('番・')}番 のドアイラストをクリックしてください。`;
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

  if (isWin) {
    playWinBgm();
  } else {
    playLoseBgm();
  }
  speakResult(isWin);

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
