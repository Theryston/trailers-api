import { redirect } from "next/navigation";

import Content from "./content";

import { getProcess } from "@/lib/fetchers";

type Props = {
  params: {
    id: string;
  };
};

export default async function Page({ params }: Props) {
  try {
    const process = await getProcess(params.id);

    if (!process) return redirect("/");

    return <Content id={params.id} process={process} />;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);

    return redirect("/");
  }
}
