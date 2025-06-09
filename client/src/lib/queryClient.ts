import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// We'll create a function to set up the query client with error handling
export const createQueryClient = (captureError?: (error: Error, additionalInfo?: any) => void) => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: getQueryFn({ on401: "throw" }),
        refetchInterval: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        retry: false,
        onError: captureError ? (error: any) => {
          console.error('React Query Error:', error);
          captureError(error, {
            type: 'query_error',
            timestamp: new Date().toISOString()
          });
        } : undefined,
      },
      mutations: {
        retry: false,
        onError: captureError ? (error: any, variables: any, context: any) => {
          console.error('React Query Mutation Error:', error, variables, context);
          captureError(error, {
            type: 'mutation_error',
            variables,
            context,
            timestamp: new Date().toISOString()
          });
        } : undefined,
      },
    },
  });
};

// Default query client for backwards compatibility
export const queryClient = createQueryClient();
