import { PlopTypes } from '@turbo/gen';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
    plop.setGenerator('typescript-package', {
        description: 'Genera un nuevo package TypeScript en el monorepo',
        prompts: [
            {
                type: 'input',
                name: 'name',
                message: '¿Cuál es el nombre del package? (ej: utils, api, shared)',
                validate: (input: string) => {
                    if (input.includes(' ')) {
                        return 'El nombre del package no puede contener espacios';
                    }
                    if (input.includes('@')) {
                        return 'No incluyas el scope @repo, se añadirá automáticamente';
                    }
                    return true;
                },
            },
            {
                type: 'input',
                name: 'description',
                message: '¿Cuál es la descripción del package?',
                default: 'Un package TypeScript',
            },
        ],
        actions: [
            {
                type: 'add',
                path: '{{ turbo.paths.root }}/packages/{{kebabCase name}}/package.json',
                templateFile: 'typescript-package/templates/package.json.t',
            },
            {
                type: 'add',
                path: '{{ turbo.paths.root }}/packages/{{kebabCase name}}/tsconfig.json',
                templateFile: 'typescript-package/templates/tsconfig.json.t',
            },
            {
                type: 'add',
                path: '{{ turbo.paths.root }}/packages/{{kebabCase name}}/eslint.config.mjs',
                templateFile: 'typescript-package/templates/eslint.config.mjs.t',
            },
            {
                type: 'add',
                path: '{{ turbo.paths.root }}/packages/{{kebabCase name}}/src/index.ts',
                templateFile: 'typescript-package/templates/index.ts.t',
            },
            {
                type: 'add',
                path: '{{ turbo.paths.root }}/packages/{{kebabCase name}}/jest.config.ts',
                templateFile: 'typescript-package/templates/jest.config.ts.t',
            },
            {
                type: 'add',
                path: '{{ turbo.paths.root }}/packages/{{kebabCase name}}/src/index.test.ts',
                templateFile: 'typescript-package/templates/index.test.ts.t',
            },
            {
                type: 'add',
                path: '{{ turbo.paths.root }}/packages/{{kebabCase name}}/README.md',
                templateFile: 'typescript-package/templates/README.md.t',
            },
        ],
    });
}
