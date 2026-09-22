export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">MyOnlineCikgu</h1>

      <p className="text-gray-500">
        Find. Book. Learn. Improve.
      </p>

      <a
        href="/signup"
        className="text-blue-600 underline"
      >
        Go to Sign Up
      </a>
    </main>
  )
}