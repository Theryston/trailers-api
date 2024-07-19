import Script from "next/script";

export default function GoogleAdsense() {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return (
    <Script
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
      strategy="afterInteractive"
    />
  );
}
