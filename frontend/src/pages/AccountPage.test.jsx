/**
 * Tests for AccountPage
 *
 * Covers:
 * - Login form renders correctly
 * - Login shows error on failure
 * - Login clears error when typing
 * - Register tab switches form
 * - Logged-in state shows username and quick links
 * - Logout button is present when logged in
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AccountPage from '../pages/AccountPage'
import * as api from '../lib/api'

// ---------------------------------------------------------------------------
// Mock the entire api module
// ---------------------------------------------------------------------------

vi.mock('../lib/api', () => ({
  getCurrentUser: vi.fn(),
  getProgressLogs: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn(),
  updateUserProfile: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  return render(
    <MemoryRouter>
      <AccountPage />
    </MemoryRouter>,
  )
}

const LOGGED_OUT_STATE = { user: null }
const LOGGED_IN_STATE = {
  user: { id: 1, username: 'alice', email: 'alice@test.com', bio: '', avatar: null },
}

// ---------------------------------------------------------------------------
// Tests — logged out state
// ---------------------------------------------------------------------------

describe('AccountPage — logged out', () => {
  beforeEach(() => {
    api.getCurrentUser.mockResolvedValue(LOGGED_OUT_STATE)
    api.getProgressLogs.mockResolvedValue([])
  })

  it('renders the login form by default', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('shows Sign in button', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })
  })

  it('switches to register form when Register tab is clicked', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Register'))
    fireEvent.click(screen.getByText('Register'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('shows auth error when login fails', async () => {
    api.loginUser.mockRejectedValue(new Error('Invalid credentials.'))
    renderPage()

    await waitFor(() => screen.getByLabelText(/username/i))
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials.')).toBeInTheDocument()
    })
  })

  it('clears auth error when user starts typing', async () => {
    api.loginUser.mockRejectedValue(new Error('Invalid credentials.'))
    renderPage()

    await waitFor(() => screen.getByLabelText(/username/i))
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => screen.getByText('Invalid credentials.'))

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice2' } })

    await waitFor(() => {
      expect(screen.queryByText('Invalid credentials.')).not.toBeInTheDocument()
    })
  })

  it('clears error when switching tabs', async () => {
    api.loginUser.mockRejectedValue(new Error('Invalid credentials.'))
    renderPage()

    await waitFor(() => screen.getByLabelText(/username/i))
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => screen.getByText('Invalid credentials.'))

    fireEvent.click(screen.getByText('Register'))

    await waitFor(() => {
      expect(screen.queryByText('Invalid credentials.')).not.toBeInTheDocument()
    })
  })

  it('calls loginUser with username and password', async () => {
    api.loginUser.mockResolvedValue({ id: 1, username: 'alice' })
    api.getCurrentUser
      .mockResolvedValueOnce(LOGGED_OUT_STATE)
      .mockResolvedValue(LOGGED_IN_STATE)

    renderPage()
    await waitFor(() => screen.getByLabelText(/username/i))

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass12345' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(api.loginUser).toHaveBeenCalledWith({
        username: 'alice',
        password: 'pass12345',
      })
    })
  })

  it('shows generic error when server returns no message', async () => {
    api.loginUser.mockRejectedValue(new Error('Something went wrong. Please try again.'))
    renderPage()

    await waitFor(() => screen.getByLabelText(/username/i))
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'x' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'y' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// Tests — logged in state
// ---------------------------------------------------------------------------

describe('AccountPage — logged in', () => {
  beforeEach(() => {
    api.getCurrentUser.mockResolvedValue(LOGGED_IN_STATE)
    api.getProgressLogs.mockResolvedValue([
      { id: 1, status: 'completed', mountain: 1 },
      { id: 2, status: 'planned', mountain: 2 },
    ])
  })

  it('shows the username when logged in', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })
  })

  it('shows completed and planned counts', async () => {
    renderPage()
    await waitFor(() => {
        const stats = document.querySelector('.account-user-stats')
        expect(stats).toBeInTheDocument()
        expect(stats.textContent).toContain('1')
        expect(stats.textContent).toContain('Completed')
        expect(stats.textContent).toContain('Planned')
    })
    })

  it('shows quick links to Dashboard, Journal, Gallery', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /journal/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /gallery/i })).toBeInTheDocument()
    })
  })

  it('shows Edit profile and Logout buttons', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
    })
  })

  it('calls logoutUser when Logout is clicked', async () => {
    api.logoutUser.mockResolvedValue({})
    api.getCurrentUser
      .mockResolvedValueOnce(LOGGED_IN_STATE)
      .mockResolvedValue(LOGGED_OUT_STATE)

    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /logout/i }))
    fireEvent.click(screen.getByRole('button', { name: /logout/i }))

    await waitFor(() => {
      expect(api.logoutUser).toHaveBeenCalled()
    })
  })

  it('shows edit form when Edit profile is clicked', async () => {
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /edit profile/i }))
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/tell us about your hiking/i)).toBeInTheDocument()
    })
  })

  it('shows welcome back kicker text', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    })
  })
})
