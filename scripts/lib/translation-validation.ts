import ts from 'typescript';

export function assertUniqueTranslationKeys(text: string, filename: string): void {
    const source = ts.parseJsonText(filename, text);
    function visit(node: ts.Node) {
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
                    throw new Error(
                        `${filename}:${location.line + 1}: duplicate translation key "${key}"`
                    );
                }
                keys.add(key);
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
}
