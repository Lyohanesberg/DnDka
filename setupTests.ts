
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Web APIs that might be missing in jsdom
window.scrollTo = vi.fn();
