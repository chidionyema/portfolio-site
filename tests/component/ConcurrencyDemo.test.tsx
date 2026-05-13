import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ConcurrencyDemo } from '../../src/components/demo/ConcurrencyDemo';

vi.mock('../../src/hooks/useDemoSession', () => ({
  useDemoSession: () => ({ 
    sessionId: 'test-session-123',
    events: [],
    executeCommand: vi.fn().mockResolvedValue({ success: true, newVersion: 2 })
  })
}));

describe('ConcurrencyDemo', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<ConcurrencyDemo />);
    expect(screen.getByText('Entity Versioning')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('can send a single update and log success', async () => {
    render(<ConcurrencyDemo />);
    const sendBtn = screen.getByRole('button', { name: /Single Update/i });
    
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Committed v2')).toBeInTheDocument();
      // Verifying the version updated in the display
      expect(screen.getByText('v2')).toBeInTheDocument();
    });
  });
});
