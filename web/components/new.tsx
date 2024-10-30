"use client";

import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Tabs, Tab } from "@nextui-org/tabs";
import { Autocomplete, AutocompleteItem } from "@nextui-org/autocomplete";
import { Switch } from "@nextui-org/switch";
import { useCallback, useState } from "react";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Select, SelectItem } from "@nextui-org/select";

import { client } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import {
  useCreateProcess,
  useCreateProcessByTrailerPage,
  useServices,
} from "@/lib/hooks";

export default function New() {
  return (
    <Card className="h-fit w-full md:w-1/2 md:min-w-[500px]">
      <CardHeader className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Download Trailers</h2>
      </CardHeader>
      <CardBody>
        <Tabs fullWidth>
          <Tab key="page-url" title="By Page URL">
            <PageUrl />
          </Tab>
          <Tab key="search" title="Search Trailer">
            <Search />
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
}

function PageUrl() {
  const router = useRouter();
  const { data: services } = useServices();
  const [pageUrl, setPageUrl] = useState("");
  const [langValue, setLangValue] = useState("en-US");
  const [fullAudioTracksValue, setFullAudioTracksValue] = useState(true);
  const { mutateAsync: createProcessByTrailerPage, isPending: isLoading } =
    useCreateProcessByTrailerPage();

  const onSubmit = useCallback(async () => {
    if (!pageUrl) {
      toast.error("Page URL is required");

      return;
    }

    if (!pageUrl.startsWith("https://")) {
      toast.error("Page URL must start with https://");

      return;
    }

    if (
      !fullAudioTracksValue &&
      !LANGUAGES.find((l) => l.value === langValue)
    ) {
      toast.error(
        "Language must be one of: " + LANGUAGES.map((l) => l.label).join(", ")
      );

      return;
    }

    try {
      const { processId } = await createProcessByTrailerPage({
        trailerPage: pageUrl,
        fullAudioTracks: fullAudioTracksValue,
        lang: fullAudioTracksValue ? undefined : langValue,
      });

      router.push(`/process/${processId}`);
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to download trailers");
      }
    }
  }, [pageUrl, langValue, fullAudioTracksValue, createProcessByTrailerPage]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 text-center">
        Insert a page URL from any of these services:{" "}
        {services?.map((service: any) => service.friendlyName).join(", ")} And
        this tool will automatically download the trailer for you
      </p>
      <Input
        label="Page URL"
        placeholder="https://www.netflix.com/title/81223025"
        size="sm"
        value={pageUrl}
        onChange={(e) => setPageUrl(e.target.value)}
      />
      <DefaultFields
        fullAudioTracksValue={fullAudioTracksValue}
        langValue={langValue}
        onFullAudioTracksChange={setFullAudioTracksValue}
        onLangChange={setLangValue}
      />
      <Button
        fullWidth
        color="primary"
        isLoading={isLoading}
        onClick={onSubmit}
      >
        Download Trailers
      </Button>
    </div>
  );
}

const YEARS = Array.from(
  { length: new Date().getFullYear() - 1800 + 1 },
  (_, i) => i + 1800
).map((item) => ({
  value: item.toString(),
  label: item.toString(),
}));

function Search() {
  const { data: services } = useServices();
  const [service, setService] = useState("");
  const [name, setName] = useState("");
  const [langValue, setLangValue] = useState("en-US");
  const [fullAudioTracksValue, setFullAudioTracksValue] = useState(true);
  const [yearValue, setYearValue] = useState("");
  const router = useRouter();
  const { mutateAsync: createProcess, isPending: isLoading } =
    useCreateProcess();

  const servicesOptions = [
    { value: "ALL", label: "All Services" },
    ...(services?.map((s: any) => ({ value: s.name, label: s.friendlyName })) ||
      []),
  ];

  const onSubmit = useCallback(async () => {
    if (!service || !servicesOptions.find((s) => s.value === service)) {
      toast.error(
        `Service must be one of: ${servicesOptions
          .map((s) => s.label)
          .join(", ")}`
      );

      return;
    }

    if (!name) {
      toast.error("Name is required");

      return;
    }

    if (!yearValue || !YEARS.find((y) => y.value === yearValue)) {
      toast.error("Please select a year");

      return;
    }

    if (
      !fullAudioTracksValue &&
      !LANGUAGES.find((l) => l.value === langValue)
    ) {
      toast.error(
        "Language must be one of: " + LANGUAGES.map((l) => l.label).join(", ")
      );

      return;
    }

    try {
      const { processId } = await createProcess({
        serviceName: service,
        name,
        year: yearValue,
        lang: fullAudioTracksValue ? undefined : langValue,
        fullAudioTracks: fullAudioTracksValue,
      });

      router.push(`/process/${processId}`);
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to download trailers");
      }
    }
  }, [
    service,
    name,
    yearValue,
    langValue,
    fullAudioTracksValue,
    createProcess,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 text-center">
        Insert some data from the movie or tv show and this tool will
        automatically search and download the trailers from any of these
        services:{" "}
        {services?.map((service: any) => service.friendlyName).join(", ")}
      </p>

      <Select
        items={servicesOptions}
        label="Service"
        multiple={false}
        selectedKeys={[service]}
        size="sm"
        onSelectionChange={(value) =>
          setService((value?.currentKey as string) || "")
        }
      >
        {(item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        )}
      </Select>

      <div className="flex gap-4 flex-col md:flex-row">
        <Input
          fullWidth
          label="Name"
          placeholder="The Batman"
          size="sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Autocomplete
          className="w-full md:w-1/3"
          defaultItems={YEARS}
          label="Year"
          placeholder="2022"
          size="sm"
          value={yearValue}
          onSelectionChange={(value) => setYearValue(value as string)}
        >
          {(item) => (
            <AutocompleteItem key={item.value} value={item.value}>
              {item.label}
            </AutocompleteItem>
          )}
        </Autocomplete>
      </div>

      <DefaultFields
        fullAudioTracksValue={fullAudioTracksValue}
        langValue={langValue}
        onFullAudioTracksChange={setFullAudioTracksValue}
        onLangChange={setLangValue}
      />

      <Button
        fullWidth
        color="primary"
        isLoading={isLoading}
        onClick={onSubmit}
      >
        Download Trailers
      </Button>
    </div>
  );
}

type DefaultFieldProps = {
  langValue: string;
  fullAudioTracksValue: boolean;
  onLangChange: (value: string) => void;
  onFullAudioTracksChange: (value: boolean) => void;
};

function DefaultFields({
  langValue,
  fullAudioTracksValue,
  onFullAudioTracksChange,
  onLangChange,
}: DefaultFieldProps) {
  return (
    <div className="flex flex-col gap-4">
      <Switch
        isSelected={fullAudioTracksValue}
        size="sm"
        onValueChange={onFullAudioTracksChange}
      >
        <p className="text-sm text-gray-500">
          Create multi-audio video with all the available languages
        </p>
      </Switch>
      {!fullAudioTracksValue && (
        <Autocomplete
          defaultItems={LANGUAGES}
          multiple={false}
          selectedKey={langValue}
          onSelectionChange={(key) => onLangChange(key as string)}
        >
          {(item) => (
            <AutocompleteItem key={item.value}>{item.label}</AutocompleteItem>
          )}
        </Autocomplete>
      )}
    </div>
  );
}
