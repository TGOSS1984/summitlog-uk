import { Link } from "react-router-dom";
import {
  TbMountain,
  TbMap2,
  TbChartBar,
  TbBookmark,
  TbArrowRight,
  TbFlame,
  TbBrandInstagram,
  TbBrandX,
  TbBrandFacebook,
  TbBrandStrava,
} from "react-icons/tb";

const FEATURES = [
  {
    icon: TbMountain,
    title: "Complete Collections",
    body: "Track Wainwrights, Munros, Corbetts and every major UK peak list. Log each ascent and watch your completion percentage climb.",
  },
  {
    icon: TbMap2,
    title: "Map-Led Exploration",
    body: "An interactive map plots every summit you've bagged, every peak on your wishlist, and surfaces new routes near you.",
  },
  {
    icon: TbChartBar,
    title: "Progress Dashboard",
    body: "Visual charts and stats tell your summit story — elevation gained, seasons conquered, collections completed.",
  },
  {
    icon: TbBookmark,
    title: "Journal Every Ascent",
    body: "Record conditions, notes and photos for each climb. Build a personal archive of your time on the hills.",
  },
];

const STATS = [
  { value: "800+", label: "UK Summits" },
  { value: "3", label: "Collections" },
  { value: "∞", label: "Routes" },
];

const COLLECTIONS = [
  { name: "Wainwrights", count: 214, region: "Lake District" },
  { name: "Munros", count: 282, region: "Scottish Highlands" },
  { name: "Nutalls", count: 222, region: "Wales/England" },
];

const ELEVATION_MARKS = [2000, 1750, 1500, 1250, 1000, 750, 500, 250];

function HomePage() {
  return (
    <main>

      {/* ── HERO ── */}
      <section className="hero-home">
        <div className="hero-home__overlay" />

        {/* Social sidebar — inside hero only, not fixed */}
        <aside className="social-sidebar" aria-label="Social links">
          <div className="social-sidebar__line" aria-hidden="true" />
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <TbBrandInstagram size={19} strokeWidth={2} />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter">
            <TbBrandX size={19} strokeWidth={2} />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <TbBrandFacebook size={19} strokeWidth={2} />
          </a>
          <a href="https://strava.com" target="_blank" rel="noopener noreferrer" aria-label="Strava">
            <TbBrandStrava size={19} strokeWidth={2} />
          </a>
          <div className="social-sidebar__line social-sidebar__line--bottom" aria-hidden="true" />
        </aside>

        {/* Elevation ruler — left of hero text */}
        <div className="elev-ruler" aria-hidden="true">
          <div className="elev-ruler__line" />
          {ELEVATION_MARKS.map((m) => (
            <div key={m} className="elev-ruler__mark">
              <span className="elev-ruler__label">{m}m</span>
              <span className="elev-ruler__tick" />
            </div>
          ))}
        </div>

        <div className="container hero-home__grid">

          <div className="hero-home__content">
            <p className="section-kicker">
              <span className="kicker-line" />
              Summit tracking reimagined
            </p>

            <h1 className="hero-home__h1">
              <span className="hero-home__h1-top">Explore</span>
              <span className="hero-home__h1-bottom">Mountains.</span>
            </h1>

            <p className="hero-home__lead">
              Discover Wainwrights, Munros and UK mountain collections
              through a premium, map-led tracking experience.
            </p>

            <div className="hero-home__actions">
              <Link to="/mountains" className="button-primary">
                Explore Mountains
                <TbArrowRight size={18} />
              </Link>
              <Link to="/map" className="button-secondary">
                <TbMap2 size={18} />
                Open Map
              </Link>
            </div>
          </div>

          <aside className="hero-dashboard glass-card">
            <p className="section-kicker">Progress snapshot</p>
            <div className="hero-dashboard__stats">
              <article>
                <span>Completed</span>
                <strong>43</strong>
              </article>
              <article>
                <span>Planned</span>
                <strong>12</strong>
              </article>
              <article>
                <span>Visible</span>
                <strong>214</strong>
              </article>
            </div>
            <div className="hero-dashboard__chart">
              <div className="progress-ring">
                <div className="progress-ring__inner">
                  <strong>19%</strong>
                  <span>completed</span>
                </div>
              </div>
            </div>
          </aside>

        </div>

        <div className="hero-ridge">
          <svg
            viewBox="0 0 1440 160"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            className="hero-ridge__svg"
            aria-hidden="true"
          >
            <path
              d="M0,110 C40,108 70,95 100,82 C130,69 148,74 170,68 C192,62 205,48 228,40 C251,32 268,44 290,50 C312,56 328,52 352,44 C376,36 390,22 418,18 C446,14 462,28 488,36 C514,44 530,46 558,42 C586,38 602,28 628,24 C654,20 672,30 698,38 C724,46 742,50 768,54 C794,58 812,52 838,46 C864,40 882,32 910,30 C938,28 958,38 984,46 C1010,54 1028,58 1056,56 C1084,54 1102,46 1128,40 C1154,34 1172,30 1200,36 C1228,42 1248,56 1278,68 C1308,80 1328,88 1360,94 C1392,100 1420,102 1440,104 L1440,160 L0,160 Z"
              fill="rgba(247,247,244,0.18)"
            />
            <path
              d="M0,140 C30,138 52,132 78,122 C104,112 118,106 142,98 C166,90 182,84 206,76 C230,68 246,62 272,54 C298,46 316,40 342,34 C368,28 386,22 414,16 C442,10 460,8 488,12 C516,16 532,22 558,28 C584,34 602,38 630,42 C658,46 676,44 704,40 C732,36 750,28 778,22 C806,16 824,14 852,18 C880,22 896,30 922,38 C948,46 966,52 994,56 C1022,60 1040,58 1068,54 C1096,50 1114,42 1142,38 C1170,34 1188,36 1216,42 C1244,48 1262,56 1290,66 C1318,76 1338,86 1368,100 C1398,114 1422,126 1440,134 L1440,160 L0,160 Z"
              fill="var(--color-bg-light)"
            />
          </svg>
        </div>
      </section>

      {/* ── STAT BAND ── */}
      <section className="stat-band">
        <div className="container stat-band__inner">
          {STATS.map((s) => (
            <div key={s.label} className="stat-band__item">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
          <div className="stat-band__cta">
            <Link to="/mountains" className="button-primary">
              Start Tracking <TbArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── REASONS ── */}
      <section className="reasons">
        <div className="reasons__head">
          <p className="section-kicker reasons__kicker">
            <span className="kicker-line" />
            Why SummitLog
            <span className="kicker-line" />
          </p>
          <h2 className="reasons__title">
            Five reasons to track<br />
            your UK mountains.
          </h2>
        </div>

        <div className="reasons__canvas">
          <div className="reasons__d reasons__d--lg reasons__d--L1">
            <img src="/images/placeholders/diamond-1.jpg" alt="Mountain ridge" />
          </div>
          <div className="reasons__d reasons__d--md reasons__d--L2">
            <img src="/images/placeholders/diamond-2.jpg" alt="Summit path" />
          </div>
          <div className="reasons__d reasons__d--sm reasons__d--L4">
            <img src="/images/placeholders/diamond-4.jpg" alt="Highland plateau" />
          </div>
          <div className="reasons__d reasons__d--sm reasons__d--L3">
            <img src="/images/placeholders/diamond-3.jpg" alt="Ridge walk" />
          </div>

          <div className="reasons__spine" aria-hidden="true">
            <div className="reasons__spine-line" />
            <div className="reasons__dot reasons__dot--1" />
            <div className="reasons__dot reasons__dot--2" />
            <div className="reasons__dot reasons__dot--3" />
            <div className="reasons__dot reasons__dot--4" />
            <div className="reasons__dot reasons__dot--5" />
          </div>

          <div className="reasons__d reasons__d--R1">
            <img src="/images/placeholders/diamond-5.jpg" alt="Mountain panorama" />
          </div>
          <div className="reasons__d reasons__d--R2">
            <img src="/images/placeholders/diamond-6.jpg" alt="Valley view" />
          </div>
          <div className="reasons__d reasons__d--R3">
            <img src="/images/placeholders/diamond-7.jpg" alt="Summit cairn" />
          </div>

          <div className="reasons__text reasons__text--1">
            <h3>Historic Peak Collections</h3>
            <p>The Wainwrights, Munros and Corbetts are more than tick-lists — they are a lifetime of adventure through Britain's finest highland landscapes.</p>
          </div>
          <div className="reasons__text reasons__text--2">
            <h3>Your Personal Summit Record</h3>
            <p>Every peak has a story. Log date, conditions, route, photos and notes for each ascent and build a journal that lasts a lifetime.</p>
          </div>
          <div className="reasons__text reasons__text--3">
            <h3>Map-Led Exploration</h3>
            <p>An interactive map shows every summit you've bagged, every peak on your wishlist, and surfaces new routes near you.</p>
          </div>
          <div className="reasons__text reasons__text--4">
            <h3>Four-Season Tracking</h3>
            <p>From summer scrambles to winter ascents — SummitLog tracks every ascent across the seasons and charts your mountain story over time.</p>
          </div>
          <div className="reasons__text reasons__text--5">
            <h3>Progress & Stats</h3>
            <p>Charts, percentages and milestones show exactly how far you've come — and what's left to climb.</p>
          </div>
        </div>

        <div className="reasons__cta-wrap">
          <Link to="/mountains" className="reasons__cta-btn">
            Browse Mountains →
          </Link>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section features-section">
        <div className="container">
          <div className="features-header">
            <p className="section-kicker">Features</p>
            <h2>Everything you need<br />to <em>track your summits.</em></h2>
          </div>
          <div className="features-grid">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="feature-card">
                <span className="feature-card__icon">
                  <Icon size={22} strokeWidth={1.5} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COLLECTIONS ── */}
      <section className="section section-light collections-preview">
        <div className="container">
          <div className="collections-preview__header">
            <div>
              <p className="section-kicker">Collections</p>
              <h2>Regions, collections<br />and <em>map-led exploration.</em></h2>
            </div>
            <Link to="/mountains" className="button-primary">
              View All <TbArrowRight size={16} />
            </Link>
          </div>
          <div className="collections-grid">
            {COLLECTIONS.map((c) => (
              <Link key={c.name} to="/mountains" className="collection-preview-card">
                <span className="collection-preview-card__icon">
                  <TbMountain size={24} strokeWidth={1.2} />
                </span>
                <div>
                  <h3>{c.name}</h3>
                  <p>{c.count} summits · {c.region}</p>
                </div>
                <TbArrowRight size={18} className="collection-preview-card__arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section section-dark cta-section">
        <div className="container cta-inner">
          <TbFlame size={40} strokeWidth={1} className="cta-icon" />
          <p className="section-kicker">Ready to start?</p>
          <h2>Your summit story<br /><em>begins here.</em></h2>
          <p>Create a free account and start logging your UK mountain adventures today.</p>
          <div className="cta-actions">
            <Link to="/account" className="button-primary">
              Create Account <TbArrowRight size={16} />
            </Link>
            <Link to="/mountains" className="button-secondary">
              Browse Mountains
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
