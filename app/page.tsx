import Link from 'next/link'

const steps = [
  { n: '1', label: 'Find', text: 'Search tutors by subject, level and price.' },
  { n: '2', label: 'Book', text: 'Pick a class time that works for you.' },
  { n: '3', label: 'Learn', text: 'Join a live class from your browser.' },
  { n: '4', label: 'Improve', text: 'Track progress and rate your tutor.' },
]

const reasons = [
  {
    title: 'Tutors are checked',
    text: 'Our team reviews each tutor’s certificate or ID before they get a Verified tag.',
    icon: (
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4" />
    ),
  },
  {
    title: 'Live class, no download',
    text: 'Join your class from the browser on your phone or laptop.',
    icon: (
      <>
        <rect x="2" y="6" width="14" height="12" rx="3" />
        <path d="m16 10 6-3v10l-6-3" />
      </>
    ),
  },
  {
    title: 'See how you are doing',
    text: 'Attendance, tutor notes and ratings are kept in My learning.',
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="m7 15 4-4 3 3 5-6" />
      </>
    ),
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F3F5F7]">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-12 md:pt-16 md:pb-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-[34px] sm:text-5xl leading-[1.1] font-extrabold tracking-tight text-[#0F1B2D]">
            Learning starts with the right tutor.
          </h1>
          <p className="text-base sm:text-lg text-[#566274] mt-4 max-w-md">
            Book verified tutors for Primary, Secondary and University subjects across Malaysia. Search, schedule,
            pay and attend class, all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <Link
              href="/signup"
              className="h-12 px-6 rounded-[10px] bg-[#0A7B83] text-white font-bold hover:bg-[#075A61] inline-flex items-center justify-center"
            >
              Ready to learn
            </Link>
            <Link
              href="/signup"
              className="h-12 px-6 rounded-[10px] border border-[#0A7B83] bg-white text-[#075A61] font-bold hover:bg-[#E1F1F2] inline-flex items-center justify-center"
            >
              Become a tutor
            </Link>
          </div>
        </div>

        {/* Sample card */}
        <div className="relative max-w-sm w-full mx-auto md:ml-auto">
          <div className="bg-white border border-[#DDE2E8] rounded-[14px] overflow-hidden shadow-sm">
            <div className="relative h-44 bg-[#CFE6E7] flex items-center justify-center text-6xl font-extrabold text-[#0A7B83]">
              NA
              <span className="absolute top-3 left-3 h-6 px-2 rounded-xl bg-white text-[#0A7B83] text-xs font-bold flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12 5 5 9-10" />
                </svg>
                Verified
              </span>
            </div>
            <div className="p-4 space-y-1">
              <p className="text-[17px] font-bold text-[#0F1B2D]">Nurul Aisyah</p>
              <p className="text-sm text-[#566274]">Form 5 Add Maths: Differentiation</p>
              <p className="text-sm text-[#566274]">Sat, 14 Nov, 4:00 pm</p>
              <div className="flex items-center justify-between pt-2">
                <span className="flex items-center gap-1 text-sm font-semibold">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#E8A317" aria-hidden="true">
                    <polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.2 21 12 17.5 5.8 21 7.2 14 2 9.3 8.9 8.6" />
                  </svg>
                  4.9
                </span>
                <span className="text-base font-extrabold">RM45</span>
              </div>
              <div className="mt-3 h-11 rounded-[10px] bg-[#0A7B83] text-white text-sm font-bold flex items-center justify-center">
                Book now
              </div>
            </div>
          </div>
          <p className="text-xs text-[#566274] mt-2 text-center">Sample class, for illustration.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-[#DDE2E8]">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#0F1B2D]">How it works</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {steps.map((step) => (
              <li key={step.n} className="bg-[#F3F5F7] rounded-[14px] p-5">
                <span className="w-9 h-9 rounded-full bg-[#0A7B83] text-white font-extrabold flex items-center justify-center">
                  {step.n}
                </span>
                <p className="font-bold text-[#0F1B2D] mt-3">{step.label}</p>
                <p className="text-sm text-[#566274] mt-1">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0F1B2D]">Made for parents and students</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {reasons.map((r) => (
            <div key={r.title} className="bg-white border border-[#DDE2E8] rounded-[14px] p-5">
              <span className="w-11 h-11 rounded-xl bg-[#E1F1F2] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A7B83" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {r.icon}
                </svg>
              </span>
              <h3 className="font-bold text-[#0F1B2D] mt-3">{r.title}</h3>
              <p className="text-sm text-[#566274] mt-1">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For tutors */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <div className="bg-[#075A61] rounded-[14px] p-6 sm:p-10 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Teach on your own schedule</h2>
            <p className="text-[#D5ECEE] mt-2 max-w-md">
              Teachers and university students can set their hours, create classes and keep 85% of every class they
              teach.
            </p>
          </div>
          <div className="md:justify-self-end">
            <Link
              href="/signup"
              className="h-12 px-6 rounded-[10px] bg-white text-[#075A61] font-bold hover:bg-[#E1F1F2] inline-flex items-center justify-center w-full sm:w-auto"
            >
              Become a tutor
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#DDE2E8] bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-sm text-[#566274]">
          <p>MyOnlineCikgu. Find. Book. Learn. Improve.</p>
          <Link href="/privacy" className="font-semibold text-[#0A7B83] hover:underline min-h-11 inline-flex items-center">
            Privacy policy
          </Link>
        </div>
      </footer>
    </main>
  )
}