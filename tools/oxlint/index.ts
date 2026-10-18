import { eslintCompatPlugin } from '@oxlint/plugins';

import { requireReadableSpacingRule } from './rules/require-readable-spacing.ts';

/** Project-owned Oxlint rules, registered through `jsPlugins` in `.oxlintrc.json`. */
export default eslintCompatPlugin({
    meta: { name: 'tfg' },
    rules: {
        'require-readable-spacing': requireReadableSpacingRule,
    },
});
