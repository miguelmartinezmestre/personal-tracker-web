'use client'

import { useQuery } from '@tanstack/react-query'

export default function Polling() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-data'],
    queryFn: async () => {
      // const response = await fetch('/api/my-endpoint')
      // if (!response.ok) throw new Error('Error fetching data')
      // return response.json()
      console.log('refetching')
      console.log(new Date().toISOString())
      return { message: 'Hello, world!' }
    },
    staleTime: 0,
    refetchInterval: 10000, // 2 minutos en milisegundos
    refetchIntervalInBackground: true, // opcional, para que se refetchee incluso si la pestaña está en background
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  })

  if (isLoading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>{JSON.stringify(data)}</div>
}
