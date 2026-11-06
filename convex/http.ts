import './httpPolyfills';
import { httpRouter } from 'convex/server';
import { authComponent, createAuth } from './auth';

const http = httpRouter();

// The browser reaches these routes through the Next.js /api/auth proxy (same origin), so no CORS.
authComponent.registerRoutes(http, createAuth);

export default http;
