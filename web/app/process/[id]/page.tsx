"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect } from "react";
import { CircularProgress } from "@nextui-org/progress";
import { Link } from "@nextui-org/link";
import { Button } from "@nextui-org/button";

import { fetcher } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import Trailer from "@/components/trailer";

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
    <div className="w-full h-full flex justify-center pt-16 gap-4 relative">
      <Link className="absolute top-0 left-0" href="/">
        <Button color="primary" size="sm" variant="flat">
          Back
        </Button>
      </Link>
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
        {process.name && (
          <div className="flex justify-between w-full">
            <p className="font-bold">Name:</p>
            <p className="text-gray-500">{process.name}</p>
          </div>
        )}

        <div className="flex justify-between w-full flex-wrap">
          <p className="font-bold">Page URL:</p>
          {process.trailerPage ? (
            <Link
              isExternal
              className="inline-block max-w-xs truncate"
              href={process.trailerPage}
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

        {process.year && (
          <div className="flex justify-between w-full">
            <p className="font-bold">Year:</p>
            <p className="text-gray-500">{process.year}</p>
          </div>
        )}

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

        <div className="flex justify-between w-full flex-wrap">
          <p className="font-bold">Details:</p>
          <p className="text-gray-500 inline-block max-w-xs truncate">
            {process.statusDetails}
          </p>
        </div>
      </div>

      {process.isCompleted === 1 ? (
        <>
          {!process.trailers?.length && (
            <p className="text-gray-500 text-center">No trailers found</p>
          )}

          <div className="w-full flex flex-wrap justify-center gap-4 py-5">
            {process.trailers?.map((trailer: any) => (
              <Trailer key={trailer.id} trailer={trailer} />
            ))}
          </div>
        </>
      ) : (
        <CircularProgress className="mt-5" label="Processing trailers..." />
      )}
    </div>
  );
}
