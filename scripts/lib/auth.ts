import { randomBytes } from 'node:crypto';
import { symmetricEncrypt } from 'better-auth/crypto';
import { generateExportedKeyPair } from 'better-auth/plugins';

export function stripAnsi(value: string): string {
    let result = '';
    let index = 0;

    while (index < value.length) {
        const currentCharCode = value.charCodeAt(index);
        if (currentCharCode === 27 && value[index + 1] === '[') {
            index += 2;

            while (index < value.length) {
                const ansiCode = value.charCodeAt(index);
                index += 1;

                if (ansiCode >= 64 && ansiCode <= 126) {
                    break;
                }
            }

            continue;
        }

        result += value.charAt(index);
        index += 1;
    }

    return result;
}

export async function generateStaticJwks(secret: string): Promise<string> {
    const { publicWebKey, privateWebKey } = await generateExportedKeyPair({
        jwks: {
            keyPairConfig: {
                alg: 'RS256',
            },
        },
    });

    const encryptedPrivateKey = await symmetricEncrypt({
        key: secret,
        data: JSON.stringify(privateWebKey),
    });

    const jwksDocument = [
        {
            alg: 'RS256',
            createdAt: Date.now(),
            id: randomBytes(16).toString('hex'),
            privateKey: JSON.stringify(encryptedPrivateKey),
            publicKey: JSON.stringify(publicWebKey),
        },
    ];

    return JSON.stringify(jwksDocument);
}

export function extractAdminKey(rawOutput: string): string {
    const normalizedOutput = stripAnsi(rawOutput);
    const match = normalizedOutput.match(/convex-self-hosted\|[^\s'"`]+/);

    if (!match) {
        throw new Error('Could not extract the local Convex admin key');
    }

    return match[0];
}
