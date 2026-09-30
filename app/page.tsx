import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex-1 min-h-screen bg-[#F6F3EC]">
      <section className="max-w-3xl mx-auto px-4 pt-20 pb-16">
        <h1
          className="text-5xl leading-tight font-semibold text-[#1C3529] mb-5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Learning starts with the right tutor.
        </h1>
        <p className="text-lg text-[#332B1F] max-w-xl mb-8">
          Book verified tutors for Primary, Secondary and University subjects across
          Malaysia — search, schedule, pay and attend class, all in one place.
        </p>
        <div className="flex gap-3">
          <Link
            href="/signup"
            className="bg-[#2B5D45] text-white px-6 py-3 rounded-full font-medium hover:bg-[#1F4634]"
          >
            Ready to learn
          </Link>
          <Link
            href="/signup"
            className="border-2 border-[#2B5D45] text-[#2B5D45] px-6 py-3 rounded-full font-medium hover:bg-[#F6F3EC]"
          >
            Become a tutor
          </Link>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-20">
        <div className="border-t-2 border-[#D8D2C4] pt-10">
          <ol className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            {[
              { n: '1', label: 'Find', text: 'Search tutors by subject, level and price.' },
              { n: '2', label: 'Book', text: 'Pick a class time that works for you.' },
              { n: '3', label: 'Learn', text: 'Join a live class from your browser.' },
              { n: '4', label: 'Improve', text: 'Track progress and rate your tutor.' },
            ].map((step) => (
              <li key={step.n}>
                <span
                  className="text-3xl text-[#E3A73B] font-semibold"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {step.n}
                </span>
                <p className="font-semibold text-[#1C3529] mt-2 mb-1">{step.label}</p>
                <p className="text-sm text-[#332B1F]">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}