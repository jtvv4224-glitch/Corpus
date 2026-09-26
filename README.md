# Corpus

A website about the Catholic faith. The design aims to feel like a cathedral (a rose window, lancet arches, candlelight, gold leaf, Latin inscriptions) while staying as restrained as an Apple product page.

This is the **skeleton**. The structure, design and interactions are in place, and the text is placeholder until real content is written.

## Run it

It's plain HTML, CSS and JavaScript with no build step.

```sh
npx serve .          # or: python3 -m http.server
```

Then open http://localhost:3000 (or :8000). Opening `index.html` directly in a browser also works.

## Files

```
index.html                 Home page: all the main sections
chapter.html               Template for a long-form chapter page
assets/css/style.css       All styles; design tokens live at the top in :root
assets/js/main.js          Interactions (progressive enhancement)
assets/img/rose-window.svg The hero's stained-glass rose window (generated)
assets/img/favicon.svg
tools/rose-window.mjs      Regenerates the rose window: node tools/rose-window.mjs
```

## Adding content

Every spot that needs real content is marked with an HTML comment. Search for:

```
CONTENT:
```

Home page sections, in order:

| Section | id | What goes there |
| --- | --- | --- |
| Hero | `#top` | Site title, subtitle, intro line, a verse, your name |
| Statement | `#statement` | Opening statement (lights up word by word on scroll) |
| The Faith | `#faith` | Six chapter cards, each linking to a chapter page |
| Sacraments | `#sacraments` | Swipeable carousel of the seven sacraments |
| Liturgical Year | `#year` | Scroll story through the seasons; today's season is marked automatically |
| Saints | `#saints` | Arched portrait cards (swap the initial for an `<img>`) |
| Prayer | `#prayer` | A prayer with a Latin / English toggle |
| History | `#history` | Timeline of milestones |

**To add a chapter page:** copy `chapter.html` (e.g. to `creed.html`), fill in its `CONTENT:` spots, and point the matching card in `index.html` at it. Keep the "On this page" links in sync with the `id`s of the `<h2>` headings.

**Images:** anything marked as a placeholder (`.ph`, `.saint__nimbus`, `.page-hero__window`) can be replaced with an `<img>`. Warm, low-key photography suits the look best: dark backgrounds with a single raking light source.

## Design

- **Palette** from the reference image: walnut wood, oxblood cloth, candle gold, and the jewel tones of stained glass. The accents double as liturgical colours (violet, white/gold, red, green). All colours are CSS variables in `:root`.
- **Type:** Cormorant Garamond for display, Inter/SF for UI and body text (loaded from Google Fonts).
- **Motif:** small two-line corner labels (`.label`) frame each section like the corners of an editorial poster.
- **Arches:** any element can become a pointed gothic arch with `mask: var(--arch) top / 100% auto no-repeat`.
- **Motion** respects `prefers-reduced-motion`, and everything still works with JavaScript turned off.

## Liturgical season

`main.js` works out the current season of the Roman calendar (Advent, Christmas, Lent, Paschal Triduum, Easter, Ordinary Time) from today's date, using the Gregorian Easter algorithm. It sets the accent colour and the season labels. It's simplified: it doesn't account for local transfers of feasts such as Epiphany.

## Deploy

GitHub Pages works as is: *Settings → Pages → Deploy from a branch → `/ (root)`*.
