
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AudioProvider } from '../contexts/AudioContext';

// Mock dependencies that rely on browser APIs not fully present in jsdom
vi.mock('../services/peerService', () => ({
  peerService: {
    initialize: vi.fn(),
    connectToHost: vi.fn(),
    onDataReceived: null,
    onPeerConnected: null,
    onPeerDisconnected: null,
    myPeerId: 'mock-id'
  }
}));

vi.mock('../services/geminiService', () => ({
  createDMSession: vi.fn(),
  resumeDMSession: vi.fn(),
  generateDMContent: vi.fn()
}));

// Mock AudioContext since it's used in App via AudioProvider
window.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: () => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    type: 'sine'
  }),
  createGain: () => ({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
  }),
  destination: {},
  state: 'suspended',
  resume: vi.fn()
}));

describe('App Component', () => {
  it('renders the game title', () => {
    render(
      <ThemeProvider>
        <AudioProvider>
          <App />
        </AudioProvider>
      </ThemeProvider>
    );
    
    // Check for the main title
    expect(screen.getByText(/D&D AI Dungeon Master/i)).toBeInTheDocument();
  });

  it('shows game mode selection buttons', () => {
    render(
      <ThemeProvider>
        <AudioProvider>
          <App />
        </AudioProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/Самітня Гра/i)).toBeInTheDocument();
    expect(screen.getByText(/Створити Кімнату/i)).toBeInTheDocument();
    expect(screen.getByText(/Приєднатися/i)).toBeInTheDocument();
  });
});
