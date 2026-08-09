import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CircuitBreakerDemo } from '../../src/components/demo/CircuitBreakerDemo';

vi.mock('../../src/hooks/useDemoSession', () => ({
  useDemoSession: () => ({ 
    sessionId: 'test-session-123',
    events: [],
    chaos: { serviceFaulty: false },
    executeCommand: vi.fn().mockResolvedValue({ success: true, rejected: false })
  })
}));

describe('CircuitBreakerDemo', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<CircuitBreakerDemo />);
    // "Circuit Breaker State" and a "Send Request" button were pre-rewrite copy;
    // the component now shows the state machine directly via its state labels
    // and a "With Breaker" traffic panel (see CircuitBreakerDemo.tsx STATE_CONFIG
    // + the "With Breaker" Heading).
    expect(screen.getByText('With Breaker')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('can send a request and log success', async () => {
    render(<CircuitBreakerDemo />);
    const sendBtn = screen.getByRole('button', { name: /Trigger Failure/i });

    await act(async () => {
      fireEvent.click(sendBtn);
    });

    // fireHammer() fires 6 parallel "with breaker" requests, each resolving
    // success:true from the mock, so multiple "200 OK" rows land in the table.
    await waitFor(() => {
      expect(screen.getAllByText('200 OK').length).toBeGreaterThan(0);
    });
  });
});
