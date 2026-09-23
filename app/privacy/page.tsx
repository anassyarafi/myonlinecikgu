export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-500 mt-1">MyOnlineCikgu — Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            When you use MyOnlineCikgu, we collect information you provide directly, including your name, email
            address, and role (tutor or student/parent). Tutors additionally provide qualifications, teaching
            subjects, and hourly rates. We also collect information generated through your use of the platform,
            such as bookings, class attendance, payment status, and reviews.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Your Information</h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            We use your information to operate the platform: creating and managing your account, matching
            students with tutors, processing bookings and payments, facilitating online classes, and maintaining
            learning records and earnings history.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Camera and Microphone Access</h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            Our online classroom feature requires access to your device&apos;s camera and microphone to conduct
            video classes. This access is only used during active class sessions and is never recorded or stored
            without your knowledge.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Data Sharing</h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            We do not sell your personal information. Tutor profile information (name, qualifications, rating) is
            visible to students browsing the marketplace. Booking and payment details are shared only between the
            student and tutor involved in that booking.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Data Storage & Security</h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            Your data is stored securely using industry-standard infrastructure (Supabase/PostgreSQL) with
            row-level access controls, meaning users can only access their own data unless explicitly shared
            through the platform&apos;s features (e.g. marketplace listings).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Your Rights</h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            You may request access to, correction of, or deletion of your personal data at any time by
            contacting us using the details below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Contact Us</h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            For any questions about this Privacy Policy, please contact us at [your email address here].
          </p>
        </section>
      </div>
    </div>
  )
}