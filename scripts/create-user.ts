#!/usr/bin/env node

import 'dotenv/config';

const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_PASSWORD = 'Admin12345';
const DEFAULT_NAME = 'Admin User';
const DEFAULT_ROLE = 'admin';

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed: Record<string, string> = {};

    for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace(/^--/, '');
        const value = args[i + 1];
        if (key && value) {
            parsed[key] = value;
        }
    }

    return {
        email: parsed.email || DEFAULT_EMAIL,
        password: parsed.password || DEFAULT_PASSWORD,
        name: parsed.name || DEFAULT_NAME,
        role: parsed.role || DEFAULT_ROLE,
    };
}

async function createUser() {
    try {
        const { email, password, name, role } = parseArgs();

        console.log('📝 Creando usuario...');
        console.log(`   Email: ${email}`);
        console.log(`   Nombre: ${name}`);
        console.log(`   Rol: ${role}`);

        const siteUrl =
            process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const authUrl = `${siteUrl}/api/auth`;

        try {
            console.log(`\n📡 Enviando petición a: ${authUrl}/sign-up/email`);
            const signUpResponse = await fetch(`${authUrl}/sign-up/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    name,
                }),
            });

            const responseText = await signUpResponse.text();
            let signUpData;

            try {
                signUpData = JSON.parse(responseText);
            } catch {
                throw new Error(`Respuesta no válida: ${responseText}`);
            }

            if (!signUpResponse.ok) {
                if (
                    signUpResponse.status === 409 ||
                    responseText.includes('already exists') ||
                    responseText.includes('duplicate')
                ) {
                    console.log('⚠️  El usuario ya existe en el sistema.');
                    console.log(`   Email: ${email}`);
                    console.log('\n💡 Si quieres crear otro usuario, usa un email diferente.');
                    process.exit(0);
                }
                throw new Error(
                    `Error al crear usuario: ${signUpResponse.status} - ${responseText}`
                );
            }

            console.log('✅ Usuario creado exitosamente!');
            console.log(`   ID: ${signUpData.user?.id || 'N/A'}`);
            console.log(`   Email: ${signUpData.user?.email || email}`);
            console.log(`   Nombre: ${signUpData.user?.name || name}`);

            if (role && (role === 'admin' || role === 'ADMIN')) {
                console.log(`\n🔐 Intentando asignar rol '${role}' al usuario...`);
                console.log(
                    `   ⚠️  Nota: Para asignar roles de admin, necesitas usar la API de admin`
                );
                console.log(`   después de autenticarte como administrador.`);
                console.log(`   El usuario se creó correctamente pero con rol por defecto.`);
                console.log(`   Puedes actualizar el rol desde el panel de administración.`);
            }

            console.log('\n🎉 ¡Usuario creado exitosamente!');
            console.log(`\n📋 Credenciales:`);
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${password}`);
            console.log(`\n💡 Puedes iniciar sesión en: ${siteUrl}/login`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            if (
                message?.includes('already exists') ||
                message?.includes('409') ||
                message?.includes('duplicate')
            ) {
                console.log('⚠️  El usuario ya existe en el sistema.');
                console.log(`   Email: ${email}`);
                console.log('\n💡 Si quieres crear otro usuario, usa un email diferente.');
                process.exit(0);
            }
            throw error;
        }
    } catch (error: unknown) {
        console.error('\n❌ Error al crear usuario:');
        const message = error instanceof Error ? error.message : String(error);
        console.error(`   ${message}`);

        if (message?.includes('NEXT_PUBLIC_CONVEX_URL')) {
            console.error(
                '\n💡 Asegúrate de tener configurado NEXT_PUBLIC_CONVEX_URL en tu archivo .env'
            );
        }

        process.exit(1);
    }
}

createUser();
