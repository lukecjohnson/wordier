import { inject as injectAnalyticsScript } from '@vercel/analytics';
import { puzzles } from './puzzles';
import { words } from './words';

function getTilePos(i) {
  return {
    row: Math.max(Math.ceil(i / 5) - (i % 5 === 0 ? 0 : 1), 0),
    col: i % 5,
  };
}

const persistedDate = localStorage.getItem('date');
const date = new Date().toISOString().split('T')[0];
const initialTiles = puzzles[date].map((value, i) => ({
  value,
  ...getTilePos(i),
}));

const state = {
  tiles: {
    puzzle:
      date === persistedDate
        ? JSON.parse(localStorage.getItem('tiles'))
        : initialTiles,
    demo: [
      { value: 's', row: 0, col: 0 },
      { value: 'h', row: 0, col: 1 },
      { value: 'd', row: 0, col: 2 },
      { value: 'p', row: 0, col: 3 },
      { value: 'e', row: 0, col: 4 },
      { value: 'o', row: 1, col: 0 },
      { value: 'r', row: 1, col: 1 },
      { value: 'a', row: 1, col: 2 },
      { value: 'r', row: 1, col: 3 },
      { value: 'e', row: 1, col: 4 },
    ],
    random: Array.from({ length: 25 }, (_, i) => getTilePos(i))
      .sort(() => 0.5 - Math.random())
      .map((pos, i) => ({
        ...pos,
        value:
          i < 10
            ? initialTiles[i].value
            : 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)],
      })),
  },
  time: date === persistedDate ? +localStorage.getItem('time') : 0,
  history: JSON.parse(localStorage.getItem('history')) ?? {},
  solvedRows: new Set(),
  started: false,
  paused: false,
  intervals: {
    clock: null,
    autoplay: null,
  },
};

const elements = {
  board: {
    root: document.querySelector('#board'),
    tiles: document.querySelectorAll('#board .tile'),
  },
  start: {
    root: document.querySelector('#start'),
    button: document.querySelector('#start-button'),
    countdown: document.querySelector('#start-countdown'),
  },
  clock: {
    root: document.querySelector('#clock'),
    button: document.querySelector('#clock-button'),
    time: document.querySelector('#clock-time'),
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
  help: {
    dialog: document.querySelector('#help-dialog'),
    buttons: {
      open: document.querySelector('#help-button-open'),
      close: document.querySelector('#help-button-close'),
      play: document.querySelector('#help-button-play'),
    },
    demo: {
      root: document.querySelector('#help-demo'),
      tiles: document.querySelectorAll('#help-demo .tile'),
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
  elements.board.root.classList.remove('blurred');
}

function stopClock(pause = false) {
  clearInterval(state.intervals.clock);
  state.intervals.clock = null;
  if (pause) {
    state.paused = true;
    elements.clock.root.classList.add('paused');
    elements.board.root.classList.add('blurred');
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

  elements.stats.buttons.share.style.display = state.history[date] && navigator.share 
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

function openHelpDialog() {
  elements.help.dialog.showModal();
  if (state.started && !state.history[date]) {
    stopClock(true);
  }
}

function closeHelpDialog() {
  elements.help.dialog.close();

  if (state.paused && !state.history[date]) {
    startClock();
  }

  if (!state.started) {
    elements.help.buttons.play.textContent = 'Play';
  }
}

function checkRows(key, rows) {
  const tileElements = key === 'demo' 
    ? elements.help.demo.tiles 
    : elements.board.tiles;

  state.tiles[key]
    .reduce((acc, { row, col, value }, i) => {
      if (rows.includes(row)) {
        acc[row] ??= { row, tiles: [], elements: [] };
        acc[row].tiles[col] = value;
        acc[row].elements.push(tileElements[i]);
      }
      return acc;
    }, [])
    .forEach(({ row, tiles, elements }) => {
      if (words[tiles.join('')]) {
        key === 'puzzle' && state.solvedRows.add(row);
        elements.forEach((el) => el.classList.add('solved'));
      } else {
        key === 'puzzle' && state.solvedRows.delete(row);
        elements.forEach((el) => el.classList.remove('solved'));
      }
    });

  if (key === 'puzzle' && state.solvedRows.size === 5 && state.started) {
    stopClock();
    state.history[date] = state.time;
    localStorage.setItem('history', JSON.stringify(state.history));
    elements.start.button.textContent = 'View stats';
    elements.help.buttons.play.style.display = 'none';
    renderStats();
    renderCountdown();
    setTimeout(() => {
      openStatsDialog();
      elements.start.root.classList.remove('hidden');
      elements.clock.root.classList.add('hidden');
    }, 1000);
  }
}

function swapTiles(key, a, x, y) {
  const tiles = state.tiles[key];
  const tileElements = key === 'demo' 
    ? elements.help.demo.tiles 
    : elements.board.tiles;

  const b = tiles.findIndex(({ row, col }) => {
    return row === tiles[a].row + y && col === tiles[a].col + x;
  });

  tileElements[a].style.setProperty('--row', tiles[b].row);
  tileElements[a].style.setProperty('--col', tiles[b].col);
  tileElements[b].style.setProperty('--row', tiles[a].row);
  tileElements[b].style.setProperty('--col', tiles[a].col);

  [tiles[a].row, tiles[b].row] = [tiles[b].row, tiles[a].row];
  [tiles[a].col, tiles[b].col] = [tiles[b].col, tiles[a].col];

  if (key === 'puzzle') {
    localStorage.setItem('tiles', JSON.stringify(tiles));
  }

  if (key === 'demo') {
    elements.help.demo.root.dataset.nudge = (
      elements.help.demo.root.dataset.nudge === '1' &&
      ((a === 2 && y === 1) || (a === 7 && y === -1))
    ) ? '2' : '0';
  }

  if (key === 'puzzle' || key === 'demo') {
    checkRows(key, y === 0 ? [tiles[a].row] : [tiles[a].row, tiles[b].row]);
  }
}

function renderTiles(key, handleEvents) {
  const tiles = state.tiles[key];
  const tileElements = key === 'demo' 
    ? elements.help.demo.tiles 
    : elements.board.tiles;

  tileElements.forEach((tile, i) => {
    tile.innerText = tiles[i].value;
    tile.style.setProperty('--row', tiles[i].row);
    tile.style.setProperty('--col', tiles[i].col);

    if (handleEvents) {
      let origin;

      tile.onpointerdown = (event) => {
        tile.setPointerCapture(event.pointerId);
        origin = { x: event.clientX, y: event.clientY };
      };

      tile.onpointermove = (event) => {
        if (!origin) {
          return;
        }

        tile.style.zIndex = 10;
        tile.style.boxShadow = '0px 0px 8px 2px rgba(23, 23, 23, 0.25)';
        tile.style.animation = 'none';

        const x = event.clientX - origin.x;
        const y = event.clientY - origin.y;

        if (Math.abs(x) > Math.abs(y)) {
          tile.style.setProperty('--nudge-y', '0%');
          tile.style.setProperty('--nudge-x', x > 0 ? '5%' : '-5%');
        } else {
          tile.style.setProperty('--nudge-x', '0%');
          tile.style.setProperty('--nudge-y', y > 0 ? '5%' : '-5%');
        }
      };

      tile.onpointerup = (event) => {
        tile.releasePointerCapture(event.pointerId);

        tile.style.zIndex = 0;
        tile.style.boxShadow = '';
        tile.style.animation = '';
        tile.style.setProperty('--nudge-x', '0%');
        tile.style.setProperty('--nudge-y', '0%');

        if (
          key !== 'demo' &&
          (!state.started || state.paused || state.history[date])
        ) {
          return;
        }

        const x = event.clientX - origin.x;
        const y = event.clientY - origin.y;

        if (Math.abs(x) > Math.abs(y)) {
          if (x > 10 && tiles[i].col < 4) {
            swapTiles(key, i, 1, 0);
          } else if (x < -10 && tiles[i].col > 0) {
            swapTiles(key, i, -1, 0);
          }
        } else {
          if (y > 10 && tiles[i].row < 4) {
            swapTiles(key, i, 0, 1);
          } else if (y < -10 && tiles[i].row > 0) {
            swapTiles(key, i, 0, -1);
          }
        }

        origin = null;
      };
    }
  });
}

function startAutoplay() {
  renderTiles('random');
  setTimeout(() => {
    state.intervals.autoplay = setInterval(() => {
      const i = Math.floor(Math.random() * state.tiles.random.length);
      let [x, y] = Math.round(Math.random()) ? [1, 0] : [0, 1];

      if (x && state.tiles.random[i].col === 4) {
        x = -1;
      } else if (x && state.tiles.random[i].col > 0) {
        x = x * (Math.round(Math.random()) ? 1 : -1);
      } else if (y && state.tiles.random[i].row === 4) {
        y = -1;
      } else if (y && state.tiles.random[i].row > 0) {
        y = y * (Math.round(Math.random()) ? 1 : -1);
      }

      swapTiles('random', i, x, y);
    }, 500);
  }, 500);
}

function stopAutoplay() {
  clearInterval(state.intervals.autoplay);
  state.intervals.autoplay = null;
}

function startGame() {
  renderTiles('puzzle', true);
  checkRows('puzzle', [0, 1, 2, 3, 4]);
  stopAutoplay();
  startClock();
  elements.start.root.classList.add('hidden');
  elements.clock.root.classList.remove('hidden');
  elements.help.buttons.play.textContent = 'Continue';
  state.started = true;
  state.history[date] = null;
  localStorage.setItem('history', JSON.stringify(state.history));
}

function renderCountdown() {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(5, 0, 0, 0);

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

function share() {
  navigator.share({
    title: 'Play Wordier',
    url: 'https://wordier.xyz',
    text: `I solved today's Wordier puzzle in ${formatTime(
      state.history[date],
    )}! Can you beat it?`,
  });
}

function handleStartButtonClick() {
  if (state.history[date]) {
    openStatsDialog();
  } else if (Object.keys(state.history).length === 0) {
    elements.help.buttons.play.textContent = 'Continue';
    openHelpDialog();
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

function handleHelpPlayButtonClick() {
  closeHelpDialog();
  if (!state.started) {
    startGame();
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
    renderTiles('puzzle');
    checkRows('puzzle', [0, 1, 2, 3, 4]);
    elements.start.button.textContent = 'View stats';
    elements.help.buttons.play.style.display = 'none';
  } else {
    startAutoplay();
    if (state.time > 0) {
      elements.start.button.textContent = 'Continue playing';
    }
  }

  startCountdown();
  renderStats();
  renderTiles('demo', true);

  elements.clock.time.textContent = formatTime(state.time);
  elements.start.button.onclick = handleStartButtonClick;
  elements.stats.buttons.open.onclick = openStatsDialog;
  elements.stats.buttons.close.onclick = closeStatsDialog;
  elements.stats.buttons.share.onclick = share;
  elements.help.buttons.open.onclick = openHelpDialog;
  elements.help.buttons.close.onclick = closeHelpDialog;
  elements.help.buttons.play.onclick = handleHelpPlayButtonClick;
  elements.clock.button.onclick = handleClockButtonClick;
  document.onvisibilitychange = handleVisibilityChange;

  localStorage.setItem('date', date);
  localStorage.setItem('tiles', JSON.stringify(state.tiles.puzzle));
  localStorage.setItem('time', state.time);

  injectAnalyticsScript();
}

document.addEventListener('DOMContentLoaded', init);
