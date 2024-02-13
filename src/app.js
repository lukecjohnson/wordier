import { words } from './words';
import { puzzles } from './puzzles';

const elements = {
  board: document.querySelector('.board'),
  letters: document.querySelectorAll('.letter'),
  start: {
    root: document.querySelector('.start'),
    button: document.querySelector('.start .button'),
  },
  clock: {
    root: document.querySelector('.clock'),
    button: document.querySelector('.clock-button'),
    time: document.querySelector('.clock-time'),
  },
};

const persistedDate = localStorage.getItem('date');
const date = new Date().toISOString().split('T')[0];

const state = {
  letters:
    date === persistedDate
      ? JSON.parse(localStorage.getItem('letters'))
      : puzzles[date],
  time: date === persistedDate ? +localStorage.getItem('time') : 0,
  history: JSON.parse(localStorage.getItem('history')) ?? {},
  started: false,
  paused: false,
  intervals: {
    clock: null,
    autoplay: null,
  },
};

localStorage.setItem('date', date);
localStorage.setItem('letters', JSON.stringify(state.letters));
localStorage.setItem('time', state.time);

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

function checkRows(rows) {
  const solved = new Set();

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
      console.log(row, letters);
      if (words[letters.join('')]) {
        solved.add(row);
        elements.forEach((el) => el.classList.add('solved'));
      } else {
        solved.delete(row);
        elements.forEach((el) => el.classList.remove('solved'));
      }
    });

  if (solved.size === 5 && state.started) {
    stopClock();
    state.history[date] = state.time;
    localStorage.setItem('history', JSON.stringify(state.history));
    setTimeout(() => {
      alert(`You solved the puzzle in ${formatTime(state.time)}!`);
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
        event.currentTarget.style.boxShadow =
          '0px 0px 8px 2px rgba(0, 0, 0, 0.25)';
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

        event.currentTarget.style.zIndex = 0;
        event.currentTarget.style.boxShadow = '';
        event.currentTarget.style.animation = '';
        event.currentTarget.style.setProperty('--nudge-x', '0%');
        event.currentTarget.style.setProperty('--nudge-y', '0%');
      };
    }
  });
}

function startGame() {
  state.started = true;
  renderLetters(state.letters, true);
  checkRows([0, 1, 2, 3, 4]);
  elements.start.root.classList.add('hidden');
  elements.clock.root.classList.remove('hidden');
  clearInterval(state.intervals.autoplay);
  state.intervals.autoplay = null;
  startClock();
  state.history[date] = null;
  localStorage.setItem('history', JSON.stringify(state.history));
}

if (!state.history[date]) {
  const randomLetters = Array.from({ length: 25 }, (_, i) => ({
    row: Math.max(Math.ceil(i / 5) - (i % 5 === 0 ? 0 : 1), 0),
    col: i % 5,
  }))
    .sort(() => 0.5 - Math.random())
    .map((position, i) => ({
      ...position,
      value:
        i < 10
          ? state.letters[i].value
          : 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)],
    }));

  renderLetters(randomLetters);

  state.intervals.autoplay = setInterval(() => {
    const i = Math.floor(Math.random() * randomLetters.length);
    let [x, y] = Math.round(Math.random()) ? [1, 0] : [0, 1];

    if (x && randomLetters[i].col === 4) {
      x = -1;
    } else if (x && randomLetters[i].col > 0) {
      x = x * (Math.round(Math.random()) ? 1 : -1);
    } else if (y && randomLetters[i].row === 4) {
      y = -1;
    } else if (y && randomLetters[i].row > 0) {
      y = y * (Math.round(Math.random()) ? 1 : -1);
    }

    swap(randomLetters, i, x, y, false, false);
  }, 500);
} else {
  renderLetters(state.letters);
  checkRows([0, 1, 2, 3, 4]);
}

if (state.time > 0) {
  elements.start.button.textContent = 'Continue playing';
}

elements.start.button.onclick = () => {
  if (!state.history[date]) {
    startGame();
  }
};

elements.clock.time.textContent = formatTime(state.time);

elements.clock.button.onclick = () => {
  if (state.paused) {
    startClock();
  } else {
    stopClock(true);
  }
};

document.onvisibilitychange = () => {
  if (document.visibilityState === 'hidden') {
    stopClock();
  } else if (state.started && !state.paused && !state.history[date]) {
    startClock();
  }
};
