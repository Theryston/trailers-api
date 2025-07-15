"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { CircularProgress } from "@nextui-org/progress";
import { Link } from "@nextui-org/link";
import { Button } from "@nextui-org/button";
import { LANGUAGES } from "@/lib/languages";
import Trailer from "@/components/trailer";
import { useProcess, useServices } from "@/lib/hooks";

type Props = {
  id: string;
  process: any;
};

export default function Content({ id, process: cachedProcess }: Props) {
  const [isCompleted, setIsCompleted] = useState(
    cachedProcess.isCompleted !== 1
  );

  const { data: processRequested, error } = useProcess(id, !isCompleted);

  const router = useRouter();
  const process = processRequested || cachedProcess;

  useEffect(() => {
    if (processRequested) {
      setIsCompleted(processRequested.isCompleted === 1);
    } else {
      setIsCompleted(cachedProcess.isCompleted !== 1);
    }
  }, [processRequested?.isCompleted]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to fetch process");
      router.push("/");
    }
  }, [error, router]);

  return (
    <div className="w-full h-full flex flex-col justify-center gap-4 relative">
      <Process process={process} />
    </div>
  );
}

function Process({ process }: { process: any }) {
  const { data: services } = useServices();

  const servicesOptions = [
    { value: "ALL", label: "All Services" },
    ...(services?.map((s: any) => ({ value: s.name, label: s.friendlyName })) ||
      []),
  ];

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          Informações Básicas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {process.name && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-gray-600">Nome</p>
              <p className="text-gray-800 text-xs">{process.name}</p>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-600">Status</p>
            <p className="text-gray-800 text-xs capitalize">{process.status}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-600">Baixado de</p>
            <p className="text-gray-800 text-xs">
              {servicesOptions.find((s) => s.value === process.serviceName)
                ?.label || "N/A"}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-600">Idioma</p>
            <p className="text-gray-800 text-xs">
              {process.lang
                ? LANGUAGES.find((l) => l.value === process.lang)?.label
                : "Não encontrado"}
            </p>
          </div>
          {process.year && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-gray-600">Ano</p>
              <p className="text-gray-800 text-xs">{process.year}</p>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-600">
              Faixas de Áudio Completas
            </p>
            <p className="text-gray-800 text-xs">
              {process.fullAudioTracks ? "Sim" : "Não"}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-600">URL do Trailer</p>
            {process.trailerPage ? (
              <Link
                isExternal
                className="text-blue-600 hover:text-blue-800 transition-colors break-all text-xs"
                href={process.trailerPage}
              >
                {process.trailerPage}
              </Link>
            ) : (
              <p className="text-gray-800 italic text-xs">URL não encontrada</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-600">
              Serviços Incluídos
            </p>
            <div className="flex flex-wrap gap-2">
              {process.services
                .split("|")
                .map((service: any, index: number) => {
                  const serviceLabel = servicesOptions.find(
                    (s) => s.value === service
                  )?.label;
                  return serviceLabel ? (
                    <span
                      key={index}
                      className="px-3 py-1 h-fit w-fit bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {serviceLabel}
                    </span>
                  ) : null;
                })}
            </div>
          </div>
          {process.statusDetails && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-gray-600">
                Serviços Incluídos
              </p>
              <p className="text-black text-xs leading-relaxed">
                {process.statusDetails}
              </p>
            </div>
          )}
        </div>
      </div>

      {process.isCompleted === 1 ? (
        <>
          {!process.trailers?.length && (
            <p className="text-gray-500 text-center">No trailers found</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {process.trailers?.map((trailer: any) => (
              <Trailer key={trailer.id} trailer={trailer} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <CircularProgress className="mt-5" label="Processing trailers..." />
        </div>
      )}
    </div>
  );
}
