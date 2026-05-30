/**
 * Tests for CollectionDetailPage
 *
 * Covers:
 * - Loading skeleton shown while data fetches
 * - Collection name and description rendered
 * - Mountain list renders
 * - Status filter buttons present
 * - Filtering by completed / planned / not_started works
 * - Empty state shown when filter returns no results
 * - Clear filter button resets to all
 * - Error state shown when API fails
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CollectionDetailPage from '../pages/CollectionDetailPage'
import * as api from '../lib/api'

vi.mock('../lib/api', () => ({
  getCollections: vi.fn(),
  getMountains: vi.fn(),
  getProgressLogs: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COLLECTION = {
  id: 1,
  name: 'Wainwrights',
  slug: 'wainwrights',
  description: '214 fells of the Lake District.',
  expected_total: 214,
}

const MOUNTAINS = [
  {
    id: 1,
    name: 'Scafell Pike',
    slug: 'scafell-pike',
    height_m: 978,
    collection_memberships: [{ collection: { id: 1, slug: 'wainwrights' }, rank_in_collection: 1 }],
  },
  {
    id: 2,
    name: 'Helvellyn',
    slug: 'helvellyn',
    height_m: 950,
    collection_memberships: [{ collection: { id: 1, slug: 'wainwrights' }, rank_in_collection: 2 }],
  },
  {
    id: 3,
    name: 'Skiddaw',
    slug: 'skiddaw',
    height_m: 931,
    collection_memberships: [{ collection: { id: 1, slug: 'wainwrights' }, rank_in_collection: 3 }],
  },
]

const LOGS = [
  { id: 10, mountain: 1, status: 'completed' },
  { id: 11, mountain: 2, status: 'planned' },
  // mountain 3 has no log → not_started
]

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderPage(slug = 'wainwrights') {
  return render(
    <MemoryRouter initialEntries={[`/collections/${slug}`]}>
      <Routes>
        <Route path="/collections/:slug" element={<CollectionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CollectionDetailPage — loading', () => {
  it('shows skeleton while data is loading', () => {
    api.getCollections.mockImplementation(() => new Promise(() => {}))
    api.getMountains.mockImplementation(() => new Promise(() => {}))
    api.getProgressLogs.mockResolvedValue([])

    renderPage()
    // Skeleton renders immediately before data arrives
    const skeletons = document.querySelectorAll('.skeleton-card, .skeleton-hero')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})

describe('CollectionDetailPage — success state', () => {
  beforeEach(() => {
    api.getCollections.mockResolvedValue([COLLECTION])
    api.getMountains.mockResolvedValue(MOUNTAINS)
    api.getProgressLogs.mockResolvedValue(LOGS)
  })

  it('renders the collection name', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Wainwrights')).toBeInTheDocument()
    })
  })

  it('renders all mountains initially', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Scafell Pike'))
    expect(screen.getByText('Helvellyn')).toBeInTheDocument()
    expect(screen.getByText('Skiddaw')).toBeInTheDocument()
  })

  it('shows status filter buttons', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Scafell Pike'))
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Planned' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not started' })).toBeInTheDocument()
  })

  it('shows mountain count in toolbar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/3 mountains/i)).toBeInTheDocument()
    })
  })

  it('filters to completed mountains only', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Scafell Pike'))

    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))

    await waitFor(() => {
      expect(screen.getByText('Scafell Pike')).toBeInTheDocument()
      expect(screen.queryByText('Helvellyn')).not.toBeInTheDocument()
      expect(screen.queryByText('Skiddaw')).not.toBeInTheDocument()
    })
  })

  it('filters to planned mountains only', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Helvellyn'))

    fireEvent.click(screen.getByRole('button', { name: 'Planned' }))

    await waitFor(() => {
      expect(screen.queryByText('Scafell Pike')).not.toBeInTheDocument()
      expect(screen.getByText('Helvellyn')).toBeInTheDocument()
      expect(screen.queryByText('Skiddaw')).not.toBeInTheDocument()
    })
  })

  it('filters to not started mountains only', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Skiddaw'))

    fireEvent.click(screen.getByRole('button', { name: 'Not started' }))

    await waitFor(() => {
      expect(screen.queryByText('Scafell Pike')).not.toBeInTheDocument()
      expect(screen.queryByText('Helvellyn')).not.toBeInTheDocument()
      expect(screen.getByText('Skiddaw')).toBeInTheDocument()
    })
  })

  it('shows filtered count in toolbar when filter is active', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Scafell Pike'))

    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))

    await waitFor(() => {
      expect(screen.getByText(/1 of 3 mountains/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when filter returns no results', async () => {
    // No logs at all — completed filter will return empty
    api.getProgressLogs.mockResolvedValue([])
    renderPage()
    await waitFor(() => screen.getByText('Scafell Pike'))

    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))

    await waitFor(() => {
      expect(screen.getByText(/no mountains match this filter/i)).toBeInTheDocument()
    })
  })

  it('shows a Show all mountains button in empty state', async () => {
    api.getProgressLogs.mockResolvedValue([])
    renderPage()
    await waitFor(() => screen.getByText('Scafell Pike'))

    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /show all mountains/i })).toBeInTheDocument()
    })
  })

  it('resets to all mountains when Show all mountains is clicked', async () => {
    api.getProgressLogs.mockResolvedValue([])
    renderPage()
    await waitFor(() => screen.getByText('Scafell Pike'))

    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))
    await waitFor(() => screen.getByRole('button', { name: /show all mountains/i }))
    fireEvent.click(screen.getByRole('button', { name: /show all mountains/i }))

    await waitFor(() => {
      expect(screen.getByText('Scafell Pike')).toBeInTheDocument()
      expect(screen.getByText('Helvellyn')).toBeInTheDocument()
      expect(screen.getByText('Skiddaw')).toBeInTheDocument()
    })
  })

  it('All button is active by default', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Scafell Pike'))
    const allBtn = screen.getByRole('button', { name: 'All' })
    expect(allBtn.className).toContain('active')
  })

  it('active filter button gets active class', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Scafell Pike'))

    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))

    await waitFor(() => {
      const completedBtn = screen.getByRole('button', { name: 'Completed' })
      expect(completedBtn.className).toContain('active')
    })
  })

  it('shows stat cards for completed, planned and total', async () => {
    renderPage()
    await waitFor(() => {
        const grid = document.querySelector('.collection-overview-grid')
        expect(grid).toBeInTheDocument()
        expect(grid.textContent).toContain('Completed')
        expect(grid.textContent).toContain('Planned')
        expect(grid.textContent).toContain('Total')
    })
    })

  it('mountains link to their detail pages', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Scafell Pike'))
    const link = screen.getByRole('link', { name: /scafell pike/i })
    expect(link.getAttribute('href')).toBe('/mountains/scafell-pike')
  })
})

describe('CollectionDetailPage — unauthenticated (no logs)', () => {
  it('shows mountains without status when user is not logged in', async () => {
    api.getCollections.mockResolvedValue([COLLECTION])
    api.getMountains.mockResolvedValue(MOUNTAINS)
    api.getProgressLogs.mockRejectedValue(new Error('Not authenticated'))

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Scafell Pike')).toBeInTheDocument()
    })
  })
})

describe('CollectionDetailPage — error state', () => {
  it('shows error message when API fails', async () => {
    api.getCollections.mockRejectedValue(new Error('Network error'))
    api.getMountains.mockRejectedValue(new Error('Network error'))
    api.getProgressLogs.mockResolvedValue([])

    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/unable to load collection/i)).toBeInTheDocument()
    })
  })

  it('shows not found when collection slug does not exist', async () => {
    api.getCollections.mockResolvedValue([]) // empty — no matching slug
    api.getMountains.mockResolvedValue([])
    api.getProgressLogs.mockResolvedValue([])

    renderPage('nonexistent-slug')
    await waitFor(() => {
      expect(screen.getByText(/collection not found/i)).toBeInTheDocument()
    })
  })
})
