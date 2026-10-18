import ts from 'typescript';

// Returns an error message for the first key repeated inside one object, or null.
export function findDuplicateTranslationKey(text: string, filename: string): string | null {
    const source = ts.parseJsonText(filename, text);
    let duplicate: string | null = null;

    function visit(node: ts.Node) {
        if (duplicate) return;

        if (ts.isObjectLiteralExpression(node)) {
            const keys = new Set<string>();

            for (const property of node.properties) {
                if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name))
                    continue;
                const key = property.name.text;

                if (keys.has(key)) {
                    const location = source.getLineAndCharacterOfPosition(
                        property.getStart(source)
                    );

                    duplicate = `${filename}:${location.line + 1}: duplicate translation key "${key}"`;

                    return;
                }

                keys.add(key);
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(source);

    return duplicate;
}
