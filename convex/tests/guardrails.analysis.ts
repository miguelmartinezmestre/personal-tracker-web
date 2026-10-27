import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const EXCLUDED = new Set(['_generated', 'generated', 'tests']);

const RAW_BUILDERS = new Set([
    'query',
    'mutation',
    'action',
    'queryGeneric',
    'mutationGeneric',
    'actionGeneric',
]);

const REGISTERED_BUILDERS = new Set([
    'query',
    'mutation',
    'action',
    'internalQuery',
    'internalMutation',
    'internalAction',
    'queryWithRLS',
    'mutationWithRLS',
]);

const CONTRACT_PROPERTIES = ['args', 'returns', 'handler'];

export function listConvexSources(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = join(directory, entry.name);

        if (entry.isDirectory()) return EXCLUDED.has(entry.name) ? [] : listConvexSources(file);

        return entry.isFile() && entry.name.endsWith('.ts') ? [file] : [];
    });
}

export function parseSource(file: string, text = readFileSync(file, 'utf8')) {
    return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function memberName(expression: ts.Node): string | undefined {
    if (ts.isIdentifier(expression) || ts.isStringLiteral(expression)) return expression.text;

    if (ts.isPropertyAccessExpression(expression)) return expression.name.text;

    if (
        ts.isElementAccessExpression(expression) &&
        ts.isStringLiteralLike(expression.argumentExpression)
    ) {
        return expression.argumentExpression.text;
    }

    return undefined;
}

function importedBuilders(source: ts.SourceFile) {
    const aliases = new Map<string, string>();
    const namespaces = new Set<string>();

    for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
            continue;
        const module = statement.moduleSpecifier.text;

        if (!module.endsWith('_generated/server') && module !== 'convex/server') continue;
        const bindings = statement.importClause?.namedBindings;

        if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);

        if (bindings && ts.isNamedImports(bindings)) {
            for (const binding of bindings.elements) {
                const original = (binding.propertyName ?? binding.name).text;

                if (RAW_BUILDERS.has(original))
                    aliases.set(binding.name.text, original.replace('Generic', ''));
            }
        }
    }

    return { aliases, namespaces };
}

export function findRawPublicFunctions(source: ts.SourceFile) {
    const { aliases, namespaces } = importedBuilders(source);
    const found: { name: string; kind: string; line: number }[] = [];

    function kindOf(expression: ts.Expression): string | undefined {
        if (ts.isIdentifier(expression)) return aliases.get(expression.text);

        if (!ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression))
            return undefined;
        const name = memberName(expression);

        if (
            ts.isIdentifier(expression.expression) &&
            namespaces.has(expression.expression.text) &&
            name &&
            RAW_BUILDERS.has(name)
        ) {
            return name.replace('Generic', '');
        } else {
            return undefined;
        }
    }

    for (const statement of source.statements) {
        if (
            ts.isExportDeclaration(statement) &&
            statement.moduleSpecifier &&
            ts.isStringLiteral(statement.moduleSpecifier) &&
            (statement.moduleSpecifier.text.endsWith('_generated/server') ||
                statement.moduleSpecifier.text === 'convex/server')
        ) {
            found.push({
                name: '<raw builder re-export>',
                kind: 're-export',
                line: source.getLineAndCharacterOfPosition(statement.getStart()).line + 1,
            });
        }

        if (ts.isExportAssignment(statement) && ts.isCallExpression(statement.expression)) {
            const kind = kindOf(statement.expression.expression);

            if (kind)
                found.push({
                    name: 'default',
                    kind,
                    line: source.getLineAndCharacterOfPosition(statement.getStart()).line + 1,
                });
        }

        if (!ts.isVariableStatement(statement)) continue;

        const exported = statement.modifiers?.some(
            modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
        );

        for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
            let initializerExpression: ts.Expression;

            if (ts.isCallExpression(declaration.initializer)) {
                initializerExpression = declaration.initializer.expression;
            } else {
                initializerExpression = declaration.initializer;
            }

            const kind = kindOf(initializerExpression);

            if (!kind) continue;

            if (!ts.isCallExpression(declaration.initializer))
                aliases.set(declaration.name.text, kind);

            if (exported)
                found.push({
                    name: declaration.name.text,
                    kind,
                    line: source.getLineAndCharacterOfPosition(declaration.getStart()).line + 1,
                });
        }
    }

    return found;
}

export function findMissingContracts(source: ts.SourceFile) {
    const missing: { name: string; property: string }[] = [];

    for (const statement of source.statements) {
        if (
            !ts.isVariableStatement(statement) ||
            !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
        )
            continue;

        for (const declaration of statement.declarationList.declarations) {
            const initializer = declaration.initializer;

            if (
                !ts.isIdentifier(declaration.name) ||
                !initializer ||
                !ts.isCallExpression(initializer) ||
                !ts.isIdentifier(initializer.expression) ||
                !REGISTERED_BUILDERS.has(initializer.expression.text)
            )
                continue;
            const config = initializer.arguments.at(0);

            const properties =
                config && ts.isObjectLiteralExpression(config)
                    ? config.properties.map(property => property.name && memberName(property.name))
                    : [];

            for (const property of CONTRACT_PROPERTIES) {
                if (!properties.includes(property))
                    missing.push({ name: declaration.name.text, property });
            }
        }
    }

    return missing;
}
