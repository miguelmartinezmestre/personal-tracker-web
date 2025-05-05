import '@testing-library/jest-dom'
import { expect, vi } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Improved window.matchMedia mock
vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})));

// // Mock Next.js router
// vi.mock('next/navigation', () => ({
//   useRouter: () => ({
//     push: vi.fn(),
//     replace: vi.fn(),
//     prefetch: vi.fn(),
//     back: vi.fn(),
//     forward: vi.fn(),
//     refresh: vi.fn(),
//     pathname: '/',
//     params: {},
//   }),
//   usePathname: () => '/',
//   useSearchParams: () => new URLSearchParams(),
// }))
