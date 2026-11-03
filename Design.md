\# Vermilion: Design Language Specification (Full Context)



\- \*\*System name:\*\* Vermilion (a reusable design language, not a copy of any product)

\- \*\*Version:\*\* 1 (2026-09-21)

\- \*\*Source:\*\* distilled from a reference marketing/portal interface (home, about, product, industry and FAQ pages); published as a Design System artifact.

\- \*\*Themes:\*\* one (`light`); dark grounds are expressed through `surface-inverse` tokens.

\- \*\*Font:\*\* Geist Variable (hosted), fallback `system-ui`; no logo is included.



\## How to read this document



This file is self-contained. It holds the overview and usage rules, the 13-part specification, the component guidelines and, in Appendix A, the verbatim `tokens.json`. Tokens are written in backticks (for example `brand`, `space-6`, `radius-md`) and compile to CSS custom properties named `--<token>`; for example `brand` is `var(--brand)`.



Evidence tags: text marked \*(derived)\* is an extension the reference implies but does not show (status colors, forms, tables, modals, focus, dark themes, responsive behavior, charts). Untagged rules were observed in the reference.



Contents: Overview and Usage Rules; 1. Visual Personality; 2. Color System; 3. Typography; 4. Layout Language; 5. Spacing System; 6. Shape Language; 7. Component Language; 8. Interaction Language; 9. Information Hierarchy; 10. Data Visualization; 11. Responsive Design; 12. Core Design Principles; 13. Design Tokens; Component Guidelines; Appendix A (tokens.json).





\# Overview and Usage Rules



Vermilion is a light-first design language for products that must feel trustworthy, current and calm: a white canvas, near-black ink, one committed red, soft rounded shapes and generous air. Red is scarce and always means something (act here, you are here, this matters); everything else is neutral. It suits enterprise, security, finance, infrastructure, public-sector and B2B service products, and the marketing sites and portals around them.



It was distilled from a reference interface (a marketing site with a product grid, segment cards, a metrics bento, an FAQ and a floating navigation bar) as a set of rules, not a copy. Rules tagged \*(derived)\* are extensions the reference implies but never shows: status colors, forms, tables, modals, focus, dark themes. Everything untagged was observed.



\## Use it like this



1\. Set the page in `bg`, headings and values in `ink`, body copy in `ink-secondary`, metadata in `ink-muted`. Put at most one section per page on `bg-wash`.

2\. Spend `brand` (`red-600`) only on actions, wayfinding and one emphasis per view: the outline-button label and border, text links, eyebrow labels, the active nav item, icon tiles and the highlighted metric. Never on body text; never on large surfaces except the hero atmosphere, one page banner and one metric tile.

3\. Separate surfaces with a 1px `border` hairline and space, not shadow. A card is `surface` + `border` + `radius-md` + `space-6` padding and stays flat. Only things that float (nav bar, menus, modals) take `shadow-float`, `shadow-raised` or `shadow-overlay`.

4\. Set type in Geist, or any neo-grotesque of the same proportions: `display` and `heading-1` at weight 500 with -0.02em tracking, everything else from the named styles. Headings are dark and tight; body is grey and airy (`letter-spacing` +0.01em).

5\. Buttons are 40px-tall rounded rectangles (`radius-sm`), outline by default, with a trailing arrow when they navigate. Pills (`radius-full`) belong to badges, counts and status only.

6\. Lay out on `container-default` (1120px), `container-wide` (1280px) and `container-nav` (1200px). Center section introductions; left-align content inside split sections. Separate sections with `space-24`, and hero-level moments with `space-32`.

7\. Pair every status color with an icon and a word. The brand is red, so red alone never means error.

8\. Give every interactive element a visible `shadow-focus` ring; on dark grounds use `focus-inverse`.

9\. Keep atmosphere to one moment per page (the hero glow, `shadow-glow`); every other surface is flat.

10\. Text on `red-100` is `red-700` or `ink`, never `brand` (4.2:1). `ink-muted` is for `bg`, `bg-wash`, `surface` and `surface-subtle` only.



\## Content fundamentals



Voice is confident, direct and reassuring. Address the reader as "you" and the provider as "we". Sentences are short and declarative; headlines often make two statements, the second a turn on the first: "Outages don't send warnings. Neither should your alerts arrive late." Descriptions in cards follow the same beat: one sentence that names the pain, one that promises the fix ("Find weak spots before others do. We think like an attacker.").



Casing: page and section titles and card titles in Title Case; body copy, descriptions, helper text and links in sentence case; eyebrows and category labels in UPPERCASE via `text-transform`; standalone button labels in Title Case, two or three words, verb first ("Explore Solutions", "View All Questions"); inline text links in sentence case with a trailing arrow ("Learn more"). No emoji, no exclamation marks, no jargon a buyer would have to look up. Numbers are compact and rounded to a claim: "500+", "10K+", "24/7".



Keep card descriptions to two lines at 14px, subcopy under a headline to two lines at 640px, and accordion answers to a short paragraph.



\## Visual foundations



\*\*Color.\*\* About 85% white and neutral, 10% dark neutral (ink type, charcoal tiles), 5% red. Details in \*2. Color System\*.



\*\*Type.\*\* One neo-grotesque family, weights 400, 500 and 600. Hierarchy comes from size, ink versus grey, and one uppercase eyebrow, never from decoration. Details in \*3. Typography\*.



\*\*Space.\*\* A 4px base with generous section air (96 to 128px). Cards pad at 24px, grids gap at 24px (12px when dense). Details in \*5. Spacing System\*.



\*\*Shape.\*\* Rounded but restrained: 8px controls, 12px cards, 16px floating bars and tiles, 24px framed images, full-round only for status. Hairline borders. Details in \*6. Shape Language\*.



\*\*Elevation.\*\* Almost none. The nav bar floats with `shadow-float`; a framed feature image wears a 4px `shadow-ring`; the hero has one coral `shadow-glow`.



\*\*Imagery.\*\* Three kinds, never mixed in one row: spot illustrations in a single red family with soft highlights, centered on a transparent 180px stage; photographs with a bottom scrim of black (0% to 70%) when text sits on them; and one full-color feature photo in a 4px ring at `radius-xl`. Authentication may use a full-bleed security image inside its split panel, cropped around the subject and darkened only enough to protect white overlay copy. No stock people and no decorative gradients on photos beyond the scrim.



\*\*Motion.\*\* Quick and quiet: 140 to 150ms control feedback, 180ms form feedback, and 200ms disclosure or layout continuity, using natural `ease-out` curves. Validation messages reveal from their field, authentication alerts expand and collapse with the form flow, and password icons acknowledge their state change. No bounce or parallax. Respect `prefers-reduced-motion`.



\*\*Focus.\*\* 2px `focus` ring with a 2px white gap (`shadow-focus`), always visible on keyboard focus.



\## Iconography



Outline icons only, 24px canvas drawn at 1.5px stroke (`stroke-icon`) with round caps and joins, in the Lucide / Feather family. Two placements: a white glyph centered in a 40px `surface-brand` tile at `radius-sm` (feature and segment lists), and an inline 16 to 20px glyph in `brand` or `ink-secondary` beside a label (arrows, chevrons, search). Icons never stand alone as the only label of a control. No emoji; no filled icons except the tiny check inside a success status. Illustrations are original, single-hue red objects; do not reuse another company's marks.



No logo ships with this system: set a wordmark in Geist 600, uppercase, +0.04em tracking, in `red-700`, or supply your own.





\# 1. Visual Personality



\*A calm, confident white room with one red door.\*



\## Character



Vermilion looks like a premium service that has nothing to prove. Large areas of white and near-white carry quiet grey copy; a single saturated red picks out only what the person can act on or must notice. Rounded cards and soft glows keep it approachable, while disciplined alignment, hairline borders and dark ink keep it serious. The mood is \*armored but friendly\*: authority without coldness, and warmth without playfulness.



\## Reading the personality



| Dimension | Reading | The rule it produces |

| --- | --- | --- |

| Visual density | Low to medium. One idea per section; about six cards per grid; large gaps between regions. Denser only in list-like areas (accordion rows, tab strips, footer). | One heading, one or two lines of subcopy and one component group per section. Never two competing groups side by side. |

| Professional vs casual | Roughly 80 / 20 toward professional. Professional: strict grid, neutral type, hairlines, uppercase eyebrows. Casual: rounded corners, rhetorical headlines, pink glow. | Keep the casual signals in shape and headline rhythm; keep the professional signals in layout, color and data. |

| Minimalism | Moderate. Cards have no shadows or ornaments and there is one accent color, but the hero carries atmosphere and the metrics grid is rich with dark tiles and photography. | Flat by default; allow exactly one atmospheric moment per page and one rich dark grid. |

| Visual hierarchy | Size steps are modest (40 / 20 / 16 / 14). The hierarchy is made by color (ink vs grey vs red), position (centered intros) and whitespace. | Change color and space before you change size. Never bold something to make it louder; make the rest quieter. |

| Contrast strategy | Almost everything is light; the few dark surfaces (charcoal tiles, one deep-red banner) are placed to create rhythm and to carry numbers. | Use dark surfaces sparingly, as punctuation, and always with white type. |



\## Overall impression



Trustworthy, current, expensive-but-approachable. It reads as \*managed and dependable\*: the interface behaves like a well-run front desk, tidy, unhurried and slightly formal, with red used the way a signature is used, once per view and always deliberately.



\## When Vermilion is the right language



Products where trust and clarity must lead the emotion: security, finance, infrastructure, compliance, public-sector portals, B2B services, healthcare admin. It is a weaker fit for playful consumer products, editorial or content-dense reading products, and dashboards that need many simultaneous hues; for those, keep the shapes and typography and widen the data palette (see \*10. Data Visualization\*).





\# 2. Color System



The system is a \*\*neutral field with one committed red\*\*. Read the colors by what they \*do\*, not by how they look.



\## Roles and how they are used



| Role | Token | Value | How it is used |

| --- | --- | --- | --- |

| Primary | `brand` (`red-600`) | `#d8232a` | The signal color. Outline-button border and label, text links, eyebrow labels, the active navigation label, icon tiles, the selected count, one highlighted metric. Reserved for \*action and place\*. |

| Primary, deep | `red-700` / `red-800` | `#b3141f` / `#7f1218` | Hover, pressed, wordmark, focus ring on light grounds, and text that sits on `red-100`. |

| Secondary | `surface-inverse` (charcoal) | `#1c1c1e` | The counterweight to red: feature and metric tiles, always with white type. Ink itself (`#0b0b0c`) is the secondary "color" of every headline. |

| Background | `bg`, `bg-wash` | `#ffffff`, `#fff5f5` | White is the page. `bg-wash`, a pink-tinted white, appears as a radial glow behind the hero and behind one supporting section, fading back to white. |

| Surface | `surface-subtle` | `#f5f5f6` | Quiet neutral fills: the active nav item, count badges, row hover, disabled controls. |

| Card | `surface` | `#ffffff` | Cards are the \*same\* white as the page and are separated by a hairline, not by tone. |

| Border | `border`, `border-strong`, `border-control` | `#e7e7ea`, `#cfcfd4`, `#8a8a93` | Hairline for grouping (about 1.3:1); stronger hairline for hover; 3:1 border only for controls that must be found without color. |

| Primary text | `ink` | `#0b0b0c` | Headlines, titles, values. |

| Secondary text | `ink-secondary` | `#5e5e66` | Body copy, descriptions, subcopy. |

| Muted text | `ink-muted` | `#6f6f77` | Metadata, captions, footer links, placeholders, inactive tabs. |

| Accent | `red-400`, `red-100`, `red-50` | `#ec5b57`, `#fde4e4`, `#fef2f2` | Coral for decorative gradients and glow; pale reds for selected and hover grounds. Never as text on small type. |

| Success \*(derived)\* | `success` | `#116b33` | Green with a check icon and a word. |

| Warning \*(derived)\* | `warning` | `#9a5b00` | Deep amber with a triangle icon and a word. |

| Error \*(derived)\* | `error` | `#b42318` | Deep red with an alert icon, a message and a tinted ground. |



\## What dominates, what is reserved



\- \*\*Dominant (about 85%):\*\* `bg`, `surface`, `surface-subtle`, `ink-secondary` body copy. The page should read as white with grey text and dark headings.

\- \*\*Punctuation (about 10%):\*\* `ink` type and `surface-inverse` tiles. Dark appears as headings and as isolated tiles that carry numbers or photographs.

\- \*\*Signal (about 5%):\*\* the reds. Red on white is the only saturated combination in the system, which is why it works as a signal.

\- \*\*Reserved for actions:\*\* `brand`, `brand-hover`, `brand-pressed`, `border-brand`, `brand-tint`. If a red thing cannot be clicked, it must at least mark \*where you are\* (active nav, selected tab) or \*what matters\* (the eyebrow, the highlighted metric).

\- \*\*Reserved for status \*(derived)\*:\*\* `success`, `warning`, `error`, `info` and their `-bg` / `-border` companions. Status colors never appear as decoration.

\- \*\*Reserved for atmosphere:\*\* `red-400`, `red-500`, `red-900`, `red-950` in gradients and glows; never as flat UI fills.



\## How contrast is created



1\. \*\*Value contrast first.\*\* Near-black headings (`ink`, 18:1 or better on every light ground) sit over mid-grey body (`ink-secondary`, 6.4:1). The step from ink to grey is the primary hierarchy device.

2\. \*\*One saturated hue on neutrals.\*\* Red on white is 5.0:1 and is instantly the most vivid thing on the screen. White type on `brand` is also 5.0:1.

3\. \*\*Light-dark rhythm.\*\* A dark charcoal tile in a light page creates a focal point without adding a second hue; white on charcoal is 17:1.

4\. \*\*Borders are quiet.\*\* Card and divider hairlines are deliberately low contrast (grouping, not information). Anything interactive gets a 3:1 border (`border-control`), a fill or a ring.

5\. \*\*Pale tints for state.\*\* Selected and hover states change \*ground\* to `red-50` or `red-100` and the label to `red-700`, so the text stays at 5.7:1 or better.



\## Gradients (recipes)



Tokens cannot carry gradients, so these recipes reference tokens:



| Name | Recipe | Where |

| --- | --- | --- |

| Emphasis text | `linear-gradient(90deg, var(--ink), var(--red-400))` on the closing phrase, `background-clip: text` | The second sentence of a display headline. 24px+ only. |

| Hero wash | `radial-gradient(60% 50% at 50% 100%, var(--bg-wash), var(--bg))` | Behind the hero object and headline; the pink lifts from the bottom. |

| Hero atmosphere | Coral discs and arcs in `red-400` at 20 to 60% opacity plus `shadow-glow` | The hero object only. |

| Page banner | `linear-gradient(120deg, var(--red-950) 0%, var(--red-800) 45%, var(--red-500) 100%)` | The title band of a secondary page (FAQ, docs); white `heading-page` type. |

| Charcoal tile | `linear-gradient(135deg, var(--surface-inverse), var(--surface-inverse-raised))` | Metric and feature tiles. |

| Brand tile | `linear-gradient(135deg, var(--red-600), var(--red-800))` | The single highlighted metric tile. |

| Photo scrim | `linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,0) 60%)` | Over photographs whenever text sits on them. |



\## Rules that keep the palette honest



\- Red is never body text and never a large flat surface, except the banner, the brand tile and the hero atmosphere.

\- Text on `red-100` or `red-50` is `red-700` or `ink`. `brand` on `red-100` is 4.2:1 and fails.

\- `red-400` is decorative (3.4:1 on white): fine in 24px+ gradient text, not in body.

\- Because the brand is red, \*\*error must not rely on hue.\*\* Give it an alert icon, a message and a `error-bg` ground; keep `error` visually deeper than `brand`.

\- Success and error must also differ by icon and word so people who cannot separate red from green still read them. If a product needs color-blind-safe status in its own right, add a theme rather than re-tinting the brand.

\- No blue, purple or teal accents. Photography may bring color; the UI does not.

\- Limits observed: never place `ink-muted` on a red tint or on a dark surface.





\# 3. Typography



\## Voice of the type



A single neo-grotesque sans, set in Geist. It is clean, slightly wide, with open apertures and a large x-height. Headings are \*\*medium weight, tight tracking, near-black\*\*; body is \*\*regular weight, slightly loosened tracking, mid-grey\*\*. There is no serif, no display face and no italic. Personality comes from the tight headlines, the generous leading of body copy and one uppercase eyebrow style.



Use Geist as the default. Any neo-grotesque with a similar x-height (Inter, Instrument Sans, Public Sans) works if you keep the weights and tracking below. Set it in `--font-sans`; use `--font-mono` only for code and identifiers.



\## The hierarchy as a system



The hierarchy has \*\*five tiers\*\*, and each tier changes at least two of size, weight and color:



| Tier | Style | Size / line | Weight | Tracking | Color | Job |

| --- | --- | --- | --- | --- | --- | --- |

| 1. Headline | `display`, `heading-1`, `heading-page` | 40 / 46 and 36 / 44 | 500 (600 on dark banner) | -0.02em | `ink` (`ink-inverse` on banner) | State the section's idea. Last phrase may take the emphasis gradient. |

| 2. Title | `title-lg`, `title-md`, `title-sm` | 20 / 32, 18 / 28, 16 / 24 | 500 | 0 | `ink` | Name a card, item, question or tab. |

| 3. Body | `body-lg`, `body`, `body-sm` | 16 / 24, 15 / 24, 14 / 24 | 400 | +0.01em | `ink-secondary` | Explain. Leading is always 24px: text is airy, never packed. |

| 4. Label | `eyebrow`, `overline`, `button`, `nav-link`, `badge`, `input` | 14 / 20 down to 12 / 16 | 400 to 500 | 0 to +0.12em | `brand`, `ink-muted`, `ink-secondary` | Categorize, act, navigate. Uppercase for eyebrow and overline. |

| 5. Metadata | `caption` | 12 / 18 | 400 | +0.01em | `ink-muted` | Footer links, helper text, timestamps. |



A separate \*\*metric tier\*\* (`stat-number` 40 / 48 at 600, `stat-label` 20 / 28 at 500, both `ink-inverse`) is used only on stat tiles.



\## Details worth copying



\- \*\*Weights:\*\* 400, 500 and 600 only. 500 is the workhorse for anything that names something. 600 appears on metric numerals, page banners and footer column headings; there is no 700.

\- \*\*Line height:\*\* roughly 1.15 on headlines, 1.6 on body (24px for 14 to 16px text), 1.6 on titles that wrap (32px leading for the 20px card title). Airy leading is a defining trait.

\- \*\*Letter spacing:\*\* negative on 36 to 40px headlines (-0.02em), zero on titles and UI, a light positive on body (+0.01em), and very wide (+0.12em) only on the quiet uppercase `overline`.

\- \*\*Uppercase:\*\* only `eyebrow` (14px, +0.02em, `brand`) and `overline` (12px, +0.12em, `ink-muted`). Never uppercase a title or a button.

\- \*\*Emphasis inside a headline:\*\* either the emphasis gradient (`ink` to `red-400`) on the closing phrase, or a 3px `brand` underline beneath one word offset 4px below the baseline. Use one or the other per headline, once per page section.

\- \*\*Text density:\*\* low. Subcopy under a headline is two lines at 640px; card descriptions are two lines; accordion answers are one paragraph. If it needs more, it belongs on its own page.

\- \*\*Measure:\*\* 60 to 75 characters. Body copy is capped at `container-copy` (640px) and centered on marketing pages, left-aligned in split sections and cards.

\- \*\*Alignment:\*\* centered for section introductions and hero; left for everything inside cards, lists and split sections. Never justify.

\- \*\*Numerals:\*\* proportional in prose; tabular (`font-variant-numeric: tabular-nums`) in tables, charts and stat tiles that will change.



\## Recipes



\- Section intro: `eyebrow` (uppercase, `brand`) then `display` (centered) then `body-lg` in `ink-secondary` at `container-copy`.

\- Card: `title-lg` then `body-sm` then a `button` text link in `brand` with an arrow.

\- Segment card: `eyebrow` beside a 40px icon tile, `title-md`, `body`, link.

\- FAQ: `title-sm` question, `body-lg` answer in `ink-secondary`.

\- Metric tile: `stat-number` over `stat-label`, both `ink-inverse`.





\# 4. Layout Language



\## Page structure



A page is a vertical stack of \*\*full-width bands\*\*, each holding one centered container. Bands are separated by white space, never by background stripes, except one `bg-wash` band and one dark banner where the design wants rhythm.



```

\[ floating nav bar ]                       sticky, above everything

\[ hero ]        pill, headline, subcopy, one button, atmospheric object   bg-wash radial

\[ logo strip ]  overline + evenly spaced logos, hairlines above and below

\[ split ]       eyebrow + title + list  |  framed image

\[ card grid ]   centered section intro, 3-up cards, one text button

\[ segment grid ] centered intro on bg-wash, 3-up segment cards

\[ metrics bento ] 2-column checkerboard of photo, dark and brand tiles + prose

\[ FAQ ]         chip strip + accordion + text button

\[ footer ]      brand block + link columns, hairline, copyright

```



\## Container and grid



| Use | Token | Width |

| --- | --- | --- |

| Floating nav bar and page banners | `container-nav` | 1200px |

| Card grids, centered content, footer | `container-default` | 1120px |

| Split sections, dense segment grids, bento | `container-wide` | 1280px |

| Subcopy and long paragraphs | `container-copy` | 640px |



\- \*\*Columns:\*\* a 12-column grid with `space-6` gutters underlies everything. Card grids use three 4-column spans; split sections use two 6-column spans, with the text column held to about 540px and the image column aligned to the container's right edge; the segment grid uses three columns at a tighter `space-3` gap; the bento uses two equal columns with a `space-6` gap.

\- \*\*Alignment:\*\* section intros are centered on the page axis. Everything inside a card is left-aligned. In split sections the text column is left-aligned and vertically centered against the media. Row heights are equal within a card row (stretch).

\- \*\*Bento checkerboard:\*\* two columns, three rows per column, alternating tall media (about 490px) and short metric tiles (about 148px), so the tall tile in the left column faces the short tile in the right. This creates a diagonal reading rhythm.



\## Header



A \*\*floating navigation bar\*\*, not a full-width header: a rounded `surface` bar with a hairline `border` and `shadow-float`, `container-nav` wide, 76px tall, detached `space-2` from the top edge, `position: sticky` at `z-nav`. Logo at the left, links at the right. Page content scrolls \*under\* it, so sections need top padding equal to the bar's height plus its offset. The active link follows the section in view (scroll-spy).



\## Sidebar \*(derived)\*



The reference has none. For application UI, use a 240px `surface` column with a right `border`, items in the same 40px rounded-rectangle shape as the nav links (active: `surface-subtle` fill, `brand` label; no left rule). Collapse to 64px icon-only between `bp-md` and `bp-lg`.



\## Authentication layout



Authentication uses a viewport-height split composition at `bp-lg` and above. The left column holds the Trustera logo and a centered form no wider than 420px; the right column is a clipped `radius-xl` media panel with a full-bleed security image and bottom photo scrim. The image subject remains near the center, while the copy lockup sits at the lower-left with two white signal chips (`01 Assess`, `02 Validate`) above the lines “your security.” and “your defenses.”



The page owns vertical overflow. Neither the form column nor the media panel creates an independent scrollbar; when viewport height is insufficient, the entire document scrolls. Below `bp-lg`, hide the media panel and keep the form as the only focal element with comfortable inline padding.



\## Content area and section structure



Every marketing section follows the same anatomy:



1\. Eyebrow: `eyebrow`, uppercase, `brand` (optional).

2\. Title: `display` (centered) or `heading-1` (split).

3\. Subcopy: `body-lg`, `ink-secondary`, at most two lines, `container-copy`.

4\. Content: a grid, a list or a media block.

5\. Closing action: one centered outline button (optional).



The gap between 2 and 3 is `space-4`; between 1 and 2 is `space-3`; between subcopy and content is `space-16` (primary sections) or `space-12` (compact ones).



\## Card placement



Cards sit on a grid with no offsets or overlaps. Media, when present, sits at the top of the card in a stage of about 180px, centered. Text follows, then a text link at the bottom. Grids of six cards are 3 x 2; if the count is not a multiple of three, center the last row rather than leaving a ragged left edge. A closing outline button is centered `space-16` below the grid.



\## Spacing between major regions



| Between | Space |

| --- | --- |

| Nav bar and hero content | `space-12` to `space-16` |

| Hero content blocks (pill, headline, subcopy, button) | `space-8` |

| Hero and the next band | `space-32` |

| Section band and next section band | `space-24` (96px), `space-32` for feature bands |

| Section header and its content | `space-16` (primary) or `space-12` (compact) |

| Grid gaps | `space-6` (cards, tiles); `space-3` (dense segment grid) |

| Content and footer | `space-24`; footer top padding `space-16` |



\## Layout rules, in short



\- Center what introduces; left-align what informs.

\- One container width per band; never mix widths inside a band.

\- Space, not lines, separates bands. The only full-width rules are around the logo strip and above the footer copyright.

\- Hairlines inside a band separate list rows (FAQ, footer), not cards.

\- Media is normally inset into the grid or framed. The authentication image is the deliberate exception: it fills its clipped split panel edge to edge.





\# 5. Spacing System



\## The scale



A \*\*4px base\*\* with a scale that roughly doubles every two steps. Two intermediate values (20px and 40px) exist because the reference lands there for button padding and control height.



| Token | Value | Where it is spent |

| --- | --- | --- |

| `space-1` | 4px | Icon-to-label micro gap, badge vertical padding, arrow nudge on hover |

| `space-2` | 8px | Icon + text in a link, chip internals, gap between inline actions, nav bar offset from the top |

| `space-3` | 12px | Dense grid gap (segment cards), title to description, eyebrow to title, chip gaps |

| `space-4` | 16px | Icon tile to its text, field padding, subhead to body, title to subcopy |

| `space-5` | 20px | Button horizontal padding, accordion row padding |

| `space-6` | 24px | Card padding, default grid gap, text to link inside a card |

| `space-8` | 32px | Hero rhythm, stacked blocks inside a section |

| `space-10` | 40px | Control height (buttons, inputs), icon tile size |

| `space-12` | 48px | Section header to content (compact) |

| `space-16` | 64px | Section header to content (primary), footer top padding |

| `space-24` | 96px | Vertical padding of a section band |

| `space-32` | 128px | Hero to first section; feature-band separation |



\## Applied to the layout



| Region | Rule |

| --- | --- |

| Page padding (inline) | 24px below `bp-md`, 32px from `bp-md`, centered `container-\*` above that |

| Section spacing | `space-24` top and bottom; `space-32` around feature bands |

| Card padding | `space-6` on all sides; `space-5` in compact cards |

| Card inner rhythm | media, `space-6`, title, `space-3`, description, `space-6`, link |

| Icon tile to text (list rows) | `space-4`; between rows `space-6` |

| Component gaps | `space-2` inside controls; `space-3` between chips and small siblings; `space-4` between form fields |

| Text spacing | eyebrow, `space-3`, title, `space-4`, subcopy; paragraphs `space-4` apart |

| Grid gaps | `space-6` default; `space-3` for dense segment grids |

| Control height | `space-10` (40px) for buttons and inputs; 48 to 56px for tabs and list rows |

| Bento gap | `space-6` (the reference measures about 26px; use 24) |



\## Principles



1\. \*\*Space groups; borders separate.\*\* Related things sit `space-2` to `space-4` apart; unrelated things `space-8` and up. If two things need a line between them, they are probably too close.

2\. \*\*Airy vertical, restrained horizontal.\*\* Vertical rhythm is large (96 to 128px between bands); horizontal padding inside components is modest (20 to 24px).

3\. \*\*Multiples, not exceptions.\*\* Every gap is a scale step. If a design needs a 26px gap, use 24 and adjust the container, not the scale.

4\. \*\*Bigger container, bigger gap.\*\* Dense grids use the small gap (`space-3`), open grids the large one (`space-6`), and both keep card padding at `space-6`.

5\. \*\*Optical padding.\*\* Icon tiles and pills get their 4px optical padding from `space-1`; never pad a pill with `space-3`.





\# 6. Shape Language



\*\*Soft, but disciplined.\*\* Corners are visibly rounded but never bubbly; edges are drawn with hairlines, not thick strokes; almost nothing casts a shadow. The result is \*rounded-rectangle modular\*: friendly enough to be approachable, geometric enough to stay professional.



\## Radius scale



| Token | Value | Applies to |

| --- | --- | --- |

| `radius-xs` | 4px | Tags, checkboxes, inline highlights |

| `radius-sm` | 8px | Buttons, inputs, icon tiles, nav links, menu items |

| `radius-md` | 12px | Cards, tabs, chips, alerts |

| `radius-lg` | 16px | The floating nav bar, stat tiles, bento image tiles |

| `radius-xl` | 24px | Framed feature image, modals |

| `radius-full` | 9999px | Pills, count badges, status dots, avatars |



The rule is \*\*radius scales with size\*\*: the bigger the container, the bigger the radius, in four steps from 8 to 24. A child sits inside a parent with a smaller radius (a 40px icon tile at 8px inside a 12px card).



\## Component shapes



\- \*\*Buttons:\*\* rounded rectangles, 40px tall, `radius-sm`, 1px border. Deliberately \*not\* pills, so pills stay meaningful as status.

\- \*\*Inputs:\*\* the same 40px rounded rectangle, `radius-sm`. A search input is the same shape with a leading 16px icon.

\- \*\*Cards:\*\* `radius-md`, 1px `border`, flat `surface`, `space-6` padding. No shadow, no colored edge, no accent bar.

\- \*\*Navigation bar:\*\* a detached floating card at `radius-lg` with a hairline and `shadow-float`. Its links are `radius-sm` rectangles inside it.

\- \*\*Tabs / chips:\*\* `radius-md`, 1px border, with an internal `radius-full` count badge.

\- \*\*Icon tiles:\*\* 40 x 40, `radius-sm`, solid `surface-brand`, white outline glyph.

\- \*\*Badges:\*\* `radius-full`, an outer capsule with a hairline wrapping an inner solid pill.

\- \*\*Dividers:\*\* 1px `border`, spanning the container; used between list rows and above the footer copyright. No dashed or thick rules.

\- \*\*Containers:\*\* invisible. Layout containers have no visible shape; only cards, tiles and the nav bar do.



\## Borders and elevation



| Element | Border | Shadow |

| --- | --- | --- |

| Card | 1px `border` | none (`shadow-raised` on hover, derived) |

| Nav bar | 1px `border` | `shadow-float` |

| Framed image | 1px `border` + 4px ring | `shadow-ring` |

| Input | 1px `border-control` | none; focus adds `shadow-focus` |

| Stat tile | none (fill provides the edge) | none |

| Menu, popover \*(derived)\* | 1px `border` | `shadow-raised` |

| Modal \*(derived)\* | none | `shadow-overlay` over a scrim |



\## Image treatment



\- \*\*Framed feature image:\*\* `radius-xl` with a 1px `border` and a 4px soft ring (`shadow-ring`), giving a "double bezel" that lifts the image without a drop shadow.

\- \*\*Bento tiles:\*\* `radius-lg`; photographs are grayscale with a black scrim rising from the bottom (0 to 70%) to hold white numerals and labels; a small circular affordance in a corner hints at expansion.

\- \*\*Spot illustrations:\*\* no frame, no background, centered on a stage about 180px tall; a single red family with lighter highlights; a soft glow is acceptable.

\- \*\*Logos:\*\* unframed, evenly spaced, at a common height (about 48px), in their own colors.



\## Density of shape



Compact-to-medium: controls are 40px, rows 56px, cards 24px padded. Nothing is oversized or pill-shaped at UI scale, so the interface reads as tight and efficient even though the sections around it are airy.





\# 7. Component Language



Components below are described as reusable patterns. \*(derived)\* marks patterns the reference does not show; they are built from the same tokens so they belong to the family. Live previews exist for the components under `components/`.



\## Buttons



\- \*\*Structure:\*\* label (`button` style) plus an optional trailing arrow icon (16px, `space-2` gap). Variants: \*\*Outline\*\* (default: `brand` label and 1px `border-brand` on `bg`), \*\*Solid\*\* \*(derived)\* (`brand` fill, `on-brand` label), \*\*Quiet\*\* \*(derived)\* (no border, `ink-secondary` label), \*\*Text link\*\* (`brand` label, no box, always with an arrow).

\- \*\*Hierarchy:\*\* the outline button is the primary call to action. Restraint is the point: a page has one hero button and one closing button per grid. Use Solid only when a single conversion must outrank everything. Text links carry per-card actions.

\- \*\*States:\*\* hover: outline fills `brand-tint` and shifts to `brand-hover`; solid goes `brand-hover`; the arrow nudges `space-1` right. Pressed: `brand-pressed`. Focus: `shadow-focus`. Disabled: `border-strong` and `ink-disabled`, no hover. Loading: a 16px spinner replaces the arrow, width fixed, label stays.

\- \*\*Spacing:\*\* 40px tall, `space-5` horizontal padding, `space-2` icon gap.

\- \*\*Shape:\*\* `radius-sm`, 1px border.

\- \*\*Behavior:\*\* 150ms transitions; click target is the full box; a link that navigates gets an arrow, a button that acts does not.



\## Cards



Three siblings share one skeleton: `surface` + 1px `border` + `radius-md` + `space-6` padding.



\- \*\*Feature card:\*\* centered spot illustration (about 180px stage), `title-lg`, `body-sm` (two lines), text link. All cards in a row are equal height and the link pins to the bottom.

\- \*\*Segment card:\*\* a row of 40px icon tile and `eyebrow` label, then `title-md`, `body` (up to five lines), link.

\- \*\*List row:\*\* 40px icon tile left; `title-sm` above `body-sm` at right; `space-4` gap, `space-6` between rows. No box.

\- \*\*States:\*\* default flat. Hover \*(derived)\*: border to `border-strong`, `shadow-raised`, arrow nudge; the whole card is one target. Selected \*(derived)\*: `border-brand` and `brand-tint`.

\- \*\*Behavior:\*\* cards do not expand in place; they navigate.



\## Stat tiles



\- \*\*Structure:\*\* a numeral (`stat-number`) top-left and its label (`stat-label`) beneath or bottom-left, all `ink-inverse`.

\- \*\*Fills:\*\* charcoal gradient, brand gradient (only one per grid), or a grayscale photo with a scrim.

\- \*\*Shape and space:\*\* `radius-lg`, `space-6` padding, minimum height about 148px; photo tiles about 490px.

\- \*\*Behavior:\*\* static. A small corner affordance may open a media lightbox.



\## Navigation



\- \*\*Structure:\*\* logo left; links right. Links are 14px `nav-link`, padded `space-2` x `space-4`, `radius-sm`.

\- \*\*States:\*\* resting `ink-secondary`; hover `ink`; \*\*active\*\* (the section in view) `surface-subtle` fill with `brand` label; focus `shadow-focus`.

\- \*\*Placement:\*\* the floating bar (see \*4. Layout Language\*). At small widths it collapses to logo plus a menu button, and the links move into a sheet.

\- \*\*Breadcrumbs and pagination\*\* \*(derived)\*: `caption` in `ink-muted`, separators are chevrons, current item `ink`.



\## Inputs \*(derived from the search field in the reference)\*



\- \*\*Structure:\*\* optional label above (`title-sm` at 14px), field, helper or error text below (`caption`). Search: a leading 16px search icon in `ink-muted`, placeholder in `ink-muted`.

\- \*\*Shape and space:\*\* 40px tall, `radius-sm`, 1px `border-control`, `space-3` horizontal padding; label to field `space-2`; field to helper `space-1`.

\- \*\*States:\*\* hover: border to `ink-secondary`. Focus: border `focus` plus `shadow-focus`. Authentication fields use a muted `surface-subtle` fill and a neutral grey focus ring instead of the brand red. Error: border `error`, an alert icon and message in `error`. Disabled: `surface-subtle` fill, `ink-disabled`. On the dark banner, the search input is white with no visible border.

\- \*\*Behavior:\*\* choose validation timing by task. The login form validates required and format rules only after submit, never merely because focus leaves a field; after the first submit, revalidate on change and keep each message until its value is fixed. Required messages enter with a short 180ms feedback transition.



\## Dropdowns and selects \*(derived)\*



A select is an input with a trailing chevron (16px). The menu is a `surface` panel with 1px `border`, `radius-md`, `shadow-raised`, items 40px tall with `radius-sm`, hover `surface-subtle`, current item marked with a `brand` check. Menus open on click, never on hover; Escape closes; arrow keys move.



\## Tabs (category chips)



\- \*\*Structure:\*\* a horizontally scrolling strip of chips. Each chip: optional 16px icon, `title-sm` label, and a count badge. An optional second line (`caption`, `ink-muted`) can hold a sub-label.

\- \*\*Hierarchy:\*\* the \*selected\* chip is the only tinted thing in the strip.

\- \*\*States:\*\* default `surface` + `border`, count in `surface-subtle`; hover `border-strong`; \*\*selected\*\* `brand-soft` fill, `border-brand-soft`, label `ink`, count in `red-200` with `red-700` text; focus `shadow-focus`.

\- \*\*Spacing and shape:\*\* `radius-md`, padding `space-3` x `space-4`, `space-3` between chips, count badge `radius-full`.

\- \*\*Behavior:\*\* selecting swaps the panel below without navigating. When the strip overflows, show chevron buttons at each end or a slim scrollbar, and let the selected chip scroll into view. Left and right arrows move selection.



\## Accordion



\- \*\*Structure:\*\* full-width rows divided by 1px `border`; each row has a `title-sm` question at left and a 16px chevron at right; the open row reveals a `body-lg` answer in `ink-secondary`.

\- \*\*States:\*\* closed chevron down; open chevron up; hover title to `brand-hover`; focus `shadow-focus` on the row header.

\- \*\*Spacing:\*\* row padding `space-5` vertical; answer bottom padding `space-5`.

\- \*\*Behavior:\*\* one row open at a time by default, with the first open on load; 200ms height and fade transition. No boxes, no fills.



\## Badges and pills



\- \*\*Pill ("powered by"):\*\* an outer capsule with a hairline and `surface` fill wrapping a `caption` label and an inner solid `surface-brand` pill with `on-brand` `badge` text. Used once, above the hero headline.

\- \*\*Count badge:\*\* `radius-full`, at least 24px wide, `badge` text; `surface-subtle` normally, `red-200` in a selected chip.

\- \*\*Status badge\*\* \*(derived)\*: `radius-full`, status `-bg`, status text, a 8px dot or a 16px icon, and a word.



\## Alerts \*(derived)\*



\- \*\*Structure:\*\* a 20px status icon at left; `title-sm` and `body-sm`; optional `brand` text link; optional close button. Compact form alerts reduce the icon to 16px and use a single `body-sm` medium-weight message.

\- \*\*Shape and space:\*\* `radius-md`, 1px status border, status `-bg` ground, `space-4` padding, `space-3` icon gap. Compact form alerts use 12px inline padding, 10px block padding and an 8px gap.

\- \*\*Variants:\*\* info (`info`), success, warning, error, each with icon plus word.

\- \*\*Behavior:\*\* inline alerts stay until resolved; dismissible alerts expose an accessible close button. The login credential alert says “Email atau password tidak valid”, expands into the form flow, and collapses before its error state is reset. Transient confirmations disappear after 6 seconds and never carry an error.



\## Status indicators \*(derived)\*



An 8px dot (`radius-full`) in a status color, always followed by its label in `ink`. Do not use color alone; use a shape variant (filled dot, ring, triangle) for the second cue. No animation on static status; a 1.5s soft pulse is allowed only on a live-connection dot.



\## Tables \*(derived)\*



Header row: `overline` style in `ink-muted`, 48px tall. Rows: 56px, separated by a 1px `border`, no zebra, no outer box (or one `radius-md` border around the whole table). Cell padding `space-4` horizontal. Numbers right-aligned in tabular figures. Row hover `surface-subtle`; selected `brand-soft`. Sortable headers show a 16px chevron. Status cells use status badges. Action cells use a Quiet button or text link.



\## Search and filters



Search is a single input, up to 450px wide, centered on marketing pages and left-aligned above a table or list in applications. Filters reuse Tabs chips: single-select for categories, multi-select with a leading check icon for facets \*(derived)\*. Active filters appear as chips with a remove icon; a text link "Clear all" in `brand` clears them.



\## Modals \*(derived)\*



A `surface` panel at `radius-xl`, `shadow-overlay`, 480 or 640px wide, `space-8` padding, over a scrim of `ink` at 48%. Title `title-lg`, body `body`, footer actions right-aligned (Quiet cancel, Outline or Solid confirm). Close button top-right with a 40px target. Focus is trapped; Escape closes; the trigger regains focus. Enter with a 200ms fade and 2% scale.



\## Section header, logo strip, footer



\- \*\*Section header:\*\* eyebrow, title, subcopy (see \*4. Layout Language\*). Centered on marketing pages, left in split sections.

\- \*\*Logo strip:\*\* `overline` label centered above evenly pitched logos (about 96px apart) at a common height of about 48px, wrapping into centered rows, with a hairline above and below.

\- \*\*Footer:\*\* brand block (wordmark plus a two-line `body-lg` description) at left; link columns headed by 14px 600 `ink`, links in `caption` `ink-muted` with about 34px pitch; a full-width hairline; centered copyright in `body-sm` `ink-muted`.



\## Loading and empty states \*(derived)\*



Skeletons are `surface-subtle` blocks at the real component shape with `radius-sm`, no shimmer beyond a slow 1.2s fade. Empty states are centered: a 40px icon tile, `title-md`, one line of `body-sm`, and an outline button.





\# 8. Interaction Language



\*\*Philosophy: quiet and reassuring.\*\* Interaction confirms and orients; it never performs. Changes are small (a color shift, a border, an arrow nudge, a tint), fast (150 to 200ms) and predictable. The interface feels like a well-run desk: it responds, it does not bounce.



What the reference shows directly: an active navigation state that follows the scroll position (scroll-spy), a selected chip with a tinted ground, an expanded accordion row with a flipped chevron, a horizontally scrolling chip strip with chevron controls, a "scroll for more" cue in the hero, and trailing arrows on every link. Everything else below is \*(derived)\* from those cues.



| State | Behavior |

| --- | --- |

| \*\*Hover\*\* | Text links and outline buttons shift `brand` to `brand-hover`; outline buttons also fill `brand-tint`; trailing arrows nudge `space-1` right. Cards \*(derived)\* take `border-strong` and `shadow-raised`. Nav links move from `ink-secondary` to `ink`. Rows take `surface-subtle`. Hover never scales or glows. |

| \*\*Focus\*\* | Keyboard focus draws `shadow-focus`: a 2px white gap and a 2px `focus` ring (`focus-inverse` on dark grounds). Never remove it; never rely on color alone (the ring is a solid shape). Inputs also switch border to `focus`. |

| \*\*Active / pressed\*\* | Solid fills go to `brand-pressed`; outline buttons darken the tint to `red-100`. A primary form submit may compress to 99% scale and a small dismiss control to 90% as immediate tactile feedback; routine navigation and content controls do not scale. |

| \*\*Selected\*\* | A ground change, not a border thickening: chips and rows go `brand-soft` with `border-brand-soft`. Nav uses `surface-subtle` with a `brand` label. Selected state is set by the app (scroll position, chosen tab), not by hover. |

| \*\*Disabled\*\* | `ink-disabled` label, `border-strong` border, no hover response, `cursor: not-allowed`. Explain why in nearby helper text; never hide the control. |

| \*\*Loading\*\* | Buttons keep their width and replace the trailing icon with a 16px spinner. Content uses `surface-subtle` skeletons at final shape. No full-page blockers. |

| \*\*Error\*\* | Field border `error`, an alert icon, and a message in `error` below the field. Alerts use `error-bg` and `error-border`. Focus moves to the first invalid field. On login, blur alone never produces an error; submit reveals all unmet requirements, then edits revalidate them. |

| \*\*Success\*\* | A `success` check with a word, inline; transient confirmations fade after 6s. Success never celebrates with confetti or motion. |



\## Transitions and micro-interactions



\- \*\*Duration and easing:\*\* 150ms for color, border and shadow; 200ms for disclosure (accordion height, menus, modals); `ease-out` for entrances, `ease-in` for exits.

\- \*\*Accordion:\*\* the answer's height animates and fades; the chevron rotates 180 degrees.

\- \*\*Chip strip:\*\* the selected chip scrolls into view; overflow shows chevron buttons that disappear at the ends.

\- \*\*Scroll-spy nav:\*\* the active link changes when a section crosses the middle of the viewport; the change is a fill fade, not a sliding indicator.

\- \*\*Hero cue:\*\* "Scroll for more" with a small chevron in `ink-muted` on the ground beneath the hero object (use `ink-inverse` only where the ground is `red-600` or darker); it fades out after the first scroll.

\- \*\*Authentication feedback:\*\* required messages reveal in 180ms with a small upward offset and clipped edge; the credential alert uses a 200ms grid-row, opacity and spacing transition so surrounding fields move continuously; the password visibility icon swaps in 140ms; submit and dismiss controls acknowledge press without delaying the action.

\- \*\*Reduced motion:\*\* with `prefers-reduced-motion`, all transitions become instant and the chevron flips without rotation.



\## Rules



1\. Motion explains a state change; if it doesn't, remove it.

2\. One kind of hover per component family; do not invent a second.

3\. Never rely on hover for essential information (touch has none).

4\. Keep every interactive target at least 40px in height (44px on touch).





\# 9. Information Hierarchy



The interface tells people what matters through a fixed order of cues: \*\*size and darkness first, then red, then position, then everything else recedes into grey.\*\*



\## What is most important



The \*\*headline\*\*: the largest type (40px), the darkest color (`ink`), tightest tracking, centered on the page axis, with ample white space around it. If a screen has a hero object, it sits \*below\* the headline as atmosphere, not competition. In split sections the title is 36px at the top of the text column, with media balancing it on the other side.



\## What requires attention



\*\*Red on white\*\* is the attention system, because it is the only saturated color. Attention is drawn, in order, to: the eyebrow label, the outline button, the selected chip or active nav item, and the highlighted metric tile. A single dark tile in a light grid does the same job for numbers. Nothing else is allowed to be loud: no badges in five colors, no bold running text.



\## What is actionable



Things a person can do are \*\*red-labeled and paired with an arrow or a border\*\*: the outline button, the text link ("Learn more" plus an arrow), the tab chip, the accordion chevron. A red word with no arrow is a label or eyebrow (uppercase, small); a red word with an arrow is an action. Non-actionable emphasis is `ink`, never red.



\## What is secondary



Supporting copy is `ink-secondary` at 14 to 16px with 24px leading: subcopy, card descriptions, answers. It is deliberately quieter than titles but must remain readable (6.4:1). Decorative structure (borders, dividers, ring shadows) is quieter still.



\## What represents status



The reference has no status UI; \*(derived)\*: status is expressed by a word, an icon and a tinted ground in `success`, `warning`, `error` or `info`. A count in a badge is neutral information, not status. A "selected" state (tinted chip, active nav) is a \*place\*, not a status.



\## What represents metadata



`caption` (12px) and `overline` (12px, uppercase, +0.12em) in `ink-muted`: footer links, contact lines, "Trusted by" labels, sub-labels in chips, dates in tables. Metadata is smaller, lighter and never red.



\## Reading order per band



1\. Eyebrow (small, red, uppercase) sets the topic.

2\. Title (large, dark) states the idea.

3\. Subcopy (grey) qualifies it.

4\. Content (cards, media, list) proves it.

5\. Action (outline button or text link) closes it.



\## Rules



\- One idea per band; one primary action per band.

\- Size differences are modest; use color and space to separate tiers.

\- If two elements are red in the same view, one of them is probably not needed.

\- Numbers on dark tiles are the loudest \*data\* in the system; keep them to short claims.

\- Order by importance, not by symmetry. Cards in a grid are equal in weight; if one matters more, move it first or give it the brand tile.





\# 10. Data Visualization



The reference contains \*\*metrics, not charts\*\*: a 2-column grid of tiles, each with a large numeral and a label, plus small count badges. There are no axes, legends or plots. Everything about charts below is \*(derived)\* from how the system treats numbers.



\## What is observed



\- \*\*Metric tile:\*\* a numeral at 40px / 600 (`stat-number`) over a 20px / 500 label (`stat-label`), in `ink-inverse`, on a charcoal gradient, a brand gradient or a grayscale photo with a scrim. Values are short claims ("500+", "10K+", "24/7", a year).

\- \*\*Emphasis by fill:\*\* the single most important metric takes the red tile; the others are charcoal. Never two red tiles in one grid.

\- \*\*Density:\*\* very low. Four metrics, no sparklines, no deltas, no units beyond a suffix.

\- \*\*Count badges:\*\* small neutral `radius-full` chips showing quantities beside category labels.



\## Charts \*(derived)\*



Keep the same restraint: neutral chart chrome and \*\*red only for the story\*\*.



| Element | Rule |

| --- | --- |

| Style | Flat, no gradients, no shadows, no 3D. Lines 2px with 4px round end caps; bars with `radius-xs` at the top and 8px minimum gaps; areas at 12 to 16% opacity. |

| Palette | `viz-1` (`red-600`) is the highlighted series, `viz-2` charcoal the strongest neutral, `viz-3` grey for context, `viz-4` and `viz-5` (coral, pale red) for further series. If more than four series are needed, split the chart instead. |

| Highlight pattern | One series or bar in `viz-1`; everything else `viz-3`. The eye goes to the one that matters. |

| Chrome | Gridlines in `viz-grid` (1px), no vertical gridlines, axis labels in `caption` `ink-muted`, tabular figures, no axis lines except the baseline. |

| Labels | Prefer direct labels at line ends and bar tops in `ink`; a legend is a fallback, placed above the chart in `caption`. |

| Titles | `title-sm` in `ink`; a one-line takeaway in `body-sm` `ink-secondary` beneath. |

| Tooltips | `surface`, 1px `border`, `radius-sm`, `shadow-raised`, `caption` label and `title-sm` value. |

| Thresholds | A dashed 1px `error` or `warning` line labeled with a word; never color alone. |

| Metric cards in apps | `surface` + `border` + `radius-md`: `overline` label, `display`-scale numeral (36px, tabular), and a delta chip (status color plus arrow icon plus signed number). |

| Color-blind safety | Do not encode a series by red versus green. Differentiate series by lightness (charcoal vs red vs grey) and always label directly. |

| Density | Show the fewest points that tell the story. Prefer one focused chart per card; a dashboard grid is 3 columns on `container-wide` with `space-6` gaps. |



\## Numbers in prose



Round to a claim ("10K+"), append a plus for "at least", use "24/7" for continuous coverage, and always say what is being counted in the label ("Incidents handled"). Never show a number without a noun.





\# 11. Responsive Design



The reference is shown at desktop width only. The rules below are \*(derived)\* from its container widths, its horizontally scrolling chip strip and its modular grids. Breakpoints are tokens: `bp-sm` 640, `bp-md` 768, `bp-lg` 1024, `bp-xl` 1280.



\## Principles



\- \*\*Content-first stacking.\*\* Multi-column grids collapse to fewer columns; they never shrink type to fit.

\- \*\*Scale space, not shape.\*\* Keep radii, borders and control heights constant across breakpoints. Reduce section padding and headline size.

\- \*\*Horizontal overflow is a feature for chips.\*\* The chip strip scrolls sideways at every width with its edges bleeding to the viewport so the cut-off signals more.

\- \*\*Keep one focal element per screen.\*\* On narrow screens the headline and one button lead; atmosphere and decoration shrink or drop.



\## Desktop (1280px and up)



Layouts at intended widths: `container-nav` 1200, `container-default` 1120, `container-wide` 1280. Three-up card grids, two-column split sections, two-column bento, four-column footer. Floating nav bar with all links visible. Section padding `space-24`; feature bands `space-32`.

Authentication stays in two columns with a minimum 520px media column. The form remains centered within a maximum 420px measure, while the image fills the full height of its rounded panel.



\## Tablet (768 to 1279px)



\- Nav bar keeps the links (down to `bp-md`) with reduced horizontal padding.

\- Card grids: three-up above `bp-lg`, two-up between `bp-sm` and `bp-lg`.

\- Split sections: two columns down to `bp-md`, with the image scaling to the column; below that they stack, text above image.

\- Bento: two columns kept; the tall tiles shrink to about 360px.

\- Inline page padding 32px. Headline `display` reduces to 36 / 44 and `heading-1` to 32 / 40.

\- Footer link columns wrap into two rows.



\## Mobile (below 768px)



\- \*\*Nav:\*\* the floating bar shrinks to full width minus 16px, height 64px, showing the logo and a menu button. Links open in a sheet (`surface`, `radius-lg`, links 48px tall). Active state remains `surface-subtle` with `brand` label.

\- \*\*Type:\*\* `display` 28 / 36, `heading-1` 28 / 36, `title-lg` 18 / 28, body unchanged at 15 to 16px. Keep 24px leading.

\- \*\*Grids:\*\* everything single-column with `space-4` to `space-6` gaps. Card padding stays `space-6`; segment cards remain full-width.

\- \*\*Bento:\*\* tiles stack full-width; photo tiles drop to about 240px tall; metric tiles remain at minimum 120px.

\- \*\*Hero:\*\* pill, headline, subcopy and a full-width button; the hero object scales to the width and is cropped by the fold; the glow is reduced.

\- \*\*Authentication:\*\* hide the photographic panel below `bp-lg`; keep the logo, form, account-support copy and full-width submit button. Never introduce an inner form scrollbar—the document scrolls if vertical space is short.

\- \*\*Chip strip:\*\* scroll horizontally, edges bleed, no chevron buttons (touch swipes).

\- \*\*Accordion:\*\* unchanged; row padding `space-4`; answer text 15px.

\- \*\*Section padding:\*\* `space-16` (64px) top and bottom; feature bands `space-24`.

\- \*\*Touch targets:\*\* at least 44px tall; links inside cards get the card as target.

\- \*\*Footer:\*\* columns stack; copyright and links centered.



\## What never changes



Color roles, the single red, the hairline-and-space separation, the 40px control height (44 on touch), and the pairing of icon plus word for every status.





\# 12. Core Design Principles



1\. \*\*White establishes the room; red is the only voice.\*\* Surfaces and grounds stay neutral so a single saturated red can mean \*act here, you are here, this matters\*.

2\. \*\*Red is spent, not sprayed.\*\* It appears on actions, place markers and one highlighted number per view. If two red things compete, remove one.

3\. \*\*Color separates before size does.\*\* Hierarchy is made mostly with ink versus grey and with position; headings are only modestly larger than body, but far darker.

4\. \*\*Type is tight when it declares and airy when it explains.\*\* Headlines are medium weight with negative tracking; body copy is regular weight, +0.01em tracking and 24px leading.

5\. \*\*Hairlines and space separate; shadows are for things that float.\*\* Cards are flat with a 1px border; only the nav bar, menus and modals lift.

6\. \*\*Rounded, never bubbly.\*\* Radius scales with size (8, 12, 16, 24); pills are reserved for status, so shape carries meaning.

7\. \*\*One idea per band, one action per idea.\*\* Each section is eyebrow, title, subcopy, content and at most one closing button, centered when it introduces and left-aligned when it informs.

8\. \*\*Dark tiles are punctuation.\*\* A few charcoal or brand tiles carry numbers and photography and break the white rhythm; they never become the page.

9\. \*\*Atmosphere once.\*\* One glow, one gradient headline, one hero object per page; everything else stays flat so those moments read as designed.

10\. \*\*State is a ground change, not a decoration.\*\* Hover, selected and active states tint a ground or shift a border; they never scale, glow or bounce. Every status pairs color with an icon and a word.





\# 13. Design Tokens



Every value below is compiled into CSS custom properties (`--<name>`) by the page; `tokens.json` is the source of truth. Use tokens, never raw values. Color has one theme (`light`); dark ground is expressed by the `surface-inverse` tokens, not by a second theme.



\## Color tokens



\### Ground and surface



| Token | Value | Use |

| --- | --- | --- |

| `bg` | `#ffffff` | Page ground. Default background of every section; `ink`, `ink-secondary` and `ink-muted` all read on it |

| `bg-wash` | `#fff5f5` | Pink-tinted white used as a soft wash behind the hero and one supporting section per page (radial, fading to `bg`) |

| `surface` | `#ffffff` | Card and panel fill, always paired with a `border` hairline. Same text colors as `bg` |

| `surface-subtle` | `#f5f5f6` | Quiet neutral fill: the active nav item, count badges, hover on rows, disabled fills |

| `surface-inverse` | `#1c1c1e` | Dark charcoal tile / hero ground for high-contrast feature tiles and stat tiles |

| `surface-inverse-raised` | `#3a3a3d` | Gradient end for `surface-inverse` tiles (top-left `surface-inverse` to bottom-right `surface-inverse-raised`) |

| `surface-brand` | `{red-600}` | Solid brand fill for icon tiles, the Pill badge and the single highlighted stat tile |



\### Text



| Token | Value | Use |

| --- | --- | --- |

| `ink` | `#0b0b0c` | Headlines, card titles, nav labels, form values |

| `ink-secondary` | `#5e5e66` | Body copy, subcopy, descriptions. 6.4:1 on `bg`; above 5.5:1 on `bg-wash` and `surface-subtle` |

| `ink-muted` | `#6f6f77` | Metadata, captions, footer links, placeholders, inactive tab labels |

| `ink-disabled` | `#a1a1a8` | Disabled labels and icons only (exempt from contrast); never for anything a person must read |

| `ink-inverse` | `#ffffff` | Text on `surface-inverse`, `surface-inverse-raised` and photo scrims |

| `ink-inverse-muted` | `#d4d4d8` | Secondary text on `surface-inverse` (11.5:1) and `surface-inverse-raised` (7.7:1) |

| `on-brand` | `#ffffff` | Text and icons on `brand`, `brand-hover`, `brand-pressed`, `surface-brand` |



\### Border



| Token | Value | Use |

| --- | --- | --- |

| `border` | `#e7e7ea` | Hairline around cards, dividers between rows (FAQ, footer), the nav pill outline |

| `border-strong` | `#cfcfd4` | Hover border on cards and quiet buttons; divider inside dense tables |

| `border-control` | `#8a8a93` | Border of inputs, selects, checkboxes: at least 3:1 on `bg`, `bg-wash` and `surface-subtle` so a control is findable without color |

| `border-brand` | `{red-600}` | Outline of the primary (outline) button and the selected chip ring. 5.0:1 on `bg` |

| `border-brand-soft` | `#f3b7b7` | Border of the selected tab and tinted callouts, paired with `brand-soft` fill |



\### Red scale



| Token | Value | Use |

| --- | --- | --- |

| `red-50` | `#fef2f2` | Lightest red tint: tinted callout ground, hover ground on outline buttons. Text on it: `ink` or `red-700` |

| `red-100` | `#fde4e4` | Selected tab / chip fill, count badge on a selected tab |

| `red-200` | `#f8c6c6` | Third step of the chart ramp (`viz-5`), hover ground of selected chips. Decorative fills only |

| `red-400` | `#ec5b57` | Coral: the end of the emphasis-gradient on headline text (`ink` to `red-400`), hero glow and arcs, second chart red |

| `red-500` | `#ef1010` | Saturated end of the dark page-banner gradient (`red-950` to `red-500`) |

| `red-600` | `#d8232a` | The brand red |

| `red-700` | `#b3141f` | Deep red: hover for solid brand fills, wordmark, focus ring on light grounds, text on `red-100`. 7:1 on `bg` |

| `red-800` | `#7f1218` | Pressed state; bottom end of the red feature-tile gradient (`red-600` to `red-800`) |

| `red-900` | `#4a0a0d` | Dense dark red for deep panels and chart emphasis |

| `red-950` | `#250304` | Near-black maroon: start of the dark page-banner gradient, deepest hero ground |



\### Brand roles



| Token | Value | Use |

| --- | --- | --- |

| `brand` | `{red-600}` | Text and stroke colour for anything the person can act on or that marks where they are: outline-button label, text links, eyebrow labels, active nav label |

| `brand-hover` | `{red-700}` | Hover and focus-visible colour of `brand` text and solid brand fills |

| `brand-pressed` | `{red-800}` | Active (pressed) colour of solid brand fills |

| `brand-tint` | `{red-50}` | Hover ground of outline buttons and tinted callouts |

| `brand-soft` | `{red-100}` | Selected tab, selected chip, selected row ground |

| `focus` | `{red-700}` | Focus ring on light grounds: 2px solid, 2px offset (`shadow-focus`). 7:1 on `bg` |

| `focus-inverse` | `#ffffff` | Focus ring on `surface-inverse`, photo tiles and `surface-brand` |



\### Status (derived)



| Token | Value | Use |

| --- | --- | --- |

| `success` | `#116b33` | (derived) Text/icon of a positive status, always with a check icon and a word |

| `success-bg` | `#eaf7ef` | (derived) Ground of a success alert or status chip |

| `success-border` | `#a9d8bb` | (derived) Border of a success alert |

| `warning` | `#9a5b00` | (derived) Text/icon of a caution status, always with a triangle icon and a word |

| `warning-bg` | `#fff6e0` | (derived) Ground of a warning alert or chip |

| `warning-border` | `#f0d089` | (derived) Border of a warning alert |

| `error` | `#b42318` | (derived) Text/icon of a failure |

| `error-bg` | `#fef0ef` | (derived) Ground of an error alert or field message |

| `error-border` | `#f4b6b2` | (derived) Border of an error alert; the field border on error is `error` itself |

| `info` | `#3a4557` | (derived) Neutral slate for informational notes: no hue competes with the brand |

| `info-bg` | `#f1f3f6` | (derived) Ground of an informational alert |

| `info-border` | `#c9d0da` | (derived) Border of an informational alert |



\### Data visualization (derived)



| Token | Value | Use |

| --- | --- | --- |

| `viz-1` | `{red-600}` | (derived) First chart series and the highlighted bar/line: the one that matters |

| `viz-2` | `#2b2b2e` | (derived) Second series: charcoal, the strongest neutral |

| `viz-3` | `#8a8a93` | (derived) Third series and 'everything else' in a highlight chart |

| `viz-4` | `{red-400}` | (derived) Fourth series; pair with a direct label, never a legend alone |

| `viz-5` | `{red-200}` | (derived) Fifth series and range/confidence fills |

| `viz-grid` | `#ededf0` | (derived) Gridlines and axis rules in charts; lighter than `border` |



\## Typography tokens



Families: `--font-sans` = `"Geist Variable", "Geist", system-ui, -apple-system, "Segoe UI", sans-serif`; `--font-mono` = `ui-monospace, "SF Mono", Menlo, Consolas, monospace`.



| Style | Group | Size / line | Weight | Tracking | Use |

| --- | --- | --- | --- | --- | --- |

| `display` | Display | 40px / 46px | 500 | -0.02em | Hero headline and centered section titles |

| `heading-1` | Display | 36px / 44px | 500 | -0.02em | Left-aligned section title beside media. One word may carry a 3px `brand` underline |

| `heading-page` | Display | 36px / 44px | 600 | -0.02em | Page title inside the dark gradient banner, `ink-inverse` |

| `title-lg` | Titles | 20px / 32px | 500 | 0 | Feature-card title (may wrap to two lines on 32px leading). `ink` |

| `title-md` | Titles | 18px / 28px | 500 | 0 | Segment/industry card title beneath its eyebrow. `ink` |

| `title-sm` | Titles | 16px / 24px | 500 | 0 | List-item titles, accordion questions, tab labels. `ink` |

| `body-lg` | Body | 16px / 24px | 400 | 0.01em | Hero subcopy, accordion answers, footer descriptions. `ink-secondary`, 640px max measure |

| `body` | Body | 15px / 24px | 400 | 0.01em | Card descriptions in wide cards. `ink-secondary` |

| `body-sm` | Body | 14px / 24px | 400 | 0.01em | Compact card descriptions and list-item descriptions. `ink-secondary` |

| `caption` | Body | 12px / 18px | 400 | 0.01em | Footer links, helper text, timestamps. `ink-muted` |

| `eyebrow` | UI | 14px / 20px | 400 | 0.02em | Section eyebrow and category label, set UPPERCASE (text-transform) in `brand` |

| `overline` | UI | 12px / 16px | 400 | 0.12em | Quiet uppercase label over a logo strip or group. `ink-muted`; wide tracking is the point |

| `button` | UI | 14px / 20px | 500 | 0 | Button and text-link labels |

| `nav-link` | UI | 14px / 20px | 400 | 0 | Navigation items: `ink-secondary` resting, `brand` when active |

| `badge` | UI | 12px / 16px | 500 | 0 | Pills and count badges |

| `input` | UI | 14px / 20px | 400 | 0 | Field values and placeholders (`ink-muted`) |

| `stat-number` | Metrics | 40px / 48px | 600 | -0.01em | Metric numerals on stat tiles, `ink-inverse` |

| `stat-label` | Metrics | 20px / 28px | 500 | 0 | Label beneath a stat numeral, `ink-inverse` |



Uppercase is applied with `text-transform` on `eyebrow` and `overline`.



\## Spacing tokens



| Token | Value | Use |

| --- | --- | --- |

| `space-1` | `4px` | Icon-to-label micro gap, vertical badge padding, arrow nudge on hover |

| `space-2` | `8px` | Tight gaps: icon plus text in a link, chip internals, list of inline actions |

| `space-3` | `12px` | Dense grid gap (segment cards), card title to description, eyebrow to title |

| `space-4` | `16px` | Icon tile to its text, field padding, subhead to body, section title to subcopy |

| `space-5` | `20px` | Horizontal padding of a button; row padding in accordions |

| `space-6` | `24px` | Card padding, default grid gap, gap between a card's text and its link |

| `space-8` | `32px` | Hero rhythm (headline, subcopy, button), gap between stacked blocks in a section |

| `space-10` | `40px` | Control height (buttons, inputs), large inner gaps |

| `space-12` | `48px` | Section header to content on compact sections |

| `space-16` | `64px` | Section header to content on primary sections; footer top |

| `space-24` | `96px` | Default vertical section padding |

| `space-32` | `128px` | Major separation: hero to first section, feature bands |



\## Radius tokens



| Token | Value | Use |

| --- | --- | --- |

| `radius-xs` | `4px` | Tags, checkbox, small inline highlights |

| `radius-sm` | `8px` | Buttons, inputs, icon tiles, menu items |

| `radius-md` | `12px` | Cards, tabs, alerts, accordion focus area |

| `radius-lg` | `16px` | Floating nav bar, stat tiles, image tiles in the bento grid |

| `radius-xl` | `24px` | Framed hero/feature image and modals |

| `radius-full` | `9999px` | Pills, count badges, status dots, avatars |



\## Shadow / elevation tokens



| Token | Value | Use |

| --- | --- | --- |

| `shadow-float` | `0 2px 12px 0 rgba(20,20,24,0.08)` | The floating nav pill. Always combined with a `border` hairline |

| `shadow-raised` | `0 8px 24px -4px rgba(20,20,24,0.10)` | (derived) Card hover lift and dropdown menus |

| `shadow-overlay` | `0 24px 48px -12px rgba(20,20,24,0.24)` | (derived) Modals and popovers above a scrim |

| `shadow-ring` | `0 0 0 4px rgba(20,20,24,0.05)` | The soft 4px ring that frames a feature image (image has its own 1px `border`) |

| `shadow-focus` | `0 0 0 2px #ffffff, 0 0 0 4px #b3141f` | (derived) Keyboard focus ring: white gap, then 2px `focus` |

| `shadow-glow` | `0 0 120px 20px rgba(236,91,87,0.30)` | Atmospheric coral glow behind the hero object. One per page |



\## Border and stroke tokens



| Token | Value | Use |

| --- | --- | --- |

| `stroke-hairline` | `1px` | Card borders, dividers, nav outline, outline-button border |

| `stroke-strong` | `2px` | Focus ring, selected-state emphasis, headline underline is 3px |

| `stroke-icon` | `1.5px` | Stroke width of every outline icon at 20-24px |



\## Container tokens



| Token | Value | Use |

| --- | --- | --- |

| `container-copy` | `640px` | Max measure of centered subcopy and long paragraphs |

| `container-default` | `1120px` | Three-up card grids and centered content blocks |

| `container-nav` | `1200px` | The floating nav bar and page banners |

| `container-wide` | `1280px` | Split sections, dense segment grids, bento |



\## Breakpoint tokens



| Token | Value | Use |

| --- | --- | --- |

| `bp-sm` | `640px` | Two columns for card grids |

| `bp-md` | `768px` | Tablet: nav shows links again; split sections go side by side |

| `bp-lg` | `1024px` | Small desktop: three-up grids |

| `bp-xl` | `1280px` | Full desktop: wide containers at intended widths |



\## Z-index tokens



| Token | Value | Use |

| --- | --- | --- |

| `z-base` | `0` | Normal flow |

| `z-nav` | `50` | Floating nav bar, above scrolling content |

| `z-overlay` | `100` | Menus and popovers |

| `z-modal` | `200` | Modal and its scrim |



\## Border recipes



| Recipe | CSS |

| --- | --- |

| Card | `border: var(--stroke-hairline) solid var(--border); border-radius: var(--radius-md); background: var(--surface); padding: var(--space-6)` |

| Outline button | `border: var(--stroke-hairline) solid var(--border-brand); color: var(--brand); border-radius: var(--radius-sm); height: var(--space-10); padding: 0 var(--space-5)` |

| Control | `border: var(--stroke-hairline) solid var(--border-control); border-radius: var(--radius-sm); height: var(--space-10)` |

| Nav bar | `border: var(--stroke-hairline) solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-float)` |

| Framed image | `border: var(--stroke-hairline) solid var(--border); border-radius: var(--radius-xl); box-shadow: var(--shadow-ring)` |

| Focus | `outline: none; box-shadow: var(--shadow-focus)` |



\## Motion (not a token family)



| Name | Value | Use |

| --- | --- | --- |

| fast | 150ms ease-out | Color, border, shadow, arrow nudge |

| control | 140ms natural ease-out | Password visibility icon and immediate control feedback |

| feedback | 180ms natural ease-out | Required messages and compact form alerts |

| base | 200ms ease-out | Accordion, menus, modal, toast |

| exit | 150ms ease-in | Closing menus and modals |

| reduced | 0ms | Under `prefers-reduced-motion: reduce` |



\## Gradient recipes



See \*2. Color System\* for the gradient recipes (emphasis text, hero wash, hero atmosphere, page banner, charcoal tile, brand tile, photo scrim). They are composed from the tokens above and are not tokens themselves.





\# Component Guidelines



Each component has a live preview in the Design System artifact (`components/<Name>/preview.html`). The guidelines say what the consumer provides, the anatomy, states and rules.



\## Button



An outline-first action button in a 40px rounded rectangle, with solid, quiet and text-link variants.



\*\*You provide:\*\* a short verb-first label (two or three words, Title Case for buttons, sentence case for text links) and, when the action navigates, a trailing arrow icon.



\*\*Variants.\*\* Outline (`border-brand` + `brand` label on `bg`) is the default and the primary call to action. Solid (`brand` fill, `on-brand` label) is for the single conversion that must outrank everything on a view. Quiet (`ink-secondary` label, no border) is for cancel and tertiary actions. Text link (`brand`, no box) is the per-card action and always carries an arrow.



\*\*Rules.\*\*



\- Height `space-10`, horizontal padding `space-5`, radius `radius-sm`, label in `button` style, icon gap `space-2`.

\- One outline hero button and at most one closing button per grid; one Solid per view.

\- Hover: outline fills `brand-tint` and shifts to `brand-hover`; the arrow nudges `space-1` right. Pressed: `brand-pressed`. Disabled: `border-strong` border and `ink-disabled` label. Loading keeps the width and swaps the arrow for a 16px spinner.

\- Focus is `shadow-focus`; on dark grounds use `focus-inverse`.

\- Never make a button a pill, never put red text on a `red-100` ground, and never stack two Solid buttons.



\## Badge



Small pills, counts, status chips and tags that label or count without drawing attention away from content.



\*\*You provide:\*\* a short label or number; for status, an icon or dot and a word.



\*\*Kinds.\*\* The \*pill\* is an outer capsule (`surface`, hairline `border`, `radius-full`) holding a `caption` label and an inner solid `surface-brand` pill with `on-brand` `badge` text; use it once above a hero headline ("Powered by ..."). The \*count badge\* is a `radius-full` chip at least 24px wide: `surface-subtle` normally, `red-200` with `red-700` text inside a selected chip. The \*status badge\* (derived) uses the status `-bg`, `-border` and text colors with an icon or dot plus a word. The \*tag\* is a `radius-xs` `surface-subtle` label.



\*\*Rules.\*\*



\- Never use color alone: pair every status with an icon or dot and a word.

\- Status badges never decorate; only use them for real state.

\- Do not place `ink-muted` text on `red-100` or `red-50`; use `red-700`.

\- Keep badge text in `badge` style (12px / 500).



\## Input



A 40px text field family: search, form field and select, built from the same rounded rectangle.



\*\*You provide:\*\* a visible label (for form fields), the value or placeholder, helper text, and an error message when invalid. A search input needs an accessible name because it has no visible label.



\*\*Anatomy.\*\* Optional label (`title-sm` at 14px, `ink`), control, helper or error line (`caption`). The control is `space-10` tall, `radius-sm`, 1px `border-control` (3:1 so it is findable without color), `space-3` horizontal padding, value in `input` style, placeholder in `ink-muted`. Search adds a leading 16px search icon; select adds a trailing 16px chevron.



\*\*States.\*\* Hover: border `ink-secondary`. Focus: border `focus` plus `shadow-focus`. Authentication fields use `surface-subtle`, a quiet border and a neutral grey focus ring. Error (derived): border `error`, an alert icon and message in `error` below; never signal error with color alone. Disabled: `surface-subtle` fill, `ink-disabled`, border `border-strong`.



\*\*On a dark banner\*\* the search input is white (`surface`) with no visible border, up to 450px wide, centered; its focus ring uses a `surface-inverse` gap and `focus-inverse`.



\*\*Rules.\*\* Labels sit above fields, never as placeholders alone. Validation timing follows the task: login validates on submit and revalidates on change, while blur alone stays quiet. Field to field gap is `space-4`; label to control `space-2`. Required feedback enters in 180ms and disappears as soon as the corrected value becomes valid.



\## Alert



An inline message in a tinted, hairline-bordered box with a status icon, a title, one or two lines of body and an optional action.



\*\*Derived:\*\* the reference shows no alerts; this is built from its tokens.



\*\*You provide:\*\* the status (info, success, warning, error), a title that states the outcome, a body of at most two lines, an optional text link, and whether it can be dismissed.



\*\*Anatomy.\*\* `radius-md`, 1px status border, status `-bg` ground, `space-4` padding, 20px status icon at left with `space-3` gap, `title-sm` in `ink`, body in `body-sm` `ink-secondary`, action as a `brand` text link with an arrow, dismiss button top-right (`ink-muted`). The compact form variant uses a 16px icon, `body-sm` medium text, 12px inline padding, 10px block padding and a vertically centered close button.



\*\*Rules.\*\*



\- Always icon + a word (for example "Error: import failed"). Because the brand is red, error never relies on hue: it uses `alert-circle`, the word "Error" and `error-bg`.

\- Info uses neutral slate, not a new hue.

\- Inline alerts persist until resolved; transient confirmations fade after 6 seconds and are never errors.

\- One alert per event; stack at most three.

\- Credential failures use neutral, non-enumerating copy: “Email atau password tidak valid”. Do not reveal which credential was incorrect.

\- A dismissed compact alert collapses out of the layout before its state resets; closing it never clears the form values.



\## Tabs



A horizontally scrolling strip of category chips with icons, labels and counts, where the selected chip is tinted and swaps the panel below.



\*\*You provide:\*\* the chips (label, optional icon, count, optional sub-label), the selected index, and the panel content each chip controls.



\*\*Anatomy.\*\* Chip: `radius-md`, 1px `border`, `surface`, padding `space-3` x `space-4`, min height 48px, 16px icon, `title-sm` label, optional `caption` sub-label in `ink-muted`, `radius-full` count badge; `space-3` between chips. Selected: `brand-soft` fill, `border-brand-soft`, label `ink`, count `red-200` with `red-700` text. Hover: `border-strong`. Focus: `shadow-focus`.



\*\*Behavior.\*\* Selecting a chip swaps the panel without navigating; Left and Right arrows move selection; the strip scrolls sideways at every width with 40px chevron buttons at both ends (desktop) or native swipe (touch); the selected chip scrolls into view.



\*\*Rules.\*\* The selected chip is the only tinted element in the strip. Counts are neutral information, not status. Use the same chip shape for filters (multi-select adds a leading check).



\## Accordion



A full-width list of hairline-separated question rows, one open at a time, with the answer revealed beneath.



\*\*You provide:\*\* question and answer pairs, with the answer as one short paragraph; and the index of the row that starts open (the first by default).



\*\*Anatomy.\*\* Rows separated by 1px `border` with no boxes or fills. Question in `title-sm` `ink` on the left, a 16px chevron in `ink-secondary` on the right (down closed, up open). Answer in `body-lg` `ink-secondary`, indented to the question, `space-5` below. Row padding `space-5` vertical.



\*\*Behavior.\*\* Opening a row closes the others; height and opacity animate in 200ms `ease-out`; the chevron rotates 180 degrees. Hover shifts the question to `brand-hover`. The row header is a `button` with `aria-expanded` and `shadow-focus`.



\*\*Rules.\*\* Keep answers to one short paragraph; longer explanations get their own page. Put a centered outline "View All" button `space-16` below the list when the FAQ continues elsewhere.



\## NavBar



A floating navigation card with the logo at the left and links at the right, whose active link follows the section in view.



\*\*You provide:\*\* the logo or wordmark, the link list (about five), the active link, and the scroll-spy wiring.



\*\*Anatomy.\*\* `container-nav` (1200px) wide, 76px tall, `surface` with a 1px `border`, `radius-lg` and `shadow-float`; detached `space-2` from the top; sticky at `z-nav` so page content scrolls under it. Links: `nav-link` 14px, padding `space-2` x `space-4`, `radius-sm`. Resting `ink-secondary`; hover `ink`; \*\*active\*\* `surface-subtle` fill with `brand` label.



\*\*Rules.\*\*



\- Give every band below it top padding of the bar's height plus its offset.

\- Below `bp-md` it becomes a full-width-minus-16px, 64px bar with the logo and a menu button; links open in a sheet with 48px targets.

\- The active state is set by scroll position or route, never by hover.

\- The wordmark is uppercase Geist 600 with +0.04em tracking in `red-700` unless you supply a real logo.



\## Card



The system's flat, hairline-bordered card in three forms: feature card with an illustration, segment card with an icon tile and eyebrow, and an unboxed list row.



\*\*You provide:\*\* for a feature card, a spot illustration (about 180px stage), a title, a two-line description and a link label; for a segment card, an icon, a category label, a title, a description of up to five lines and a link; for a list row, an icon, a title and a description.



\*\*Anatomy.\*\* Card: `surface`, 1px `border`, `radius-md`, `space-6` padding; equal heights within a row; the link pins to the bottom. Feature: stage, `title-lg`, `body-sm` in `ink-secondary`, text link. Segment: 40px `surface-brand` icon tile with a white glyph at `radius-sm` beside an uppercase `eyebrow` in `brand`, then `title-md`, `body`, link. List row: tile left, `title-sm` over `body-sm`, `space-4` gap.



\*\*States.\*\* Resting flat. Hover (derived): `border-strong`, `shadow-raised`, arrow nudge; the whole card is the target. Selected (derived): `border-brand` on `brand-tint`.



\*\*Rules.\*\* No left-border accents, no drop shadows at rest, no more than six cards per grid without a closing button. Illustrations are single-hue reds with lighter highlights; do not mix photo and illustration cards in one row.



\## StatTile



A dark or brand metric tile with a large numeral and a label, used in a two-column bento grid with photo tiles.



\*\*You provide:\*\* a short numeral or claim (for example "10K+", "24/7", a year), a label that says what is counted, and the tile fill: charcoal, brand, or a grayscale photograph.



\*\*Anatomy.\*\* `radius-lg`, `space-6` padding, `stat-number` (40 / 48, 600) over `stat-label` (20 / 28, 500), both `ink-inverse` (label may be `ink-inverse-muted` on charcoal). Fills: `surface-inverse` to `surface-inverse-raised` gradient (135 degrees), `red-600` to `red-800` gradient, or a grayscale photo under a bottom scrim (black 0 to 70% over 60%) with text on the scrim at the bottom. Short tiles are about 148px, photo tiles about 490px; grid gap `space-6`.



\*\*Rules.\*\*



\- Only one brand tile per grid; it marks the number that matters most.

\- Text over a photo always sits on the scrim, never on a bright area.

\- Use tabular figures when values change.

\- A small circular corner affordance may open the photo in a lightbox.



\## SectionHeader



The eyebrow, title and subcopy trio that introduces every section, centered on marketing pages and left-aligned beside media.



\*\*You provide:\*\* an optional category (eyebrow), a title of about six words with an optional emphasized phrase, and one or two lines of subcopy.



\*\*Anatomy.\*\* Eyebrow in `eyebrow` style, uppercase, `brand`; `space-3` gap; title in `display` (centered) or `heading-1` (split), `ink`; `space-4` gap; subcopy in `body-lg` `ink-secondary` at `container-copy`. Emphasis is either the gradient (`ink` to `red-400`) on the closing phrase, or a 3px `brand` underline offset 4px beneath one word, never both. Content follows `space-16` below (`space-12` in compact sections).



\*\*Split variant.\*\* Text column up to 540px with a list of icon-tile rows; media column aligned to the container's right edge, framed at `radius-xl` with a 1px `border` and `shadow-ring`.



\*\*Rules.\*\* Gradient text is 24px or larger only. One idea per header.



\## Hero



The opening band: a pill, a gradient-ended headline, two lines of subcopy, one outline button, and one glowing object on a pink-tinted wash.



\*\*You provide:\*\* a two-part headline (a statement and its turn), a subcopy of at most two lines, a button label, the pill text, and a hero object (illustration or product image).



\*\*Anatomy.\*\* Background `bg-wash` radial fading to `bg`. Stack centered with `space-8` rhythm: pill, `display` headline with the emphasis gradient on the second sentence, `body-lg` subcopy at `container-copy`, outline button. Below, a stage about 280px tall carrying a coral half-disc (`red-400` fading to `bg-wash`) with fine concentric arcs and one solid `surface-brand` object; edges are masked so the glow never shows a hard side. A quiet "Scroll for more" cue in `ink-muted` with a chevron sits beneath.



\*\*Rules.\*\* This is the one atmospheric moment on the page. Keep the nav bar overlaying the top, hero content starting `space-12` below it, and the next band `space-32` away. Do not add a second button or a second glow.



\## Authentication Surface



A focused split-screen entry point that pairs a calm, compact login form with one cinematic security image.



\*\*Anatomy.\*\* The page uses a white left column and a clipped `radius-xl` image panel on the right. The Trustera logo sits at the top of the form column; the form is centered at a maximum width of 420px. Use the heading “Login” and the supporting line “Portal Vulnerability Assessment dan Penetration Testing (VAPT).” The image panel carries a dark bottom scrim and the two-stage lockup `01 Assess / your security.` and `02 Validate / your defenses.` at the lower-left.



\*\*Fields.\*\* Labels and placeholders are “Email” and “Password”. Fields use `surface-subtle`, a muted neutral border and a grey focus ring. The password visibility control is a bold black eye icon with no surrounding fill or visible padded container; it remains an accessible button with a changing label.



\*\*Validation and feedback.\*\* Required and email-format errors appear only after submit, focus the first invalid field, and then revalidate on change. Credential rejection is a compact dismissible error alert with the single message “Email atau password tidak valid”. Required text, alert expansion and collapse, password icon swaps and pressed controls use the short motion timings defined in \*Interaction Language\*.



\*\*Responsive behavior.\*\* Show both columns from `bp-lg`; below it, remove the image panel rather than shrinking it behind the form. The document is the only scroll container at every size.



\## Footer



A quiet footer with a brand block, link columns, a hairline and a centered copyright.



\*\*You provide:\*\* the wordmark or logo, a one- or two-line description, link groups with headings, contact lines, and the copyright text.



\*\*Anatomy.\*\* `container-default`, top padding `space-16`. A three-column grid (brand block wider): wordmark plus a `body-lg` `ink-secondary` description at 320px max; column headings in 14px / 600 `ink`; links in `caption` `ink-muted` at about 34px pitch, hover `brand-hover`. A full-width 1px `border` rule, then the copyright centered in `body-sm` `ink-muted`.



\*\*Rules.\*\* No dark footer background; the footer stays white so the page ends as calmly as it began. Columns stack below `bp-md`.





\# Appendix A. tokens.json (verbatim)



Source of truth for every value in this document. Color values written `{name}` are aliases of another color token.



```json

{

&#x20; "name": "Vermilion",

&#x20; "version": 1,

&#x20; "color": {

&#x20;   "themes": \[

&#x20;     {

&#x20;       "id": "light",

&#x20;       "name": "Light"

&#x20;     }

&#x20;   ],

&#x20;   "tokens": \[

&#x20;     {

&#x20;       "name": "bg",

&#x20;       "value": "#ffffff",

&#x20;       "usage": "Page ground. Default background of every section; `ink`, `ink-secondary` and `ink-muted` all read on it."

&#x20;     },

&#x20;     {

&#x20;       "name": "bg-wash",

&#x20;       "value": "#fff5f5",

&#x20;       "usage": "Pink-tinted white used as a soft wash behind the hero and one supporting section per page (radial, fading to `bg`). `ink`, `ink-secondary`, `ink-muted` and `brand` text read on it."

&#x20;     },

&#x20;     {

&#x20;       "name": "surface",

&#x20;       "value": "#ffffff",

&#x20;       "usage": "Card and panel fill, always paired with a `border` hairline. Same text colors as `bg`."

&#x20;     },

&#x20;     {

&#x20;       "name": "surface-subtle",

&#x20;       "value": "#f5f5f6",

&#x20;       "usage": "Quiet neutral fill: the active nav item, count badges, hover on rows, disabled fills. `ink`, `ink-secondary` and `ink-muted` read on it."

&#x20;     },

&#x20;     {

&#x20;       "name": "surface-inverse",

&#x20;       "value": "#1c1c1e",

&#x20;       "usage": "Dark charcoal tile / hero ground for high-contrast feature tiles and stat tiles. Text on it: `ink-inverse` and `ink-inverse-muted`."

&#x20;     },

&#x20;     {

&#x20;       "name": "surface-inverse-raised",

&#x20;       "value": "#3a3a3d",

&#x20;       "usage": "Gradient end for `surface-inverse` tiles (top-left `surface-inverse` to bottom-right `surface-inverse-raised`). Text: `ink-inverse`."

&#x20;     },

&#x20;     {

&#x20;       "name": "surface-brand",

&#x20;       "value": "{red-600}",

&#x20;       "usage": "Solid brand fill for icon tiles, the Pill badge and the single highlighted stat tile. Text and glyphs on it: `on-brand`."

&#x20;     },

&#x20;     {

&#x20;       "name": "ink",

&#x20;       "value": "#0b0b0c",

&#x20;       "usage": "Headlines, card titles, nav labels, form values. 18:1 or better on `bg`, `bg-wash`, `surface` and `surface-subtle`."

&#x20;     },

&#x20;     {

&#x20;       "name": "ink-secondary",

&#x20;       "value": "#5e5e66",

&#x20;       "usage": "Body copy, subcopy, descriptions. 6.4:1 on `bg`; above 5.5:1 on `bg-wash` and `surface-subtle`."

&#x20;     },

&#x20;     {

&#x20;       "name": "ink-muted",

&#x20;       "value": "#6f6f77",

&#x20;       "usage": "Metadata, captions, footer links, placeholders, inactive tab labels. 4.98:1 on `bg`, 4.66:1 on `bg-wash`, 4.57:1 on `surface-subtle`. Do not use on `red-50`, `red-100` or any dark surface."

&#x20;     },

&#x20;     {

&#x20;       "name": "ink-disabled",

&#x20;       "value": "#a1a1a8",

&#x20;       "usage": "Disabled labels and icons only (exempt from contrast); never for anything a person must read."

&#x20;     },

&#x20;     {

&#x20;       "name": "ink-inverse",

&#x20;       "value": "#ffffff",

&#x20;       "usage": "Text on `surface-inverse`, `surface-inverse-raised` and photo scrims. 17:1 on `surface-inverse`, 11:1 on `surface-inverse-raised`."

&#x20;     },

&#x20;     {

&#x20;       "name": "ink-inverse-muted",

&#x20;       "value": "#d4d4d8",

&#x20;       "usage": "Secondary text on `surface-inverse` (11.5:1) and `surface-inverse-raised` (7.7:1)."

&#x20;     },

&#x20;     {

&#x20;       "name": "on-brand",

&#x20;       "value": "#ffffff",

&#x20;       "usage": "Text and icons on `brand`, `brand-hover`, `brand-pressed`, `surface-brand`. 5.0:1 on `red-600`, 7:1 on `red-700`."

&#x20;     },

&#x20;     {

&#x20;       "name": "border",

&#x20;       "value": "#e7e7ea",

&#x20;       "usage": "Hairline around cards, dividers between rows (FAQ, footer), the nav pill outline. Decorative grouping only (about 1.3:1): never the only cue for a control."

&#x20;     },

&#x20;     {

&#x20;       "name": "border-strong",

&#x20;       "value": "#cfcfd4",

&#x20;       "usage": "Hover border on cards and quiet buttons; divider inside dense tables."

&#x20;     },

&#x20;     {

&#x20;       "name": "border-control",

&#x20;       "value": "#8a8a93",

&#x20;       "usage": "Border of inputs, selects, checkboxes: at least 3:1 on `bg`, `bg-wash` and `surface-subtle` so a control is findable without color."

&#x20;     },

&#x20;     {

&#x20;       "name": "border-brand",

&#x20;       "value": "{red-600}",

&#x20;       "usage": "Outline of the primary (outline) button and the selected chip ring. 5.0:1 on `bg`."

&#x20;     },

&#x20;     {

&#x20;       "name": "border-brand-soft",

&#x20;       "value": "#f3b7b7",

&#x20;       "usage": "Border of the selected tab and tinted callouts, paired with `brand-soft` fill."

&#x20;     },

&#x20;     {

&#x20;       "name": "red-50",

&#x20;       "value": "#fef2f2",

&#x20;       "usage": "Lightest red tint: tinted callout ground, hover ground on outline buttons. Text on it: `ink` or `red-700`."

&#x20;     },

&#x20;     {

&#x20;       "name": "red-100",

&#x20;       "value": "#fde4e4",

&#x20;       "usage": "Selected tab / chip fill, count badge on a selected tab. Text on it: `red-700` (5.7:1) or `ink`; never `brand` (4.2:1)."

&#x20;     },

&#x20;     {

&#x20;       "name": "red-200",

&#x20;       "value": "#f8c6c6",

&#x20;       "usage": "Third step of the chart ramp (`viz-5`), hover ground of selected chips. Decorative fills only."

&#x20;     },

&#x20;     {

&#x20;       "name": "red-400",

&#x20;       "value": "#ec5b57",

&#x20;       "usage": "Coral: the end of the emphasis-gradient on headline text (`ink` to `red-400`), hero glow and arcs, second chart red. Decorative and 24px+ display text only (3.4:1 on `bg`)."

&#x20;     },

&#x20;     {

&#x20;       "name": "red-500",

&#x20;       "value": "#ef1010",

&#x20;       "usage": "Saturated end of the dark page-banner gradient (`red-950` to `red-500`). Large white display text only (4.4:1)."

&#x20;     },

&#x20;     {

&#x20;       "name": "red-600",

&#x20;       "value": "#d8232a",

&#x20;       "usage": "The brand red. Actions, eyebrows, links, active labels, icon tiles. 5.0:1 on `bg` and `bg-wash`; white on it 5.0:1."

&#x20;     },

&#x20;     {

&#x20;       "name": "red-700",

&#x20;       "value": "#b3141f",

&#x20;       "usage": "Deep red: hover for solid brand fills, wordmark, focus ring on light grounds, text on `red-100`. 7:1 on `bg`."

&#x20;     },

&#x20;     {

&#x20;       "name": "red-800",

&#x20;       "value": "#7f1218",

&#x20;       "usage": "Pressed state; bottom end of the red feature-tile gradient (`red-600` to `red-800`)."

&#x20;     },

&#x20;     {

&#x20;       "name": "red-900",

&#x20;       "value": "#4a0a0d",

&#x20;       "usage": "Dense dark red for deep panels and chart emphasis."

&#x20;     },

&#x20;     {

&#x20;       "name": "red-950",

&#x20;       "value": "#250304",

&#x20;       "usage": "Near-black maroon: start of the dark page-banner gradient, deepest hero ground."

&#x20;     },

&#x20;     {

&#x20;       "name": "brand",

&#x20;       "value": "{red-600}",

&#x20;       "usage": "Text and stroke colour for anything the person can act on or that marks where they are: outline-button label, text links, eyebrow labels, active nav label."

&#x20;     },

&#x20;     {

&#x20;       "name": "brand-hover",

&#x20;       "value": "{red-700}",

&#x20;       "usage": "Hover and focus-visible colour of `brand` text and solid brand fills."

&#x20;     },

&#x20;     {

&#x20;       "name": "brand-pressed",

&#x20;       "value": "{red-800}",

&#x20;       "usage": "Active (pressed) colour of solid brand fills."

&#x20;     },

&#x20;     {

&#x20;       "name": "brand-tint",

&#x20;       "value": "{red-50}",

&#x20;       "usage": "Hover ground of outline buttons and tinted callouts."

&#x20;     },

&#x20;     {

&#x20;       "name": "brand-soft",

&#x20;       "value": "{red-100}",

&#x20;       "usage": "Selected tab, selected chip, selected row ground."

&#x20;     },

&#x20;     {

&#x20;       "name": "focus",

&#x20;       "value": "{red-700}",

&#x20;       "usage": "Focus ring on light grounds: 2px solid, 2px offset (`shadow-focus`). 7:1 on `bg`."

&#x20;     },

&#x20;     {

&#x20;       "name": "focus-inverse",

&#x20;       "value": "#ffffff",

&#x20;       "usage": "Focus ring on `surface-inverse`, photo tiles and `surface-brand`."

&#x20;     },

&#x20;     {

&#x20;       "name": "success",

&#x20;       "value": "#116b33",

&#x20;       "usage": "(derived) Text/icon of a positive status, always with a check icon and a word. 6.6:1 on `bg`, 6.0:1 on `success-bg`. Green is not in the reference; it is added because status needs a hue other than the brand red."

&#x20;     },

&#x20;     {

&#x20;       "name": "success-bg",

&#x20;       "value": "#eaf7ef",

&#x20;       "usage": "(derived) Ground of a success alert or status chip."

&#x20;     },

&#x20;     {

&#x20;       "name": "success-border",

&#x20;       "value": "#a9d8bb",

&#x20;       "usage": "(derived) Border of a success alert."

&#x20;     },

&#x20;     {

&#x20;       "name": "warning",

&#x20;       "value": "#9a5b00",

&#x20;       "usage": "(derived) Text/icon of a caution status, always with a triangle icon and a word. 5.4:1 on `bg`, 5.0:1 on `warning-bg`."

&#x20;     },

&#x20;     {

&#x20;       "name": "warning-bg",

&#x20;       "value": "#fff6e0",

&#x20;       "usage": "(derived) Ground of a warning alert or chip."

&#x20;     },

&#x20;     {

&#x20;       "name": "warning-border",

&#x20;       "value": "#f0d089",

&#x20;       "usage": "(derived) Border of a warning alert."

&#x20;     },

&#x20;     {

&#x20;       "name": "error",

&#x20;       "value": "#b42318",

&#x20;       "usage": "(derived) Text/icon of a failure. Because the brand is red, an error is never signalled by color alone: it carries an alert icon, the word 'Error' or a message, and a `error-bg` ground. 6.5:1 on `bg`, 5.8:1 on `error-bg`."

&#x20;     },

&#x20;     {

&#x20;       "name": "error-bg",

&#x20;       "value": "#fef0ef",

&#x20;       "usage": "(derived) Ground of an error alert or field message."

&#x20;     },

&#x20;     {

&#x20;       "name": "error-border",

&#x20;       "value": "#f4b6b2",

&#x20;       "usage": "(derived) Border of an error alert; the field border on error is `error` itself."

&#x20;     },

&#x20;     {

&#x20;       "name": "info",

&#x20;       "value": "#3a4557",

&#x20;       "usage": "(derived) Neutral slate for informational notes: no hue competes with the brand. 9.7:1 on `bg`, 8.6:1 on `info-bg`."

&#x20;     },

&#x20;     {

&#x20;       "name": "info-bg",

&#x20;       "value": "#f1f3f6",

&#x20;       "usage": "(derived) Ground of an informational alert."

&#x20;     },

&#x20;     {

&#x20;       "name": "info-border",

&#x20;       "value": "#c9d0da",

&#x20;       "usage": "(derived) Border of an informational alert."

&#x20;     },

&#x20;     {

&#x20;       "name": "viz-1",

&#x20;       "value": "{red-600}",

&#x20;       "usage": "(derived) First chart series and the highlighted bar/line: the one that matters."

&#x20;     },

&#x20;     {

&#x20;       "name": "viz-2",

&#x20;       "value": "#2b2b2e",

&#x20;       "usage": "(derived) Second series: charcoal, the strongest neutral."

&#x20;     },

&#x20;     {

&#x20;       "name": "viz-3",

&#x20;       "value": "#8a8a93",

&#x20;       "usage": "(derived) Third series and 'everything else' in a highlight chart."

&#x20;     },

&#x20;     {

&#x20;       "name": "viz-4",

&#x20;       "value": "{red-400}",

&#x20;       "usage": "(derived) Fourth series; pair with a direct label, never a legend alone."

&#x20;     },

&#x20;     {

&#x20;       "name": "viz-5",

&#x20;       "value": "{red-200}",

&#x20;       "usage": "(derived) Fifth series and range/confidence fills."

&#x20;     },

&#x20;     {

&#x20;       "name": "viz-grid",

&#x20;       "value": "#ededf0",

&#x20;       "usage": "(derived) Gridlines and axis rules in charts; lighter than `border`."

&#x20;     }

&#x20;   ]

&#x20; },

&#x20; "type": {

&#x20;   "fonts": \[],

&#x20;   "families": {

&#x20;     "sans": "\\"Geist Variable\\", \\"Geist\\", system-ui, -apple-system, \\"Segoe UI\\", sans-serif",

&#x20;     "mono": "ui-monospace, \\"SF Mono\\", Menlo, Consolas, monospace"

&#x20;   },

&#x20;   "groups": \[

&#x20;     {

&#x20;       "name": "Display",

&#x20;       "family": "sans",

&#x20;       "styles": \[

&#x20;         {

&#x20;           "name": "display",

&#x20;           "fontSize": "40px",

&#x20;           "lineHeight": "46px",

&#x20;           "fontWeight": 500,

&#x20;           "letterSpacing": "-0.02em",

&#x20;           "sample": "Downtime doesn't wait. Neither should you.",

&#x20;           "usage": "Hero headline and centered section titles. `ink`, with the emphasis gradient (`ink` to `red-400`) on the closing phrase."

&#x20;         },

&#x20;         {

&#x20;           "name": "heading-1",

&#x20;           "fontSize": "36px",

&#x20;           "lineHeight": "44px",

&#x20;           "fontWeight": 500,

&#x20;           "letterSpacing": "-0.02em",

&#x20;           "sample": "Why teams switch",

&#x20;           "usage": "Left-aligned section title beside media. One word may carry a 3px `brand` underline."

&#x20;         },

&#x20;         {

&#x20;           "name": "heading-page",

&#x20;           "fontSize": "36px",

&#x20;           "lineHeight": "44px",

&#x20;           "fontWeight": 600,

&#x20;           "letterSpacing": "-0.02em",

&#x20;           "sample": "Frequently asked questions",

&#x20;           "usage": "Page title inside the dark gradient banner, `ink-inverse`. Bolder than `heading-1` because it sits on a busy ground."

&#x20;         }

&#x20;       ]

&#x20;     },

&#x20;     {

&#x20;       "name": "Titles",

&#x20;       "family": "sans",

&#x20;       "styles": \[

&#x20;         {

&#x20;           "name": "title-lg",

&#x20;           "fontSize": "20px",

&#x20;           "lineHeight": "32px",

&#x20;           "fontWeight": 500,

&#x20;           "letterSpacing": "0",

&#x20;           "sample": "Uptime monitoring",

&#x20;           "usage": "Feature-card title (may wrap to two lines on 32px leading). `ink`."

&#x20;         },

&#x20;         {

&#x20;           "name": "title-md",

&#x20;           "fontSize": "18px",

&#x20;           "lineHeight": "28px",

&#x20;           "fontWeight": 500,

&#x20;           "letterSpacing": "0",

&#x20;           "sample": "Guarding customer records",

&#x20;           "usage": "Segment/industry card title beneath its eyebrow. `ink`."

&#x20;         },

&#x20;         {

&#x20;           "name": "title-sm",

&#x20;           "fontSize": "16px",

&#x20;           "lineHeight": "24px",

&#x20;           "fontWeight": 500,

&#x20;           "letterSpacing": "0",

&#x20;           "sample": "End-to-end coverage",

&#x20;           "usage": "List-item titles, accordion questions, tab labels. `ink`."

&#x20;         }

&#x20;       ]

&#x20;     },

&#x20;     {

&#x20;       "name": "Body",

&#x20;       "family": "sans",

&#x20;       "styles": \[

&#x20;         {

&#x20;           "name": "body-lg",

&#x20;           "fontSize": "16px",

&#x20;           "lineHeight": "24px",

&#x20;           "fontWeight": 400,

&#x20;           "letterSpacing": "0.01em",

&#x20;           "sample": "Enterprise-grade tooling, managed for you, without hiring an entire team.",

&#x20;           "usage": "Hero subcopy, accordion answers, footer descriptions. `ink-secondary`, 640px max measure."

&#x20;         },

&#x20;         {

&#x20;           "name": "body",

&#x20;           "fontSize": "15px",

&#x20;           "lineHeight": "24px",

&#x20;           "fontWeight": 400,

&#x20;           "letterSpacing": "0.01em",

&#x20;           "sample": "Unified visibility across every site, before it becomes an incident.",

&#x20;           "usage": "Card descriptions in wide cards. `ink-secondary`."

&#x20;         },

&#x20;         {

&#x20;           "name": "body-sm",

&#x20;           "fontSize": "14px",

&#x20;           "lineHeight": "24px",

&#x20;           "fontWeight": 400,

&#x20;           "letterSpacing": "0.01em",

&#x20;           "sample": "A short line that says what it does. And the promise.",

&#x20;           "usage": "Compact card descriptions and list-item descriptions. `ink-secondary`."

&#x20;         },

&#x20;         {

&#x20;           "name": "caption",

&#x20;           "fontSize": "12px",

&#x20;           "lineHeight": "18px",

&#x20;           "fontWeight": 400,

&#x20;           "letterSpacing": "0.01em",

&#x20;           "sample": "support@example.com",

&#x20;           "usage": "Footer links, helper text, timestamps. `ink-muted`."

&#x20;         }

&#x20;       ]

&#x20;     },

&#x20;     {

&#x20;       "name": "UI",

&#x20;       "family": "sans",

&#x20;       "styles": \[

&#x20;         {

&#x20;           "name": "eyebrow",

&#x20;           "fontSize": "14px",

&#x20;           "lineHeight": "20px",

&#x20;           "fontWeight": 400,

&#x20;           "letterSpacing": "0.02em",

&#x20;           "sample": "About us",

&#x20;           "usage": "Section eyebrow and category label, set UPPERCASE (text-transform) in `brand`."

&#x20;         },

&#x20;         {

&#x20;           "name": "overline",

&#x20;           "fontSize": "12px",

&#x20;           "lineHeight": "16px",

&#x20;           "fontWeight": 400,

&#x20;           "letterSpacing": "0.12em",

&#x20;           "sample": "Trusted by these teams",

&#x20;           "usage": "Quiet uppercase label over a logo strip or group. `ink-muted`; wide tracking is the point."

&#x20;         },

&#x20;         {

&#x20;           "name": "button",

&#x20;           "fontSize": "14px",

&#x20;           "lineHeight": "20px",

&#x20;           "fontWeight": 500,

&#x20;           "letterSpacing": "0",

&#x20;           "sample": "Explore solutions",

&#x20;           "usage": "Button and text-link labels."

&#x20;         },

&#x20;         {

&#x20;           "name": "nav-link",

&#x20;           "fontSize": "14px",

&#x20;           "lineHeight": "20px",

&#x20;           "fontWeight": 400,

&#x20;           "letterSpacing": "0",

&#x20;           "sample": "Product",

&#x20;           "usage": "Navigation items: `ink-secondary` resting, `brand` when active."

&#x20;         },

&#x20;         {

&#x20;           "name": "badge",

&#x20;           "fontSize": "12px",

&#x20;           "lineHeight": "16px",

&#x20;           "fontWeight": 500,

&#x20;           "letterSpacing": "0",

&#x20;           "sample": "Powered by",

&#x20;           "usage": "Pills and count badges."

&#x20;         },

&#x20;         {

&#x20;           "name": "input",

&#x20;           "fontSize": "14px",

&#x20;           "lineHeight": "20px",

&#x20;           "fontWeight": 400,

&#x20;           "letterSpacing": "0",

&#x20;           "sample": "Search your question...",

&#x20;           "usage": "Field values and placeholders (`ink-muted`)."

&#x20;         }

&#x20;       ]

&#x20;     },

&#x20;     {

&#x20;       "name": "Metrics",

&#x20;       "family": "sans",

&#x20;       "styles": \[

&#x20;         {

&#x20;           "name": "stat-number",

&#x20;           "fontSize": "40px",

&#x20;           "lineHeight": "48px",

&#x20;           "fontWeight": 600,

&#x20;           "letterSpacing": "-0.01em",

&#x20;           "sample": "10K+",

&#x20;           "usage": "Metric numerals on stat tiles, `ink-inverse`. Use tabular figures (`font-variant-numeric: tabular-nums`) in tables and charts."

&#x20;         },

&#x20;         {

&#x20;           "name": "stat-label",

&#x20;           "fontSize": "20px",

&#x20;           "lineHeight": "28px",

&#x20;           "fontWeight": 500,

&#x20;           "letterSpacing": "0",

&#x20;           "sample": "Incidents handled",

&#x20;           "usage": "Label beneath a stat numeral, `ink-inverse`."

&#x20;         }

&#x20;       ]

&#x20;     }

&#x20;   ]

&#x20; },

&#x20; "spacing": {

&#x20;   "note": "4px base. Steps double roughly every two: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, with 20 and 40 for the two places the reference lands between.",

&#x20;   "tokens": \[

&#x20;     {

&#x20;       "name": "space-1",

&#x20;       "value": "4px",

&#x20;       "usage": "Icon-to-label micro gap, vertical badge padding, arrow nudge on hover."

&#x20;     },

&#x20;     {

&#x20;       "name": "space-2",

&#x20;       "value": "8px",

&#x20;       "usage": "Tight gaps: icon plus text in a link, chip internals, list of inline actions."

&#x20;     },

&#x20;     {

&#x20;       "name": "space-3",

&#x20;       "value": "12px",

&#x20;       "usage": "Dense grid gap (segment cards), card title to description, eyebrow to title."

&#x20;     },

&#x20;     {

&#x20;       "name": "space-4",

&#x20;       "value": "16px",

&#x20;       "usage": "Icon tile to its text, field padding, subhead to body, section title to subcopy."

&#x20;     },

&#x20;     {

&#x20;       "name": "space-5",

&#x20;       "value": "20px",

&#x20;       "usage": "Horizontal padding of a button; row padding in accordions."

&#x20;     },

&#x20;     {

&#x20;       "name": "space-6",

&#x20;       "value": "24px",

&#x20;       "usage": "Card padding, default grid gap, gap between a card's text and its link."

&#x20;     },

&#x20;     {

&#x20;       "name": "space-8",

&#x20;       "value": "32px",

&#x20;       "usage": "Hero rhythm (headline, subcopy, button), gap between stacked blocks in a section."

&#x20;     },

&#x20;     {

&#x20;       "name": "space-10",

&#x20;       "value": "40px",

&#x20;       "usage": "Control height (buttons, inputs), large inner gaps."

&#x20;     },

&#x20;     {

&#x20;       "name": "space-12",

&#x20;       "value": "48px",

&#x20;       "usage": "Section header to content on compact sections."

&#x20;     },

&#x20;     {

&#x20;       "name": "space-16",

&#x20;       "value": "64px",

&#x20;       "usage": "Section header to content on primary sections; footer top."

&#x20;     },

&#x20;     {

&#x20;       "name": "space-24",

&#x20;       "value": "96px",

&#x20;       "usage": "Default vertical section padding."

&#x20;     },

&#x20;     {

&#x20;       "name": "space-32",

&#x20;       "value": "128px",

&#x20;       "usage": "Major separation: hero to first section, feature bands."

&#x20;     }

&#x20;   ]

&#x20; },

&#x20; "radius": {

&#x20;   "note": "Soft but disciplined: buttons are rounded rectangles, never pills. Full round is reserved for status.",

&#x20;   "tokens": \[

&#x20;     {

&#x20;       "name": "radius-xs",

&#x20;       "value": "4px",

&#x20;       "usage": "Tags, checkbox, small inline highlights."

&#x20;     },

&#x20;     {

&#x20;       "name": "radius-sm",

&#x20;       "value": "8px",

&#x20;       "usage": "Buttons, inputs, icon tiles, menu items."

&#x20;     },

&#x20;     {

&#x20;       "name": "radius-md",

&#x20;       "value": "12px",

&#x20;       "usage": "Cards, tabs, alerts, accordion focus area."

&#x20;     },

&#x20;     {

&#x20;       "name": "radius-lg",

&#x20;       "value": "16px",

&#x20;       "usage": "Floating nav bar, stat tiles, image tiles in the bento grid."

&#x20;     },

&#x20;     {

&#x20;       "name": "radius-xl",

&#x20;       "value": "24px",

&#x20;       "usage": "Framed hero/feature image and modals."

&#x20;     },

&#x20;     {

&#x20;       "name": "radius-full",

&#x20;       "value": "9999px",

&#x20;       "usage": "Pills, count badges, status dots, avatars."

&#x20;     }

&#x20;   ]

&#x20; },

&#x20; "shadow": {

&#x20;   "note": "Almost flat. Surfaces are separated by hairlines, not shadows; only floating things (nav, menus, modals) lift.",

&#x20;   "tokens": \[

&#x20;     {

&#x20;       "name": "shadow-float",

&#x20;       "value": "0 2px 12px 0 rgba(20,20,24,0.08)",

&#x20;       "usage": "The floating nav pill. Always combined with a `border` hairline."

&#x20;     },

&#x20;     {

&#x20;       "name": "shadow-raised",

&#x20;       "value": "0 8px 24px -4px rgba(20,20,24,0.10)",

&#x20;       "usage": "(derived) Card hover lift and dropdown menus."

&#x20;     },

&#x20;     {

&#x20;       "name": "shadow-overlay",

&#x20;       "value": "0 24px 48px -12px rgba(20,20,24,0.24)",

&#x20;       "usage": "(derived) Modals and popovers above a scrim."

&#x20;     },

&#x20;     {

&#x20;       "name": "shadow-ring",

&#x20;       "value": "0 0 0 4px rgba(20,20,24,0.05)",

&#x20;       "usage": "The soft 4px ring that frames a feature image (image has its own 1px `border`)."

&#x20;     },

&#x20;     {

&#x20;       "name": "shadow-focus",

&#x20;       "value": "0 0 0 2px #ffffff, 0 0 0 4px #b3141f",

&#x20;       "usage": "(derived) Keyboard focus ring: white gap, then 2px `focus`. Use `focus-inverse` with a dark gap on inverse surfaces."

&#x20;     },

&#x20;     {

&#x20;       "name": "shadow-glow",

&#x20;       "value": "0 0 120px 20px rgba(236,91,87,0.30)",

&#x20;       "usage": "Atmospheric coral glow behind the hero object. One per page."

&#x20;     }

&#x20;   ]

&#x20; },

&#x20; "stroke": {

&#x20;   "note": "Line weights.",

&#x20;   "tokens": \[

&#x20;     {

&#x20;       "name": "stroke-hairline",

&#x20;       "value": "1px",

&#x20;       "usage": "Card borders, dividers, nav outline, outline-button border."

&#x20;     },

&#x20;     {

&#x20;       "name": "stroke-strong",

&#x20;       "value": "2px",

&#x20;       "usage": "Focus ring, selected-state emphasis, headline underline is 3px."

&#x20;     },

&#x20;     {

&#x20;       "name": "stroke-icon",

&#x20;       "value": "1.5px",

&#x20;       "usage": "Stroke width of every outline icon at 20-24px."

&#x20;     }

&#x20;   ]

&#x20; },

&#x20; "container": {

&#x20;   "note": "Content widths. Everything centers; nothing hangs off the page edge except backgrounds and bleeds.",

&#x20;   "tokens": \[

&#x20;     {

&#x20;       "name": "container-copy",

&#x20;       "value": "640px",

&#x20;       "usage": "Max measure of centered subcopy and long paragraphs."

&#x20;     },

&#x20;     {

&#x20;       "name": "container-default",

&#x20;       "value": "1120px",

&#x20;       "usage": "Three-up card grids and centered content blocks."

&#x20;     },

&#x20;     {

&#x20;       "name": "container-nav",

&#x20;       "value": "1200px",

&#x20;       "usage": "The floating nav bar and page banners."

&#x20;     },

&#x20;     {

&#x20;       "name": "container-wide",

&#x20;       "value": "1280px",

&#x20;       "usage": "Split sections, dense segment grids, bento."

&#x20;     }

&#x20;   ]

&#x20; },

&#x20; "breakpoint": {

&#x20;   "note": "(derived) Minimum widths at which the layout steps up.",

&#x20;   "tokens": \[

&#x20;     {

&#x20;       "name": "bp-sm",

&#x20;       "value": "640px",

&#x20;       "usage": "Two columns for card grids."

&#x20;     },

&#x20;     {

&#x20;       "name": "bp-md",

&#x20;       "value": "768px",

&#x20;       "usage": "Tablet: nav shows links again; split sections go side by side."

&#x20;     },

&#x20;     {

&#x20;       "name": "bp-lg",

&#x20;       "value": "1024px",

&#x20;       "usage": "Small desktop: three-up grids."

&#x20;     },

&#x20;     {

&#x20;       "name": "bp-xl",

&#x20;       "value": "1280px",

&#x20;       "usage": "Full desktop: wide containers at intended widths."

&#x20;     }

&#x20;   ]

&#x20; },

&#x20; "zIndex": {

&#x20;   "tokens": \[

&#x20;     {

&#x20;       "name": "z-base",

&#x20;       "value": "0",

&#x20;       "usage": "Normal flow."

&#x20;     },

&#x20;     {

&#x20;       "name": "z-nav",

&#x20;       "value": "50",

&#x20;       "usage": "Floating nav bar, above scrolling content."

&#x20;     },

&#x20;     {

&#x20;       "name": "z-overlay",

&#x20;       "value": "100",

&#x20;       "usage": "Menus and popovers."

&#x20;     },

&#x20;     {

&#x20;       "name": "z-modal",

&#x20;       "value": "200",

&#x20;       "usage": "Modal and its scrim."

&#x20;     }

&#x20;   ]

&#x20; }

}

```

