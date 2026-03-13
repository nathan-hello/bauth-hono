import { RouteMetadata } from "@/lib/copy/en";
import type { Child } from "hono/jsx";
import { CopyProvider, type Copy } from "@/lib/copy";

export function Layout({ meta, children, copy }: { meta: RouteMetadata; children: Child; copy: Copy }) {
    return (
        <html lang="en" style={{ backgroundColor: "#C297A0" }}>
            <head>
                <title>{meta.title}</title>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <link rel="stylesheet" href="/styles.css" />
            </head>
            <body class="font-sans bg-[url('/carpark.webp')] bg-center bg-cover bg-fixed min-h-screen p-4 flex items-center justify-center flex-col text-fg text-xl">
                <a href="/">
                    <img src="/favicon.svg" class="py-2 cursor-pointer mx-auto h-10 w-auto" />
                </a>
                <CopyProvider copy={copy}>{children}</CopyProvider>
            </body>
        </html>
    );
}
