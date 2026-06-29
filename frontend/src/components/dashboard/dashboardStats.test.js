import { describe, it, expect } from 'vitest'
import {
  computeRealDashboardStats,
  buildTieredAchievements,
  computeDeepStats,
  computePersonalBests,
  mountainBelongsToCollection,
  getMountainCollectionNames,
  getLogCollectionNames,
  TOTAL_POSSIBLE_BADGES,
} from './dashboardStats'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOUNTAINS = [
  {
    id: 1, name: 'Scafell Pike', height_m: 978,
    region: { name: 'Lake District' },
    collection_memberships: [{ collection: { slug: 'wainwrights' } }],
  },
  {
    id: 2, name: 'Ben Nevis', height_m: 1345,
    region: { name: 'Scotland' },
    collection_memberships: [{ collection: { slug: 'munros' } }],
  },
  {
    id: 3, name: 'Helvellyn', height_m: 950,
    region: { name: 'Lake District' },
    collection_memberships: [{ collection: { slug: 'wainwrights' } }],
  },
]

const COLLECTIONS = [
  { id: 1, slug: 'wainwrights', expected_total: 214 },
  { id: 2, slug: 'munros', expected_total: 282 },
]

const LOGS = [
  {
    id: 10, mountain: 1, status: 'completed', completed_date: '2024-08-14',
    hike_distance_km: 12.4, hike_duration_hours: 6.5, steps: 24000,
    flights_climbed: 50,
    mountain_detail: { name: 'Scafell Pike', slug: 'scafell-pike', height_m: 978, region: { name: 'Lake District' } },
  },
  {
    id: 11, mountain: 2, status: 'completed', completed_date: '2024-09-02',
    hike_distance_km: 17.0, hike_duration_hours: 9, steps: 30000,
    flights_climbed: 80,
    mountain_detail: { name: 'Ben Nevis', slug: 'ben-nevis', height_m: 1345, region: { name: 'Scotland' } },
  },
  {
    id: 12, mountain: 3, status: 'planned', completed_date: '2025-01-10',
    mountain_detail: { name: 'Helvellyn', slug: 'helvellyn', height_m: 950, region: { name: 'Lake District' } },
  },
]

const ROUTE_LOGS = []

// ---------------------------------------------------------------------------
// computeRealDashboardStats
// ---------------------------------------------------------------------------

describe('computeRealDashboardStats', () => {
  const stats = computeRealDashboardStats({
    mountains: MOUNTAINS, collections: COLLECTIONS, logs: LOGS, routeLogs: ROUTE_LOGS,
  })

  it('counts completed and planned correctly', () => {
    expect(stats.completed).toBe(2)
    expect(stats.planned).toBe(1)
    expect(stats.totalVisible).toBe(3)
  })

  it('sums distance, height, steps and flights across completed logs only', () => {
    expect(stats.totalDistance).toBeCloseTo(29.4) // 12.4 + 17.0
    expect(stats.totalHeight).toBe(978 + 1345)    // only completed mountains' heights
    expect(stats.totalSteps).toBe(54000)
    expect(stats.totalFlightsClimbed).toBe(130)
  })

  it('computes per-collection completion using the curated expected_total', () => {
    const wainwrights = stats.collectionStats.find((c) => c.slug === 'wainwrights')
    expect(wainwrights.completed).toBe(1) // Scafell Pike only — Helvellyn is planned, not completed
    expect(wainwrights.total).toBe(214)

    const munros = stats.collectionStats.find((c) => c.slug === 'munros')
    expect(munros.completed).toBe(1)
    expect(munros.total).toBe(282)
  })

  it('groups region stats with correct completed/planned/total counts', () => {
    const lakeDistrict = stats.regionStats.find((r) => r.name === 'Lake District')
    expect(lakeDistrict.total).toBe(2)      // Scafell Pike + Helvellyn
    expect(lakeDistrict.completed).toBe(1)  // Scafell Pike
    expect(lakeDistrict.planned).toBe(1)    // Helvellyn
  })

  it('sets nextObjective to the first planned log', () => {
    expect(stats.nextObjective?.id).toBe(12)
  })

  it('produces an achievement list capped at TOTAL_POSSIBLE_BADGES', () => {
    expect(stats.earnedBadgeCount).toBeLessThanOrEqual(TOTAL_POSSIBLE_BADGES)
    expect(stats.achievementPercent).toBeGreaterThanOrEqual(0)
    expect(stats.achievementPercent).toBeLessThanOrEqual(100)
  })
})

// ---------------------------------------------------------------------------
// buildTieredAchievements — tier boundary correctness
// ---------------------------------------------------------------------------

describe('buildTieredAchievements', () => {
  it('sits at Bronze just below the Silver threshold', () => {
    const [summitBagger] = buildTieredAchievements({
      completedCount: 9, wainwrightsCompleted: 0, munrosCompleted: 0,
      totalDistance: 0, totalSteps: 0, totalHeight: 0, routeCount: 0,
    })
    expect(summitBagger.activeTier.label).toBe('Bronze')
  })

  it('advances to Silver exactly at the threshold value', () => {
    const [summitBagger] = buildTieredAchievements({
      completedCount: 10, wainwrightsCompleted: 0, munrosCompleted: 0,
      totalDistance: 0, totalSteps: 0, totalHeight: 0, routeCount: 0,
    })
    expect(summitBagger.activeTier.label).toBe('Silver')
  })

  it('marks allComplete once the Gold target is reached', () => {
    const [summitBagger] = buildTieredAchievements({
      completedCount: 50, wainwrightsCompleted: 0, munrosCompleted: 0,
      totalDistance: 0, totalSteps: 0, totalHeight: 0, routeCount: 0,
    })
    expect(summitBagger.allComplete).toBe(true)
    expect(summitBagger.nextTier).toBeNull()
  })

  it('reports no active tier and a real next-tier target before the first threshold', () => {
    const [summitBagger] = buildTieredAchievements({
      completedCount: 0, wainwrightsCompleted: 0, munrosCompleted: 0,
      totalDistance: 0, totalSteps: 0, totalHeight: 0, routeCount: 0,
    })
    expect(summitBagger.activeTierIndex).toBe(-1)
    expect(summitBagger.nextTier.target).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// computeDeepStats — streaks, best month/year
// ---------------------------------------------------------------------------

describe('computeDeepStats', () => {
  it('returns null with no completed logs', () => {
    expect(computeDeepStats([])).toBeNull()
  })

  it('identifies the best month and best year correctly', () => {
    const logs = [
      { completed_date: '2024-08-01' },
      { completed_date: '2024-08-15' },
      { completed_date: '2024-08-20' },
      { completed_date: '2024-03-01' },
    ]
    const deep = computeDeepStats(logs)
    expect(deep.bestMonth.count).toBe(3)
    expect(deep.bestYear.year).toBe('2024')
    expect(deep.bestYear.count).toBe(4)
  })

  it('counts a single ascent as a 1-week streak, not 0', () => {
    const deep = computeDeepStats([{ completed_date: '2024-08-01' }])
    expect(deep.longestStreak).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// computePersonalBests
// ---------------------------------------------------------------------------

describe('computePersonalBests', () => {
  it('returns null when there are no completed logs', () => {
    expect(computePersonalBests([{ status: 'planned' }], [])).toBeNull()
  })

  it('picks the longest hike and highest peak from completed logs', () => {
    const bests = computePersonalBests(LOGS, MOUNTAINS)
    expect(bests.longestHike.value).toBe('17.0km')   // Ben Nevis leg
    expect(bests.highestPeak.value).toBe('1345m')    // Ben Nevis
  })
})

// ---------------------------------------------------------------------------
// Collection name helpers
// ---------------------------------------------------------------------------

describe('mountainBelongsToCollection / getMountainCollectionNames', () => {
  it('matches a mountain to its collection by slug', () => {
    expect(mountainBelongsToCollection(MOUNTAINS[0], 'wainwrights')).toBe(true)
    expect(mountainBelongsToCollection(MOUNTAINS[0], 'munros')).toBe(false)
  })

  it('falls back to "Unlisted" when a mountain has no collection membership', () => {
    expect(getMountainCollectionNames({})).toBe('Unlisted')
  })

  it('getLogCollectionNames delegates to the mountain_detail collection name', () => {
    const log = { mountain_detail: { collection_memberships: [{ collection: { name: 'Munros' } }] } }
    expect(getLogCollectionNames(log)).toBe('Munros')
    expect(getLogCollectionNames({})).toBe('Unlisted')
  })
})