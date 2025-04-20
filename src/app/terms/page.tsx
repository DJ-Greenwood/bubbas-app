import React from 'react';

export default function TermsPage() {
  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Bubbas.AI – Terms, Privacy & Ethics</h1>
          <p className="text-gray-700 mb-4"><strong>Effective Date: April 10, 2025 (Updated April 14, 2025)</strong></p>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Welcome to Bubbas.AI</h2>
          <p className="text-gray-700 mb-4">Bubbas.AI is your emotional support companion — designed to help you reflect, grow, and feel understood. By using this app, you agree to the terms below, including our privacy and ethics commitments.</p>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">2. What Bubbas.AI Is (and Isn’t)</h2>
          <p className="text-gray-700 mb-4">Bubbas.AI is a journaling and emotional support chatbot. It offers a space to reflect and interact with an AI named Bubba.</p>
          <p className="text-gray-700 mb-4"><strong>Important:</strong> Bubbas.AI is not a therapist, doctor, or crisis service. It is a tool for self-reflection and emotional support — not for diagnosis, treatment, or emergencies.</p>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Your Data & Privacy</h2>
          <p className="text-gray-700 mb-4">Your trust matters. Here's how we handle and protect your personal data:</p>
          <ul className="list-disc list-inside text-gray-700 mb-4">
            <li>✅ We only collect what’s necessary: your email, preferences, agreement to these terms, and billing info (if applicable).</li>
            <li>✅ All reflective data, including journal entries, chat logs, and transcripts from voice interactions, is encrypted such that even we, the developers and owners, cannot read it.</li>
            <li>✅ Voice input is transcribed into text for reflection purposes. <b>Raw audio is not stored</b> to preserve space, privacy, and security.</li>
            <li>✅ Transcripts may be encrypted to preserve the privacy of speech data.</li>
            <li>✅ We do not sell, share, or mine your data for advertising or external analysis.</li>
            <li>✅ You can permanently delete your account and all associated data at any time from your profile settings.</li>
          </ul>
          <p className="text-gray-700 mb-4">We store data securely using Firebase and industry-standard encryption. Billing is processed by Stripe — we never see or store your credit card information.</p>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Your Rights</h2>
          <p className="text-gray-700 mb-4">You have the right to:</p>
          <ul className="list-disc list-inside text-gray-700 mb-4">
            <li>View or delete your personal data</li>
            <li>Update your app preferences</li>
            <li>Cancel your subscription at any time</li>
            <li>Understand how your data is being handled</li>
          </ul>
          <p className="text-gray-700 mb-4">You can do this in the app or by contacting us at <a href="mailto:BubbasPerson@Bubbas.ai" className="text-blue-600 underline">
          BubbasPerson@Bubbas.ai
          </a>.</p>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Ethics Policy</h2>
          <p className="text-gray-700 mb-4">We built Bubbas.AI with care and intention. Here's what we stand for:</p>
          <ul className="list-disc list-inside text-gray-700 mb-4">
            <li>🤝 <b>User-first design</b> — Your emotional safety and privacy guide every decision.</li>
            <li>🧠 <b>Data minimalism</b> — We collect the minimum needed to provide meaningful interaction.</li>
            <li>🔐 <b>Privacy by encryption</b> — We use strong encryption so that your personal data, including reflections and transcripts, are private — even from us.</li>
            <li>🚫 <b>No manipulation</b> — No dark patterns. No exploitative emotional nudges. No deceptive AI.</li>
            <li>🌱 <b>Transparency</b> — If how we handle data changes, you’ll be clearly informed.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Voice Features</h2>
          <p className="text-gray-700 mb-4">Bubbas.AI offers optional voice features for journaling and support. Here’s how we handle that:</p>
          <ul className="list-disc list-inside text-gray-700 mb-4">
            <li>🎙️ <b>Voice input is transcribed</b> into text for AI responses and reflection.</li>
            <li>🔐 <b>Transcripts may be encrypted</b> before being stored, and we will not store raw audio files.</li>
            <li>❌ <b>We do not retain voice recordings</b> to minimize storage usage and protect your privacy.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">7. Fair Use & Respect</h2>
          <p className="text-gray-700 mb-4">You agree to:</p>
          <ul className="list-disc list-inside text-gray-700 mb-4">
            <li>Use Bubbas.AI respectfully</li>
            <li>Not misuse or attempt to harm the system or other users</li>
            <li>Not use Bubbas.AI for illegal or harmful activities</li>
          </ul>
          <p className="text-gray-700 mb-4">We may suspend your access if needed to maintain a safe and ethical space.</p>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">8. Payments & Plans</h2>
          <p className="text-gray-700 mb-4">Some features may require a subscription. Billing is processed securely via Stripe. You can cancel anytime. No surprise fees, ever.</p>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">9. Updates to These Terms</h2>
          <p className="text-gray-700 mb-4">We may occasionally update these terms, the privacy policy, or the ethics policy. If changes are significant, we’ll notify you through the app or by email.</p>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">10. Contact</h2>
          <p className="text-gray-700 mb-4">📩 <b>Email:</b> <a href="mailto:BubbasPerson@Bubbas.ai" className="text-blue-600 underline">BubbasPerson@Bubbas.ai</a></p>
          <p className="text-gray-700 mb-4">💬 We’re here to listen, help, and improve — always with your privacy in mind.</p>

          <p className="text-gray-700">✅ By using Bubbas.AI, you agree to these updated terms — and we commit to protecting your privacy, voice, and reflections with the highest ethical standards.</p>
        </div>
      </div>
    </div>
  )
}