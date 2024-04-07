import appleTv from "./appleTv/index.js";
import netflix from "./netflix/index.js";
import primeVideo from "./primeVideo/index.js";

export default function getServices() {
  return [
    {
      name: "APPLE_TV",
      friendlyName: "Apple TV",
      domain: "tv.apple.com",
      func: appleTv,
    },
    {
      name: "PRIME_VIDEO",
      friendlyName: "Prime Video",
      domain: "primevideo.com",
      func: primeVideo,
    },
    {
      name: "NETFLIX",
      friendlyName: "Netflix",
      domain: "netflix.com",
      func: netflix,
    },
  ];
}
