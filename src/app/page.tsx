// src/app/page.tsx
// This is the main entry point for the Bubbas.ai application.
// It serves as the landing page and provides an overview of the app's features, mission, and values.
'use client';
import Link from 'next/link';
import '../app/globals.css';

export default function Home() {
  return (
    <main id="main" role="main">

    <div className="bg-gray-100 min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white text-blue-600 p-2 rounded shadow z-50">
        Skip to main content
      </a>

      {/* Header */}
  

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-500 to-purple-500 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Welcome to Bubbas.AI – Your Trusted Companion in Reflection</h1>
          <p className="text-lg mb-8">
          Bubbas.ai is a privacy-first AI-powered virtual companion built for emotional support and journaling. Inspired by Bubba, the founder’s Yorkie, Bubbas.ai aims to be a trusted digital friend—one that remembers, adapts, and supports users while prioritizing data security, emotional safety, and transparency.
          </p>
          <Link href="/auth" className="bg-white text-blue-500 py-2 px-6 rounded-full font-bold hover:bg-blue-100 transition duration-300">
              Get Started 
          </Link>
        </div>
      </section>

      

      {/* Mission Statement Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Mission</h2>
          <p className="text-lg text-gray-700">
          To create a truly personal AI companion that learns, grows, and supports users in their daily lives—just like a loyal friend. Bubbas.ai is designed to be more than just a companion; it’s a trusted companion that remembers, adapts, and provides meaningful interactions, making technology feel more human and connected.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Key Features & Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Conversational AI</h3>
              <p className="text-gray-600">
              Chat naturally and comfortably with Bubba, powered by ChatGPT-4o — a state-of-the-art AI designed to respond with empathy, curiosity, and care.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Memory & Context Retention</h3>
              <p className="text-gray-600">
              Bubbas.ai remembers meaningful past interactions (securely and privately), allowing for more personal, context-aware conversations over time.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">AI-Powered Reflections</h3>
              <p className="text-gray-600">
              Receive gentle, insightful summaries of your chats and journal entries to help you reflect, grow, and better understand your emotional journey.
              </p>
            </div>
            {/* Add more features as needed */}
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12"> Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Value 1 */}
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <img src="/assets/images/CoreValues/EmotionalSafety.jpg" alt="Emotional Safety" className="mx-auto mb-4 w-16 h-16" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Emotional Safety First</h3>
              <p className="text-gray-600">We design every experience with your well-being in mind — no manipulation, no dark patterns, just compassionate support.</p>
            </div>
            {/* Value 2 */}
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <img src="/assets/images/CoreValues/PrivacyTrust.jpg" alt="Privacy & Trust" className="mx-auto mb-4 w-16 h-16" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Privacy & Trust</h3>
              <p className="text-gray-600">Your thoughts and reflections are yours alone. We protect your data with strong encryption and give you full control over it.</p>
            </div>
            {/* Value 3 */}
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <img src="/assets/images/CoreValues/EthicalInnovation.jpg" alt="Ethical Innovation" className="mx-auto mb-4 w-16 h-16" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Ethical Innovation</h3>
              <p className="text-gray-600">We embrace the latest in AI — like ChatGPT-4o — while holding ourselves to the highest standards of responsible, transparent use.</p>
            </div>
            {/* Value 4 */}
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <img src="/assets/images/CoreValues/HumanCenteredDesign.jpg" alt="Human-Centered Design" className="mx-auto mb-4 w-16 h-16"/>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Human-Centered Design</h3>
              <p className="text-gray-600">Bubbas.ai is built to listen, understand, and support — just like a loyal friend. Every feature is made to serve you, not the system.</p>
            </div>
            {/* Value 5 */} 
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <img src="/assets/images/CoreValues/Acessiblity.jpg" alt="Accessibility" className="mx-auto mb-4 w-16 h-16"/>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Accessibility with Purpose</h3>
              <p className="text-gray-600">Everyone deserves a safe space to reflect. Our freemium model ensures access, while our premium tiers enhance the experience without exploiting your emotions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tiers & Pricing Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Plans & Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">

            {/* Free Tier */}
            <div className="bg-gray-50 p-8 rounded-lg shadow-md border border-gray-200">
              <img
                src="/assets/images/tiers/bubbafreetier.jpg"
                alt="Bubba - Free Tier"
                className="mx-auto mb-4 w-24 h-24 rounded-full object-cover shadow"
              />
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">Free</h3>
              <p className="text-gray-600 mb-4">A supportive companion experience with basic journaling and daily chats.</p>
              <ul className="text-gray-700 text-sm mb-4 space-y-1">
                <li>✓ Chat with Bubba (Limited Daily)</li>
                <li>✓ Basic Mood Tracking</li>
                <li>✓ Local-only Memory</li>
                <li>✓ Optional Encouraging Texts</li>
                <li>✓ 7-Day Trial Access to Plus Tier</li>
              </ul>
              <p className="text-xl font-bold text-blue-500">Free</p>
            </div>

            {/* Plus Tier */}
            <div className="bg-white p-8 rounded-lg shadow-lg border border-blue-300">
              <img
                src="/assets/images/tiers/bubbaplustier.jpg"
                alt="Bubba - Plus Tier"
                className="mx-auto mb-4 w-24 h-24 rounded-full object-cover shadow border border-blue-200"
              />
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">Plus</h3>
              <p className="text-gray-600 mb-4">An enhanced AI experience with more memory and emotional insights.</p>
              <ul className="text-gray-700 text-sm mb-4 space-y-1">
                <li>✓ Extended Chat Sessions</li>
                <li>✓ Enhanced Mood Tracking & Daily Reflections</li>
                <li>✓ Memory Sync Across Devices</li>
                <li>✓ AI-Generated Reflection Summaries</li>
                <li>✓ Optional Encouraging Texts</li>
              </ul>
              <p className="text-xl font-bold text-blue-600">$/month (not available yet, under construction)</p>
            </div>

            {/* Pro Tier */}
            <div className="bg-white p-8 rounded-lg shadow-md border border-purple-300">
              <img
              src="/assets/images/tiers/bubbaprotier.jpg"
              alt="Bubba - Pro Tier"
              className="mx-auto mb-4 w-24 h-24 rounded-full object-cover shadow border border-purple-300"
              />
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">Pro</h3>
              <p className="text-gray-600 mb-4">The full Bubbas.ai experience with advanced emotional analysis and full history.</p>
              <ul className="text-gray-700 text-sm mb-4 space-y-1">
                <li>✓ Unlimited Conversations</li>
                <li>✓ Full Chat & Journal History Sync</li>
                <li>✓ AI Sentiment Feedback & Emotional Voice Insights</li>
                <li>✓ Advanced Memory & Long-Term Reflection Trends</li>
                <li>✓ Optional Encouraging Texts</li>
              </ul>
              <p className="text-xl font-bold text-purple-600">$/month (not available yet, under construction)</p>
            </div>
            <p className="text-center text-sm text-gray-00 mt-4 col-span-full">
              Every higher tier includes all features from the previous one, with expanded capabilities and deeper personalization.
            </p>

          </div>
        </div>
      </section>

      {/* Emotional  Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white p-6 rounded-lg shadow-md">
            
            <img src="/assets/images/CompanionNotCounselor.png" alt="A Companion, Not a Counselor" className="mx-auto mb-4 w-32 h-32 object-contain" />
            <p className="text-gray-700 text-lg mb-4">
              Bubbas.ai is designed to be a supportive space — a friendly companion to help you reflect, check in with your emotions, and feel heard.
            </p>
            <p className="text-gray-600 text-md italic">
              While Bubba may be good at listening, he's not a licensed therapist. This app is not a substitute for professional counseling or mental health treatment.
            </p>
            <p className="text-gray-600 text-md mt-4">
              If you're facing a mental health crisis or need emotional support beyond reflection, please consider reaching out to a qualified mental health provider or calling a local crisis line.
            </p>
            <p className="text-sm text-gray-400 mt-6">
              ❤️ Bubba’s here to support — but we believe in real help when it's needed.
            </p>
            <p className="text-sm text-blue-500 mt-6">
              If you need immediate support, please visit the <a href="https://988lifeline.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700">988 Suicide & Crisis Lifeline</a>.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-blue-500 to-purple-500 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} Bubbas.ai. All rights reserved.</p>
          {/* Add links to terms of service and privacy policy */}
          <div className="mt-4">
            | <Link href="/terms" className="text-white hover:underline">Terms of Service</Link> | 
          </div>
        </div>
      </footer>
    </div>

</main>

  );
}
