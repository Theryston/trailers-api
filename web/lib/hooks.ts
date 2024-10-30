import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createProcess,
  createProcessByTrailerPage,
  getFeed,
  getProcess,
  getServices,
} from "./fetchers";

export function useServices() {
  return useQuery({ queryKey: ["services"], queryFn: getServices });
}

export function useProcess(id: string, realTime = false) {
  return useQuery({
    queryKey: ["process", id],
    queryFn: () => getProcess(id),
    refetchInterval: realTime ? 1000 : false,
  });
}

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam = 1 }) => getFeed(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPageCursor,
    initialPageParam: 1,
  });
}

export function useCreateProcessByTrailerPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProcessByTrailerPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useCreateProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
