/* ==========================================================================
   content.js - every fact on the site, written once.

   The Brief, Meadow Desktop and Field Trip are three interfaces over this one
   file. Nothing here is written twice, and nothing here knows which of the
   three is reading it.

   House rules:
     - A fact I cannot point at is `null` with a note, so the action
       disappears instead of becoming a dead link. `LINKS.resume` is the one
       that matters: set it to a path and every résumé action on the site
       appears.
     - No phone number, ever. Every visitor downloads this file.
     - The desktop's personal lines (about, notes) stay lowercase and casual,
       the way the first version of the site was. Anything that describes the
       work is ordinary sentence case.
   ========================================================================== */

window.PORTFOLIO = (function () {
  'use strict';

  const LINKS = {
    github: 'https://github.com/TabishNavaid',
    linkedin: 'https://linkedin.com/in/tabish-navaid',
    email: 'mailto:tabishnavaid06@gmail.com',
    emailPlain: 'tabishnavaid06@gmail.com',
    // No phone number lives here. This file is fetched by every visitor, so a
    // number nothing renders would still be a number anyone could read.
    resume: 'https://drive.google.com/file/d/1HFX05raVRAMJdxN29plHdO9lkpA5qKPC/view?usp=sharing'
  };

  const PROFILE = {
    name: 'Tabish Navaid',
    tagline: 'Aspiring software engineer building web apps, and a few browser games',
    taglinePlain: 'Aspiring software engineer building web apps, and a few browser games',
    school: 'Whitman College',
    degree: 'BA, Computer Science',
    minor: 'Mathematics',
    classYear: 'Class of 2028',
    gpa: '3.98',
    location: 'Walla Walla, WA'
  };

  /* --- role lens (lives inside Work, and inside Field Trip locations) ----- */

  const LENSES = {
    engineering: {
      id: 'engineering',
      label: 'engineering',
      order: ['built', 'stack', 'engineering', 'product', 'problem', 'learned']
    },
    product: {
      id: 'product',
      label: 'product',
      order: ['problem', 'product', 'built', 'engineering', 'stack', 'learned']
    }
  };

  /* --- projects ----------------------------------------------------------
     `openLabel` is the button that opens the detail window on Meadow Desktop,
     and the question you open under each project in The Brief. It names
     something that window actually contains, so no two of them read the same.
     Leave it out and the button falls back to a plain label.

     `kind` says what the thing is in a couple of words, and `state` is where
     the thing stands in a few more. The bar across the top of each plate in
     The Brief carries both. (`state` rather than `status`, because Field Trip's
     panels already render a `status` field.)

     `measure` is optional, and only for a real before-and-after pair: The Brief
     draws it as a dimension line, `from` at one end and `to` at the other. */

  const PROJECTS = [
    {
      id: 'first-seen',
      state: 'live at 1stseen.win',
      kind: 'forecasting web app',
      openLabel: 'how it learns an opening date',
      title: '1stSeen',
      featured: true,
      year: '2026',
      subtitle: 'Internship and new-grad programs, with the date each one is most likely to open next.',
      measure: { from: '12,600 requests', to: '50', label: 'database requests per 1,000 observations' },
      preview:
        'It learns when each program opens every year from that program’s own posting history, then gives the window it is likely to open in next and how confident it is.',
      stack: ['TypeScript', 'Cloudflare Workers', 'Supabase', 'PostgreSQL', 'Python'],
      built: ['A feed of what just opened', 'Likely opening dates', 'A prep plan per saved program'],
      problem:
        'Internship programs open at roughly the same time every year, but that date is scattered across company job boards and nobody writes it down. By the time a posting reaches a group chat the early window has gone.',
      whatIBuilt: [
        'A live feed of programs that opened in the last 45 days, each linked to its posting',
        'A predicted opening window per program, with a Low, Medium or High confidence',
        'A watchlist that works back from a likely date, so you know when to start networking and when the résumé needs to be ready',
        'Collection from public job boards and from archived copies of career pages going back several years',
        'A question-answering service on Cloud Run, with GitHub Actions collecting current postings twice a day'
      ],
      techStack: 'TypeScript, Cloudflare Workers, Supabase Postgres, Python, Google Cloud Run, GitHub Actions',
      productDecisions: [
        'A program without enough history says so instead of guessing. A confident-looking date with nothing behind it is worse than no date at all.',
        'Every date links to the page it was seen on, so a prediction can be checked rather than taken on trust.',
        'Confidence is Low, Medium or High rather than a percentage. The underlying accuracy is not validated yet, and a number would imply that it was.'
      ],
      engineeringDecisions: [
        'Collection used to talk to the database one row at a time. Reading each company’s evidence once and writing in bulk took it from about 12,600 requests per 1,000 observations to about 50, with identical results. On one 2,747-observation run that was 34,528 requests down to 137.',
        'A past opening is one of three things: exact, from the job board’s own posting date; bounded, between one archived snapshot without the posting and one with it; or only known to have been open by some date. They are stored apart, never promoted into one another, and weighted differently by the model.',
        'Cloudflare’s built-in rate limiting let 13 requests through from one address when it was set to three a minute, so each guest limit is counted exactly by a Durable Object instead.',
        'In production, collection reads a site’s robots.txt before every request and skips whatever it disallows, including whole job boards.',
        'The test suite recomputes every number the site shows, including totals, filters and a program’s past openings, with independent database queries, and fails on any mismatch.'
      ],
      learned:
        'The forecast is a statistical model rather than an AI, and saying so plainly turned out to matter more than the model did. People will trust a date they can click through and check.',
      visual: {
        src: 'assets/images/work/1stseen-landing.webp',
        width: 1200,
        height: 750,
        alt: 'The 1stSeen landing page: dark green and cream, reading “Know when internships open, before everyone else” above a Get started button and a Browse programs button.'
      },
      links: [
        { label: '1stseen.win', href: 'https://1stseen.win' },
        { label: 'GitHub', href: 'https://github.com/TabishNavaid/1stseen' }
      ],
      missing:
        'The opening dates are predictions from public posting history, and how accurate they are has not been measured yet. The site says so on its own pages too.'
    },
    {
      id: 'emberwing',
      state: 'ran at Symphonicon, 213+ players',
      kind: 'lobby installation',
      openLabel: 'why nobody can lose',
      title: 'Emberwing: The Way Home',
      featured: true,
      year: '2026',
      subtitle:
        'A lobby game for the Walla Walla Symphony’s Symphonicon, played on a projector with a motion-capture lantern. It ran on 5 November and more than 213 people played it.',
      preview:
        'You are the lighthouse keeper. Point your light into the fog to find a lost baby dragon, then guide it home through a string of hoops. A run takes about 45 seconds.',
      stack: ['JavaScript', 'Canvas 2D', 'Vite', 'WebSockets'],
      built: ['Three levels, for any age', 'A light cursor any rig can drive', 'A flock that builds through the night'],
      problem:
        'Act II is music from How to Train Your Dragon, and the audience waits in the lobby before it. The game had to be picked up by a six-year-old and a grandparent, first time, with nobody standing there explaining it.',
      whatIBuilt: [
        'Three levels (hatchling, flier, storm rider) so small children, teenagers and grandparents can each have a go',
        'A light cursor fed by a motion-capture lantern prop, a mouse, or a phone, with corner calibration for the rig',
        'A flock that accumulates over the evening, with every dragon that gets home leaving a ribbon in the aurora',
        'An operator layer: fullscreen, scene skip, a debug overlay, reduced motion, and a QR code so a queue can play on their own phones',
        'A smoke test that checks the deployed build still plays end to end'
      ],
      techStack: 'JavaScript, Canvas 2D, Vite, WebSockets, GitHub Actions, GitHub Pages',
      productDecisions: [
        'Nobody can lose. Hitting something makes the dragon tumble and carry on, because a lobby game that fails you in front of a queue does not get a second player. On the night some people came back for another run, which is the only evidence for that I have.',
        'When the start screen returns it ignores the light for two seconds, and a light left resting on a level has to move off it and back before it counts. Otherwise the next guest inherits whatever the last one was pointing at.',
        'Nothing needs a click: every control is “hold the light here” and a ring fills, which is the only gesture a lantern prop can make.'
      ],
      engineeringDecisions: [
        'The game needs exactly one x/y point, so the prop can arrive three ways: as the ordinary OS mouse, over a WebSocket at one message a frame, or from a parent frame by postMessage. The lobby rig can be swapped without the game changing.',
        'Calibration maps the four corners and applies only to the mocap input, so plugging in a mouse still behaves normally.',
        'If the lobby laptop cannot keep up, the game drops some of its own sparkle and puts it back once frames are quick again, rather than stuttering through the evening.',
        'The night is kept in localStorage, so a refresh or a crashed tab does not lose the flock, and it clears itself on a new day.'
      ],
      learned:
        'Designing for a prop that can only point and hold, with no click and no keyboard, cut out most of the interface before I wrote any of it. The constraint did the design work.',
      visual: {
        src: 'assets/images/work/emberwing-attract.webp',
        width: 1200,
        height: 750,
        alt: 'The Emberwing attract screen: a pixel lighthouse sweeping its beam over a stormy sea at a small pink dragon, beside three level rings reading Hatchling, Flier and Storm Rider.'
      },
      links: [
        { label: 'Play it', href: 'https://tabishnavaid.github.io/emberwing/' },
        { label: 'GitHub', href: 'https://github.com/TabishNavaid/emberwing' }
      ],
      missing:
        'The link is the build that ran that night, without the room around it: you steer with a mouse or a finger instead of the lantern, and the flock starts empty, because a night clears itself the next day.'
    },
    {
      id: 'sos-lost-found',
      state: 'rebuild in progress',
      kind: 'campus web app',
      openLabel: 'how you prove it’s yours',
      title: 'SOS Lost & Found',
      featured: true,
      year: '2024, rebuilt 2026',
      subtitle: 'A campus lost-and-found that started as a twelve-hour hackathon project, rebuilt properly in 2026.',
      preview: 'Report something you lost or found, and prove it’s yours before anyone swaps phone numbers. When it suggests a match, it tells you why.',
      stack: ['React', 'TypeScript', 'Supabase', 'PostgreSQL', 'Playwright'],
      built: ['Lost and found reporting', 'Private ownership checks', 'Claim through to reunion'],
      problem:
        'Campus lost-and-found usually lives in three different inboxes and a box behind a desk. Proving something’s yours means messaging a stranger from your own account and hoping they’re nice about it.',
      whatIBuilt: [
        'Separate forms for lost and found items, since each one needs different questions',
        'Search with filters that live in the URL, cursor pagination, and match suggestions that explain themselves',
        'Ownership checks: the finder sets a question and a private answer, and the claimant has to get it right before anyone shares contact details',
        'A claim flow that goes request → verification → handoff → confirmed reunion',
        'Campus tenancy: memberships, roles, a moderation queue and audit history',
        'A demo mode that runs entirely on seeded localStorage, so you can try it without setting up Supabase'
      ],
      techStack: 'React, TypeScript, Supabase, PostgreSQL, Vitest, Playwright, GitHub Actions',
      productDecisions: [
        'Whoever finds an item writes a question and a private answer. You have to answer it before either of you sees the other’s contact details.',
        'Accepting a claim doesn’t close the item. It only closes once someone confirms they actually got it back, since agreeing to meet up isn’t the same as meeting up.',
        'Match suggestions show why they matched, so it’s easy to spot a bad one and ignore it.'
      ],
      engineeringDecisions: [
        'Every page talks to one interface, DataClient. The localStorage demo and the Supabase adapter both implement it, so the demo follows the same ownership and membership rules as the real thing.',
        'Row Level Security is on for all 37 application tables, so Postgres itself refuses reads and writes a user isn’t allowed to make. Hiding routes in the frontend is just tidiness.',
        'My first schema kept the verification question and its answer in one field, so the UI couldn’t show the question without the answer coming along with it. Moving the answer into its own table fixed that.',
        'Every push runs typecheck, lint, unit tests and a build, then Playwright, including an axe check that fails the build on serious accessibility problems.'
      ],
      learned:
        'I went in thinking privacy was a UI problem. It was a schema problem. Pulling the answer out of the question’s table ended an argument I’d been having with myself in CSS for a week.',
      visual: {
        src: 'assets/images/work/sos-landing.webp',
        width: 1200,
        height: 800,
        alt: 'SOS landing page: a cream and red page reading “The fastest route from lost to found”, beside a preview of a lost water bottle matched to a found student ID.'
      },
      links: [{ label: 'GitHub', href: 'https://github.com/TabishNavaid/SOS---Save-Our-Souls' }],
      missing: 'There’s no hosted demo yet. It runs locally in demo mode, and it isn’t connected to a real campus.'
    },
    {
      id: 'porchlight',
      state: 'runs locally',
      kind: 'audio engine',
      openLabel: 'how rendering got six times faster',
      title: 'Porchlight',
      year: '2026',
      subtitle: 'Generative lofi that runs in the browser and writes hour-long WAV files from a seed.',
      measure: { from: '3x realtime', to: '19.6x', label: 'render speed' },
      preview: 'Pick a seed and one of fourteen styles, and it writes the track in your browser with no server and no samples. The same seed gives you the same audio, down to the sample.',
      stack: ['TypeScript', 'Next.js', 'Web Audio', 'Tone.js', 'Vitest'],
      built: ['The generation engine', 'Offline WAV rendering', 'Fourteen style packs'],
      problem:
        'Most generative music tools either stream at you or give you a file built from samples someone else owns. I wanted to make a track I could actually keep.',
      whatIBuilt: [
        'A generator where composeBar(spec, bar) returns every note, drum hit and texture event for a bar as plain data, without looking at the bar before it',
        'An offline renderer that works in segments and streams each one to the file writer, so memory use depends on segment size instead of track length',
        'Fourteen style packs, each with its own drum kit, rhythm grammar, voices, chord layout and room',
        'ITU-R BS.1770 loudness metering and a true-peak limiter, measured at -14.15 LUFS against a -14 target',
        'Unit, seam and real-browser test suites, plus an axe pass over the pages'
      ],
      techStack: 'TypeScript, Next.js, React, Tone.js, Web Audio, Vitest, Playwright, ffmpeg.wasm',
      productDecisions: [
        'Nothing is sampled or recorded. Every drum, pad and bit of vinyl crackle is generated from the track’s seed, so there are no third-party rights in the audio and you can publish or sell what you make.',
        'The live preview uses the same scheduling function as the file renderer, so what you hear while picking a seed is exactly what ends up in the WAV.'
      ],
      engineeringDecisions: [
        'In Chrome, an OfflineAudioContext keeps paying for source nodes even after they’ve stopped, so render time grew with the square of the segment length. I switched to synthesizing notes into a shared buffer instead of giving each note its own node. That made the cost linear and took rendering from about 3x realtime to 19.6x, so an hour-long track now takes about three minutes.',
        'There are no Web Audio calls anywhere in src/engine/. Generation takes a spec and a bar number and returns data, and both playback and file rendering read from that one function.',
        'Output is only guaranteed identical within the same browser, and the repo says so. The Node audio backend the tests use drifts from Chrome by around -49 dBFS on samples that land on mixing-window boundaries, so every fixture records which engine produced it.'
      ],
      learned:
        'I had plenty of theories about why rendering was slow, and every one of them was wrong until I measured it. The problem was how Chrome handles audio nodes, not my generation code.',
      visual: {
        src: 'assets/images/work/porchlight-studio.webp',
        width: 1200,
        height: 712,
        alt: 'The Porchlight studio: four chord cards reading Am9, Bm7, Gmaj9 and Dm11 above a drum grid, with a seed, a play button and a send-to-render-queue button underneath.'
      },
      links: [{ label: 'GitHub', href: 'https://github.com/TabishNavaid/porchlight' }],
      missing: 'No hosted build yet. Clone it, npm install, npm run dev.'
    },
    {
      id: 'walla-walla-map',
      state: 'live prototype',
      kind: 'civic map',
      openLabel: 'why it uses demo data',
      title: 'Downtown Walla Walla Vacancy Map',
      featured: true,
      year: '2026',
      subtitle: 'A map of vacant and partly vacant spaces downtown, made with the Downtown Walla Walla Foundation and Whitman Economics.',
      preview: 'Twenty-two demo listings you can filter by status, space type and rent. The page is upfront that the data isn’t real yet.',
      stack: ['Leaflet.js', 'OpenStreetMap', 'JavaScript'],
      built: ['Interactive map', 'Status and rent filters', 'Listings panel'],
      problem:
        'It’s hard to get a feel for where downtown’s vacant spaces are without seeing them on a map. This prototype shows what that could look like, before anyone commits to collecting the real data.',
      whatIBuilt: [
        'A map with markers for vacant, partial and occupied spaces',
        'Filters for status, space type and maximum rent',
        'A listings panel that stays in sync with whatever the map is showing',
        'A data format a real inventory can drop straight into later, with the demo listings already using it'
      ],
      techStack: 'HTML, CSS, JavaScript, Leaflet.js, OpenStreetMap',
      productDecisions: [
        'I led with the map because the question people were asking was where the vacancies are, and a table is better at telling you how many.',
        'The page says clearly that the listings are demo data and that the photos are reference images of other buildings, so there’s no confusion about what’s real.',
        'Each status is written out next to its colour, because committee packets get printed in greyscale.'
      ],
      engineeringDecisions: [
        'It uses Leaflet and OpenStreetMap, so there’s no API key or account for the Foundation to look after once I graduate.',
        'It’s three files with no build step, so it can be hosted anywhere, dropped into an iframe, or handed to someone who’s never used npm.'
      ],
      learned: 'Being clear about what the prototype couldn’t do yet is what made the Foundation take the rest of it seriously.',
      note: 'Built with the Downtown Walla Walla Foundation and Whitman Economics.',
      visual: {
        src: 'assets/images/work/walla-walla-map.webp',
        width: 1200,
        height: 733,
        alt: 'The live vacancy map: filters, counters for vacant, partial and occupied spaces, an OpenStreetMap view of downtown Walla Walla with coloured markers, a legend, and a listings sidebar.'
      },
      links: [
        { label: 'Live prototype', href: 'https://tabishnavaid.github.io/walla-walla-map/' },
        { label: 'GitHub', href: 'https://github.com/TabishNavaid/walla-walla-map' }
      ]
    },
    {
      id: 'pond-hopper',
      state: 'shipped',
      kind: 'browser game',
      openLabel: 'why I rebuilt the ending',
      title: 'Pond Hopper',
      year: '2026',
      subtitle: 'Six chapters of a rabbit crossing water, with ghost replays and a daily seed.',
      preview: 'Plain JavaScript and Canvas with no build step. It’s interactive in 1.54 seconds on a throttled Fast 3G connection.',
      stack: ['JavaScript', 'Canvas 2D', 'GitHub Pages', 'node:test'],
      built: ['Physics and seeded courses', 'Six chapters', 'A pixel-exact parity gate'],
      problem:
        'I wanted a game that loads on a phone before you lose interest, with code that stays easy to read. Clone the folder, serve it, and it plays.',
      whatIBuilt: [
        'A fixed-timestep loop, seeded course generation, and hop physics tuned by measuring how long you stay on each surface',
        'Six chapters defined as data, with five pacing shapes and a validator that catches bad levels in tests instead of in playtesting',
        'Ghost replays, a daily seed with streaks, and shareable challenge links on a frozen wire format',
        'A parity harness that fingerprints every RGBA byte of the canvas across nine scenarios',
        'A throttling server that models HTTP/2 multiplexing, and a preload generator that walks the real import graph'
      ],
      techStack: 'JavaScript, Canvas 2D, ES modules, node:test, Python for the QA tooling, GitHub Pages',
      productDecisions: [
        'In the first version, the final chase didn’t test any skill. The rabbit moves at a constant speed, so the rising water was really just a countdown. I rebuilt it so clean landings push the water back, which turns your combo into breathing room.',
        'Story cards only show the first time. If you replay a chapter, you go straight into playing instead of clicking past text you’ve already read.'
      ],
      engineeringDecisions: [
        'The simulation is always 480 by 270, on every device and in every orientation. Anything outside that area is decoration only the renderer draws; physics, level generation and ghosts never see it. That’s what keeps a seed’s course identical at any window size, and it’s why saved ghosts and shared links still replay correctly.',
        'The parity harness stubs the clock and the random number generator and steps the game at a fixed 1/60, so I can prove a refactor changed nothing before I touch any of the art.',
        'I skipped a bundler. A script walks the import graph and writes the modulepreload tags into index.html, and a separate test fails if the committed tags drift. Without it, the preload list would slowly go stale and the only symptom would be a slower first load.'
      ],
      learned:
        'Four separate times, a strange number turned out to be a problem with how I was measuring, not with the game. My local server wasn’t gzipping, so I was measuring 345 KB on first load when the real host only sends 147.',
      visual: {
        src: 'assets/images/work/pond-hopper-play.webp',
        width: 1200,
        height: 750,
        alt: 'Pond Hopper mid-run: a pixel rabbit airborne over a river of lily pads and a wooden jetty, with score, carrot count and a chapter progress bar reading Home Meadow at 44 per cent.'
      },
      links: [
        { label: 'Play it', href: 'https://tabishnavaid.github.io/pond-hopper/' },
        { label: 'GitHub', href: 'https://github.com/TabishNavaid/pond-hopper' }
      ],
      missing: 'I’ve built and measured the mobile version in an emulator, but I haven’t tested it on a real phone yet.'
    },
    {
      id: 'aakritam',
      state: 'live, taking orders',
      kind: 'storefront',
      openLabel: 'why you shop by collection',
      title: 'Aakritam',
      year: '2025',
      subtitle: 'An online shop for Indian handicrafts that doesn’t hide the people who make them.',
      preview: 'A live, fair-trade storefront that works directly with 320+ artisans.',
      stack: ['Shopify', 'Liquid', 'JavaScript', 'Responsive design'],
      built: ['Storefront navigation', 'Collection and product pages', 'Cart and account flows'],
      problem:
        'Aakritam buys directly from 320+ artisans and from around 2,000 more indirectly, and the crafts have almost nothing in common. The shop had to hold all of that without losing the people behind it.',
      whatIBuilt: [
        'A responsive storefront and its navigation',
        'Collection and product browsing across image-heavy pages',
        'Cart, account and checkout entry points',
        'Homepage sections for categories, products and a featured artisan'
      ],
      techStack: 'Shopify, Liquid, HTML, CSS, JavaScript',
      productDecisions: [
        'You browse by collection first. When one shop sells ceramics, brass, handloom, calligraphy and honey, a single grid of products is just confusing.',
        'The artisan story is on the homepage, in the middle of the shopping flow, where people deciding what to buy will actually see it.'
      ],
      engineeringDecisions: [
        'Shopify handles the catalogue, accounts, cart and checkout. A shop that takes real orders can’t depend on a student to maintain those parts.',
        'The layout stays solid on collection and product pages that are mostly big photographs.'
      ],
      learned: 'The tricky part was giving products enough room on the page while still leaving space to say where they came from.',
      visual: {
        src: 'assets/images/work/aakritam-home.webp',
        width: 1280,
        height: 720,
        alt: 'Aakritam homepage with a cream header, burgundy navigation, and a large hero photograph of a decorated brass vessel beside the words “Handcrafted Treasures with a Purpose”.'
      },
      links: [{ label: 'Live storefront', href: 'https://www.aakritam.com/' }]
    },
    {
      id: 'bloom',
      kind: 'task app',
      openLabel: 'what happens when a restore fails',
      title: 'Bloom',
      year: '2026',
      subtitle: 'Tasks go in as seeds and flower when you finish them.',
      preview: 'It works offline first, and only saves to the cloud when you ask it to.',
      stack: ['React', 'Vite', 'Framer Motion', 'Supabase'],
      built: ['Garden board', 'Task planting and completion', 'Optional cloud save'],
      problem: 'In most to-do apps, finishing a task just makes it disappear. I wanted it to feel like something.',
      whatIBuilt: [
        'The garden board, planting, completion, journal and stats',
        'localStorage as the source of truth, so the app works before you have an account',
        'Optional Supabase sign-in, with a cloud save you trigger yourself'
      ],
      techStack: 'React, Vite, Framer Motion, Supabase',
      productDecisions: [
        'Signing in never copies or deletes your local data without asking. Guest mode keeps working, garden and all.'
      ],
      engineeringDecisions: [
        'A cloud restore goes validate, serialise, back up, commit. It snapshots every key before writing, rolls each one back if any write throws, and tells you exactly which keys failed to roll back instead of reporting success.'
      ],
      learned: 'Cloud restore wasn’t ready to ship until it could undo a half-finished write.',
      links: [{ label: 'GitHub', href: 'https://github.com/TabishNavaid/bloom' }],
      missing: 'It’s local-only for now. There’s no hosted build, and some of the art is still placeholder.'
    },
    {
      id: 'this-site',
      kind: 'portfolio',
      openLabel: 'how this site works',
      title: 'This Website',
      year: '2026',
      subtitle: 'One portfolio with three ways to look at it: a one-page brief, an illustrated desktop, and a pixel town you can walk around.',
      preview: 'All three read from the same content file, so every fact lives in exactly one place.',
      stack: ['HTML', 'CSS', 'JavaScript', 'Canvas'],
      built: ['Three modes, one content model', 'Draggable desktop windows', 'A canvas town with save state'],
      problem:
        'A recruiter has about a minute and wants the facts in order. Someone who’s just curious wants something to poke at. One page can’t really do both, so I made three.',
      whatIBuilt: [
        'A profile chooser that boots like a small computer',
        'A desktop with draggable windows and a sun you drag to change the time of day',
        'A top-down pixel town with collision, a camera, quests and saved progress',
        'A bus ride between the desktop and the town, with luggage to dodge on the way',
        'Three arcade cabinets, each loaded the first time you walk up to one',
        'One content file behind all three renderers'
      ],
      techStack: 'HTML, CSS, JavaScript, Canvas 2D, Vercel',
      productDecisions: [
        'Three modes, because a recruiter and a curious visitor want pretty much opposite things.',
        'Everything in the town is also listed in a text map directory, so you never have to walk anywhere to find the work.',
        'You can drag anywhere on the town to walk. The first person who tried it on a phone couldn’t comfortably reach the on-screen d-pad.'
      ],
      visual: {
        src: 'assets/images/work/this-site-meadow.webp',
        width: 1200,
        height: 750,
        alt: 'Meadow Desktop: a paper window reading “hi! i’m tabish” with five illustrated icons, standing in a sunlit meadow with a cat sitting beside it and a doodle of Tabish peering over the top.'
      },
      engineeringDecisions: [
        'One number from 0 to 1 drives every colour on the desktop, so day and night use the same code.',
        'Windows are native dialogs, so the browser handles focus trapping and returning focus.',
        'The town’s art comes from three small atlases that a Python script cuts out of the licensed packs. They only load when you pick that profile, and the game loop pauses when the tab is hidden.',
        'Collision comes from each sprite’s alpha channel rather than its bounding box. Someone testing the town kept getting stuck on the empty space around buildings, so now you can walk right up to a wall.'
      ],
      learned: 'Three front ends are only manageable because every fact lives in one file. Anything written in two places would eventually disagree with itself.',
      links: []
    },
    {
      id: 'restaurant-management',
      kind: 'coursework',
      openLabel: 'the three workflows',
      title: 'Restaurant Management App',
      year: '2025',
      subtitle: 'A Java and MySQL app with separate customer, staff and admin accounts sharing one menu.',
      preview: 'A coursework project, and the first time I had to design a database schema and a permission model at the same time.',
      stack: ['Java', 'MySQL', 'JDBC', 'MVC', 'JUnit'],
      built: ['Role-based accounts', 'Menu CRUD', 'Order tracking'],
      problem:
        'A customer, a server and an owner want different things from the same menu and the same order list.',
      whatIBuilt: ['Role-based accounts', 'Menu CRUD', 'Order tracking', 'An MVC structure', 'JUnit tests over the core flows'],
      techStack: 'Java, MySQL, JDBC, MVC, NetBeans, JUnit, Git',
      productDecisions: ['Each role gets its own workflow, instead of one shared screen with half the buttons greyed out.'],
      engineeringDecisions: ['MVC, to keep the database code out of the interface', 'JUnit tests on the ordering flows'],
      learned: 'How to structure a bigger Java app, hook it up to a database, and test the parts that would really hurt if they broke.',
      links: [],
      missing: 'This was coursework, so there’s no public repo or demo to link to.'
    }
  ];

  /* --- experience ---------------------------------------------------------- */

  const EXPERIENCES = [
    {
      id: 'whitman-accessibility',
      title: 'Front-End & Accessibility Developer @ Whitman College',
      org: 'Whitman College',
      role: 'Front-End & Accessibility Developer',
      date: 'Jan 2025–present',
      measure: { from: '70%', to: '99.6%', label: 'accessibility score' },
      preview: 'I fix layouts and accessibility problems across the college’s 1000+ page website, and helped raise its accessibility score from 70% to 99.6%.',
      tags: ['HTML', 'CSS', 'Accessibility', 'CMS', 'QA'],
      whatIDid: [
        'Refactored broken layouts across 1000+ pages',
        'Helped raise the site’s accessibility score from 70% to 99.6%',
        'Built feature pages from editorial briefs',
        'Debugged HTML/CSS issues inside the CMS',
        'Set up pre-launch QA and accessibility checks'
      ],
      tools: 'HTML, CSS, CMS, Monsido, accessibility, WCAG, QA',
      mattered: 'A thousand-odd college pages are easier for everyone to use now, and less likely to break when something new goes live.'
    },
    {
      id: 'movate',
      title: 'Software Developer Intern @ Movate',
      org: 'Movate',
      role: 'Software Developer Intern',
      date: 'Jun–Aug 2025',
      preview: 'Built a role-based permission system and dashboard, and helped work out what admins, managers and end users each needed.',
      tags: ['React', 'Supabase', 'Auth', 'Dashboards'],
      whatIDid: [
        'Built a role-based permission system',
        'Helped scope the admin, manager and end-user workflows',
        'Worked with stakeholders remotely',
        'Turned loose requirements into a 10-week delivery plan',
        'Built dashboard features for day-to-day operations'
      ],
      tools: 'React, Supabase, role-based auth, stakeholder scoping, dashboards',
      mattered:
        'I learned how to take vague requirements and turn them into a working tool with clear user roles, while working within real constraints.'
    },
    {
      id: 'peer-tutor',
      title: 'Peer Tutor / TA @ Whitman College',
      org: 'Whitman College',
      role: 'Peer Tutor / TA',
      date: 'Jan 2025–present',
      preview: 'I tutor Data Structures and Discrete Math, and I lean heavily on drawings and step-by-step walkthroughs.',
      tags: ['Data Structures', 'Discrete Math', 'Teaching', 'Debugging'],
      whatIDid: [
        'Tutored Data Structures, Discrete Math, writing, and technical skills',
        'Made visual explanations and walkthroughs I could reuse',
        'Helped students find where their understanding broke down, as well as fixing their code',
        'Changed how I explained things when the same misunderstanding kept coming up'
      ],
      tools: 'Data Structures, Discrete Math, teaching, debugging, communication',
      mattered: 'When lots of students get stuck in the same place, it usually means the explanation needs work, so that’s what I tried to fix.'
    }
  ];

  const SKILLS = [
    {
      title: 'quick with',
      items: ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'React', 'Supabase', 'SQL', 'Git', 'accessibility', 'CMS']
    },
    {
      title: 'building with right now',
      items: ['PostgreSQL and row-level security', 'Canvas 2D', 'Web Audio', 'Next.js', 'Playwright and axe', 'Vercel']
    },
    { title: 'read about, haven’t shipped yet', items: ['AWS', 'Docker', 'AI tooling'] }
  ];

  /* --- about (Meadow Desktop) ---------------------------------------------- */

  const ABOUT = {
    heading: 'Tabish Navaid',
    sub: 'Aspiring software engineer<br />CS student @ Whitman College · Former software developer intern @ Movate',
    intro:
      'hi! i’m tabish. i build web things, and then spend most of my time on the parts you never see: who’s allowed to see what, what happens when a save fails, and whether the next person can read my code. lately i’ve also been making a lofi music generator and a pixel game about a rabbit crossing a pond.',
    doing: [
      'build web apps, dashboards, and CMS features,',
      'turn fuzzy ideas into user flows, a plan, and a clear list of what’s out of scope,',
      'work on civic tech, storefronts, accessibility fixes, and student-facing tools,',
      'tutor students in CS, math, writing, and technical skills, and',
      'help keep a thousand-page college website from turning into a mystery drawer.'
    ],
    education:
      'Bachelor of Arts in Computer Science, Mathematics minor<br />Whitman College, Walla Walla, WA · Class of 2028<br />GPA: 3.98 · UWC Davis Scholar (Full Scholarship)',
    awards: ['UWC Davis Scholar (Full Scholarship)', 'Whitman Hackathon Winner · 1st Place', 'Lead ASWC Senator'],
    exploring: [
      'product management',
      'full-stack product engineering',
      'accessibility-centered design',
      'small business tools',
      'civic and educational technology'
    ],
    languages: 'English (fluent), Hindi/Urdu (native), German (conversational)',
    interests: [
      'human-computer interaction and educational tech',
      'accessibility advocacy',
      'open-source and community-driven projects',
      'badminton'
    ]
  };

  /* --- notes (Meadow Desktop) ---------------------------------------------- */

  const NOTES = [
    {
      q: 'currently',
      a: 'studying CS and math at Whitman, working on the college website, tutoring, and rendering far too many test WAV files for Porchlight.'
    },
    {
      q: 'cat status',
      a: 'quality assurance, morale support, and a fair amount of walking across the keyboard. no notes on this page so far.'
    },
    {
      q: 'favourite kind of work',
      a: 'fiddly early decisions: splitting one database field into two, writing “this is demo data” right on the page, making demo mode obey the same permissions as the real app. none of it shows up in a screenshot, and all of it decides how annoying the thing is in six months.'
    },
    {
      q: 'languages, and what else i care about',
      a: 'English (fluent), Hindi/Urdu (native) and German (conversational). outside of class i care about accessibility, open-source and community projects, and human-computer interaction. also badminton.'
    },
    {
      q: 'under the hood',
      list: [
        'All three modes read from one content file, so every fact on the site lives in one place.',
        'One number from 0 to 1 drives the sky, grass, paper, ink, and the sun’s position.',
        'Open windows are saved in the URL, so you can paste a link to a project straight into an email.',
        'Windows are native dialogs, so the browser handles focus trapping and returning focus.',
        'No sound file is downloaded until you turn sound on.',
        'Field Trip’s art is three small atlases cut from the licensed packs by a script, and they only load when you pick that profile.',
        'The town’s pond picks its own shore tiles from each tile’s four neighbours, so the map file never has to spell out a coastline.',
        'In the town, collision comes from each sprite’s alpha channel, so you can walk right up to the edge of a building.',
        'Every wave of luggage on the bus ride is checked to make sure there’s always a lane you can reach.',
        'The arcade games only download when you walk up to a cabinet.',
        'The two big cat animations went from 6.4 MB of GIF to about 30 KB of WebP.'
      ]
    }
  ];

  const CONTACT = {
    heading: 'send a tiny letter',
    body:
      'Email is the best way to reach me: software engineering internships, web projects, or anything other people will still have to use after I’m done with it. I read every email and reply to most of them.'
  };

  /* --- the brief ---------------------------------------------------------- */

  const BRIEF = {
    lede:
      'I like building web tools for problems that are already a bit messy, like a campus lost-and-found where you can prove something’s yours without handing a stranger your number, or a vacancy map for downtown Walla Walla. I also work on Whitman’s thousand-page website, and I’ve been building a lofi music generator in my spare time.',
    featured: ['first-seen', 'sos-lost-found', 'emberwing', 'walla-walla-map'],
    alsoBuilt: ['porchlight', 'pond-hopper', 'aakritam', 'this-site', 'bloom', 'restaurant-management']
  };

  /* --- field trip: the town ----------------------------------------------- */
  /* Layout (where things stand) lives in js/field-trip/. This is only what
     the town says. Rooms name their objects; the game joins them by id. */

  const L = (label, href) => ({ label: label, href: href });

  const TOWN = {
    intro: 'A small pixel village. Nine of the buildings open, and each one holds a different part of my work.',

    /* the map directory, and the order locations appear in it */
    locations: [
      { id: 'square', label: 'the green', short: 'the middle of town', room: 'square' },
      { id: 'workshop', label: 'the workshop', short: 'engineering', room: 'workshop' },
      { id: 'drafting', label: 'the drafting room', short: 'product', room: 'drafting' },
      { id: 'pub', label: 'the pub', short: 'porchlight, in the jukebox', room: 'pub' },
      { id: 'civic', label: 'the community center', short: 'civic work', room: 'civic' },
      { id: 'lostfound', label: 'the lost & found office', short: 'SOS, and the hackathon it came from', room: 'lostfound' },
      { id: 'market', label: 'the market', short: 'shops and ordering systems', room: 'market' },
      { id: 'library', label: 'the library', short: 'school and tutoring', room: 'library' },
      { id: 'pond', label: 'the millpond', short: 'pond hopper', room: 'pond' },
      { id: 'post', label: 'the post office', short: 'contact', room: 'post' },
      { id: 'arcade', label: 'the arcade', short: 'three games to play', room: 'arcade' },
      { id: 'stop', label: 'the bus stop', short: 'the ride back to the meadow', room: 'stop' }
    ],

    /* what each place says. `panel` opens on inspection; `lines` just talks. */
    rooms: {
      square: {
        blurb: 'The middle of town, where the paths meet at a fountain.',
        objects: {
          welcome: {
            name: 'the welcome marker',
            panel: {
              title: 'welcome to the village',
              sections: [
                { kind: 'profile' },
                { kind: 'text', body: 'Nine buildings are open, and each one has part of my work inside. If you’d rather not walk, press M (or tap map at the top) for a list of every room and everything in it.' }
              ]
            }
          },
          fountain: {
            name: 'the fountain',
            lines: ['The pump is on a timer and the timer is an hour out, so it runs at six in the morning.']
          },
          notice: {
            name: 'the notice board',
            panel: {
              title: 'notice board',
              sections: [
                { kind: 'text', body: 'The quests button at the top has a list of things to find around town. If you just want to get in touch, the post office on Market Row (north side of Main Street) has my email and résumé.' },
                { kind: 'quests' }
              ]
            }
          },
          mapsign: { name: 'the map sign', action: 'map', lines: ['The whole village on one board. There’s an easier-to-read version under the map button at the top.'] },
          bench: { name: 'a bench', lines: ['Still warm, so somebody was sitting here a minute ago.'] }
        },
        npcs: {
          'npc-a': { name: 'a kid with a skateboard', lines: ['The workshop’s the one with the horseshoe over the door, east along South Lane. The trailer next to it is where the product stuff lives.', 'If you don’t feel like walking, press M. Same buildings, fewer steps.'] },
          'npc-b': { name: 'someone waiting for the bus', lines: ['This bus goes back to the meadow. Stand by the door and it’ll take you.', 'Late most days, and nobody at this stop has ever looked worried about it.'] },
          'npc-c': { name: 'the arcade regular', lines: ['The arcade’s on the corner of South Lane. There are three cabinets in there now, and I’m bad at all of them.', 'There’s another game down at the pond. Follow the dirt lane east past the works yard and look for the sign.'] }
        }
      },

      pond: {
        blurb: 'A millpond at the end of the dirt lane, with a wooden bridge over the stream.',
        objects: {
          noticeboard: {
            name: 'the notice by the water',
            quest: 'pond-notice',
            panel: {
              title: 'pond hopper',
              sections: [
                { kind: 'text', body: 'Six chapters of a rabbit crossing water, running in a browser tab with no build step. It’s a game, and it’s also where I learned most of what I know about frame budgets.' },
                { kind: 'projects', ids: ['pond-hopper'], lens: 'engineering' }
              ]
            }
          },
          water: {
            name: 'the millpond',
            lines: ['Too deep to swim in the middle, but shallow enough at the edges to fall into.', 'Something splashed. Probably a fish. The game about crossing this is on the notice behind you.']
          },
          bridge: {
            name: 'the bridge',
            panel: {
              title: 'how the ending works',
              sections: [
                { kind: 'text', body: 'Pond Hopper ends with the water chasing you. In the first version the rabbit moved at a fixed speed, so you couldn’t really outrun anything and the chase was just a countdown.' },
                { kind: 'text', body: 'So I tied the chase to the one skill the game actually tests: landing well. A clean landing pushes the water back and a sloppy one barely does, which means your combo is really how much breathing room you have.' },
                { kind: 'links', items: [
                  L('play it', 'https://tabishnavaid.github.io/pond-hopper/'),
                  L('source', 'https://github.com/TabishNavaid/pond-hopper')
                ] }
              ]
            }
          }
        },
        npcs: {}
      },

      workshop: {
        blurb: 'A cluttered workshop full of half-finished projects. The engineering side of my work lives here.',
        objects: {
          terminal: {
            name: 'the terminal',
            panel: {
              title: 'repositories',
              sections: [
                { kind: 'text', body: 'Seven of these are public, and they should all run if you clone them.' },
                { kind: 'links', items: [
                  L('1stSeen', 'https://github.com/TabishNavaid/1stseen'),
                  L('Emberwing', 'https://github.com/TabishNavaid/emberwing'),
                  L('SOS Lost & Found', 'https://github.com/TabishNavaid/SOS---Save-Our-Souls'),
                  L('Porchlight', 'https://github.com/TabishNavaid/porchlight'),
                  L('Pond Hopper', 'https://github.com/TabishNavaid/pond-hopper'),
                  L('Downtown Walla Walla map', 'https://github.com/TabishNavaid/walla-walla-map'),
                  L('Bloom', 'https://github.com/TabishNavaid/bloom'),
                  L('everything else', 'https://github.com/TabishNavaid')
                ] }
              ]
            }
          },
          workbench: {
            name: 'the workbench',
            panel: { title: 'what’s on the bench', sections: [{ kind: 'projects', ids: ['first-seen', 'emberwing', 'sos-lost-found', 'porchlight', 'pond-hopper'], lens: 'engineering' }] }
          },
          whiteboard: {
            name: 'the whiteboard',
            panel: {
              title: 'how SOS handles its data',
              sections: [
                { kind: 'text', body: 'SOS can run in two modes: a demo on seeded localStorage that needs no setup, or the real backend on Supabase with Postgres, auth and storage. Both sit behind one typed interface, so a page behaves the same whichever one is underneath.' },
                { kind: 'list', title: 'why that helps', items: [
                  'The demo follows the same ownership and membership rules as the real backend',
                  'The browser tests run the same code paths either way',
                  'Permissions live in the database, so a component can’t accidentally skip them'
                ] }
              ]
            }
          },
          toolwall: { name: 'the tool wall', panel: { title: 'tools', sections: [{ kind: 'skills' }] } },
          teststation: {
            name: 'the testing bench',
            panel: {
              title: 'tests and measurements',
              sections: [
                { kind: 'list', title: 'on SOS', items: [
                  'Every push runs typecheck, lint, unit tests and a build, then Playwright in a real browser',
                  'Row Level Security is on for all 37 application tables',
                  'A Playwright test runs axe over the public pages and fails the build on serious accessibility problems'
                ] },
                { kind: 'list', title: 'on Porchlight and Pond Hopper', items: [
                  'Porchlight: a sixty-minute track renders in about three minutes, at -14.15 to -14.18 LUFS against a -14 target',
                  'Pond Hopper: interactive in 1.54 seconds on throttled Fast 3G, measured on the deployed files instead of my local copy',
                  'Pond Hopper: nine test scenarios fingerprint every RGBA byte of the canvas, so I can prove a refactor didn’t change anything'
                ] },
                { kind: 'experience', ids: ['whitman-accessibility'] }
              ]
            }
          },
          halfbuilt: { name: 'a half-built something', lines: ['Four wheels and no plan yet.'] }
        },
        npcs: { 'npc-b': { name: 'someone tidying up', lines: ['That whiteboard gets ignored for weeks and then completely rewritten in one evening.'] } }
      },

      drafting: {
        blurb: 'A site trailer that’s mostly one big table covered in paper. The product side of my work is in here.',
        objects: {
          table: {
            name: 'the planning table',
            panel: {
              title: 'who these were for',
              sections: [
                { kind: 'list', title: 'problems that started with someone else', items: [
                  'A campus with lost property and no safe way to prove something’s yours',
                  'A downtown foundation that couldn’t see its vacancies on a map',
                  'A craft marketplace whose artisans kept getting buried behind an About page'
                ] },
                { kind: 'projects', ids: ['sos-lost-found', 'walla-walla-map'], lens: 'product' }
              ]
            }
          },
          flowboard: {
            name: 'the flow board',
            panel: { title: 'a role-based workflow', sections: [
              { kind: 'text', body: 'At Movate, the permission system came before the dashboard. Admins, managers and end users each get a different set of actions, and I broke the scope into a ten-week plan before anything was built.' },
              { kind: 'experience', ids: ['movate'] }
            ] }
          },
          ledger: {
            name: 'the decision ledger',
            quest: 'product-decision',
            panel: {
              title: 'decisions I made, and why',
              sections: [
                { kind: 'decisions', ids: ['sos-lost-found', 'walla-walla-map', 'pond-hopper', 'porchlight'], lens: 'product' }
              ]
            }
          },
          pinboard: { name: 'the pinboard', panel: { title: 'pinned up', sections: [{ kind: 'visual', ids: ['sos-lost-found', 'walla-walla-map', 'porchlight'] }] } },
          calendar: { name: 'the scope board', lines: ['Ten weeks, three roles, and a whole column of things that didn’t make the cut.'] }
        },
        npcs: { 'npc-c': { name: 'someone with a clipboard', lines: ['The vacancy map uses demo data for now. Saying that clearly on the page is a big part of why the Foundation trusted the rest of it.'] } }
      },

      pub: {
        blurb: 'A cosy pub with a jukebox in the corner, and the jukebox runs Porchlight.',
        objects: {
          jukebox: {
            name: 'the jukebox',
            panel: {
              title: 'porchlight',
              sections: [
                { kind: 'text', body: 'It writes music rather than playing it back. Type in a seed, pick one of fourteen style packs, and it renders an hour of lofi to a WAV file right in your browser, with no server, no samples and no AI model.' },
                { kind: 'projects', ids: ['porchlight'], lens: 'engineering' }
              ]
            }
          },
          records: {
            name: 'the shelf behind the bar',
            panel: {
              title: 'fourteen style packs',
              sections: [
                { kind: 'text', body: 'Each pack has its own drum kit, rhythm grammar, instrument voices, chord layout and room sound. Chillhop and atmospheric drum and bass from the same seed come out as two completely different pieces of music, right down to how the snare is synthesized.' },
                { kind: 'text', body: 'Adding a new pack means adding one data file.' }
              ]
            }
          },
          counter: {
            name: 'the counter',
            panel: {
              title: 'why there are no samples',
              sections: [
                { kind: 'text', body: 'Every drum, pad and bit of vinyl crackle is generated from the track’s seed. There’s no recorded audio anywhere in the repository, so whatever you make is yours to publish or sell, with no rights to clear.' },
                { kind: 'links', items: [L('source', 'https://github.com/TabishNavaid/porchlight')] }
              ]
            }
          },
          table: { name: 'the corner table', lines: ['There’s a seed written on a beer mat in biro: 3f2a91c.', 'The same seed always gives you the same thirty minutes of music.'] },
          window: { name: 'the front window', lines: ['From here you can see the green, and whoever’s reading the notice board.'] }
        },
        npcs: {
          'npc-a': { name: 'someone at the bar', lines: ['I’ve been typing random seeds into that jukebox all night. Seven characters each, and every one sounds different.'] }
        }
      },

      civic: {
        blurb: 'A bright community center with a big map of downtown on the wall. The civic work lives here.',
        objects: {
          wallmap: {
            name: 'the wall map',
            panel: { title: 'downtown walla walla', sections: [
              { kind: 'projects', ids: ['walla-walla-map'], lens: 'product' },
              { kind: 'links', items: [L('open the live prototype', 'https://tabishnavaid.github.io/walla-walla-map/')] }
            ] }
          },
          report: {
            name: 'the accessibility report',
            panel: { title: 'the college website', sections: [{ kind: 'experience', ids: ['whitman-accessibility'] }] }
          },
          cabinet: {
            name: 'the filing cabinet',
            panel: { title: 'what the map can’t do yet', sections: [
              { kind: 'list', items: [
                'The twenty-two listings are demo data, and the page says so right above the map',
                'The photos are reference images of other downtown buildings, which the page also mentions',
                'There’s no live inventory feed yet, but the data format is ready for one',
                'No ownership or lease records, since that’s the Foundation’s data to share'
              ] }
            ] }
          },
          terminal: { name: 'the public terminal', panel: { title: 'links', sections: [{ kind: 'links', items: [
            L('live prototype', 'https://tabishnavaid.github.io/walla-walla-map/'),
            L('source', 'https://github.com/TabishNavaid/walla-walla-map')
          ] }] } },
          aquarium: { name: 'the aquarium', lines: ['The filter is louder than four fish can possibly justify.'] }
        },
        npcs: {}
      },

      lostfound: {
        blurb: 'Shelves of lost property and a desk for reporting things. SOS, my lost-and-found app, lives here.',
        objects: {
          shelves: {
            name: 'the shelves',
            lines: ['Mostly water bottles. One bike helmet with a name inked inside the strap.']
          },
          intake: {
            name: 'the intake desk',
            panel: { title: 'reporting something', sections: [
              { kind: 'list', title: 'how reporting works', items: [
                'Lost and found items have separate forms, since each one needs different questions',
                'Search, filters and pagination all live in the URL, so you can send someone a link to exactly what you’re looking at',
                'Match suggestions explain why they matched',
                'A demo mode runs on seeded localStorage, with no setup needed'
              ] }
            ] }
          },
          cabinet: {
            name: 'the locked cabinet',
            panel: { title: 'proving it’s yours', sections: [
              { kind: 'text', body: 'The person who found the item writes a question and a private answer. You answer the question before either of you sees the other’s contact details, so you never have to give a stranger your number just to get a water bottle back.' },
              { kind: 'text', body: 'Those rules are enforced by Postgres itself, with Row Level Security on all 37 application tables, so they still hold even if someone skips the frontend entirely.' }
            ] }
          },
          noticeboard: { name: 'the notice board', lines: ['Found: one house key with a bottle opener attached. Please describe the bottle opener.'] },
          ledger: {
            name: 'the handoff ledger',
            panel: { title: 'claim to reunion', sections: [
              { kind: 'list', items: [
                'Request, verification, handoff, reunion: each one is a separate state with its own rules',
                'Accepting a claim doesn’t close the item. It closes when someone confirms they got it back'
              ] }
            ] }
          },
          trophy: {
            name: 'the trophy',
            panel: { title: 'the hackathon', sections: [
              { kind: 'text', body: 'SOS started at a hackathon as six pages of vanilla JavaScript, built in twelve hours, and it won first place out of ten teams. It also had a broken Supabase import, placeholder credentials and no privacy model at all.' },
              { kind: 'text', body: 'I kept the name and rebuilt everything else around one question: how do you get someone their stuff back without either person having to share their contact details?' }
            ] }
          },
          terminal: { name: 'the office computer', panel: { title: 'SOS', sections: [
            { kind: 'projects', ids: ['sos-lost-found'], lens: 'engineering' }
          ] } }
        },
        npcs: { 'npc-a': { name: 'the clerk', lines: ['Everything on those shelves has a question attached. Answer it right and it’s yours to take home.'] } }
      },

      market: {
        blurb: 'A little shop with a stockroom out back. My e-commerce and ordering projects are in here.',
        objects: {
          shelves: {
            name: 'the shelves',
            panel: { title: 'aakritam', sections: [
              { kind: 'text', body: 'Aakritam is a live shop for Indian handicrafts. It buys from 320+ artisans directly and around 2,000 more indirectly, so the same shop sells ceramics, brass, handloom, calligraphy and honey. That’s why you browse by collection instead of scrolling one long grid of products.' },
              { kind: 'projects', ids: ['aakritam'], lens: 'product' }
            ] }
          },
          checkout: {
            name: 'the checkout',
            panel: { title: 'what Shopify handles', sections: [
              { kind: 'text', body: 'Shopify handles the catalogue, accounts, cart and checkout. A small shop can’t rely on a student to maintain those parts after graduating, so deciding where to draw that line was a big part of the job.' }
            ] }
          },
          stockboard: {
            name: 'the stock board',
            panel: { title: 'three people, one menu', sections: [
              { kind: 'text', body: 'The Java restaurant app went the other way: everything is built by hand, with JDBC talking to MySQL and MVC keeping the database code out of the interface.' },
              { kind: 'projects', ids: ['restaurant-management'], lens: 'engineering' }
            ] }
          },
          tickets: {
            name: 'the order tickets',
            panel: { title: 'why three workflows', sections: [
              { kind: 'text', body: 'A customer, a server and an owner all want different things from the same menu and order list, so each of them gets their own screen. It was also the first time I had to design a database schema and a permission model together.' }
            ] }
          },
          staffdoor: {
            name: 'the staff door',
            panel: { title: 'both ordering systems', sections: [
              { kind: 'projects', ids: ['aakritam', 'restaurant-management'], lens: 'product' }
            ] }
          },
          crate: { name: 'a crate of onions', lines: ['A crate of onions, sorted by size. Whoever did that had a slow afternoon.'] }
        },
        npcs: {}
      },

      library: {
        blurb: 'A quiet library, with my school and tutoring work on the shelves.',
        objects: {
          shelves: { name: 'the computer science shelf', panel: { title: 'school', sections: [{ kind: 'education' }] } },
          tutordesk: { name: 'the tutoring desk', panel: { title: 'tutoring', sections: [{ kind: 'experience', ids: ['peer-tutor'] }] } },
          awards: { name: 'the awards cabinet', panel: { title: 'awards', sections: [{ kind: 'awards' }] } },
          studyboard: { name: 'the study board', panel: { title: 'currently learning', sections: [{ kind: 'skills' }] } },
          blackboard: {
            name: 'the blackboard',
            lines: [
              'Someone’s drawn a linked list and crossed out the last arrow twice.',
              'Underneath, in smaller writing: “it was the base case.”'
            ]
          },
          plant: { name: 'a very tall plant', lines: ['The label says low light. It is in a south window and has not read the label.'] }
        },
        npcs: { 'npc-b': { name: 'a student', lines: ['I get help with data structures on Tuesdays. Tabish always makes me draw it out before I write any code, which is annoying, but it works.'] } }
      },

      post: {
        blurb: 'The post office. If you want to get in touch, this is the place.',
        objects: {
          desk: {
            name: 'the letter desk',
            quest: 'post-letter',
            panel: { title: 'write to tabish', sections: [
              { kind: 'text', body: 'Email’s the best way to reach me, whether it’s about an internship, a web project, or just to say hi.' },
              { kind: 'contact' }
            ] }
          },
          pigeonholes: { name: 'the pigeonholes', panel: { title: 'elsewhere on the internet', sections: [{ kind: 'links', items: [
            L('GitHub', 'https://github.com/TabishNavaid'),
            L('LinkedIn', 'https://linkedin.com/in/tabish-navaid')
          ] }] } },
          addressbook: { name: 'the address book', panel: { title: 'all my contact details', sections: [{ kind: 'contact' }] } },
          parcels: { name: 'the parcel shelf', lines: ['A parcel marked out for delivery since Tuesday. It has not left this shelf.'] },
          computer: {
            name: 'the public computer',
            panel: { title: 'the other two profiles', sections: [
              { kind: 'text', body: 'The same work is also on a one-page brief and an illustrated desktop. The bus at the bottom of the village goes back to the desktop.' },
              { kind: 'return' }
            ] }
          }
        },
        npcs: {}
      },

      stop: {
        blurb: 'The bus stop, with the bus you came in on waiting to take you back.',
        objects: {
          ride: {
            name: 'the bus home',
            action: 'ride',
            lines: ['The driver nods at you. Hop on whenever you’re ready.']
          },
          timetable: {
            name: 'the timetable',
            panel: {
              title: 'route 03',
              sections: [
                { kind: 'text', body: 'One route, two stops: the meadow at one end and this village at the other. Watch out for the luggage in the road.' },
                { kind: 'return' }
              ]
            }
          }
        },
        npcs: {}
      },

      arcade: {
        blurb: 'The arcade. There is no résumé in here, which is the point of it.',
        objects: {
          cabinet: { name: 'CAT COURIER', action: 'arcade', game: 'courier', lines: ['Deliver parcels to the right doors before time runs out.'] },
          highscore: { name: 'the high score board', action: 'highscore' },
          machine1: { name: 'a racing cabinet', lines: ['Out of order. Someone’s left the steering wheel on the floor next to it.'] },
          machine2: { name: 'BEAT STREET', action: 'arcade', game: 'beat', lines: ['The arrows still light up. It only knows eight bars, which is long enough to get good at eight bars.'] },
          machine3: { name: 'GRABBER', action: 'arcade', game: 'claw', lines: ['A claw machine full of plushies. The claw has two settings, nearly and nearly.'] },
          prizes: { name: 'the prize shelf', lines: ['Everything here costs more tickets than the machines hand out. That is the whole business model.'] }
        },
        npcs: {
          'npc-c': { name: 'the arcade regular', lines: ['I’ve had the top score on CAT COURIER for weeks. Go on, have a go.'] },
          'npc-a': { name: 'a kid with tokens', lines: ['Tip for CAT COURIER: check the colour and the symbol before you go in. A wrong door costs you two seconds and resets your combo.'] }
        }
      }
    },

    quests: [
      { id: 'enter-workshop', label: 'go inside the workshop', hint: 'In the works yard at the east end of South Lane, with a horseshoe over the door' },
      { id: 'inspect', label: 'look at something indoors', hint: 'Anything with an arrow floating over it' },
      { id: 'lost-found', label: 'visit the lost & found', hint: 'The purple house on Market Row, just east of the Cut' },
      { id: 'product-decision', label: 'find a product decision', hint: 'There’s a ledger of them in the drafting room' },
      { id: 'pond-notice', label: 'read the notice at the millpond', hint: 'Follow South Lane east until it turns into a dirt path' },
      { id: 'arcade-round', label: 'play a game in the arcade', hint: 'The arcade’s on the corner of South Lane' },
      { id: 'post-letter', label: 'open the letter desk', hint: 'Inside the post office on Market Row' }
    ],
    reward:
      'That is all of it: the same work as the PDF, considerably more walking. Thanks for taking the long way round.',
    rewardLine: 'Thanks for exploring. If you want to say hi, my email’s at the post office.'
  };

  return {
    links: LINKS,
    profile: PROFILE,
    lenses: LENSES,
    projects: PROJECTS,
    experiences: EXPERIENCES,
    skills: SKILLS,
    about: ABOUT,
    notes: NOTES,
    contact: CONTACT,
    brief: BRIEF,
    town: TOWN,
    project: (id) => PROJECTS.find((p) => p.id === id) || null,
    experience: (id) => EXPERIENCES.find((e) => e.id === id) || null
  };
})();
