"use client";

import axios from "axios";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@nextui-org/modal";
import { Card } from "@nextui-org/card";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Link } from "@nextui-org/link";
import { Button } from "@nextui-org/button";

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;

  return text.substr(0, maxLength - 3) + "...";
}

export default function Trailer({
  trailer,
  process,
  clickable = false,
  customHeight = "235px",
  ignoreButtons = false,
}: {
  trailer: any;
  process?: any;
  clickable?: boolean;
  customHeight?: string;
  ignoreButtons?: boolean;
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
    <Card
      isFooterBlurred
      className="border-none relative w-full h-full"
      style={{
        backgroundImage: `url(${trailer.thumbnailUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: customHeight,
      }}
      radius="lg"
    >
      {clickable && (
        <Link
          className="absolute top-0 left-0 w-full h-full z-30 hover:bg-black/50 transition-all duration-300"
          href={`/process/${trailer.processId}`}
        />
      )}
      <div className="absolute bottom-0 h-fit z-40 w-full flex-col gap-2 p-2 bg-gradient-to-t from-black to-transparent">
        <p className="w-full truncate text-white">
          <b>Title:</b> {trailer.title}
        </p>
        {process?.name ? (
          <p className="w-full text-white">
            <b>Process Name:</b> {truncateText(process.name, 28)}
          </p>
        ) : (
          process?.trailerPage && (
            <p className="w-full text-white">
              <b>Page URL:</b>{" "}
              <Link isExternal href={process.trailerPage}>
                {truncateText(process.trailerPage, 28)}
              </Link>
            </p>
          )
        )}

        {!ignoreButtons && (
          <div className="flex justify-between gap-2 w-full">
            <Button
              fullWidth
              variant="faded"
              isLoading={isDownloading}
              size="sm"
              onClick={download}
            >
              {isDownloading ? `${downloadingProgress}%` : "Download"}
            </Button>
            <Link isExternal className="w-full" href={trailer.url}>
              <Button fullWidth size="sm" variant="faded">
                Open
              </Button>
            </Link>
            <Button
              fullWidth
              variant="faded"
              size="sm"
              onClick={onOpenSubtitles}
            >
              Subtitles
            </Button>
          </div>
        )}
      </div>

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
        <ModalBody className="max-h-[80vh] overflow-y-auto">
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
