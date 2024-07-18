"use client";

import useSWR from "swr";

import Trailer from "./trailer";

import { fetcher } from "@/lib/api";

export default function LastTrailers() {
  const { data: trailers } = useSWR("/trailers/feed", fetcher);

  return (
    <>
      {!trailers || !trailers.length ? (
        <></>
      ) : (
        <div>
          <div className="w-full h-full flex flex-col justify-center gap-4">
            <div className="flex flex-col gap-0">
              <h2 className="text-2xl font-bold">Last Trailers</h2>
              <p className="text-gray-500">
                See some trailers downloaded by our users
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {trailers.map((t: any) => (
                <Trailer
                  key={t.id}
                  showProcess
                  process={t.process}
                  trailer={t}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
