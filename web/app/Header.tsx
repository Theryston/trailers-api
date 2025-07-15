"use client";

import { Button } from "@nextui-org/button";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white mb-4">
      <Link href="/">
        <h1 className="text-2xl font-bold">Trailers API</h1>
      </Link>
      {pathname !== "/" && (
        <Button size="sm" variant="faded" onClick={() => router.back()}>
          Back
        </Button>
      )}
    </div>
  );
}
