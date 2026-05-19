import { Link } from "react-router-dom";

function HomePage() {
  return (
    <main>
      <section className="hero-home">
        <div className="hero-home__overlay" />

        <div className="container hero-home__grid">

          <div className="hero-home__content">
            <p className="section-kicker">
              Summit tracking reimagined
            </p>

            <h1>
              Explore mountains.
              <br />
              Track progress.
              <br />
              Build your summit story.
            </h1>

            <p>
              Discover Wainwrights, Munros and UK mountain collections
              through a premium map-led experience.
            </p>

            <div className="hero-home__actions">
              <Link
                to="/mountains"
                className="button-primary"
              >
                Explore Mountains
              </Link>

              <Link
                to="/map"
                className="button-secondary"
              >
                Open Map
              </Link>
            </div>
          </div>

          <aside className="hero-dashboard glass-card">

            <p className="section-kicker">
              Progress snapshot
            </p>

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

        <div className="hero-cutout" />
      </section>

      <section className="section section-light">

        <div className="container">

          <p className="section-kicker">
            Coming next
          </p>

          <h2>
            Regions, collections and map-led exploration
          </h2>

        </div>

      </section>
    </main>
  );
}

export default HomePage;