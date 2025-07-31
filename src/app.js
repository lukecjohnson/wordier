import { puzzles } from './puzzles';
import { words } from './words';

const elements = {
  tiles: {
    puzzle: document.querySelectorAll('#board .tile'),
    tutorial: document.querySelectorAll('#help-tutorial .tile'),
  },
  header: {
    stats: document.querySelector('#header-stats'),
    help: document.querySelector('#header-help'),
  },
  footer: {
    button: document.querySelector('#footer-button'),
    countdown: document.querySelector('#footer-countdown-time'),
  },
  stats: {
    dialog: document.querySelector('#stats-dialog'),
    moves: document.querySelector('#stats-moves'),
    avg: document.querySelector('#stats-avg'),
    solved: document.querySelector('#stats-solved'),
    rate: document.querySelector('#stats-rate'),
    share: document.querySelector('#stats-share'),
  },
  help: {
    dialog: document.querySelector('#help-dialog'),
    button: document.querySelector('#help-button'),
  },
  counter: {
    root: document.querySelector('#counter'),
    value: {
      tens: document.querySelector('#counter-value-tens'),
      ones: document.querySelector('#counter-value-ones'),
    },
  },
};

const date = new Date().toLocaleDateString('en-CA');
const restored = date === localStorage.getItem('date');
localStorage.setItem('date', date);

const state = {
  history: JSON.parse(localStorage.getItem('history')) ?? {},
  moves: (restored && +localStorage.getItem('moves')) || 0,
  solved: new Set(),
  boards: {
    puzzle: {
      tiles:
        (restored && JSON.parse(localStorage.getItem('tiles'))) ||
        createTiles(puzzles[date]),
      elements: elements.tiles.puzzle,
    },
    tutorial: {
      tiles: createTiles('shdpeorare'),
      elements: elements.tiles.tutorial,
    },
    autoplay: {
      tiles: Array.from({ length: 25 }, (_, i) => getTilePos(i))
        .sort(() => 0.5 - Math.random())
        .map((pos, i) => ({ ...pos, value: puzzles[date][i] })),
      elements: elements.tiles.puzzle,
    },
  },
  get status() {
    return document.body.dataset.status;
  },
  set status(status) {
    document.body.dataset.status = status;
  },
  get tutorialStep() {
    return document.body.dataset.tutorialStep;
  },
  set tutorialStep(step) {
    document.body.dataset.tutorialStep = step;
  },
};

function getTilePos(i) {
  return {
    row: Math.max(Math.ceil(i / 5) - (i % 5 === 0 ? 0 : 1), 0),
    col: i % 5,
  };
}

function createTiles(letters) {
  return letters.split('').map((value, i) => ({ value, ...getTilePos(i) }));
}

function check(key, rows = [0, 1, 2, 3, 4]) {
  const board = state.boards[key];

  board.tiles
    .reduce((acc, { row, col, value }, i) => {
      if (rows.includes(row)) {
        acc[row] ??= { row, tiles: [], elements: [] };
        acc[row].tiles[col] = value;
        acc[row].elements.push(board.elements[i]);
      }
      return acc;
    }, [])
    .forEach(({ row, tiles, elements }) => {
      if (words[tiles.join('')]) {
        key === 'puzzle' && state.solved.add(row);
        elements.forEach((el) => el.classList.add('solved'));
      } else {
        key === 'puzzle' && state.solved.delete(row);
        elements.forEach((el) => el.classList.remove('solved'));
      }
    });

  if (
    key === 'puzzle' &&
    state.status === 'in-progress' &&
    (state.solved.size === 5 || state.moves === 50)
  ) {
    state.history[date] = state.solved.size === 5 ? state.moves : false;
    localStorage.setItem('history', JSON.stringify(state.history));
    renderStats();
    renderCountdown();
    state.status = state.solved.size === 5 ? 'solved' : 'failed';
    setTimeout(() => {
      elements.stats.dialog.showModal();
    }, 1000);
  }
}

function swap(key, i, x, y) {
  const board = state.boards[key];
  const j = board.tiles.findIndex(({ row, col }) => {
    return row === board.tiles[i].row + y && col === board.tiles[i].col + x;
  });

  const a = { tile: board.tiles[i], element: board.elements[i] };
  const b = { tile: board.tiles[j], element: board.elements[j] };

  [a.tile.row, b.tile.row] = [b.tile.row, a.tile.row];
  [a.tile.col, b.tile.col] = [b.tile.col, a.tile.col];

  a.element.style.setProperty('--row', a.tile.row);
  a.element.style.setProperty('--col', a.tile.col);
  b.element.style.setProperty('--row', b.tile.row);
  b.element.style.setProperty('--col', b.tile.col);

  switch (key) {
    case 'autoplay':
      return;
    case 'tutorial':
      if (
        state.tutorialStep === '1' &&
        ((i === 2 && y === 1) || (i === 7 && y === -1))
      ) {
        state.tutorialStep = '2';
      } else {
        state.tutorialStep = '0';
      }
      break;
    default:
      state.moves < 50 && state.moves++;
      renderCounter();
      localStorage.setItem('moves', state.moves);
      localStorage.setItem('tiles', JSON.stringify(board.tiles));
  }

  check(key, y === 0 ? [a.tile.row] : [a.tile.row, b.tile.row]);
}

function renderTiles(key) {
  const board = state.boards[key];

  board.elements.forEach((el, i) => {
    let origin;

    el.innerText = board.tiles[i].value;
    el.style.setProperty('--row', board.tiles[i].row);
    el.style.setProperty('--col', board.tiles[i].col);

    el.onpointerdown = (event) => {
      el.setPointerCapture(event.pointerId);
      origin = { x: event.clientX, y: event.clientY };
    };

    el.onpointermove = (event) => {
      if (!origin) return;
      const x = event.clientX - origin.x;
      const y = event.clientY - origin.y;

      el.style.zIndex = 10;
      el.style.animation = 'none';

      if (Math.abs(x) > Math.abs(y) && Math.abs(x) >= 10) {
        el.style.setProperty('--nudge-y', '0%');
        el.style.setProperty('--nudge-x', x > 0 ? '5%' : '-5%');
      } else if (Math.abs(y) >= 10) {
        el.style.setProperty('--nudge-x', '0%');
        el.style.setProperty('--nudge-y', y > 0 ? '5%' : '-5%');
      } else {
        el.style.setProperty('--nudge-x', '0%');
        el.style.setProperty('--nudge-y', '0%');
      }
    };

    el.onpointerup = (event) => {
      if (!origin) return;
      el.releasePointerCapture(event.pointerId);
      el.style.zIndex = 0;
      el.style.animation = '';
      el.style.setProperty('--nudge-x', '0%');
      el.style.setProperty('--nudge-y', '0%');

      const x = event.clientX - origin.x;
      const y = event.clientY - origin.y;
      origin = null;

      if (Math.abs(x) > Math.abs(y)) {
        if (x > 10 && board.tiles[i].col < 4) {
          swap(key, i, 1, 0);
        } else if (x < -10 && board.tiles[i].col > 0) {
          swap(key, i, -1, 0);
        }
      } else {
        if (y > 10 && board.tiles[i].row < 4) {
          swap(key, i, 0, 1);
        } else if (y < -10 && board.tiles[i].row > 0) {
          swap(key, i, 0, -1);
        }
      }
    };
  });
}

function renderStats() {
  const all = Object.values(state.history);
  const solved = all.filter((v) => !!v);
  const sum = solved.reduce((a, v) => a + v, 0);

  if (state.history[date]) {
    elements.stats.moves.textContent = state.history[date];
  }

  if (solved.length > 0) {
    elements.stats.avg.textContent = Math.round(sum / solved.length);
  }

  if (all.length > 0 && (all.length !== 1 || state.history[date] !== null)) {
    elements.stats.solved.textContent = solved.length;
    elements.stats.rate.textContent = `${Math.round((solved.length / all.length) * 100)}%`;
  }
}

function renderCounter() {
  const r = 50 - state.moves;
  const tens = Math.floor(r / 10);
  const ones = r % 10;

  elements.counter.value.tens.style.transform = `translateY(${tens * -10}%)`;
  elements.counter.value.ones.style.transform = `translateY(${ones * -10}%)`;
  r <= 10 && elements.counter.root.classList.add('warning');
}

function renderCountdown() {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  midnight.setDate(midnight.getDate() + 1);

  const update = () => {
    const min = Math.ceil((midnight.getTime() - Date.now()) / 60000);
    const hr = Math.round(min / 60);

    elements.footer.countdown.textContent =
      min <= 60
        ? `${min} minute${min === 1 ? '' : 's'}`
        : `${hr} hour${hr === 1 ? '' : 's'}`;
  };

  update();
  setTimeout(
    () => {
      update();
      setInterval(update, 60000);
    },
    60000 - (Date.now() % 60000),
  );
}

function start() {
  clearInterval(autoplay);
  renderTiles('puzzle');
  check('puzzle');
  state.status = 'in-progress';
  elements.help.dialog.close();
  state.history[date] = null;
  localStorage.setItem('history', JSON.stringify(state.history));
}

elements.header.stats.onclick = () => elements.stats.dialog.showModal();
elements.header.help.onclick = () => elements.help.dialog.showModal();
elements.help.dialog.onclose = () => delete document.body.dataset.onboarding;
elements.help.button.onclick = () => start();

elements.footer.button.onclick = () => {
  if (state.status === 'solved' || state.status === 'failed') {
    elements.stats.dialog.showModal();
  } else if (Object.keys(state.history).length === 0) {
    document.body.dataset.onboarding = '';
    elements.help.dialog.showModal();
  } else {
    start();
  }
};

elements.stats.share.onclick = async () => {
  await navigator.share({
    title: 'Play Wordier',
    url: 'https://wordier.xyz',
    text:
      state.solved.size === 5
        ? `I solved today's Wordier puzzle in ${state.moves} moves! Can you beat it?`
        : `I failed to solve today's Wordier puzzle. Can you solve it?`,
  });
};

let autoplay;
if (!Object.hasOwn(state.history, date) || state.history[date] === null) {
  state.status = Object.hasOwn(state.history, date) ? 'restored' : 'new';
  renderTiles('autoplay');
  setTimeout(() => {
    autoplay = setInterval(() => {
      const i = Math.floor(Math.random() * state.boards.autoplay.tiles.length);
      let [x, y] = Math.round(Math.random()) ? [1, 0] : [0, 1];

      if (x && state.boards.autoplay.tiles[i].col === 4) {
        x = -1;
      } else if (x && state.boards.autoplay.tiles[i].col > 0) {
        x = x * (Math.round(Math.random()) ? 1 : -1);
      } else if (y && state.boards.autoplay.tiles[i].row === 4) {
        y = -1;
      } else if (y && state.boards.autoplay.tiles[i].row > 0) {
        y = y * (Math.round(Math.random()) ? 1 : -1);
      }

      swap('autoplay', i, x, y);
    }, 500);
  }, 500);
} else {
  state.status = state.history[date] ? 'solved' : 'failed';
  renderTiles('puzzle');
  check('puzzle');
}

renderStats();
renderTiles('tutorial');
renderCounter();
renderCountdown();
document.body.dataset.canShare = !!navigator.share;
