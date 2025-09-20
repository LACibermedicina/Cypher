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
    // Handle different queryKey patterns for proper URL construction
    let url: string;
    
    if (queryKey.length === 1) {
      // Simple case: ['/api/something']
      url = queryKey[0] as string;
    } else if (queryKey.length === 2) {
      // Path param case: ['/api/appointments/doctor', doctorId]
      url = `${queryKey[0]}/${queryKey[1]}`;
    } else if (queryKey.length === 3) {
      // Query param case: ['/api/appointments/doctor', doctorId, date]
      const basePath = queryKey[0] as string;
      const pathParam = queryKey[1] as string;
      const queryParam = queryKey[2] as string;
      
      // Special handling for date parameters
      if (basePath.includes('/doctor') && queryParam) {
        const date = new Date(queryParam).toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
        url = `${basePath}/${pathParam}?date=${date}`;
      } else {
        url = `${basePath}/${pathParam}/${queryParam}`;
      }
    } else {
      // Fallback to join for other cases
      url = queryKey.join("/") as string;
    }

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
