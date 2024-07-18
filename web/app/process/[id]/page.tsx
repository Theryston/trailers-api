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
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@nextui-org/modal";
import { ArrowTopRightIcon } from "@radix-ui/react-icons";

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

export function Trailer({
  trailer,
  process,
  showProcess = false,
}: {
  trailer: any;
  process?: any;
  showProcess?: boolean;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingProgress, setDownloadingProgress] = useState(0);
  const {
    isOpen: isSubtitlesOpen,
    onOpen: onOpenSubtitles,
    onOpenChange: onOpenSubtitlesChange,
  } = useDisclosure();

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
    <Card isFooterBlurred className="border-none relative" radius="lg">
      {showProcess && (
        <Link
          isExternal
          className="absolute right-1 top-1 z-50"
          href={`/process/${trailer.processId}`}
        >
          <Button
            isIconOnly
            className="flex justify-center items-center"
            color="success"
            size="sm"
          >
            <ArrowTopRightIcon />
          </Button>
        </Link>
      )}
      <Image
        className="object-cover max-w-full"
        height={300}
        src={trailer.thumbnailUrl}
        width={500}
      />
      <CardFooter className="justify-between gap-2 flex-col before:bg-white/10 border-white/20 border-1 overflow-hidden py-1 absolute before:rounded-xl rounded-large bottom-1 w-[calc(100%_-_8px)] shadow-small ml-1 z-10">
        <div className="flex flex-col gap-2 w-full">
          <p className="w-full truncate text-white">
            <b>Title:</b> {trailer.title}
          </p>
          {process?.name ? (
            <p className="w-full truncate text-white">
              <b>Process Name:</b> {process.name}
            </p>
          ) : (
            <>
              {process?.trailerPage && (
                <p className="w-full truncate text-white">
                  <b>Page URL:</b>{" "}
                  <Link isExternal href={process.trailerPage}>
                    {process.trailerPage}
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex justify-between gap-2 w-full">
          <Button
            fullWidth
            color="primary"
            isLoading={isDownloading}
            size="sm"
            onClick={download}
          >
            {isDownloading ? `${downloadingProgress}%` : "Download"}
          </Button>
          <Link isExternal className="w-full" href={trailer.url}>
            <Button fullWidth color="primary" size="sm" variant="ghost">
              Open
            </Button>
          </Link>
          <Button
            fullWidth
            color="primary"
            size="sm"
            variant="ghost"
            onClick={onOpenSubtitles}
          >
            Subtitles
          </Button>
        </div>
      </CardFooter>

      <ModalSubtitles
        isOpen={isSubtitlesOpen}
        subtitles={trailer.subtitles || []}
        onOpenChange={onOpenSubtitlesChange}
      />
    </Card>
  );
}

type ModalSubtitlesProps = {
  subtitles: any[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

function ModalSubtitles({
  subtitles,
  isOpen,
  onOpenChange,
}: ModalSubtitlesProps) {
  return (
    <Modal isOpen={isOpen} placement="top-center" onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="font-bold text-2xl">Subtitles</h2>
        </ModalHeader>
        <ModalBody>
          {!subtitles || !subtitles.length ? (
            <p className="text-gray-500">No subtitles found</p>
          ) : (
            <div className="flex flex-col gap-4">
              {subtitles.map((subtitle: any) => (
                <Subtitle key={subtitle.id} subtitle={subtitle} />
              ))}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function Subtitle({ subtitle }: any) {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      const { data } = await axios.get(subtitle.url, { responseType: "blob" });

      const blob = new Blob([data], { type: "text/vtt" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `${subtitle.language}.vtt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download subtitle");
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, subtitle.url]);

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <p className="text-gray-500">{subtitle.language}</p>
      <div className="flex gap-2">
        <Button
          className="w-[150px]"
          color="primary"
          isLoading={isDownloading}
          size="sm"
          onClick={download}
        >
          Download
        </Button>
        <Link isExternal href={subtitle.url}>
          <Button color="primary" size="sm" variant="ghost">
            Open
          </Button>
        </Link>
      </div>
    </div>
  );
}
