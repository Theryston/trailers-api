import appleTv from "./appleTv/index.js";
import netflix from "./netflix/index.js";

export default function getServices() {
  return [
    {
      name: "APPLE_TV",
      domain: "tv.apple.com",
      func: appleTv,
    },
    {
      name: "NETFLIX",
      domain: "www.netflix.com",
      func: netflix,
    },
  ];
}
