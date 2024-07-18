"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { CircularProgress } from "@nextui-org/progress";
import { Link } from "@nextui-org/link";
import { Card, CardFooter } from "@nextui-org/card";
import { Button } from "@nextui-org/button";
import { Image } from "@nextui-org/image";
import axios from "axios";

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

      <div className="w-full flex flex-wrap justify-center gap-4 py-5">
        {process.trailers?.map((trailer: any) => (
          <Trailer key={trailer.id} trailer={trailer} />
        ))}
      </div>
    </div>
  );
}

function Trailer({ trailer }: { trailer: any }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingProgress, setDownloadingProgress] = useState(0);

  const download = useCallback(async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadingProgress(0);

    try {
      const { data } = await axios.get(trailer.url, {
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );

          setDownloadingProgress(progress);
        },
      });

      const blob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `${trailer.title}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download trailer");
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, trailer.url]);

  return (
    <Card isFooterBlurred className="border-none" radius="lg">
      <Image
        className="object-cover max-w-full"
        height={300}
        src={trailer.thumbnailUrl}
        width={500}
      />
      <CardFooter className="justify-between gap-2 flex-col before:bg-white/10 border-white/20 border-1 overflow-hidden py-1 absolute before:rounded-xl rounded-large bottom-1 w-[calc(100%_-_8px)] shadow-small ml-1 z-10">
        <p className="w-full truncate text-white">
          <b>Title:</b> {trailer.title}
        </p>
        <div className="flex justify-between gap-2 w-full">
          <Button
            fullWidth
            color="primary"
            isLoading={isDownloading}
            onClick={download}
          >
            {isDownloading ? `${downloadingProgress}%` : "Download"}
          </Button>
          <Link isExternal className="w-full" href={trailer.url}>
            <Button fullWidth color="primary" variant="ghost">
              Open
            </Button>
          </Link>
          <Button fullWidth color="primary" variant="ghost">
            Subtitles
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
