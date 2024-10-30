import React from "react";

import New from "@/components/new";
import ListTrailers from "@/components/list-trailers";

export default function Home() {
  return (
    <div className="w-full h-full items-end flex flex-wrap-reverse gap-6 md:gap-24 justify-center pt-16">
      <ListTrailers />
      <New />
    </div>
  );
}
