import { Layout } from "@/views/components/layout";

export function ErrorPage({
  status,
  message,
}: {
  status: number;
  message: string;
}) {
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
