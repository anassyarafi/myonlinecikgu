// Replace this with your real contact email before publishing.
const CONTACT_EMAIL = 'REPLACE-WITH-YOUR-EMAIL@example.com'

const LAST_UPDATED = '3 November 2026'

const sections = [
  {
    title: 'Information we collect',
    body: [
      'When you use MyOnlineCikgu, we collect information you give us directly: your name, email address and role (tutor, or student and parent).',
      'Tutors also give us their qualifications, teaching subjects, hourly rate and bio. Tutors can upload a profile photo and a verification document, such as a degree certificate or IC.',
      'We also collect information created as you use the platform, such as bookings, class attendance, payment status, ratings and reports you send us.',
    ],
  },
  {
    title: 'How we use your information',
    body: [
      'We use your information to run the platform: creating and managing your account, matching students with tutors, processing bookings and payments, running online classes, and keeping learning records and earnings history.',
      'Verification documents are used only by our admin team to check that a tutor is who they say they are.',
    ],
  },
  {
    title: 'Camera and microphone',
    body: [
      'The online classroom needs your camera and microphone to hold video classes. They are only used during a class. MyOnlineCikgu does not record classes.',
    ],
  },
  {
    title: 'Who can see your information',
    body: [
      'We do not sell your personal information.',
      'A tutor’s name, qualification, profile photo and rating are visible to students browsing the marketplace. Booking and payment details are only shared between the student and the tutor in that booking.',
      'Verification documents are private. Only the tutor who uploaded one and our admin team can open it.',
    ],
  },
  {
    title: 'Storage and security',
    body: [
      'Your data is stored using Supabase, a database service with row-level access controls. This means users can only reach their own data unless it is meant to be shared through the platform, such as marketplace listings.',
    ],
  },
  {
    title: 'Your rights',
    body: [
      'You can ask to see, correct or delete your personal data at any time by contacting us using the details below.',
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#F3F5F7] px-4 pt-5 pb-12">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-[#0F1B2D]">Privacy policy</h1>
          <p className="text-sm text-[#566274] mt-1">MyOnlineCikgu. Last updated {LAST_UPDATED}.</p>
        </div>

        <div className="bg-[#E1F1F2] rounded-[14px] p-4 sm:p-5">
          <p className="font-bold text-[#075A61]">In short</p>
          <p className="text-sm text-[#075A61] mt-1">
            We collect only what we need to run your classes. We never sell your data, we do not record your classes,
            and tutor documents stay private.
          </p>
        </div>

        <div className="bg-white border border-[#DDE2E8] rounded-[14px] divide-y divide-[#EBEEF2]">
          {sections.map((s, i) => (
            <section key={s.title} className="p-5 sm:p-6">
              <h2 className="text-base font-bold text-[#0F1B2D]">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-2 space-y-3 max-w-prose">
                {s.body.map((p) => (
                  <p key={p} className="text-[15px] leading-relaxed text-[#566274]">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <section className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-[#0F1B2D]">{sections.length + 1}. Contact us</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#566274] max-w-prose">
              For any question about this policy, or to ask about your data, email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#0A7B83] hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}