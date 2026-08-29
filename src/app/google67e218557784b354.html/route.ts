export function GET() {
  return new Response("google-site-verification: google67e218557784b354.html\n", {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
