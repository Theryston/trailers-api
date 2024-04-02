import appleTv from "./appleTv/index.js";
import netflix from "./netflix/index.js";

export default function getServices() {
  return [
    {
      name: "APPLE_TV",
      func: appleTv,
    },
    {
      name: "NETFLIX",
      func: netflix,
    },
  ];
}
