import { expect, test } from 'vitest';
import { unknownRequirementTags } from './requirement-tags';

test('rejects unknown requirements instead of counting them as coverage', () => {
    const known = new Set(['REQ-NF-001']);
    expect(
        unknownRequirementTags(
            "['@REQ-NF-001', '@REQ-INVENTED-999', '@REQ-INVENTED-999', '@cross-browser']",
            known
        )
    ).toEqual(['REQ-INVENTED-999']);
    expect(unknownRequirementTags("['@REQ-NF-001']", known)).toEqual([]);
});
