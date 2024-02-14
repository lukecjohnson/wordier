import { puzzles } from './puzzles';
import { words } from './words';

const persistedDate = localStorage.getItem('date');
const date = new Date().toISOString().split('T')[0];

const state = {
  letters: date === persistedDate
    ? JSON.parse(localStorage.getItem('letters'))
    : puzzles[date],
  time: date === persistedDate ? +localStorage.getItem('time') : 0,
  history: JSON.parse(localStorage.getItem('history')) ?? {},
  solvedRows: new Set(),
  started: false,
  paused: false,
  intervals: { clock: null, autoplay: null },
};

const elements = {
  board: document.querySelector('.board'),
  letters: document.querySelectorAll('.letter'),
  start: {
    root: document.querySelector('.start'),
    button: document.querySelector('.start .button'),
    countdown: document.querySelector('#start-countdown'),
  },
  clock: {
    root: document.querySelector('.clock'),
    button: document.querySelector('.clock-button'),
    time: document.querySelector('.clock-time'),
  },
  stats: {
    dialog: document.querySelector('#stats-dialog'),
    buttons: {
      open: document.querySelector('#stats-button-open'),
      close: document.querySelector('#stats-button-close'),
      share: document.querySelector('#stats-button-share'),
    },
    values: {
      today: document.querySelector('#stats-value-today'),
      average: document.querySelector('#stats-value-average'),
      solved: document.querySelector('#stats-value-solved'),
      rate: document.querySelector('#stats-value-rate'),
    },
  },
};

function formatTime(s) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function startClock() {
  state.intervals.clock = setInterval(() => {
    state.time++;
    localStorage.setItem('time', state.time);
    elements.clock.time.textContent = formatTime(state.time);
  }, 1000);
  state.paused = false;
  elements.clock.root.classList.remove('paused');
  elements.board.classList.remove('blurred');
}

function stopClock(pause = false) {
  clearInterval(state.intervals.clock);
  state.intervals.clock = null;
  if (pause) {
    state.paused = true;
    elements.clock.root.classList.add('paused');
    elements.board.classList.add('blurred');
  }
}

function renderStats() {
  const all = Object.values(state.history);
  const solved = all.filter((v) => v);
  const totalTime = solved.reduce((total, time) => total + time, 0);

  elements.stats.values.today.textContent = state.history[date]
    ? formatTime(state.history[date])
    : '-';

  elements.stats.values.average.textContent = solved.length > 0
    ? formatTime(Math.round(totalTime / solved.length))
    : '–';

  elements.stats.values.solved.textContent = solved.length > 0
    ? solved.length
    : '–';

  elements.stats.values.rate.textContent = solved.length > 0
    ? `${Math.round((solved.length / all.length) * 100)}%`
    : '–';

  elements.stats.buttons.share.style.display = history[date] && navigator.share
    ? ''
    : 'none';
}

function openStatsDialog() {
  elements.stats.dialog.showModal();
  if (state.started && !state.history[date]) {
    stopClock(true);
  }
}

function closeStatsDialog() {
  elements.stats.dialog.close();
  if (state.paused && !state.history[date]) {
    startClock();
  }
}

function checkRows(rows) {
  state.letters
    .reduce((acc, { row, col, value }, i) => {
      if (rows.includes(row)) {
        acc[row] ??= { row, letters: [], elements: [] };
        acc[row].letters[col] = value;
        acc[row].elements.push(elements.letters[i]);
      }
      return acc;
    }, [])
    .forEach(({ row, letters, elements }) => {
      if (words[letters.join('')]) {
        state.solvedRows.add(row);
        elements.forEach((el) => el.classList.add('solved'));
      } else {
        state.solvedRows.delete(row);
        elements.forEach((el) => el.classList.remove('solved'));
      }
    });

  if (state.solvedRows.size === 5 && state.started) {
    stopClock();
    state.history[date] = state.time;
    localStorage.setItem('history', JSON.stringify(state.history));
    elements.start.button.textContent = 'View stats';
    renderStats();
    setTimeout(() => {
      openStatsDialog();
      elements.start.root.classList.remove('hidden');
      elements.clock.root.classList.add('hidden');
    }, 1000);
  }
}

function swap(letters, a, x, y, check = true, persist = true) {
  const b = letters.findIndex(({ row, col }) => {
    return row === letters[a].row + y && col === letters[a].col + x;
  });

  elements.letters[a].style.setProperty('--row', letters[b].row);
  elements.letters[a].style.setProperty('--col', letters[b].col);
  elements.letters[b].style.setProperty('--row', letters[a].row);
  elements.letters[b].style.setProperty('--col', letters[a].col);

  [letters[a].row, letters[b].row] = [letters[b].row, letters[a].row];
  [letters[a].col, letters[b].col] = [letters[b].col, letters[a].col];

  if (persist) {
    localStorage.setItem('letters', JSON.stringify(letters));
  }

  if (check) {
    checkRows(y === 0 ? [letters[a].row] : [letters[a].row, letters[b].row]);
  }
}

function renderLetters(letters, handleEvents) {
  elements.letters.forEach((letter, i) => {
    letter.className = 'letter';
    letter.innerText = letters[i].value;
    letter.style.setProperty('--row', letters[i].row);
    letter.style.setProperty('--col', letters[i].col);

    if (handleEvents) {
      const origin = { x: 0, y: 0 };

      letter.ontouchstart = (event) => {
        origin.x = event.touches[0].clientX;
        origin.y = event.touches[0].clientY;
      };

      letter.ontouchmove = (event) => {
        event.currentTarget.style.zIndex = 10;
        event.currentTarget.style.boxShadow = '0px 0px 8px 2px rgba(0, 0, 0, 0.25)';
        event.currentTarget.style.animation = 'none';

        const x = event.changedTouches[0].clientX - origin.x;
        const y = event.changedTouches[0].clientY - origin.y;

        if (Math.abs(x) > Math.abs(y)) {
          event.currentTarget.style.setProperty('--nudge-y', '0%');
          event.currentTarget.style.setProperty(
            '--nudge-x',
            x > 0 ? '5%' : '-5%',
          );
        } else {
          event.currentTarget.style.setProperty('--nudge-x', '0%');
          event.currentTarget.style.setProperty(
            '--nudge-y',
            y > 0 ? '5%' : '-5%',
          );
        }
      };

      letter.ontouchend = (event) => {
        event.currentTarget.style.zIndex = 0;
        event.currentTarget.style.boxShadow = '';
        event.currentTarget.style.animation = '';
        event.currentTarget.style.setProperty('--nudge-x', '0%');
        event.currentTarget.style.setProperty('--nudge-y', '0%');

        if (!state.started || state.paused || state.history[date]) {
          return;
        }

        const x = event.changedTouches[0].clientX - origin.x;
        const y = event.changedTouches[0].clientY - origin.y;

        if (Math.abs(x) > Math.abs(y)) {
          if (x > 10 && letters[i].col < 4) {
            swap(letters, i, 1, 0);
          } else if (x < -10 && letters[i].col > 0) {
            swap(letters, i, -1, 0);
          }
        } else {
          if (y > 10 && letters[i].row < 4) {
            swap(letters, i, 0, 1);
          } else if (y < -10 && letters[i].row > 0) {
            swap(letters, i, 0, -1);
          }
        }
      };
    }
  });
}

function startAutoplay() {
  const letters = Array.from({ length: 25 }, (_, i) => ({
    row: Math.max(Math.ceil(i / 5) - (i % 5 === 0 ? 0 : 1), 0),
    col: i % 5,
  }))
    .sort(() => 0.5 - Math.random())
    .map((position, i) => ({
      ...position,
      value: i < 10
        ? state.letters[i].value
        : 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)],
    }));

  renderLetters(letters);

  state.intervals.autoplay = setInterval(() => {
    const i = Math.floor(Math.random() * letters.length);
    let [x, y] = Math.round(Math.random()) ? [1, 0] : [0, 1];

    if (x && letters[i].col === 4) {
      x = -1;
    } else if (x && letters[i].col > 0) {
      x = x * (Math.round(Math.random()) ? 1 : -1);
    } else if (y && letters[i].row === 4) {
      y = -1;
    } else if (y && letters[i].row > 0) {
      y = y * (Math.round(Math.random()) ? 1 : -1);
    }

    swap(letters, i, x, y, false, false);
  }, 500);
}

function stopAutoplay() {
  clearInterval(state.intervals.autoplay);
  state.intervals.autoplay = null;
}

function startGame() {
  renderLetters(state.letters, true);
  checkRows([0, 1, 2, 3, 4]);
  stopAutoplay();
  startClock();
  elements.start.root.classList.add('hidden');
  elements.clock.root.classList.remove('hidden');
  state.started = true;
  state.history[date] = null;
  localStorage.setItem('history', JSON.stringify(state.history));
}

function renderCountdown() {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const diff = Math.ceil((tomorrow.getTime() - Date.now()) / 60000);

  elements.start.countdown.textContent = (
    state.history[date]
      ? 'Next daily puzzle begins in '
      : "Today's puzzle ends in "
  ) + (
    diff <= 60
      ? `${diff} minutes`
      : `${Math.ceil(diff / 60)} hours`
  );
}

function startCountdown() {
  renderCountdown();
  setInterval(renderCountdown, 60000);
}

function handleStartButtonClick() {
  if (state.history[date]) {
    openStatsDialog();
  } else {
    startGame();
  }
}

function handleClockButtonClick() {
  if (state.paused) {
    startClock();
  } else {
    stopClock(true);
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    stopClock();
  } else if (state.started && !state.paused && !state.history[date]) {
    startClock();
  }
}

function init() {
  if (state.history[date]) {
    renderLetters(state.letters);
    checkRows([0, 1, 2, 3, 4]);
    elements.start.button.textContent = 'View stats';
  } else {
    startAutoplay();
    if (state.time > 0) {
      elements.start.button.textContent = 'Continue playing';
    }
  }

  startCountdown();
  renderStats();
  elements.clock.time.textContent = formatTime(state.time);
  elements.start.button.onclick = handleStartButtonClick;
  elements.stats.buttons.open.onclick = openStatsDialog;
  elements.stats.buttons.close.onclick = closeStatsDialog;
  elements.clock.button.onclick = handleClockButtonClick;
  document.onvisibilitychange = handleVisibilityChange;

  localStorage.setItem('date', date);
  localStorage.setItem('letters', JSON.stringify(state.letters));
  localStorage.setItem('time', state.time);
}

document.addEventListener('DOMContentLoaded', init);
