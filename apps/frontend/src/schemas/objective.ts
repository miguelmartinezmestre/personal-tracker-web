import { z } from 'zod';

export const schema = z.object({
    id: z.number().optional(),
    title: z.string().min(1, { message: 'Title is required' }).describe(`label:'title'`),
    description: z
        .string()
        .min(1, { message: 'Description is required' })
        .describe('label:Descripción'),
    category: z.string().min(1, { message: 'Category is required' }).describe('label:Categoría'),
    targetValue: z
        .number()
        .min(1, { message: 'Target value is required' })
        .describe('label:Valor Objetivo'),
    currentValue: z
        .number()
        .min(1, { message: 'Current value is required' })
        .describe('label:Valor Actual'),
    deadline: z.date().describe('label:Fecha Limite'),
    status: z.string().min(1, { message: 'Status is required' }).describe('label:Estado'),
    unit: z.string().min(1, { message: 'Unit is required' }).describe('label:Unidad'),
});
