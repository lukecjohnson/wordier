# Wordier

[Wordier](https://wordier.xyz) is a daily word game where you unscramble a 5×5
grid of letter tiles to make a valid 5-letter word with each row in 50 moves or less.

## Development

Wordier is built with vanilla HTML, CSS, and JavaScript. [esbuild](https://github.com/evanw/esbuild)
is used for bundling, transpilation, and minification. Run `npm run build` for
a production build or `npm run dev` to start a local development server.
Commits to `main` are automatically deployed via [Cloudflare Pages](https://pages.cloudflare.com).
