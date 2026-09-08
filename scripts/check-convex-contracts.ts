import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { findForbiddenQueries } from './lib/convex-guardrails';

const CONVEX_DIRECTORY = path.resolve(process.cwd(), 'convex');
const REGISTERED_FUNCTIONS = new Set([
    'query',
    'mutation',
    'action',
    'internalQuery',
    'internalMutation',
    'internalAction',
    'queryWithRLS',
    'mutationWithRLS',
    'internalQueryWithRLS',
    'internalMutationWithRLS',
]);
const IGNORED_DIRECTORIES = new Set(['_generated', 'generated', 'tests']);

async function listTypeScriptFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async entry => {
            const entryPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                return IGNORED_DIRECTORIES.has(entry.name)
                    ? []
                    : await listTypeScriptFiles(entryPath);
            }
            return entry.isFile() && entry.name.endsWith('.ts') ? [entryPath] : [];
        })
    );
    return files.flat();
}

function getRegisteredFunctionName(expression: ts.CallExpression): string | null {
    if (!ts.isIdentifier(expression.expression)) {
        return null;
    }
    return REGISTERED_FUNCTIONS.has(expression.expression.text) ? expression.expression.text : null;
}

function getObjectPropertyNames(object: ts.ObjectLiteralExpression): Set<string> {
    return new Set(
        object.properties.flatMap(property => {
            if (
                (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) &&
                ts.isIdentifier(property.name)
            ) {
                return [property.name.text];
            }
            return [];
        })
    );
}

async function checkFile(filePath: string, program: ts.Program): Promise<string[]> {
    const sourceText = await readFile(filePath, 'utf8');
    const sourceFile =
        program.getSourceFile(filePath) ??
        ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const failures: string[] = findForbiddenQueries(sourceFile, program.getTypeChecker()).map(
        failure =>
            `${path.relative(process.cwd(), filePath)}:${failure.line} database ${failure.method} must use an index and bounded reads`
    );

    for (const statement of sourceFile.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        const isExported = statement.modifiers?.some(
            modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
        );
        if (!isExported) continue;

        for (const declaration of statement.declarationList.declarations) {
            if (!declaration.initializer || !ts.isIdentifier(declaration.name)) continue;
            if (!ts.isCallExpression(declaration.initializer)) continue;
            const functionName = getRegisteredFunctionName(declaration.initializer);
            if (!functionName) continue;

            const config = declaration.initializer.arguments[0];
            const position = sourceFile.getLineAndCharacterOfPosition(declaration.getStart());
            const location = `${path.relative(process.cwd(), filePath)}:${position.line + 1}`;
            if (!config || !ts.isObjectLiteralExpression(config)) {
                failures.push(`${location} ${declaration.name.text} must use an object config`);
                continue;
            }

            const properties = getObjectPropertyNames(config);
            for (const requiredProperty of ['args', 'returns', 'handler']) {
                if (!properties.has(requiredProperty)) {
                    failures.push(
                        `${location} ${declaration.name.text} (${functionName}) is missing ${requiredProperty}`
                    );
                }
            }
        }
    }

    return failures;
}

const files = await listTypeScriptFiles(CONVEX_DIRECTORY);
const configPath = path.join(CONVEX_DIRECTORY, 'tsconfig.json');
const config = ts.readConfigFile(configPath, file => ts.sys.readFile(file));
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, CONVEX_DIRECTORY);
const program = ts.createProgram(files, parsed.options);
const failures = (await Promise.all(files.map(file => checkFile(file, program)))).flat();

if (failures.length > 0) {
    console.error(`Convex contract check failed (${failures.length}):`);
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exitCode = 1;
} else {
    console.log(`Convex contract check passed for ${files.length} files.`);
}
