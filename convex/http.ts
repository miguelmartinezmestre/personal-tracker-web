import { httpRouter } from 'convex/server';
import { authComponent, createAuth } from './functions/auth';

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

export default http;
