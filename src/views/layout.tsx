import type { Child } from "hono/jsx";

export function Layout({ title, children }: { title: string; children: Child }) {
  return (
    <html lang="en">
      <head>
        <title>{title}</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="font-sans bg-[url('/carpark.webp')] bg-center bg-cover bg-fixed min-h-screen p-4 flex items-center justify-start flex-col select-none text-fg">
        <a href="/">
          <img src="/favicon.svg" class="py-2 cursor-pointer mx-auto h-10 w-auto" />
        </a>
        {children}
      </body>
    </html>
  );
}

export function ErrorPage({ status, message }: { status: number; message: string }) {
  return (
    <Layout title={`${status} - Error`}>
      <div class="flex min-h-screen items-center justify-center">
        <div class="text-center bg-black p-16">
          <h1 class="text-4xl font-bold">{status}</h1>
          <p class="mt-4 text-lg text-gray-600">{message}</p>
          <a href="/" class="mt-6 inline-block text-blue-600 hover:underline">
            Go home
          </a>
        </div>
      </div>
    </Layout>
  );
}
