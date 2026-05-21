import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getCollections, getMountains, getProgressLogs } from "../lib/api";

const DASHBOARD_COLLECTIONS = [
  { name: "Wainwrights", slug: "wainwrights", expectedTotal: 214 },
  { name: "Munros", slug: "munros", expectedTotal: 282 },
  { name: "Nuttalls", slug: "nuttalls", expectedTotal: 443 },
];

const CHART_COLORS = {
  completed: "var(--color-teal)",
  planned: "var(--color-accent)",
  remaining: "#d9dedc",
  text: "var(--color-teal-deep)",
};

function mountainBelongsToCollection(mountain, collectionSlug) {
  return (
    mountain.collection_memberships?.some(
      (membership) => membership.collection?.slug === collectionSlug
    ) || mountain.collection?.slug === collectionSlug
  );
}

function getMountainCollectionNames(mountain) {
  if (mountain.collection_memberships?.length) {
    return mountain.collection_memberships
      .map((membership) => membership.collection?.name)
      .filter(Boolean)
      .join(" / ");
  }

  return mountain.collection?.name || "Unlisted";
}

function getLogCollectionNames(log) {
  if (log.mountain_detail) {
    return getMountainCollectionNames(log.mountain_detail);
  }

  return "Unlisted";
}

function formatDate(dateValue) {
  if (!dateValue) return "No date";
  return new Date(dateValue).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DashboardPage() {
  const [mountains, setMountains] = useState([]);
  const [collections, setCollections] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [mountainData, collectionData, logData] = await Promise.all([
          getMountains(),
          getCollections(),
          getProgressLogs(),
        ]);

        setMountains(
          Array.isArray(mountainData) ? mountainData : mountainData.results || []
        );
        setCollections(Array.isArray(collectionData) ? collectionData : []);
        setLogs(Array.isArray(logData) ? logData : logData.results || []);
        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }

    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const completedLogs = logs.filter((log) => log.status === "completed");
    const plannedLogs = logs.filter((log) => log.status === "planned");

    const completedMountainIds = new Set(
      completedLogs.map((log) => log.mountain)
    );

    const loggedMountainIds = new Set(logs.map((log) => log.mountain));

    const totalDistance = completedLogs.reduce(
      (total, log) => total + Number(log.hike_distance_km || 0),
      0
    );

    const totalHeight = mountains
      .filter((mountain) => completedMountainIds.has(mountain.id))
      .reduce((total, mountain) => total + Number(mountain.height_m || 0), 0);

    const totalSteps = completedLogs.reduce(
      (total, log) => total + Number(log.steps || 0),
      0
    );

    const totalFlightsClimbed = completedLogs.reduce(
      (total, log) => total + Number(log.flights_climbed || 0),
      0
    );

    const collectionStats = DASHBOARD_COLLECTIONS.map((dashboardCollection) => {
      const apiCollection = collections.find(
        (collection) => collection.slug === dashboardCollection.slug
      );

      const collectionMountains = mountains.filter((mountain) =>
        mountainBelongsToCollection(mountain, dashboardCollection.slug)
      );

      const completedCount = collectionMountains.filter((mountain) =>
        completedMountainIds.has(mountain.id)
      ).length;

      const totalCount =
        apiCollection?.expected_total ||
        dashboardCollection.expectedTotal ||
        collectionMountains.length ||
        0;

      return {
        id: apiCollection?.id || dashboardCollection.slug,
        name: dashboardCollection.name,
        slug: dashboardCollection.slug,
        completed: completedCount,
        total: totalCount,
        percent: totalCount
          ? Math.round((completedCount / totalCount) * 100)
          : 0,
      };
    });

    const statusChartData = [
      { name: "Completed", value: completedLogs.length },
      { name: "Planned", value: plannedLogs.length },
      {
        name: "Remaining",
        value: Math.max(mountains.length - loggedMountainIds.size, 0),
      },
    ];

    const collectionChartData = collectionStats.map((collection) => ({
      name: collection.name,
      completed: collection.completed,
      remaining: Math.max(collection.total - collection.completed, 0),
    }));

    const recentLogs = [...logs]
      .sort(
        (a, b) =>
          new Date(b.completed_date || b.updated_at || b.created_at) -
          new Date(a.completed_date || a.updated_at || a.created_at)
      )
      .slice(0, 4);

    const nextObjective = plannedLogs[0] || null;

    const photoLogs = logs
      .filter((log) => log.uploaded_image)
      .slice(0, 4);

    const elevationPercent = Math.min(Math.round((totalHeight / 10000) * 100), 100);

    const achievements = [
      {
        title: "First Summit",
        description: "Complete your first mountain log.",
        target: 1,
        current: completedLogs.length,
      },
      {
        title: "Wainwright Starter",
        description: "Complete 5 Wainwrights.",
        target: 5,
        current:
          collectionStats.find(
            (item) => item.slug === "wainwrights"
          )?.completed || 0,
      },
      {
        title: "Mountain Regular",
        description: "Complete 10 mountains.",
        target: 10,
        current: completedLogs.length,
      },
      {
        title: "Distance Walker",
        description: "Log 50km of routes.",
        target: 50,
        current: totalDistance,
      },
      {
        title: "Step Collector",
        description: "Log 100,000 steps across completed routes.",
        target: 100000,
        current: totalSteps,
      },
      {
        title: "Stairway Summit",
        description: "Log 500 flights climbed.",
        target: 500,
        current: totalFlightsClimbed,
      },
      {
        title: "High Climber",
        description: "Reach 5000m total elevation.",
        target: 5000,
        current: totalHeight,
      },
    ];

    const achievedBadges = achievements.filter(
      (achievement) =>
        achievement.current >= achievement.target
    );

    const achievementPercent =
      achievements.length > 0
        ? Math.round(
            (achievedBadges.length /
              achievements.length) *
              100
          )
        : 0;

    const regionStats = [
      "Lake District",
      "Scotland",
      "Wales",
      "England",
    ].map((regionName) => {
      const regionMountains = mountains.filter(
        (mountain) => mountain.region?.name === regionName
      );

      const completed = regionMountains.filter((mountain) =>
        completedMountainIds.has(mountain.id)
      ).length;

      const planned = regionMountains.filter((mountain) =>
        plannedLogs.some((log) => log.mountain === mountain.id)
      ).length;

      const total = regionMountains.length;

      return {
        name: regionName,
        completed,
        planned,
        total,
        percent: total ? Math.round((completed / total) * 100) : 0,
      };
    });

    return {
      completed: completedLogs.length,
      planned: plannedLogs.length,
      totalVisible: mountains.length,
      totalDistance,
      totalHeight,
      totalSteps,
      totalFlightsClimbed,
      collectionStats,
      statusChartData,
      collectionChartData,
      recentLogs,
      nextObjective,
      photoLogs,
      elevationPercent,
      achievements,
      achievedBadges,
      achievementPercent,
      regionStats,
    };
  }, [collections, logs, mountains]);

  return (
    <main className="dashboard-page">
      <section className="section section-dark dashboard-hero">
        <div className="container">
          <p className="section-kicker">
              <span className="kicker-line" />
              Dashboard
            </p>
          <h1 className="page-hero__h1">
                <span className="page-hero__h1-top">Your mountain record,</span>
                <span className="page-hero__h1-bottom">Progress.</span>
              </h1>
          <p>
            Track completed summits, planned objectives, distance logged and
            collection progress across the UK.
          </p>
        </div>
      </section>

      <section className="section section-light">
        <div className="container">
          {status === "loading" && <p>Loading dashboard...</p>}

          {status === "error" && (
            <p>Please log in to view your dashboard progress.</p>
          )}

          {status === "success" && (
            <>
              <div className="dashboard-stat-grid">
                <article className="dashboard-stat-card">
                  <p>Completed</p>
                  <strong>{stats.completed}</strong>
                  <span>summits logged</span>
                </article>

                <article className="dashboard-stat-card">
                  <p>Planned</p>
                  <strong>{stats.planned}</strong>
                  <span>future objectives</span>
                </article>

                <article className="dashboard-stat-card">
                  <p>Distance</p>
                  <strong>{stats.totalDistance.toFixed(1)}km</strong>
                  <span>personally logged</span>
                </article>

                <article className="dashboard-stat-card">
                  <p>Height total</p>
                  <strong>{Math.round(stats.totalHeight)}m</strong>
                  <span>summit height completed</span>
                </article>
                <article className="dashboard-stat-card">
                  <p>Steps</p>
                  <strong>{stats.totalSteps.toLocaleString()}</strong>
                  <span>steps logged</span>
                </article>

                <article className="dashboard-stat-card">
                  <p>Flights climbed</p>
                  <strong>{stats.totalFlightsClimbed.toLocaleString()}</strong>
                  <span>flights recorded</span>
                </article>
              </div>

              <div className="dashboard-journey-grid">
                <article className="dashboard-journey-card dashboard-next-card">
                  <p className="section-kicker">Next objective</p>

                  {stats.nextObjective ? (
                    <>
                      <h3>{stats.nextObjective.mountain_detail?.name}</h3>
                      <p>
                        {getLogCollectionNames(stats.nextObjective)} /{" "}
                        {stats.nextObjective.mountain_detail?.region?.name}
                      </p>
                      <div className="dashboard-journey-meta">
                        <span>
                          {stats.nextObjective.mountain_detail?.height_m}m
                        </span>
                        <span>
                          {stats.nextObjective.route_taken || "Route not set"}
                        </span>
                      </div>
                      <Link to={`/mountains/${stats.nextObjective.mountain_detail?.slug}`}>
                        Open mountain
                      </Link>
                    </>
                  ) : (
                    <>
                      <h3>No objective planned yet</h3>
                      <p>Open a mountain and mark it as planned.</p>
                      <Link to="/mountains">Explore mountains</Link>
                    </>
                  )}
                </article>

                <article className="dashboard-journey-card dashboard-elevation-card">
                  <p className="section-kicker">Elevation climbed</p>
                  <h3>{Math.round(stats.totalHeight)}m</h3>

                  <div className="elevation-mountain">
                    <div
                      className="elevation-mountain__fill"
                      style={{ height: `${stats.elevationPercent}%` }}
                    />
                  </div>

                  <p>{stats.elevationPercent}% of a 10,000m milestone</p>
                </article>
              </div>

              <div className="dashboard-chart-grid">
                <article className="dashboard-chart-card dashboard-chart-card--status">
                  <div>
                    <p className="section-kicker">Overview</p>
                    <h3>Progress status</h3>
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.statusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={72}
                        outerRadius={108}
                        paddingAngle={5}
                        stroke="white"
                        strokeWidth={4}
                      >
                        {stats.statusChartData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={
                              entry.name === "Completed"
                                ? CHART_COLORS.completed
                                : entry.name === "Planned"
                                  ? CHART_COLORS.planned
                                  : CHART_COLORS.remaining
                            }
                          />
                        ))}
                      </Pie>

                      <Tooltip />

                      <text
                        x="50%"
                        y="47%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="dashboard-chart-center-value"
                      >
                        {stats.completed}
                      </text>

                      <text
                        x="50%"
                        y="57%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="dashboard-chart-center-label"
                      >
                        completed
                      </text>
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="dashboard-chart-legend">
                    <span><i className="legend-dot legend-dot--completed" />Completed</span>
                    <span><i className="legend-dot legend-dot--planned" />Planned</span>
                    <span><i className="legend-dot legend-dot--not-started" />Remaining</span>
                  </div>
                </article>

                <article className="dashboard-chart-card dashboard-chart-card--collections">
                  <div>
                    <p className="section-kicker">Collections</p>
                    <h3>Completed vs remaining</h3>
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.collectionChartData} barCategoryGap="24%">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(4, 57, 59, 0.12)"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#243b3a", fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#667573" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="completed"
                        stackId="a"
                        fill={CHART_COLORS.completed}
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="remaining"
                        stackId="a"
                        fill={CHART_COLORS.remaining}
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="dashboard-chart-legend">
                    <span><i className="legend-dot legend-dot--completed" />Completed</span>
                    <span><i className="legend-dot legend-dot--not-started" />Remaining</span>
                  </div>
                </article>
              </div>

              <div className="dashboard-story-grid">
                <article className="dashboard-story-card">
                  <p className="section-kicker">Recent activity</p>
                  <h3>Latest mountain logs</h3>

                  <div className="dashboard-timeline">
                    {stats.recentLogs.length === 0 && (
                      <p>No recent activity yet.</p>
                    )}

                    {stats.recentLogs.map((log) => (
                      <Link
                        to={`/mountains/${log.mountain_detail?.slug}`}
                        className="dashboard-timeline-item"
                        key={log.id}
                      >
                        <span>{log.status === "completed" ? "✓" : "○"}</span>
                        <div>
                          <strong>{log.mountain_detail?.name}</strong>
                          <small>
                            {log.status} / {formatDate(log.completed_date)}
                          </small>
                        </div>
                      </Link>
                    ))}
                  </div>
                </article>

                <article className="dashboard-story-card">
                  <p className="section-kicker">Summit memories</p>
                  <h3>Recent photos</h3>

                  <div className="dashboard-photo-strip">
                    {stats.photoLogs.length === 0 && (
                      <p>No uploaded summit photos yet.</p>
                    )}

                    {stats.photoLogs.map((log) => (
                      <Link
                        to={`/mountains/${log.mountain_detail?.slug}`}
                        key={log.id}
                      >
                        <img
                          src={log.uploaded_image}
                          alt={log.mountain_detail?.name}
                        />
                      </Link>
                    ))}
                  </div>
                </article>
              </div>
              <div className="dashboard-achievement-panel">

                <div className="dashboard-achievement-summary">

                  <div>
                    <p className="section-kicker">
                      Achievements
                    </p>

                    <h2>
                      Summit achievements
                    </h2>
                  </div>

                  <div className="dashboard-achievement-score">

                    <strong>
                      {stats.achievedBadges.length}
                      {" / "}
                      {stats.achievements.length}
                    </strong>

                    <span>
                      achieved
                    </span>

                  </div>

                  <div className="progress-track">
                    <span
                      style={{
                        width:
                          `${stats.achievementPercent}%`,
                      }}
                    />
                  </div>

                  <p>
                    {
                      stats.achievements.length -
                      stats.achievedBadges.length
                    }
                    {" "}
                    achievements remaining
                  </p>

                </div>

                <div className="dashboard-achievement-list">

                  {stats.achievements.map(
                    (achievement) => {

                      const achieved =
                        achievement.current >=
                        achievement.target;

                      const percent =
                        Math.min(
                          Math.round(
                            (
                              achievement.current /
                              achievement.target
                            ) * 100
                          ),
                          100
                        );

                      return (

                        <article
                          key={achievement.title}
                          className={
                            achieved
                              ? "dashboard-achievement-item achieved"
                              : "dashboard-achievement-item"
                          }
                        >

                          <div>

                            <h3>
                              {achievement.title}
                            </h3>

                            <p>
                              {achievement.description}
                            </p>

                            <div className="progress-track">

                              <span
                                style={{
                                  width:
                                    `${percent}%`,
                                }}
                              />

                            </div>

                            <small>
                              {Math.round(
                                achievement.current
                              )}
                              {" / "}
                              {achievement.target}
                            </small>

                          </div>

                          <strong>
                            {achieved
                              ? "✓"
                              : "○"}
                          </strong>

                        </article>

                      );
                    }
                  )}

                </div>

              </div>

              <div className="dashboard-region-panel">
                <div>
                  <p className="section-kicker">UK progress</p>
                  <h2>Region completion</h2>
                  <p>
                    See how your completed and planned summits are building across each
                    mountain area.
                  </p>
                </div>

                <div className="dashboard-region-grid">
                  {stats.regionStats.map((region) => (
                    <article className="dashboard-region-card" key={region.name}>
                      <div>
                        <p className="section-kicker">{region.name}</p>
                        <h3>
                          {region.completed} / {region.total}
                        </h3>
                        <span>
                          {region.planned} planned
                        </span>
                      </div>

                      <strong>{region.percent}%</strong>

                      <div className="progress-track">
                        <span style={{ width: `${region.percent}%` }} />
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="collection-progress-panel">
                <div>
                  <p className="section-kicker">Collection progress</p>
                  <h2>Progress by mountain list</h2>
                </div>

                <div className="collection-progress-list collection-progress-list--premium">
                  {stats.collectionStats.map((collection) => {
                    const remaining = Math.max(collection.total - collection.completed, 0);

                    return (
                      <Link
                        to={`/collections/${collection.slug}`}
                        className="collection-progress-card collection-progress-card--premium"
                        key={collection.id}
                      >
                        <div className="collection-progress-card__icon">
                          ▲
                        </div>

                        <div className="collection-progress-card__main">
                          <p className="section-kicker">{collection.name}</p>

                          <h3>
                            {collection.completed} / {collection.total}
                          </h3>

                          <p>
                            {remaining} remaining to complete this collection.
                          </p>

                          <div className="progress-track">
                            <span style={{ width: `${collection.percent}%` }} />
                          </div>
                        </div>

                        <strong className="collection-progress-card__percent">
                          {collection.percent}%
                        </strong>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="my-progress-panel">
                <div>
                  <p className="section-kicker">My progress</p>
                  <h2>Saved mountain logs</h2>
                  <p>
                    Review completed and planned mountains, then open each summit
                    to update your route notes, date, distance or status.
                  </p>
                </div>

                <div className="my-progress-list">
                  {logs.length === 0 && (
                    <p>
                      No mountain logs yet. Open a mountain and save your first
                      record.
                    </p>
                  )}

                  {logs.map((log) => (
                    <Link
                      to={`/mountains/${log.mountain_detail?.slug}`}
                      className="my-progress-card"
                      key={log.id}
                    >
                      <div>
                        <p className="my-progress-card__status">{log.status}</p>
                        <h3>{log.mountain_detail?.name}</h3>
                        <p>
                          {getLogCollectionNames(log)} /{" "}
                          {log.mountain_detail?.region?.name}
                        </p>
                      </div>

                      <div className="my-progress-card__meta">
                        <span>{log.completed_date || "No date"}</span>
                        <span>{log.hike_distance_km || "—"}km</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;