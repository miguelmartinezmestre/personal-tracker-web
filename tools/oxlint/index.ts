import { eslintCompatPlugin } from '@oxlint/plugins';

import { requireReadableSpacingRule } from './rules/require-readable-spacing.ts';

export default eslintCompatPlugin({
    meta: { name: 'tfg' },
    rules: {
        'require-readable-spacing': requireReadableSpacingRule,
    },
});
