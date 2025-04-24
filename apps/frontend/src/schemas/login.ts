import { z } from 'zod';

export const formSchema = z.object({
    email: z.string().email({
        message: 'Por favor ingresa un correo electrónico válido.',
    }),
    password: z.string().min(1, {
        message: 'La contraseña es obligatoria.',
    }),
});
