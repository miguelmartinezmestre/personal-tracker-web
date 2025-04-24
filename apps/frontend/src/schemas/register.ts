import { z } from 'zod';

export const formSchema = z.object({
    email: z.string().email({
        message: 'Por favor ingresa un correo electrónico válido.',
    }),
    password: z.string().min(8, {
        message: 'La contraseña debe tener al menos 8 caracteres.',
    }),
    username: z.string().min(3, {
        message: 'El nombre de usuario debe tener al menos 3 caracteres.',
    }),
});
