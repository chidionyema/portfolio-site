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

  it('renders correctly', async () => {
    // "Dynamic Credentials" was pre-rewrite copy; the panel label is
    // "Database credential". "ACTIVE" only appears once the mount-time
    // checkStatus() effect resolves (mocked executeCommand -> {success:true}),
    // so the render must be flushed inside act() before asserting on it.
    await act(async () => {
      render(<VaultRotationDemo />);
    });
    expect(screen.getByText('Database credential')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('can verify vault status and show active credential', async () => {
    // There's no "Test Query" button or "DB Auth Success" text; the current
    // control is "Verify" (calls checkStatus(), which flips the credential
    // Pill to "ACTIVE" using the mocked {success:true} response).
    await act(async () => {
      render(<VaultRotationDemo />);
    });

    const verifyBtn = screen.getByRole('button', { name: /^Verify$/i });

    await act(async () => {
      fireEvent.click(verifyBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });
  });
});
