import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RateLimiterDemo } from '../../src/components/demo/RateLimiterDemo';

vi.mock('../../src/hooks/useDemoSession', () => ({
  useDemoSession: () => ({ 
    sessionId: 'test-session-123',
    events: [],
    executeCommand: vi.fn()
  })
}));

describe('RateLimiterDemo', () => {
  beforeEach(() => {
    // Standard setup
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<RateLimiterDemo />);
    // "Token Bucket" (exact) and "Available Tokens" were pre-rewrite copy;
    // the heading is "Token Bucket Limiter" and the state label is
    // "Bucket State" (see RateLimiterDemo.tsx).
    expect(screen.getByText(/Token Bucket Limiter/i)).toBeInTheDocument();
    expect(screen.getByText('Bucket State')).toBeInTheDocument();
  });

  it('can send a request and decrement tokens', async () => {
    render(<RateLimiterDemo />);
    // There's no "Send Request" button; the buttons are "Send 1"/"Send 5"/"Send 12".
    const sendBtn = screen.getByRole('button', { name: /^Send 1$/i });

    await act(async () => {
      fireEvent.click(sendBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('200 OK')).toBeInTheDocument();
      // Remaining tokens render as "4/5" (one span, not a bare "4").
      expect(screen.getByText('4/5')).toBeInTheDocument();
    });
  });
});
