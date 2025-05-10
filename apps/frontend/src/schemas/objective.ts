import { z } from 'zod';

export const schema = z.object({
    id: z.number().optional(),
    title: z.string().min(1, { message: 'Title is required' }).describe('label:title'),
    description: z.string().optional().describe('label:Descripción'),
    category: z.string().optional().describe('label:Categoría'),
    targetValue: z
        .number()
        .min(1, { message: 'Target value is required' })
        .describe('label:Valor Objetivo'),
    currentValue: z
        .number()
        .min(1, { message: 'Current value is required' })
        .describe('label:Valor Actual'),
    deadline: z.date().optional().describe('label:Fecha Limite'),
    status: z.string().optional().describe('label:Estado'),
    unit: z.string().optional().describe('label:Unidad'),
});
