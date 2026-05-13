import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VaultRotationDemo } from '../../src/components/demo/VaultRotationDemo';

vi.mock('../../src/hooks/useDemoSession', () => ({
  useDemoSession: () => ({ 
    sessionId: 'test-session-123',
    events: [],
    chaos: { serviceFaulty: false },
    executeCommand: vi.fn().mockResolvedValue({ success: true })
  })
}));

describe('VaultRotationDemo', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<VaultRotationDemo />);
    expect(screen.getByText('Dynamic Credentials')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('can test connection and log success', async () => {
    render(<VaultRotationDemo />);
    const testBtn = screen.getByRole('button', { name: /Test Query/i });
    
    await act(async () => {
      fireEvent.click(testBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('DB Auth Success')).toBeInTheDocument();
    });
  });
});
