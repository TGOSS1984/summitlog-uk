// Dashboard chart components — extracted from DashboardPage so the upcoming
// public SharedDashboardPage can render identical charts without duplicating
// recharts configuration. MostSummitedChart and HeightVsDistanceChart moved
// here verbatim (they used to live in DashboardPage.jsx); OverviewCharts is
// new, wrapping the three charts that were previously inline in the page's
// main return statement.

import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
  Area, AreaChart, Scatter, ScatterChart, ReferenceLine,
} from "recharts";
import { TbRepeat, TbRoute } from "react-icons/tb";
import { CHART_COLORS } from "./dashboardStats";

// ── Most summited horizontal bar chart ──────────────────────────────────────
export function MostSummitedChart({ data }) {
  if (!data || data.length === 0) return null;
  const chartHeight = Math.max(200, data.length * 52);
  return (
    <article className="dashboard-chart-card dashboard-chart-card--most-summited">
      <div>
        <p className="section-kicker">
          <TbRepeat size={13} strokeWidth={2} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          Summit repeats
        </p>
        <h3>Most summited mountains</h3>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(4,57,59,0.10)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} label={{ value: "ascents", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "#8b9493" }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#243b3a", fontWeight: 700 }} axisLine={false} tickLine={false} width={120} />
          <Tooltip formatter={(value) => [`${value} ${value === 1 ? "ascent" : "ascents"}`, "Times summited"]} cursor={{ fill: "rgba(4,57,59,0.05)" }} />
          <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 12, fill: "#243b3a", fontWeight: 700 }} />
        </BarChart>
      </ResponsiveContainer>
    </article>
  );
}

// ── Height vs Distance scatter chart ────────────────────────────────────────
export function HeightVsDistanceChart({ data }) {
  if (!data || data.length === 0) return null;
  const avgDistance = data.length ? Math.round((data.reduce((s, d) => s + d.y, 0) / data.length) * 10) / 10 : 0;
  const avgHeight   = data.length ? Math.round(data.reduce((s, d) => s + d.x, 0) / data.length) : 0;
  return (
    <article className="dashboard-chart-card dashboard-chart-card--scatter">
      <div>
        <p className="section-kicker">
          <TbRoute size={13} strokeWidth={2} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          Ascent profile
        </p>
        <h3>Height vs distance</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(4,57,59,0.10)" />
          <XAxis type="number" dataKey="x" name="Height" unit="m" tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} label={{ value: "Summit height (m)", position: "insideBottom", offset: -14, fontSize: 11, fill: "#8b9493" }} />
          <YAxis type="number" dataKey="y" name="Distance" unit="km" tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} label={{ value: "Distance (km)", angle: -90, position: "insideLeft", offset: 14, fontSize: 11, fill: "#8b9493" }} />
          <Tooltip cursor={{ strokeDasharray: "3 3", stroke: "rgba(4,57,59,0.2)" }} content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0]?.payload;
            if (!d) return null;
            return (
              <div style={{ background: "#fff", border: "1px solid #e0e4e3", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                <strong style={{ display: "block", color: "#04393b", marginBottom: 2 }}>{d.name}</strong>
                <span style={{ color: "#667573" }}>{d.x}m elevation · {d.y}km</span>
              </div>
            );
          }} />
          <ReferenceLine y={avgDistance} stroke="var(--color-accent)" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: `avg ${avgDistance}km`, position: "insideTopRight", fontSize: 10, fontWeight: 700, fill: "var(--color-accent)" }} />
          <ReferenceLine x={avgHeight}   stroke="var(--color-teal)"   strokeDasharray="5 4" strokeWidth={1.5} label={{ value: `avg ${avgHeight}m`,   position: "insideTopLeft",  fontSize: 10, fontWeight: 700, fill: "var(--color-teal)" }} />
          <Scatter data={data} fill="var(--color-teal)" fillOpacity={0.75} stroke="var(--color-teal-deep)" strokeWidth={1} r={6} />
        </ScatterChart>
      </ResponsiveContainer>
      <p style={{ fontSize: "0.75rem", color: "var(--color-text-soft)", marginTop: "0.5rem" }}>
        Each dot is one completed ascent. Dashed line shows your average distance. Hover for details.
      </p>
    </article>
  );
}

// ── Overview charts — status pie, collections bar, timeline area ───────────
// Wraps the three charts that previously sat inline in DashboardPage's main
// return statement, plus the conditional bottom row (MostSummitedChart /
// HeightVsDistanceChart) — unchanged markup, just given a name and a home.
export function OverviewCharts({ stats }) {
  const showBottomRow = (stats.mostSummited?.length > 0) || (stats.scatterData?.length > 0);

  return (
    <div className="dashboard-chart-grid">
      <article className="dashboard-chart-card dashboard-chart-card--status">
        <div><p className="section-kicker">Overview</p><h3>Progress status</h3></div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={stats.statusChartData} dataKey="value" nameKey="name" innerRadius={72} outerRadius={108} paddingAngle={5} stroke="white" strokeWidth={4}>
              {stats.statusChartData.map((entry) => (
                <Cell key={entry.name} fill={entry.name === "Completed" ? CHART_COLORS.completed : entry.name === "Planned" ? CHART_COLORS.planned : CHART_COLORS.remaining} />
              ))}
            </Pie>
            <Tooltip />
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="dashboard-chart-center-value">{stats.completed}</text>
            <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" className="dashboard-chart-center-label">completed</text>
          </PieChart>
        </ResponsiveContainer>
        <div className="dashboard-chart-legend">
          <span><i className="legend-dot legend-dot--completed" />Completed</span>
          <span><i className="legend-dot legend-dot--planned" />Planned</span>
          <span><i className="legend-dot legend-dot--not-started" />Remaining</span>
        </div>
      </article>
      <article className="dashboard-chart-card dashboard-chart-card--collections">
        <div><p className="section-kicker">Collections</p><h3>Completed vs remaining</h3></div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.collectionChartData} barCategoryGap="24%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,57,59,0.12)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#243b3a", fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="completed" stackId="a" fill={CHART_COLORS.completed} radius={[8, 8, 0, 0]} />
            <Bar dataKey="remaining"  stackId="a" fill={CHART_COLORS.remaining}  radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="dashboard-chart-legend">
          <span><i className="legend-dot legend-dot--completed" />Completed</span>
          <span><i className="legend-dot legend-dot--not-started" />Remaining</span>
        </div>
      </article>
      <article className="dashboard-chart-card dashboard-chart-card--timeline">
        <div><p className="section-kicker">Timeline</p><h3>Mountains completed over time</h3></div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={stats.completionTimelineData}>
            <defs>
              <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--color-teal)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-teal)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,57,59,0.12)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#243b3a", fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="completed" stroke={CHART_COLORS.completed} strokeWidth={3} fill="url(#timelineGrad)" dot={{ r: 5, fill: "var(--color-teal)", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 7 }} />
          </AreaChart>
        </ResponsiveContainer>
      </article>
      {showBottomRow && (
        <div className="dashboard-chart-row">
          {stats.mostSummited?.length > 0 && <MostSummitedChart data={stats.mostSummited} />}
          {stats.scatterData?.length > 0    && <HeightVsDistanceChart data={stats.scatterData} />}
        </div>
      )}
    </div>
  );
}