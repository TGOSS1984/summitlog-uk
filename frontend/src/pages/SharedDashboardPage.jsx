import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TbMountain, TbUser } from "react-icons/tb";
import {
  computeRealDashboardStats,
  getLogCollectionNames,
} from "../components/dashboard/dashboardStats";
import { OverviewCharts } from "../components/dashboard/DashboardCharts";
import { RecentActivityAndPhotos } from "../components/dashboard/DashboardStoryPanels";
import { AchievementPanel, RegionProgressPanel, CollectionProgressPanel } from "../components/dashboard/DashboardPanels";
import {
  StatCard,
  PersonalBests,
  ComingUpPanel,
  ActivityHeatmap,
  PersonalStatsDepthPanel,
  ElevationRidge,
} from "./DashboardPage";

function SharedDashboardPage() {
  const { token } = useParams();

  const [username,   setUsername]   = useState(null);
  const [mountains,  setMountains]  = useState([]);
  const [collections, setCollections] = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [routeLogs,   setRouteLogs]   = useState([]);
  const [status,      setStatus]      = useState("loading"); // loading | success | not_found | error

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/progress/share/dashboard/${token}/`);
        if (res.status === 404) { setStatus("not_found"); return; }
        if (!res.ok) throw new Error("request failed");
        const data = await res.json();
        setUsername(data.username);
        setMountains(Array.isArray(data.mountains) ? data.mountains : []);
        setCollections(Array.isArray(data.collections) ? data.collections : []);
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setRouteLogs(Array.isArray(data.route_logs) ? data.route_logs : []);
        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    load();
  }, [token]);

  const stats = useMemo(
    () => computeRealDashboardStats({ mountains, collections, logs, routeLogs }),
    [mountains, collections, logs, routeLogs]
  );

  if (status === "loading") {
    return (
      <main className="dashboard-page">
        <div className="skeleton-hero" />
        <section className="section section-light">
          <div className="container">
            <div className="dashboard-stat-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="dashboard-stat-card">
                  <div className="skeleton-line" style={{ width: 40, height: 40, borderRadius: 10, marginBottom: 12 }} />
                  <div className="skeleton-line skeleton-line--short" />
                  <div className="skeleton-line skeleton-line--title" />
                  <div className="skeleton-line skeleton-line--short" style={{ width: "40%" }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (status === "not_found" || status === "error") {
    return (
      <main>
        <section className="section section-dark" style={{ minHeight: "60vh", display: "flex", alignItems: "center" }}>
          <div className="container" style={{ textAlign: "center" }}>
            <TbMountain size={52} strokeWidth={1} style={{ color: "rgba(208,170,98,0.4)", margin: "0 auto 1rem" }} />
            <p className="section-kicker" style={{ justifyContent: "center" }}>
              {status === "not_found" ? "Not available" : "Error"}
            </p>
            <h1>{status === "not_found" ? "This shared link isn't available" : "Unable to load this dashboard"}</h1>
            <p style={{ color: "rgba(248,250,252,0.6)", marginTop: "1rem" }}>
              {status === "not_found"
                ? "The owner may have turned off sharing, or the link has changed."
                : "Check the server is running and try again."}
            </p>
            <Link to="/" className="button-primary" style={{ marginTop: "2rem", display: "inline-flex" }}>
              Back to SummitLog
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <section className="section section-dark dashboard-hero">
        <div className="container">
          <p className="section-kicker"><span className="kicker-line" />Dashboard</p>
          <h1 className="page-hero__h1">
            <span className="page-hero__h1-top">{username ? `${username}'s` : "Shared"} mountain record,</span>
            <span className="page-hero__h1-bottom">Progress.</span>
          </h1>
          <p>A shared, read-only view of completed summits, planned objectives, distance logged and collection progress.</p>
        </div>
      </section>

      <div className="dashboard-greeting">
        <div className="container">
          <div className="dashboard-greeting__inner">
            <div className="dashboard-greeting__text">
              <p className="section-kicker"><span className="kicker-line" />Shared view</p>
              <h2 className="dashboard-greeting__name">
                <span className="dashboard-greeting__possessive">{username ? `${username}'s` : "Shared"}</span>
                <span className="dashboard-greeting__label"> mountain stats</span>
              </h2>
            </div>
            <div className="dashboard-greeting__meta">
              <TbMountain size={48} strokeWidth={0.8} className="dashboard-greeting__icon" />
            </div>
          </div>
        </div>
      </div>

      <section className="section section-light">
        <div className="container">
          <div className="dashboard-demo-banner">
            <TbUser size={16} strokeWidth={2} />
            <span>
              You're viewing {username ? `${username}'s` : "a"} shared dashboard, read-only.{" "}
              <Link to="/account">Create an account</Link> to track your own.
            </span>
          </div>

          <div className="dashboard-stat-grid">
            <StatCard label="Completed"       rawValue={stats.completed}                        sub="summits logged"           loaded />
            <StatCard label="Planned"         rawValue={stats.planned}                          sub="future objectives"        loaded />
            {stats.routeCount > 0 && (
              <StatCard label="Routes logged" rawValue={stats.routeCount}                       sub="multi-mountain days"      loaded />
            )}
            <StatCard label="Distance"        rawValue={`${stats.totalDistance.toFixed(1)}km`}  sub="personally logged"        loaded />
            <StatCard label="Height total"    rawValue={`${Math.round(stats.totalHeight)}m`}    sub="summit height completed"  loaded />
            <StatCard label="Steps"           rawValue={stats.totalSteps}                       sub="steps logged"             loaded />
            <StatCard label="Flights climbed" rawValue={stats.totalFlightsClimbed}              sub="flights recorded"         loaded />
            <StatCard
              label="Total progress"
              rawValue={`${stats.completed} / ${stats.totalVisible}`}
              sub="completed of all UK mountains"
              loaded
            />
            <StatCard
              label="% Completed"
              rawValue={`${stats.totalVisible ? Math.round((stats.completed / stats.totalVisible) * 100) : 0}%`}
              sub="of all UK mountains tracked"
              loaded
            />
          </div>

          <PersonalBests personalBests={stats.personalBests} />

          <div className="dashboard-journey-grid">
            <article className="dashboard-journey-card dashboard-next-card">
              <p className="section-kicker">Next objective</p>
              {stats.nextObjective ? (
                <>
                  <h3>{stats.nextObjective.mountain_detail?.name}</h3>
                  <p>{getLogCollectionNames(stats.nextObjective)} / {stats.nextObjective.mountain_detail?.region?.name}</p>
                  <div className="dashboard-journey-meta">
                    <span>{stats.nextObjective.mountain_detail?.height_m}m</span>
                    <span>{stats.nextObjective.route_taken || "Route not set"}</span>
                  </div>
                  <Link to={`/mountains/${stats.nextObjective.mountain_detail?.slug}`}>Open mountain</Link>
                </>
              ) : (
                <>
                  <h3>No objective planned yet</h3>
                  <p>Nothing currently planned.</p>
                </>
              )}
            </article>
            <article className="dashboard-journey-card dashboard-elevation-card">
              <p className="section-kicker">Elevation climbed</p>
              <h3>{Math.round(stats.totalHeight).toLocaleString()}m</h3>
              <ElevationRidge percent={stats.elevationPercent} />
              <p>{stats.elevationPercent}% of a 50,000m milestone</p>
            </article>
          </div>

          {stats.upcomingPlanned?.length > 0 && (
            <ComingUpPanel upcomingPlanned={stats.upcomingPlanned} isDemo={false} />
          )}

          <OverviewCharts stats={stats} />

          <RecentActivityAndPhotos
            recentLogs={stats.recentLogs}
            recentRoutes={stats.recentRoutes}
            photoLogs={stats.photoLogs}
            noPhotosMessage="No uploaded summit photos yet."
          />

          {stats.heatmapLogs && <ActivityHeatmap logs={stats.heatmapLogs} />}

          <PersonalStatsDepthPanel deepStats={stats.deepStats} isDemo={false} />

          <AchievementPanel
            achievements={stats.achievements}
            earnedBadgeCount={stats.earnedBadgeCount}
            achievementPercent={stats.achievementPercent}
          />

          <RegionProgressPanel regionStats={stats.regionStats} />

          <CollectionProgressPanel collectionStats={stats.collectionStats} />
        </div>
      </section>
    </main>
  );
}

export default SharedDashboardPage;