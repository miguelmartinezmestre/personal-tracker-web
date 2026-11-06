import { createApi } from '@convex-dev/better-auth';
import { authSchemaOptions } from '../features/auth/schemaOptions';
import schema from './schema';

export const {
    create,
    findOne,
    findMany,
    updateOne,
    updateMany,
    deleteOne,
    deleteMany,
    consumeOne,
    incrementOne,
} = createApi(schema, () => authSchemaOptions);
