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
    expect(screen.getByText('Circuit Breaker State')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('can send a request and log success', async () => {
    render(<CircuitBreakerDemo />);
    const sendBtn = screen.getByRole('button', { name: /Send Request/i });
    
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('200 OK')).toBeInTheDocument();
    });
  });
});
