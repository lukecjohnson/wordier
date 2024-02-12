import { words } from './words';

const elements = {
  letters: document.querySelectorAll('.letter'),
};

const letters = [
  { row: 0, col: 0, value: 'h' },
  { row: 0, col: 1, value: 't' },
  { row: 0, col: 2, value: 'o' },
  { row: 0, col: 3, value: 'r' },
  { row: 0, col: 4, value: 't' },
  { row: 1, col: 0, value: 't' },
  { row: 1, col: 1, value: 'n' },
  { row: 1, col: 2, value: 'e' },
  { row: 1, col: 3, value: 'o' },
  { row: 1, col: 4, value: 'h' },
  { row: 2, col: 0, value: 't' },
  { row: 2, col: 1, value: 'a' },
  { row: 2, col: 2, value: 'f' },
  { row: 2, col: 3, value: 's' },
  { row: 2, col: 4, value: 'a' },
  { row: 3, col: 0, value: 'l' },
  { row: 3, col: 1, value: 'f' },
  { row: 3, col: 2, value: 'e' },
  { row: 3, col: 3, value: 't' },
  { row: 3, col: 4, value: 's' },
  { row: 4, col: 0, value: 'e' },
  { row: 4, col: 1, value: 'a' },
  { row: 4, col: 2, value: 'p' },
  { row: 4, col: 3, value: 'u' },
  { row: 4, col: 4, value: 'o' },
];

const solvedRows = new Set();

function checkRows(rows) {
  letters
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
        solvedRows.add(row);
        elements.forEach((el) => el.classList.add('solved'));
      } else {
        solvedRows.delete(row);
        elements.forEach((el) => el.classList.remove('solved'));
      }
    });

  if (solvedRows.size === 5) {
    console.log('yay!');
  }
}

function swapLetters(a, x, y) {
  const b = letters.findIndex(({ row, col }) => {
    return row === letters[a].row + y && col === letters[a].col + x;
  });

  elements.letters[a].style.setProperty('--row', letters[b].row);
  elements.letters[a].style.setProperty('--col', letters[b].col);
  elements.letters[b].style.setProperty('--row', letters[a].row);
  elements.letters[b].style.setProperty('--col', letters[a].col);

  [letters[a].row, letters[b].row] = [letters[b].row, letters[a].row];
  [letters[a].col, letters[b].col] = [letters[b].col, letters[a].col];

  checkRows(y === 0 ? [letters[a].row] : [letters[a].row, letters[b].row]);
}

elements.letters.forEach((letter, i) => {
  letter.className = 'letter';
  letter.innerText = letters[i].value;
  letter.style.setProperty('--row', letters[i].row);
  letter.style.setProperty('--col', letters[i].col);

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
      event.currentTarget.style.setProperty('--nudge-x', x > 0 ? '5%' : '-5%');
    } else {
      event.currentTarget.style.setProperty('--nudge-x', '0%');
      event.currentTarget.style.setProperty('--nudge-y', y > 0 ? '5%' : '-5%');
    }
  };

  letter.ontouchend = (event) => {
    const x = event.changedTouches[0].clientX - origin.x;
    const y = event.changedTouches[0].clientY - origin.y;

    if (Math.abs(x) > Math.abs(y)) {
      if (x > 10 && letters[i].col < 4) {
        swapLetters(i, 1, 0);
      } else if (x < -10 && letters[i].col > 0) {
        swapLetters(i, -1, 0);
      }
    } else {
      if (y > 10 && letters[i].row < 4) {
        swapLetters(i, 0, 1);
      } else if (y < -10 && letters[i].row > 0) {
        swapLetters(i, 0, -1);
      }
    }

    event.currentTarget.style.zIndex = 0;
    event.currentTarget.style.boxShadow = '';
    event.currentTarget.style.animation = '';
    event.currentTarget.style.setProperty('--nudge-x', '0%');
    event.currentTarget.style.setProperty('--nudge-y', '0%');
  };
});
