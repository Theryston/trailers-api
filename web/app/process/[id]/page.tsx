"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect } from "react";
import { CircularProgress } from "@nextui-org/progress";
import { Link } from "@nextui-org/link";

import { fetcher } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";

type Props = {
  params: {
    id: string;
  };
};

export default function Page({ params: { id } }: Props) {
  const {
    data: process,
    error,
    isLoading,
  } = useSWR(`/process/${id}`, fetcher, {
    refreshInterval: 2 * 1000,
  });
  const router = useRouter();

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to fetch process");
      router.push("/");
    }
  }, [error, router]);

  return (
    <div className="w-full h-full flex justify-center pt-16 gap-4">
      {isLoading ? (
        <CircularProgress label="Loading..." />
      ) : (
        <Process process={process} />
      )}
    </div>
  );
}

function Process({ process }: { process: any }) {
  const { data: services } = useSWR("/services", fetcher);

  const servicesOptions = [
    { value: "ALL", label: "All Services" },
    ...(services?.map((s: any) => ({ value: s.name, label: s.friendlyName })) ||
      []),
  ];

  return (
    <div className="w-full h-full flex items-center flex-col gap-5">
      <div className="w-full flex flex-col gap-4 max-w-xl">
        <div className="flex justify-between w-full flex-wrap">
          <p className="font-bold">Page URL:</p>
          {process.trailerPage ? (
            <Link
              className="inline-block max-w-xs truncate"
              href={process.trailerPage}
              rel="noreferrer"
              target="_blank"
            >
              {process.trailerPage}
            </Link>
          ) : (
            <p className="text-gray-500">Not found</p>
          )}
        </div>

        <div className="flex justify-between w-full">
          <p className="font-bold">Status:</p>
          <p className="text-gray-500">{process.status}</p>
        </div>

        <div className="flex justify-between w-full">
          <p className="font-bold">Details:</p>
          <p className="text-gray-500">{process.statusDetails}</p>
        </div>

        <div className="flex justify-between w-full">
          <p className="font-bold">Service Name:</p>
          <p className="text-gray-500">
            {
              servicesOptions.find((s) => s.value === process.serviceName)
                ?.label
            }
          </p>
        </div>

        <div className="flex justify-between w-full">
          <p className="font-bold">Language:</p>
          <p className="text-gray-500">
            {process.lang
              ? LANGUAGES.find((l) => l.value === process.lang)?.label
              : "Not found"}
          </p>
        </div>

        <div className="flex justify-between w-full">
          <p className="font-bold">Year:</p>
          <p className="text-gray-500">{process.year}</p>
        </div>

        <div className="flex justify-between w-full">
          <p className="font-bold">Full Audio Tracks:</p>
          <p className="text-gray-500">
            {process.fullAudioTracks ? "Yes" : "No"}
          </p>
        </div>

        <div className="flex justify-between w-full flex-wrap">
          <p className="font-bold">All Included Services:</p>
          <p className="text-gray-500">
            {process.services
              .split("|")
              .map(
                (service: any) =>
                  servicesOptions.find((s) => s.value === service)?.label
              )
              .join(", ")}
          </p>
        </div>
      </div>

      {!process.trailers?.length && (
        <p className="text-gray-500 text-center">No trailers found</p>
      )}

      <div className="w-full flex flex-wrap gap-4">
        {process.trailers?.map((trailer: any) => (
          <Trailer key={trailer.id} trailer={trailer} />
        ))}
      </div>
    </div>
  );
}

function Trailer({ trailer }: { trailer: any }) {
  return <div>{trailer.url}</div>;
}
