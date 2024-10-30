import { client } from "./api";

export const getServices = async () => {
  const { data } = await client.get("/services");

  return data;
};

export const getProcess = async (id: string) => {
  const { data } = await client.get(`/process/${id}`);

  return data;
};

export const getFeed = async (page: number, limit: number) => {
  const { data } = await client.get(
    `/trailers/feed?page=${page}&limit=${limit}`
  );

  return data;
};

export const createProcessByTrailerPage = async (body: any) => {
  const { data } = await client.post("/process/by-trailer-page", body);

  return data;
};

export const createProcess = async (body: any) => {
  const { data } = await client.post("/process", body);

  return data;
};
