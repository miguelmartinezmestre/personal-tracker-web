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
const QUERY_STEPS = new Set(['withIndex', 'withSearchIndex', 'order', 'filter']);

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
        return ts.isIdentifier(expression.expression) &&
            namespaces.has(expression.expression.text) &&
            name &&
            RAW_BUILDERS.has(name)
            ? name.replace('Generic', '')
            : undefined;
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
            const kind = kindOf(
                ts.isCallExpression(declaration.initializer)
                    ? declaration.initializer.expression
                    : declaration.initializer
            );
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

export function findForbiddenQueries(source: ts.SourceFile, checker?: ts.TypeChecker) {
    const definitions = new Map<string, ts.Expression>();
    const failures: { method: string; line: number }[] = [];
    function collect(node: ts.Node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer)
            definitions.set(node.name.text, node.initializer);
        ts.forEachChild(node, collect);
    }
    collect(source);
    function isQuery(expression: ts.Expression, seen = new Set<string>()): boolean {
        const type = checker?.getTypeAtLocation(expression);
        if (type?.getProperty('paginate') && type.getProperty('order')) return true;
        if (ts.isIdentifier(expression) && !seen.has(expression.text)) {
            const original = definitions.get(expression.text);
            return original ? isQuery(original, new Set([...seen, expression.text])) : false;
        }
        if (!ts.isCallExpression(expression)) return false;
        const callee = expression.expression;
        if (!ts.isPropertyAccessExpression(callee) && !ts.isElementAccessExpression(callee))
            return false;
        const name = memberName(callee);
        if (name === 'query' && memberName(callee.expression) === 'db') return true;
        return name && QUERY_STEPS.has(name) ? isQuery(callee.expression, seen) : false;
    }
    function visit(node: ts.Node) {
        if (
            ts.isCallExpression(node) &&
            (ts.isPropertyAccessExpression(node.expression) ||
                ts.isElementAccessExpression(node.expression))
        ) {
            const method = memberName(node.expression);
            if (
                (method === 'filter' || method === 'collect') &&
                isQuery(node.expression.expression)
            ) {
                failures.push({
                    method,
                    line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
                });
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    return failures;
}
