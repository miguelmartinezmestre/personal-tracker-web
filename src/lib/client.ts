import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    // log: [
    //     {
    //       emit: 'stdout', // Las consultas se mostrarán en la consola
    //       level: 'query', // Nivel de logging para mostrar las queries
    //     }
    //   ],
})

const globalForPrisma = global as unknown as { prisma: typeof prisma }

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma