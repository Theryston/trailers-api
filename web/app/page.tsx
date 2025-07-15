"use client";

import React, { useMemo } from "react";
import New from "@/components/new";
import ListTrailers from "@/components/list-trailers";
import { useFeed } from "@/lib/hooks";
import { Skeleton } from "@nextui-org/skeleton";
import InfiniteScroll from "react-infinite-scroll-component";

export default function Home() {
  const {
    data: pagination,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isPending,
  } = useFeed();

  const trailers = useMemo(() => {
    return (
      pagination?.pages
        .flatMap((page: any) => page)
        .flatMap((page: any) => page.items) || []
    );
  }, [pagination]);

  return (
    <div>
      <div className="w-full flex justify-center mb-4 md:mb-16">
        <div className="max-w-lg">
          <New />
        </div>
      </div>

      <InfiniteScroll
        dataLength={trailers.length}
        endMessage={
          <div className="w-full h-20 flex justify-center items-center">
            <p className="text-gray-500 text-sm">No more trailers</p>
          </div>
        }
        hasMore={hasNextPage}
        loader={
          <Skeleton className="w-full h-full min-h-[235px] rounded-large" />
        }
        next={fetchNextPage}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6"
      >
        <ListTrailers
          trailers={trailers}
          isLoading={isLoading}
          isPending={isPending}
        />
      </InfiniteScroll>
    </div>
  );
}
