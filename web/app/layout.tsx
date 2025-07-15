import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";
import { Link } from "@nextui-org/link";
import { Divider } from "@nextui-org/divider";
import { GoogleTagManager } from "@next/third-parties/google";

import { Providers } from "./providers";

import { fontSans } from "@/config/fonts";
import Header from "./Header";

export const metadata: Metadata = {
  title: {
    default: "Trailers Downloader",
    template: "%s - Trailers Downloader",
  },
  description:
    "A API that downloads movie and tv shows trailers in high resolution from services like Netflix, Apple TV, Prime Video and more",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <GoogleTagManager gtmId="GTM-N8LBXLPR" />
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <Providers themeProps={{ attribute: "class", forcedTheme: "light" }}>
          <div className="relative flex flex-col h-screen">
            <Header />
            <main className="w-full pt-2 px-2 md:px-4 md:pt-4 flex-grow">
              {children}
            </main>
            <Divider className="mt-8" />
            <div className="flex justify-around md:justify-center items-center gap-0 md:gap-24 py-4">
              <Link
                isExternal
                className="text-xs"
                href={`${process.env.NEXT_PUBLIC_BASE_API_URL}/docs`}
              >
                API
              </Link>
              <Divider orientation="vertical" />
              <Link
                isExternal
                className="text-xs"
                href="https://github.com/Theryston/trailers-api"
              >
                GitHub
              </Link>
              <Divider orientation="vertical" />
              <Link className="text-xs" href="/terms">
                Terms of Use &amp; Privacy Policy
              </Link>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
