/* ==========================================================================
   content.js — one verified content model, read by all three modes.

   The Brief, Meadow Desktop and Field Trip render this file through three
   different interfaces. Nothing is written twice.

   Provenance rules:
     - Copy is the original repository copy wherever it existed.
     - Additions are limited to things that can be checked: real repository
       and demo URLs, real screenshots, and points taken from Tabish's own
       project READMEs.
     - A fact nobody can check is `null` with a note, so the action disappears
       instead of becoming a dead link. `LINKS.resume` is the main one: set it
       to a path and every résumé action on the site appears.
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
    tagline: 'CS &amp; Math student building web apps, and the odd browser game',
    taglinePlain: 'CS & Math student building web apps, and the odd browser game',
    status: 'open to software engineering and product internships',
    school: 'Whitman College',
    degree: 'BA, Computer Science &amp; Mathematics',
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
     `openLabel` is the button that opens the detail window on Meadow Desktop.
     It names something that window actually contains, so no two of them read
     the same. Leave it out and the button falls back to a plain label. */

  const PROJECTS = [
    {
      id: 'sos-lost-found',
      openLabel: 'the question that changed the schema',
      title: 'SOS Lost & Found',
      featured: true,
      year: '2024, rebuilt 2026',
      subtitle: 'Campus lost-and-found, from a twelve-hour hackathon build to a rebuilt product.',
      preview: 'Report an item and prove it is yours before either person hands over a phone number. Match suggestions say what made them match.',
      stack: ['React', 'TypeScript', 'Supabase', 'PostgreSQL', 'Playwright'],
      built: ['Lost and found reporting', 'Private ownership checks', 'Claim through to reunion'],
      problem:
        'Campus lost-and-found lives in three inboxes and a box behind a desk. The usual way to prove an item is yours is to message a stranger from your own account and hope.',
      whatIBuilt: [
        'Separate lost and found reporting flows, because the questions are different',
        'Search, URL-backed filters, cursor pagination, and match suggestions that list what made them match',
        'Private ownership verification: a public question, a private answer, checked before contact',
        'Claim states from request through verification and handoff to a confirmed reunion',
        'Campus tenancy: memberships, roles, moderation queue, audit history',
        'A demo mode that runs off seeded localStorage with no Supabase project at all'
      ],
      techStack: 'React, TypeScript, Supabase, PostgreSQL, Vitest, Playwright, GitHub Actions',
      productDecisions: [
        'The finder writes a public question and a private answer. A claimant answers it before either person sees the other’s contact details.',
        'Accepting a claim does not close the item. A person confirms the reunion, because an accepted claim is a plan and a reunion is an outcome.',
        'Match suggestions show the reasons they matched, so a wrong suggestion is something you can argue with.'
      ],
      engineeringDecisions: [
        'Pages know one interface, DataClient. The seeded localStorage demo and the Supabase adapter both implement it, so the demo obeys the same ownership and membership rules as production instead of faking them.',
        'Row Level Security on all 37 application tables. The frontend hides routes a user cannot reach and is trusted with nothing beyond that.',
        'Splitting the verification question from its answer was the bug worth catching. The first schema had one field, so the interface could not show the question without risking the answer.',
        'Every push runs typecheck, lint, unit tests, a build and Playwright, including an axe pass that fails on serious violations.'
      ],
      learned:
        'Authorization was a schema problem before it was a UI problem. Once the answer had its own table, the interface question answered itself.',
      visual: {
        src: 'assets/images/work/sos-landing.webp',
        width: 1200,
        height: 800,
        alt: 'SOS landing page: a cream and red page reading “The fastest route from lost to found”, beside a preview of a lost water bottle matched to a found student ID.'
      },
      links: [{ label: 'GitHub', href: 'https://github.com/TabishNavaid/SOS---Save-Our-Souls' }],
      missing: 'No hosted demo. It runs locally in demo mode, and no real campus is connected to it.'
    },
    {
      id: 'porchlight',
      openLabel: 'why the renderer got six times faster',
      title: 'Porchlight',
      featured: true,
      year: '2026',
      subtitle: 'Generative lofi that runs in the browser and writes hour-long WAV files from a seed.',
      preview: 'Fourteen style packs, no server and no samples. The same seed gives the same audio, sample for sample.',
      stack: ['TypeScript', 'Next.js', 'Web Audio', 'Tone.js', 'Vitest'],
      built: ['The generation engine', 'Offline WAV rendering', 'Fourteen style packs'],
      problem:
        'Generative music tools either stream at you or hand back a file assembled from samples somebody else owns. I wanted a track I could keep.',
      whatIBuilt: [
        'A generator where composeBar(spec, bar) returns every note, drum hit and texture event for one bar as plain data and reads nothing from the bar before it',
        'An offline renderer that works in segments and hands each one to the file writer, so peak memory follows segment size rather than track length',
        'Fourteen style packs, each owning its drum kit, rhythm grammar, voices, chord layout and room',
        'ITU-R BS.1770 loudness metering and a true-peak limiter, measured at -14.15 LUFS against a -14 target',
        'Unit, seam and real-browser test suites, plus an axe pass over the pages'
      ],
      techStack: 'TypeScript, Next.js, React, Tone.js, Web Audio, Vitest, Playwright, ffmpeg.wasm',
      productDecisions: [
        'Nothing is sampled or recorded. Every drum, pad and piece of vinyl crackle is arithmetic seeded from the track, so the audio you generate carries no third-party rights and you can publish it or sell it.',
        'The studio preview schedules from the same function the file renderer uses, so what you hear while choosing a seed is what lands in the WAV rather than an approximation of it.'
      ],
      engineeringDecisions: [
        'An OfflineAudioContext in Chrome keeps charging for a source node after it has stopped, so render time grew with the square of the segment length. Synthesizing notes into a shared buffer instead of giving each note a node made the cost linear and took the renderer from about 3x realtime to 19.6x. A sixty-minute track now takes about three minutes.',
        'src/engine/ contains no Web Audio calls at all. Generation takes a spec and a bar number and returns data; playback and file rendering are two consumers of that one function.',
        'Determinism is scoped to one browser and the repository says so. The Node audio backend the tests use drifts from Chrome by around -49 dBFS on samples that land on mixing-window boundaries, so every fixture records which engine produced it.'
      ],
      learned:
        'The platform was the bottleneck, not the algorithm. Every guess I had about where the render time went was wrong until I measured it.',
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
      openLabel: 'why it ships with data that is not real',
      title: 'Downtown Walla Walla Vacancy Map',
      featured: true,
      year: '2026',
      subtitle: 'Downtown vacancy on a map, built with the Downtown Walla Walla Foundation and Whitman Economics.',
      preview: 'Twenty-two demo listings, filters for status, space type and rent, and a page that says out loud the data is not real yet.',
      stack: ['Leaflet.js', 'OpenStreetMap', 'JavaScript'],
      built: ['Interactive map', 'Status and rent filters', 'Listings panel'],
      problem:
        'Downtown vacancy information is hard to look at as a picture. This was an attempt to make the location data browsable before anyone commits to collecting it properly.',
      whatIBuilt: [
        'A map interface with markers for vacant, partial and occupied spaces',
        'Filters for status, space type and maximum rent',
        'A listings panel that stays in sync with whatever the map is showing',
        'A record shape a real inventory can drop into later, with the demo rows in the same format'
      ],
      techStack: 'HTML, CSS, JavaScript, Leaflet.js, OpenStreetMap',
      productDecisions: [
        'Map first, because the question people were asking was where, and a table answers how many.',
        'The page states that the listings are demo data and that the photographs are reference images of other buildings, so nobody has to guess which parts are real.',
        'Status is written as a word beside its colour, because committee packets get printed in greyscale.'
      ],
      engineeringDecisions: [
        'Leaflet over OpenStreetMap, so there is no API key and no account for the Foundation to keep alive after I graduate.',
        'Three files and no build step. It can be hosted, iframed, or handed to somebody who has never run npm.'
      ],
      learned: 'For a civic stakeholder, the credible part was the list of what it could not do yet.',
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
      openLabel: 'the finale that had to be rebuilt',
      title: 'Pond Hopper',
      year: '2026',
      subtitle: 'Six chapters of a rabbit crossing water, with ghost replays and a daily seed.',
      preview: 'Vanilla JavaScript and Canvas, with no build step at all. 1.54 seconds to interactive on a throttled Fast 3G connection.',
      stack: ['JavaScript', 'Canvas 2D', 'GitHub Pages', 'node:test'],
      built: ['Physics and seeded courses', 'Six chapters', 'A pixel-exact parity gate'],
      problem:
        'I wanted a game that opens on a phone before you lose interest and stays readable afterwards. Clone the folder, serve it, play it.',
      whatIBuilt: [
        'A fixed-timestep loop, seeded course generation, and hop physics tuned by measuring dwell time on each surface',
        'Six chapters as data, with five pacing shapes and a validator that fails a test rather than a playtest',
        'Ghost replays, a daily seed with streaks, and shareable challenge links on a frozen wire format',
        'A parity harness that fingerprints every RGBA byte of the canvas across nine scenarios',
        'A throttling server that models HTTP/2 multiplexing, and a preload generator that walks the real import graph'
      ],
      techStack: 'JavaScript, Canvas 2D, ES modules, node:test, Python for the QA tooling, GitHub Pages',
      productDecisions: [
        'The finale chase measured as scenery on the first attempt. The rabbit runs at a constant speed, so a chase you cannot outrun is a timer wearing a costume. Rebuilt so a clean landing pushes the water back and your combo becomes distance from drowning.',
        'A story card shows once. Replaying a chapter you have already read goes straight to play, because a card you have read is an obstacle.'
      ],
      engineeringDecisions: [
        'The simulation is 480 by 270 on every device, in every orientation, permanently. Everything outside that band is decoration the renderer owns and physics, generation and ghosts never read, which is what keeps one seed’s course identical at any window size and keeps saved ghosts and shared links replayable.',
        'The parity harness stubs the clock and the random number generator and drives fixed 1/60 steps, so a refactor can prove it changed nothing before the art changes anything.',
        'No bundler, on purpose. A script walks the import graph and writes the modulepreload block into index.html, and a test walks it independently and fails if the committed block drifts, because the symptom of that rot is a slow first load nothing announces.'
      ],
      learned:
        'Four times running, the surprising number was my instrument rather than the system. The local server did not gzip, so a first-load measurement was metering 345 KB where the real host sends 147.',
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
      missing: 'Mobile is built and measured in an emulator. It has not been checked on a physical phone yet.'
    },
    {
      id: 'aakritam',
      openLabel: 'why collections lead',
      title: 'Aakritam',
      year: '2025',
      subtitle: 'Indian handicrafts sold online, with the makers still visible inside the shopping flow.',
      preview: 'Live and taking orders for a fair-trade marketplace with 320+ direct artisan partnerships.',
      stack: ['Shopify', 'Liquid', 'JavaScript', 'Responsive design'],
      built: ['Storefront navigation', 'Collection and product pages', 'Cart and account flows'],
      problem:
        'Aakritam buys from 320+ artisans directly and around 2,000 more indirectly, across crafts that share nothing except who made them. One storefront had to carry all of that without burying the people behind it.',
      whatIBuilt: [
        'A responsive storefront and its navigation',
        'Collection and product browsing across image-heavy pages',
        'Cart, account and checkout entry points',
        'Homepage sections for categories, products and a featured artisan'
      ],
      techStack: 'Shopify, Liquid, HTML, CSS, JavaScript',
      productDecisions: [
        'Collections are the way in. With ceramics, brass, handloom, calligraphy and honey in the same shop, a single grid of products tells you nothing about what you are looking at.',
        'The artisan story sits on the homepage, inside the shopping flow, where somebody deciding to buy will actually pass it.'
      ],
      engineeringDecisions: [
        'Shopify owns catalogue, accounts, cart and checkout. Those are the parts a working shop cannot afford to have a student maintain, and it is taking real orders.',
        'The layout holds up across collection and product pages that are mostly large photographs.'
      ],
      learned: 'A commerce page has to give the product room and still explain where it came from.',
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
      openLabel: 'the rollback that made it shippable',
      title: 'Bloom',
      year: '2026',
      subtitle: 'Tasks go in as seeds and flower when you finish them.',
      preview: 'Local-first, with an optional cloud save you have to ask for.',
      stack: ['React', 'Vite', 'Framer Motion', 'Supabase'],
      built: ['Garden board', 'Task planting and completion', 'Optional cloud save'],
      problem: 'Most task apps make finishing something feel like nothing happened.',
      whatIBuilt: [
        'The garden board, planting, completion, journal and stats',
        'localStorage as the source of truth, so the app works before you have an account',
        'Optional Supabase sign-in with a cloud save you trigger yourself'
      ],
      techStack: 'React, Vite, Framer Motion, Supabase',
      productDecisions: [
        'Signing in never copies or deletes local data on its own. Guest mode keeps working and keeps its garden.'
      ],
      engineeringDecisions: [
        'A cloud restore runs validate, serialise, back up, then commit. It snapshots every key before writing and rolls each one back if any write throws, and it reports the keys whose rollback also failed instead of pretending the restore worked.'
      ],
      learned: 'The restore path needed a rollback before the feature was worth shipping at all.',
      links: [{ label: 'GitHub', href: 'https://github.com/TabishNavaid/bloom' }],
      missing: 'Local-only for now: no hosted build, and the art is still placeholder in places.'
    },
    {
      id: 'this-site',
      openLabel: 'how this site works',
      title: 'This Website',
      year: '2026',
      subtitle: 'Three ways into the same résumé: a one-page brief, an illustrated desktop, and a town you walk around.',
      preview: 'One content file behind all three, so no fact here is written twice.',
      stack: ['HTML', 'CSS', 'JavaScript', 'Canvas'],
      built: ['Three modes, one content model', 'Draggable desktop windows', 'A canvas town with save state'],
      problem:
        'A recruiter has about a minute and wants the facts in order. Somebody who is only curious wants to poke at something. One page cannot do both, so this one is three.',
      whatIBuilt: [
        'A profile chooser that boots like a small computer',
        'A desktop interface with draggable windows and a sun you drag to change the time of day',
        'A top-down pixel town with collision, a camera, quests and saved progress',
        'One content file behind all three renderers'
      ],
      techStack: 'HTML, CSS, JavaScript, Canvas 2D, Vercel',
      productDecisions: [
        'Three modes, because recruiters and curious people want opposite things from the same page.',
        'Everything in the town is also a row in a text map directory, so nothing professional depends on being able to walk.'
      ],
      engineeringDecisions: [
        'One number from 0 to 1 drives every colour on the desktop, so day and night are the same code path.',
        'Windows are native dialogs, which means focus trapping and focus return come from the browser.',
        'The town’s art is three small atlases cut from the licensed packs by a script, loaded only when you pick that profile, and the loop stops when the tab is hidden.'
      ],
      learned: 'Three renderers stay cheap only while the content file stays the one place a fact is written.',
      links: []
    },
    {
      id: 'restaurant-management',
      openLabel: 'the three workflows',
      title: 'Restaurant Management App',
      year: '2025',
      subtitle: 'Java and MySQL, with separate customer, staff and admin accounts over one menu.',
      preview: 'Coursework scale, but the first time I had to design a schema and a permission model together.',
      stack: ['Java', 'MySQL', 'JDBC', 'MVC', 'JUnit'],
      built: ['Role-based accounts', 'Menu CRUD', 'Order tracking'],
      problem:
        'A customer, a server and an owner want different things from the same menu and the same order list.',
      whatIBuilt: ['Role-based accounts', 'Menu CRUD', 'Order tracking', 'An MVC structure', 'JUnit tests over the core flows'],
      techStack: 'Java, MySQL, JDBC, MVC, NetBeans, JUnit, Git',
      productDecisions: ['Three workflows rather than one screen with things greyed out.'],
      engineeringDecisions: ['MVC to keep the database work out of the interface code', 'JUnit over the ordering flows'],
      learned: 'How to structure a larger Java application, connect it to a database, and test the parts that would hurt to break.',
      links: [],
      missing: 'Coursework, and not published. There is no repository or demo to link to.'
    }
  ];

  /* --- experience (original repository copy) ------------------------------ */

  const EXPERIENCES = [
    {
      id: 'whitman-accessibility',
      title: 'Front-End & Accessibility Developer @ Whitman College',
      org: 'Whitman College',
      role: 'Front-End & Accessibility Developer',
      date: 'Jan 2025–present',
      preview: 'Refactored broken layouts across 1000+ pages and helped raise accessibility from 70% to 99.6%.',
      tags: ['HTML', 'CSS', 'Accessibility', 'CMS', 'QA'],
      whatIDid: [
        'Refactored broken layouts across 1000+ pages',
        'Helped raise accessibility from 70% to 99.6%',
        'Built feature pages from editorial briefs',
        'Debugged HTML/CSS issues inside the CMS',
        'Created pre-launch QA and accessibility checks'
      ],
      tools: 'HTML, CSS, CMS, Monsido, accessibility, WCAG, QA',
      mattered: 'It made a thousand-odd college pages easier to use and less likely to break after launch.'
    },
    {
      id: 'movate',
      title: 'Software Developer Intern @ Movate',
      org: 'Movate',
      role: 'Software Developer Intern',
      date: 'Jun–Aug 2025',
      preview: 'Built role-based dashboard functionality and shaped admin, manager, and end-user workflows.',
      tags: ['React', 'Supabase', 'Auth', 'Dashboards'],
      whatIDid: [
        'Built a role-based permission system',
        'Helped scope admin, manager, and end-user workflows',
        'Worked with stakeholders in a remote environment',
        'Turned loose requirements into a 10-week delivery plan',
        'Built dashboard functionality for operational use'
      ],
      tools: 'React, Supabase, role-based auth, stakeholder scoping, dashboards',
      mattered:
        'The project taught me how to move from vague requirements to a working tool with distinct user roles and practical constraints.'
    },
    {
      id: 'peer-tutor',
      title: 'Peer Tutor / TA @ Whitman College',
      org: 'Whitman College',
      role: 'Peer Tutor / TA',
      date: 'Jan 2025–present',
      preview: 'Created visual walkthroughs and helped students debug concepts, not just code.',
      tags: ['Data Structures', 'Discrete Math', 'Teaching', 'Debugging'],
      whatIDid: [
        'Tutored Data Structures, Discrete Math, writing, and technical skills',
        'Created visual explanations and reusable walkthroughs',
        'Helped students debug concepts, not just code',
        'Adjusted explanations based on recurring misunderstandings'
      ],
      tools: 'Data Structures, Discrete Math, teaching, debugging, communication',
      mattered: 'The same misunderstandings kept coming back, so the thing worth fixing was the explanation, not the answer.'
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
    { title: 'read about, have not shipped', items: ['AWS', 'Docker', 'AI tooling'] }
  ];

  /* --- about (original repository copy) ----------------------------------- */

  const ABOUT = {
    heading: 'Tabish Navaid',
    sub: 'CS &amp; Math student @ Whitman College<br />Front-end web &amp; accessibility developer · Former intern @ Movate',
    intro:
      'hi! i’m tabish. i build web tools that people keep using after the demo, which mostly means getting the boring parts right: who is allowed to see what, what happens when a write fails, and whether the next person can read the code. lately that has also meant an audio engine and a game, because it turns out the boring parts are the same there too.',
    doing: [
      'build front-end pages, dashboards, and CMS features,',
      'turn vague ideas into flows, scopes and a list of what is not in scope,',
      'work on civic tech, storefronts, accessibility fixes, and student-facing tools,',
      'tutor students in CS, math, writing, and technical skills, and',
      'chase down the interfaces that make people ask somebody else how to use them.'
    ],
    education:
      'Bachelor of Arts in Computer Science &amp; Mathematics<br />Whitman College, Walla Walla, WA · Class of 2028<br />GPA: 3.98 · UWC Davis Scholar (Full Scholarship)',
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

  /* --- notes (original repository copy, plus one page about the build) ----- */

  const NOTES = [
    {
      q: 'currently',
      a: 'studying CS and math at Whitman, working on the college website, tutoring, and rendering an unreasonable number of test WAV files.'
    },
    {
      q: 'cat status',
      a: 'employed. walks across the keyboard during a render and has never once been sorry about it.'
    },
    {
      q: 'open to',
      a: 'internships, web projects, useful tools, and collaborations where somebody else also reads the error messages.'
    },
    {
      q: 'favorite kind of work',
      a: 'the kind where a small decision early saves an argument later. splitting one database field into two, or writing “this is demo data” on a page, or deciding a demo mode has to obey the same permissions as production.'
    },
    {
      q: 'languages, and what else i care about',
      a: 'english (fluent), hindi/urdu (native), german (conversational). outside coursework: accessibility advocacy, open-source and community projects, human-computer interaction, and badminton.'
    },
    {
      q: 'under the hood',
      list: [
        'Three modes read one content file, so no fact on this site is written twice.',
        'One number from 0 to 1 drives the sky, grass, paper, ink, and the sun’s position.',
        'Open windows are in the URL, so a project link can be pasted into an email.',
        'Windows are native dialogs: focus trapping and focus return come from the browser.',
        'No sound file is requested until you turn sound on.',
        'Field Trip’s art is three small atlases cut from the licensed packs by a script, loaded only when you pick that profile.',
        'The town’s pond picks its own shore tiles from each tile’s four neighbours, so the map file never has to spell out a coastline.',
        'The two big cat animations went from 6.4 MB of GIF to about 30 KB of WebP.'
      ]
    }
  ];

  const CONTACT = {
    heading: 'send a tiny letter',
    body:
      'email is the best way to reach me. internships, front-end work, accessibility fixes, or anything somebody else has to use afterwards. i read all of it and answer most of it.',
    status: 'open to software engineering and product internships.'
  };

  /* --- the brief ---------------------------------------------------------- */

  const BRIEF = {
    lede:
      'I build web tools for jobs that are already messy: returning lost property without either person handing over a phone number, mapping a downtown’s empty storefronts, keeping a thousand college pages usable. The rest of the time I build things that have to hold sixty frames a second.',
    featured: ['sos-lost-found', 'porchlight', 'walla-walla-map'],
    alsoBuilt: ['pond-hopper', 'aakritam', 'bloom', 'this-site', 'restaurant-management']
  };

  /* --- field trip: the town ----------------------------------------------- */
  /* Layout (where things stand) lives in js/field-trip/. This is only what
     the town says. Rooms name their objects; the game joins them by id. */

  const L = (label, href) => ({ label: label, href: href });

  const TOWN = {
    intro: 'a village where each open door holds one part of the same résumé. most of the doors do not open, which is what makes the open ones worth trying.',

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
      { id: 'pond', label: 'the millpond', short: 'pond hopper, and a bridge', room: 'pond' },
      { id: 'post', label: 'the post office', short: 'contact', room: 'post' },
      { id: 'arcade', label: 'the arcade', short: 'no résumé in here', room: 'arcade' },
      { id: 'stop', label: 'the bus stop', short: 'back to the desktop', room: null, sections: [{ kind: 'return' }] }
    ],

    /* what each place says. `panel` opens on inspection; `lines` just talks. */
    rooms: {
      square: {
        blurb: 'the middle of town: a fountain standing in a grass verge, benches on all four sides, and chalk that somebody will wash off on friday.',
        objects: {
          welcome: {
            name: 'the welcome marker',
            panel: {
              title: 'welcome to the village',
              sections: [
                { kind: 'profile' },
                { kind: 'text', body: 'nine doors open. the rest of the village is a village. press M for the map, which lists every room and everything in it as text.' }
              ]
            }
          },
          fountain: {
            name: 'the fountain',
            lines: ['three coins in the bottom. one of them is a bottle cap and has been for a while.', 'the water makes the same noise it made yesterday, which is the whole appeal.']
          },
          notice: {
            name: 'the notice board',
            panel: {
              title: 'notice board',
              sections: [
                { kind: 'text', body: 'open to software engineering and product internships. the post office, north side of the green, has the email address and the résumé.' },
                { kind: 'quests' }
              ]
            }
          },
          mapsign: { name: 'the map sign', action: 'map', lines: ['the whole village on one board. the readable version is the map button up in the bar.'] },
          bench: { name: 'a bench', lines: ['still warm. either somebody left in a hurry or the sun did its job.'] }
        },
        npcs: {
          'npc-a': { name: 'a kid with a skateboard', lines: ['workshop is the one with the horseshoe, down the west lane past the pub. the trailer parked next to it is where they argue about what goes in.', 'press M if walking is not your thing. same buildings, fewer steps.'] },
          'npc-b': { name: 'someone waiting for the bus', lines: ['the bus goes back to the meadow. it has never once been early.'] },
          'npc-c': { name: 'the arcade regular', lines: ['courier game in there. i have been beaten by a cat.', 'the other game is on a sign down at the pond. that one has a rabbit in it.'] }
        }
      },

      pond: {
        blurb: 'the path east of the green drops down to a millpond, and a stream leaves it southward under a wooden bridge.',
        objects: {
          noticeboard: {
            name: 'the notice by the water',
            quest: 'pond-notice',
            panel: {
              title: 'pond hopper',
              sections: [
                { kind: 'text', body: 'a rabbit crossing water, six chapters deep, running in a browser tab with no build step behind it. it is a game, and it is also where most of what i know about frame budgets came from.' },
                { kind: 'projects', ids: ['pond-hopper'], lens: 'engineering' }
              ]
            }
          },
          water: {
            name: 'the millpond',
            lines: ['deep enough in the middle that nobody swims and shallow enough at the edge that everybody has fallen in once.', 'something moved. probably a fish. the game about crossing this is on the notice behind you.']
          },
          bridge: {
            name: 'the bridge',
            panel: {
              title: 'the one decision worth stealing',
              sections: [
                { kind: 'text', body: 'pond hopper ends in a chase, and the first version of it measured as scenery: the rabbit runs at a fixed speed, so water you cannot outrun is a countdown wearing a costume.' },
                { kind: 'text', body: 'the fix was to give the chase the one axis of skill the game has. a clean landing shoves the water back and a scrappy one barely does, so your combo stops being points and starts being how far you are from drowning.' },
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
        blurb: 'a warm room that smells of solder and coffee. half-built things, and the reasons for them written on the wall.',
        objects: {
          terminal: {
            name: 'the terminal',
            panel: {
              title: 'repositories',
              sections: [
                { kind: 'text', body: 'five of these are public. clone them and they run.' },
                { kind: 'links', items: [
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
            panel: { title: 'what is on the bench', sections: [{ kind: 'projects', ids: ['sos-lost-found', 'porchlight', 'pond-hopper'], lens: 'engineering' }] }
          },
          whiteboard: {
            name: 'the whiteboard',
            panel: {
              title: 'one architecture decision',
              sections: [
                { kind: 'text', body: 'SOS runs in two modes: a seeded localStorage database that needs no setup, and Supabase with Postgres, auth and storage. both sit behind one typed interface, so a page cannot quietly behave differently depending on which is underneath it.' },
                { kind: 'list', title: 'what that bought', items: [
                  'the demo obeys the same ownership and membership rules as the real backend',
                  'the browser tests exercise the same paths either way',
                  'permissions live in the database, where a component cannot forget them'
                ] }
              ]
            }
          },
          toolwall: { name: 'the tool wall', panel: { title: 'tools', sections: [{ kind: 'skills' }] } },
          teststation: {
            name: 'the testing bench',
            panel: {
              title: 'testing, and the numbers that came out of it',
              sections: [
                { kind: 'list', title: 'on SOS', items: [
                  'every push runs typecheck, lint, unit tests and a build, then Playwright in a real browser',
                  'Row Level Security is on for all 37 application tables',
                  'a Playwright test runs axe over the public pages and fails the build on serious violations'
                ] },
                { kind: 'list', title: 'on porchlight and pond hopper', items: [
                  'porchlight: a sixty-minute render takes about three minutes, and lands between -14.15 and -14.18 LUFS against a -14 target',
                  'pond hopper: 1.54 seconds to interactive on throttled Fast 3G, measured against the deployed bytes rather than the working tree',
                  'pond hopper: nine scenarios fingerprint every RGBA byte of the canvas, so a refactor can prove it changed nothing'
                ] },
                { kind: 'experience', ids: ['whitman-accessibility'] }
              ]
            }
          },
          halfbuilt: { name: 'a half-built something', lines: ['four wheels and no plan. it has been like this since february.'] }
        },
        npcs: { 'npc-b': { name: 'someone tidying up', lines: ['he leaves that whiteboard alone for weeks and then rewrites the whole thing in one evening.'] } }
      },

      drafting: {
        blurb: 'a site trailer with a big table, too much paper, and one window that has never closed properly.',
        objects: {
          table: {
            name: 'the planning table',
            panel: {
              title: 'who had the problem',
              sections: [
                { kind: 'list', title: 'the ones that started as somebody else’s problem', items: [
                  'a campus with lost property and no safe way to prove an item is yours',
                  'a downtown foundation that could not see its vacancies on a map',
                  'a craft marketplace whose makers kept ending up behind an About link'
                ] },
                { kind: 'projects', ids: ['sos-lost-found', 'walla-walla-map'], lens: 'product' }
              ]
            }
          },
          flowboard: {
            name: 'the flow board',
            panel: { title: 'a role-based workflow', sections: [
              { kind: 'text', body: 'the Movate internship was a permission system before it was a dashboard: admin, manager and end user each get a different set of actions, and the scope got cut into a ten-week plan before anything was built.' },
              { kind: 'experience', ids: ['movate'] }
            ] }
          },
          ledger: {
            name: 'the decision ledger',
            quest: 'product-decision',
            panel: {
              title: 'decisions, and what they cost',
              sections: [
                { kind: 'decisions', ids: ['sos-lost-found', 'walla-walla-map', 'pond-hopper', 'porchlight'], lens: 'product' }
              ]
            }
          },
          pinboard: { name: 'the pinboard', panel: { title: 'pinned up', sections: [{ kind: 'visual', ids: ['sos-lost-found', 'walla-walla-map', 'porchlight'] }] } },
          calendar: { name: 'the scope board', lines: ['ten weeks, three roles, and one column of things that did not make it. the last column is the useful one.'] }
        },
        npcs: { 'npc-c': { name: 'someone with a clipboard', lines: ['the map ships with fake data on purpose. writing "this is demo data" on the page is the part that made the foundation trust the rest of it.'] } }
      },

      pub: {
        blurb: 'low ceiling, one long counter, and a jukebox in the corner that has been rewired into something it was not.',
        objects: {
          jukebox: {
            name: 'the jukebox',
            panel: {
              title: 'porchlight',
              sections: [
                { kind: 'text', body: 'it writes the music instead of playing it. type a seed, pick one of fourteen style packs, and it renders an hour of lofi to a WAV file in the browser. no server, no samples, no model.' },
                { kind: 'projects', ids: ['porchlight'], lens: 'engineering' }
              ]
            }
          },
          records: {
            name: 'the shelf behind the bar',
            panel: {
              title: 'fourteen packs, fourteen different machines',
              sections: [
                { kind: 'text', body: 'a pack owns its drum kit, its rhythm grammar, its instrument voices, its chord layout and its room. chillhop and atmospheric drum and bass from the same seed come out as two different pieces of music, down to how the snare is synthesized.' },
                { kind: 'text', body: 'adding a pack means adding one data file, which is the shape i wanted before i wrote the fourteenth one.' }
              ]
            }
          },
          counter: {
            name: 'the counter',
            panel: {
              title: 'why none of it is sampled',
              sections: [
                { kind: 'text', body: 'every drum, pad and piece of vinyl crackle is arithmetic seeded from the track. there is no recorded material anywhere in the repository, which means the audio you generate is yours to publish or sell and there is nothing to clear.' },
                { kind: 'links', items: [L('source', 'https://github.com/TabishNavaid/porchlight')] }
              ]
            }
          },
          table: { name: 'the corner table', lines: ['somebody has left a beer mat with a seed written on it in biro. 3f2a91c.', 'the same seed gives the same thirty minutes of music every time, which is either reassuring or slightly sinister.'] },
          window: { name: 'the front window', lines: ['from here you can see the green, the fountain, and whoever is currently reading the notice board.'] }
        },
        npcs: {
          'npc-a': { name: 'someone at the bar', lines: ['he keeps typing seven characters into that thing and then listening to the result like it owes him money.'] }
        }
      },

      civic: {
        blurb: 'high ceilings, a wall of glass, and a map big enough to argue over.',
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
            panel: { title: 'what the map cannot do yet', sections: [
              { kind: 'list', items: [
                'the twenty-two listings are demo data, and the page says so above the map',
                'the photographs are reference images of other downtown buildings, and the page says that too',
                'no live inventory feed. the record shape is there for one to drop into',
                'no ownership or lease records; that is the foundation’s data, not mine'
              ] },
              { kind: 'text', body: 'for a civic stakeholder, the credible part was the list of what it could not do yet.' }
            ] }
          },
          terminal: { name: 'the public terminal', panel: { title: 'links', sections: [{ kind: 'links', items: [
            L('live prototype', 'https://tabishnavaid.github.io/walla-walla-map/'),
            L('source', 'https://github.com/TabishNavaid/walla-walla-map')
          ] }] } },
          aquarium: { name: 'the aquarium', lines: ['four fish, one filter, no committee.'] }
        },
        npcs: {}
      },

      lostfound: {
        blurb: 'shelves of things people stopped looking for, and one desk where they start again.',
        objects: {
          shelves: {
            name: 'the shelves',
            lines: [
              'one umbrella, three left gloves, and a mug that says WORLD’S OKAYEST.',
              'a bike helmet with a sticker of a cat riding a bike. nobody has claimed it in months.'
            ]
          },
          intake: {
            name: 'the intake desk',
            panel: { title: 'reporting something', sections: [
              { kind: 'list', title: 'the flows', items: [
                'lost and found are separate forms, because the questions are different',
                'search, filters and pagination that survive being pasted into a message',
                'match suggestions that list what made them match',
                'a demo mode that runs from seeded localStorage with no setup at all'
              ] }
            ] }
          },
          cabinet: {
            name: 'the locked cabinet',
            panel: { title: 'proving it is yours', sections: [
              { kind: 'text', body: 'the finder writes a public question and a private answer. the claimant answers before either of them sees the other’s contact details, so nobody has to hand a stranger their phone number to get a water bottle back.' },
              { kind: 'text', body: 'the rules live in Postgres. Row Level Security is on for all 37 application tables, so the frontend is not the thing enforcing them.' }
            ] }
          },
          noticeboard: { name: 'the notice board', lines: ['found: one house key with a bottle opener on it. the bottle opener is the identifying feature.'] },
          ledger: {
            name: 'the handoff ledger',
            panel: { title: 'claim to reunion', sections: [
              { kind: 'list', items: [
                'request, verification, handoff, reunion. each one is a real state with its own rules',
                'accepting a claim does not close the item. a person confirms the reunion'
              ] },
              { kind: 'text', body: 'an accepted claim is a plan. a reunion is what happened.' }
            ] }
          },
          trophy: {
            name: 'the trophy',
            panel: { title: 'the hackathon', sections: [
              { kind: 'text', body: 'SOS started as six pages of vanilla javascript, shipped in twelve hours, and won first place out of ten teams. it also had a broken Supabase import, placeholder credentials and no privacy model whatsoever.' },
              { kind: 'text', body: 'the name survived. everything under it got rebuilt around one question: how do you give somebody their stuff back without publishing either person’s contact details?' }
            ] }
          },
          terminal: { name: 'the office computer', panel: { title: 'SOS', sections: [
            { kind: 'projects', ids: ['sos-lost-found'], lens: 'engineering' }
          ] } }
        },
        npcs: { 'npc-a': { name: 'the clerk', lines: ['everything on those shelves has a question attached. answer it and you can take the thing home.'] } }
      },

      market: {
        blurb: 'a shop with a back room, which is where the interesting software usually turns out to live.',
        objects: {
          shelves: {
            name: 'the shelves',
            panel: { title: 'aakritam', sections: [
              { kind: 'text', body: 'a live storefront for indian handicrafts, buying from 320+ artisans directly and around 2,000 more indirectly. ceramics, brass, handloom, calligraphy and honey in one shop, which is why collections are the way in and not one long grid of products.' },
              { kind: 'projects', ids: ['aakritam'], lens: 'product' }
            ] }
          },
          checkout: {
            name: 'the checkout',
            panel: { title: 'what shopify owns', sections: [
              { kind: 'text', body: 'catalogue, accounts, cart and checkout are shopify’s. those are the parts a small shop cannot afford to have a student maintain after he graduates, and picking that boundary was most of the work.' }
            ] }
          },
          stockboard: {
            name: 'the stock board',
            panel: { title: 'three people, one menu', sections: [
              { kind: 'text', body: 'the java restaurant app went the other way: everything hand-rolled, JDBC to MySQL, MVC so the database work stayed out of the interface code.' },
              { kind: 'projects', ids: ['restaurant-management'], lens: 'engineering' }
            ] }
          },
          tickets: {
            name: 'the order tickets',
            panel: { title: 'why three workflows', sections: [
              { kind: 'text', body: 'a customer, a server and an owner want different things from the same menu and the same order list. three screens beat one screen with half of it greyed out, and that was the first time i had to design a schema and a permission model at the same time.' }
            ] }
          },
          staffdoor: {
            name: 'the staff door',
            panel: { title: 'both ordering systems', sections: [
              { kind: 'projects', ids: ['aakritam', 'restaurant-management'], lens: 'product' }
            ] }
          },
          crate: { name: 'a crate of onions', lines: ['sorted by size. somebody here has strong feelings about onions.'] }
        },
        npcs: {}
      },

      library: {
        blurb: 'quiet, well lit, and shelved by somebody with strong opinions about shelving.',
        objects: {
          shelves: { name: 'the computer science shelf', panel: { title: 'school', sections: [{ kind: 'education' }] } },
          tutordesk: { name: 'the tutoring desk', panel: { title: 'tutoring', sections: [{ kind: 'experience', ids: ['peer-tutor'] }] } },
          awards: { name: 'the awards cabinet', panel: { title: 'awards', sections: [{ kind: 'awards' }] } },
          studyboard: { name: 'the study board', panel: { title: 'currently learning', sections: [{ kind: 'skills' }] } },
          blackboard: {
            name: 'the blackboard',
            lines: [
              'somebody has drawn a linked list and crossed out the last arrow. twice.',
              'underneath, in smaller writing: "it was the base case".'
            ]
          },
          plant: { name: 'a very tall plant', lines: ['taller than last term. the only thing in here that is not on a schedule.'] }
        },
        npcs: { 'npc-b': { name: 'a student', lines: ['data structures on tuesdays. he draws the thing before he writes the code, which is annoying and correct.'] } }
      },

      post: {
        blurb: 'one counter, a wall of pigeonholes, and a pen on a chain that still works.',
        objects: {
          desk: {
            name: 'the letter desk',
            quest: 'post-letter',
            panel: { title: 'write to tabish', sections: [
              { kind: 'text', body: 'email is the best way. internships, front-end work, useful tools, or anything that needs a careful web person.' },
              { kind: 'contact' }
            ] }
          },
          pigeonholes: { name: 'the pigeonholes', panel: { title: 'elsewhere on the internet', sections: [{ kind: 'links', items: [
            L('GitHub', 'https://github.com/TabishNavaid'),
            L('LinkedIn', 'https://linkedin.com/in/tabish-navaid')
          ] }] } },
          addressbook: { name: 'the address book', panel: { title: 'everything, in one place', sections: [{ kind: 'contact' }] } },
          parcels: { name: 'the parcel shelf', lines: ['a package addressed to "the cat, the meadow". it is being held pending a signature.'] },
          computer: {
            name: 'the public computer',
            panel: { title: 'the other two profiles', sections: [
              { kind: 'text', body: 'the same facts sit on a plain one-page brief and on an illustrated desktop. the bus at the bottom of the village goes back to the desktop.' },
              { kind: 'return' }
            ] }
          }
        },
        npcs: {}
      },

      arcade: {
        blurb: 'loud, purple, and the only building in town with nothing to do with work.',
        objects: {
          cabinet: { name: 'CAT COURIER', action: 'arcade', lines: ['deliver parcels to the matching doors before the clock runs out.'] },
          highscore: { name: 'the high score board', action: 'highscore' },
          machine1: { name: 'a racing cabinet', lines: ['out of order. the steering wheel is on the floor beside it, which is somehow worse.'] },
          machine2: { name: 'a rhythm cabinet', lines: ['the arrows still light up. the music has been the same eight bars since 2019.'] },
          machine3: { name: 'a claw machine', lines: ['one bunny plush, wedged in the corner on purpose.'] },
          prizes: { name: 'the prize shelf', lines: ['a keyring, a smaller keyring, and a poster of a fish.'] }
        },
        npcs: {
          'npc-c': { name: 'the arcade regular', lines: ['nobody has beaten the courier score in weeks. i have stopped being polite about it.'] },
          'npc-a': { name: 'a kid with tokens', lines: ['the trick is not going faster. it is not going to the wrong door.'] }
        }
      }
    },

    quests: [
      { id: 'enter-workshop', label: 'go inside the workshop', hint: 'the makers’ yard, down the west lane. horseshoe over the door' },
      { id: 'inspect', label: 'look at something indoors', hint: 'anything with an arrow floating over it' },
      { id: 'lost-found', label: 'visit the lost & found', hint: 'the purple house on the north side of the green' },
      { id: 'product-decision', label: 'find a product decision', hint: 'the drafting room keeps a ledger of them' },
      { id: 'pond-notice', label: 'read the notice at the millpond', hint: 'east off the green, then down the path to the water' },
      { id: 'arcade-round', label: 'play a round of cat courier', hint: 'the arcade, east side of the green' },
      { id: 'post-letter', label: 'open the letter desk', hint: 'the post office, north side of the green' }
    ],
    reward:
      'the street lights come on early and a cat turns up on the green. that is the whole prize. you have now read my entire résumé without reading a résumé.',
    rewardLine: 'thanks for walking the whole way round. the post office still has the email address.'
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
