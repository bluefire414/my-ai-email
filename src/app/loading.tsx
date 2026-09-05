export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <h1 className="text-2xl font-bold sm:text-3xl">今日簡報</h1>
      <p className="mt-3 text-sm text-black/50 dark:text-white/50">
        正在抓取天氣、股價與新聞，並請 AI 統整，大約需要 10 秒…
      </p>
    </main>
  );
}
