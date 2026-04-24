'use client';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { Store, Shield, AlertTriangle, CheckCircle, FileText, Scale, Ban } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scale className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Terms & Conditions</h1>
          <p className="text-gray-500">Last updated: April 2025 · Version 1.0</p>
          <p className="text-sm text-orange-600 font-medium mt-2">
            By creating an account on LastMart, you agree to these terms. Please read carefully.
          </p>
        </div>

        <div className="space-y-8">
          {/* Section 1 */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">1. Acceptance of Terms</h2>
            </div>
            <div className="text-gray-600 space-y-3 text-sm leading-relaxed">
              <p>By accessing or using LastMart ("Platform," "we," "us"), you agree to be bound by these Terms and Conditions. These terms apply to all users including customers, vendors, and administrators.</p>
              <p>If you do not agree with any part of these terms, you may not access or use the platform.</p>
            </div>
          </section>

          {/* Section 2 - Customer Rules */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">2. Customer Rules & Obligations</h2>
            </div>
            <div className="text-gray-600 space-y-3 text-sm leading-relaxed">
              <p className="font-medium text-gray-800">As a customer on LastMart, you agree to:</p>
              <ul className="space-y-2">
                {[
                  'Provide accurate personal information during registration and KYC verification.',
                  'Not create multiple accounts or share your account credentials with others.',
                  'Only place orders with genuine intent to purchase and pay.',
                  'Not engage in fraudulent activities, chargebacks abuse, or payment fraud.',
                  'Respect vendors and their products — abusive or harassing behaviour is strictly prohibited.',
                  'Not attempt to circumvent pricing, promotions, or payment systems.',
                  'Complete the KYC (Know Your Customer) verification process when required.',
                  'Report suspicious vendors or products to the admin team.',
                  'Not use the platform for money laundering or illegal activities.',
                  'Accept responsibility for orders placed from your account.',
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center font-bold mt-0.5 flex-shrink-0">{i + 1}</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 3 - Vendor Rules */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">3. Vendor Rules & Obligations</h2>
            </div>
            <div className="text-gray-600 space-y-3 text-sm leading-relaxed">
              <p className="font-medium text-gray-800">As a vendor on LastMart, you agree to:</p>
              <ul className="space-y-2">
                {[
                  'Complete full business verification (KYC) including CAC registration, TIN, and valid ID documents.',
                  'Only list products that you legally own, have rights to sell, or are an authorized dealer for.',
                  'Ensure all product information (name, description, price, images) is accurate and up-to-date.',
                  'Maintain adequate stock levels and update availability in real-time.',
                  'Submit products for authenticity and availability vetting before listing.',
                  'Never list counterfeit, stolen, prohibited, or illegal products.',
                  'Fulfill orders promptly and notify customers/admin when orders are ready.',
                  'Maintain a minimum customer satisfaction rating as required by the platform.',
                  'Not engage in price gouging, bait-and-switch tactics, or false advertising.',
                  'Pay for advertising/ranking services honestly and not attempt to manipulate rankings.',
                  'Respond to customer inquiries and disputes within 48 hours.',
                  'Allow platform inspections and audits as required for quality assurance.',
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs flex items-center justify-center font-bold mt-0.5 flex-shrink-0">{i + 1}</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 4 - KYC */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">4. KYC & Identity Verification</h2>
            </div>
            <div className="text-gray-600 space-y-3 text-sm leading-relaxed">
              <p>LastMart requires identity verification to ensure the safety of all marketplace participants. We collect:</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="font-semibold text-gray-700 mb-2">Customers</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Government-issued ID (NIN, Passport, etc.)</li>
                    <li>• Bank Verification Number (BVN)</li>
                    <li>• Recent selfie photo</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="font-semibold text-gray-700 mb-2">Vendors</p>
                  <ul className="space-y-1 text-xs">
                    <li>• CAC Business Registration Certificate</li>
                    <li>• Tax Identification Number (TIN)</li>
                    <li>• Director's Government ID</li>
                    <li>• Utility bill (proof of address)</li>
                  </ul>
                </div>
              </div>
              <p className="mt-3">All documents are encrypted and stored securely. They are only used for verification purposes and are not shared with third parties without consent, except as required by Nigerian law.</p>
            </div>
          </section>

          {/* Section 5 - Product Vetting */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-teal-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">5. Product Vetting & Disclaimers</h2>
            </div>
            <div className="text-gray-600 space-y-3 text-sm leading-relaxed">
              <p>All products listed on LastMart are subject to a vetting process to ensure authenticity and availability. Vendors must:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Provide proof of stock availability (photos/videos of actual inventory).</li>
                <li>Submit brand authorization letters or supplier invoices for branded goods.</li>
                <li>Provide quality certifications where applicable (food, health, safety products).</li>
                <li>Declare accurate country of origin for all products.</li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3">
                <p className="font-semibold text-amber-800 flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4" /> Important Disclaimer
                </p>
                <p className="text-amber-700 text-xs">LastMart is a marketplace platform. While we conduct vetting, we cannot guarantee the absolute quality or authenticity of every product. Customers are advised to inspect products upon delivery and report issues within 48 hours. LastMart will investigate and mediate disputes.</p>
              </div>
            </div>
          </section>

          {/* Section 6 - Prohibited Items */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">6. Prohibited Items & Activities</h2>
            </div>
            <div className="text-gray-600 space-y-3 text-sm leading-relaxed">
              <p className="font-medium text-gray-800">The following are strictly prohibited on LastMart:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Counterfeit or pirated goods',
                  'Illegal weapons or ammunition',
                  'Controlled substances / drugs',
                  'Stolen property',
                  'Human trafficking or exploitation content',
                  'Fake currency or financial instruments',
                  'Endangered species products',
                  'Hazardous materials without permits',
                  'Pornographic or adult content',
                  'Pyramid schemes or MLM products',
                  'Products violating Nigerian law',
                  'Unsolicited bulk messaging / spam',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700">
                    <Ban className="w-3 h-3 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 7 - Suspension Policy */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">7. Account Suspension & Termination</h2>
            </div>
            <div className="text-gray-600 space-y-3 text-sm leading-relaxed">
              <p>LastMart reserves the right to suspend or permanently terminate accounts for:</p>
              <ul className="space-y-2">
                {[
                  'Violation of any terms in this agreement.',
                  'Fraudulent activities or chargeback abuse.',
                  'Listing prohibited, counterfeit, or illegal products.',
                  'Providing false information during registration or KYC.',
                  'Persistent negative reviews or customer complaints.',
                  'Failure to fulfill orders or habitually cancelling confirmed orders.',
                  'Abuse of the advertising/ranking system.',
                  'Multiple accounts or identity impersonation.',
                ].map((reason, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs bg-gray-50 p-3 rounded-lg">Suspended accounts may appeal by contacting <strong>support@lastmart.ng</strong> within 14 days. The admin decision is final in all disputes.</p>
            </div>
          </section>

          {/* Section 8 - Privacy */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">8. Privacy & Data Protection</h2>
            </div>
            <div className="text-gray-600 space-y-3 text-sm leading-relaxed">
              <p>LastMart is committed to protecting your personal data in compliance with the Nigeria Data Protection Regulation (NDPR) 2019.</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>We collect only data necessary to operate the marketplace.</li>
                <li>Your data is stored securely with industry-standard encryption.</li>
                <li>We do not sell your personal data to third parties.</li>
                <li>You have the right to access, correct, or delete your data by contacting us.</li>
                <li>Cookies are used for session management and analytics only.</li>
              </ul>
            </div>
          </section>

          {/* Footer */}
          <div className="bg-gradient-to-r from-orange-500 to-pink-600 rounded-2xl p-6 text-white text-center">
            <p className="font-bold text-lg mb-2">By registering, you confirm you have read and agree to these Terms & Conditions.</p>
            <p className="text-white/80 text-sm mb-4">For questions, contact us at <strong>support@lastmart.ng</strong></p>
            <Link href="/auth/register" className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors">
              <Store className="w-4 h-4" />
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
