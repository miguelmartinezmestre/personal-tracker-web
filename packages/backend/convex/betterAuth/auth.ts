import { createAuth } from '../auth'
import { getStaticAuth } from '@convex-dev/better-auth'

// Re-export createAuth for use in other modules
export { createAuth };

// Export a static instance for Better Auth schema generation
export const auth = getStaticAuth(createAuth)