"use client";

import { useMemo } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Spinner } from "@nextui-org/spinner";

import Trailer from "./trailer";

import { useFeed } from "@/lib/hooks";

export default function ListTrailers() {
  const { data: pagination, fetchNextPage, hasNextPage } = useFeed(2);
  const trailers = useMemo(() => {
    return (
      pagination?.pages.flatMap((page) => page).flatMap((page) => page.items) ||
      []
    );
  }, [pagination]);

  return (
    <div>
      <div className="w-full h-full flex flex-col justify-center gap-4">
        <div className="flex flex-col gap-0">
          <h2 className="text-2xl font-bold">Last Trailers</h2>
          <p className="text-gray-500">
            See some trailers downloaded by our users
          </p>
        </div>

        <InfiniteScroll
          className="flex flex-col gap-4"
          dataLength={trailers.length}
          endMessage={
            <div className="w-full h-20 flex justify-center items-center">
              <p className="text-gray-500 text-sm">No more trailers</p>
            </div>
          }
          hasMore={hasNextPage}
          loader={
            <div className="w-full h-20 flex justify-center items-center">
              <Spinner />
            </div>
          }
          next={fetchNextPage}
        >
          {trailers.map((t: any) => (
            <Trailer key={t.id} showProcess process={t.process} trailer={t} />
          ))}
        </InfiniteScroll>
      </div>
    </div>
  );
}
