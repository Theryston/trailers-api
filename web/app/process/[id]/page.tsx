import { redirect } from "next/navigation";

import Content from "./content";

import { client } from "@/lib/api";

type Props = {
  params: {
    id: string;
  };
};

export default async function Page({ params }: Props) {
  try {
    const { data: process } = await client.get(`/process/${params.id}`);

    if (!process) return redirect("/");

    return <Content id={params.id} process={process} />;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);

    return redirect("/");
  }
}
