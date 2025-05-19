import { appRouter } from "@/server/router"
import { createContext } from "@/server/init"

// Crear un caller para el servidor
export const serverClient = appRouter.createCaller(await createContext({
  req: new Request('http://localhost:3000'),
  resHeaders: new Headers(),
  info: {
    url: new URL('http://localhost:3000'),
    type: 'query',
    isBatchCall: false,
    calls: [],
    accept: null,
    connectionParams: null,
    signal: new AbortController().signal,
  },
}))
