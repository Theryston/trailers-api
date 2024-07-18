import axios from "axios";

export const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_API_URL,
});

export const fetcher = (url: string) => client.get(url).then((res) => res.data);
