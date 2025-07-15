"use client";

import { Skeleton } from "@nextui-org/skeleton";
import Trailer from "./trailer";

export default function ListTrailers({
  trailers,
  isLoading,
  isPending,
}: {
  trailers: any[];
  isLoading: boolean;
  isPending: boolean;
}) {
  return (
    <>
      {(isLoading || isPending) && (
        <>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={index}
              className="w-full h-full min-h-[235px] rounded-large"
            />
          ))}
        </>
      )}

      {trailers.map((t: any) => (
        <Trailer
          key={t.id}
          process={t.process}
          trailer={t}
          clickable
          ignoreButtons
        />
      ))}
    </>
  );
}
