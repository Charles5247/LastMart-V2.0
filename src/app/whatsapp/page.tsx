'use client';
import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { MessageCircle, ShoppingCart, MapPin, CreditCard, Package, Repeat, Star, Share2, HelpCircle, QrCode, Copy, CheckCircle, Phone, ArrowRight, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const WHATSAPP_NUMBER = '2348123456789';
const BOT_COMMANDS = [
  { cmd: 'SHOP', desc: 'Browse products by category', example: 'SHOP electronics', icon: ShoppingCart },
  { cmd: 'SEARCH', desc: 'Search for specific products', example: 'SEARCH iPhone 15', icon: Zap },
  { cmd: 'CART', desc: 'View your cart', example: 'CART', icon: ShoppingCart },
  { cmd: 'ORDER', desc: 'Place an order', example: 'ORDER', icon: Package },
  { cmd: 'TRACK', desc: 'Track your order', example: 'TRACK #ORDER123', icon: MapPin },
  { cmd: 'REORDER', desc: 'Reorder previous items', example: 'REORDER #ORDER123', icon: Repeat },
  { cmd: 'REFER', desc: 'Get your referral link', example: 'REFER', icon: Share2 },
  { cmd: 'HELP', desc: 'Get help & support', example: 'HELP', icon: HelpCircle },
];

const DEMO_CONVERSATION = [
  { sender: 'user', text: 'SHOP electronics' },
  { sender: 'bot', text: '📱 *LastMart Electronics*\n\nAvailable products in Lagos:\n\n1️⃣ iPhone 15 Pro — ₦850,000\n2️⃣ Samsung Galaxy S24 — ₦620,000\n3️⃣ Tecno Spark 20 — ₦95,000\n4️⃣ JBL Speaker — ₦45,000\n\nReply with number to view details or\nSEARCH [product name] for more options' },
  { sender: 'user', text: '1' },
  { sender: 'bot', text: '📱 *iPhone 15 Pro*\nVendor: TechPro Lagos ⭐4.9\nPrice: ₦850,000\nStock: 5 units\nDelivery: 24-48hrs\n\n[Photo: iPhone 15 Pro]\n\nReply:\nADD — Add to cart\nINFO — More details\nBACK — Go back' },
  { sender: 'user', text: 'ADD' },
  { sender: 'bot', text: '✅ *iPhone 15 Pro* added to cart!\n\n🛒 Cart total: ₦850,000\n\nReply:\nCHECKOUT — Place order now\nCONTINUE — Keep shopping\nCART — View full cart' },
  { sender: 'user', text: 'CHECKOUT' },
  { sender: 'bot', text: '📍 *Delivery Address*\n\nPlease share your delivery address or type it:\n\nFormat: House No, Street, Area, City\nExample: 15 Bode Thomas, Surulere, Lagos' },
  { sender: 'user', text: '15 Bode Thomas, Surulere, Lagos' },
  { sender: 'bot', text: '💳 *Payment Options*\n\n1️⃣ Pay with card (Paystack)\n2️⃣ Bank Transfer\n3️⃣ Cash on Delivery\n4️⃣ Pay with wallet\n\nReply with 1, 2, 3 or 4' },
  { sender: 'user', text: '1' },
  { sender: 'bot', text: '🔗 *Payment Link Ready!*\n\nClick to pay securely:\nhttps://lastmart.com/pay/ORD_1234\n\nOrder ID: #ORD_1234\nAmount: ₦850,000\n\n✅ Link expires in 30 minutes\n🔒 Secured by Paystack' },
];

export default function WhatsAppCommercePage() {
  const [copied, setCopied] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [showingConv, setShowingConv] = useState<typeof DEMO_CONVERSATION>([]);

  const copyNumber = () => {
    navigator.clipboard.writeText(`+${WHATSAPP_NUMBER}`);
    setCopied(true);
    toast.success('Number copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const startDemo = () => {
    setShowingConv([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= DEMO_CONVERSATION.length) { clearInterval(interval); return; }
      setShowingConv(prev => [...prev, DEMO_CONVERSATION[i]]);
      i++;
    }, 800);
  };

  const openWhatsApp = (message = 'SHOP') => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
            WhatsApp Bot is Live
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Shop on LastMart<br />via <span className="text-green-200">WhatsApp</span>
          </h1>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            No app needed. Chat with our AI bot to browse products, place orders, track delivery, 
            and get support — all on WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button onClick={() => openWhatsApp('Hi! I want to shop on LastMart')}
              className="flex items-center gap-3 bg-white text-green-700 font-black px-8 py-4 rounded-2xl text-lg hover:bg-green-50 transition-colors shadow-lg">
              <MessageCircle className="w-6 h-6" /> Start Shopping Now
            </button>
            <button onClick={startDemo}
              className="flex items-center gap-3 bg-green-700 text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-green-800 transition-colors">
              <Zap className="w-6 h-6" /> Watch Demo
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 mt-6 text-green-200 text-sm">
            <Phone className="w-4 h-4" />
            <span>+{WHATSAPP_NUMBER.replace(/(\d{3})(\d{3})(\d{4})(\d{4})/, '$1 $2 $3 $4')}</span>
            <button onClick={copyNumber} className="hover:text-white transition-colors">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-black text-gray-900 text-center mb-4">Everything on WhatsApp</h2>
        <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">Shop, pay, track, and get support without leaving WhatsApp</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {[
            { icon: ShoppingCart, title: 'Browse & Order', desc: 'Shop by category or search specific products', color: 'bg-green-100 text-green-600' },
            { icon: CreditCard, title: 'Secure Payments', desc: 'Pay via card, bank transfer, or cash on delivery', color: 'bg-blue-100 text-blue-600' },
            { icon: MapPin, title: 'Live Tracking', desc: 'Get real-time delivery updates on WhatsApp', color: 'bg-orange-100 text-orange-600' },
            { icon: Repeat, title: 'Easy Reorder', desc: 'Reorder previous items with one command', color: 'bg-purple-100 text-purple-600' },
            { icon: Star, title: 'Rate & Review', desc: 'Leave reviews directly in chat after delivery', color: 'bg-yellow-100 text-yellow-600' },
            { icon: Share2, title: 'Refer & Earn', desc: 'Share your referral link, earn on every referral', color: 'bg-pink-100 text-pink-600' },
            { icon: HelpCircle, title: '24/7 Support', desc: 'Instant help from AI or live agents', color: 'bg-teal-100 text-teal-600' },
            { icon: QrCode, title: 'Vendor QR Codes', desc: 'Scan vendor QR, shop their products on WhatsApp', color: 'bg-indigo-100 text-indigo-600' },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${f.color} rounded-2xl flex items-center justify-center mb-3`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-black text-gray-800 text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Demo Conversation + Commands */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Live Demo */}
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-6">See It In Action</h3>
            <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              {/* Phone Header */}
              <div className="bg-green-600 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="text-white font-bold text-sm">LastMart Bot</div>
                  <div className="text-green-200 text-xs">🟢 Online</div>
                </div>
              </div>
              {/* Messages */}
              <div className="p-4 space-y-3 min-h-64 max-h-96 overflow-y-auto bg-[#0b141a]">
                {showingConv.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <MessageCircle className="w-8 h-8 mb-2" />
                    <p className="text-sm">Click "Watch Demo" to see the bot in action</p>
                  </div>
                ) : (
                  showingConv.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-[#005c4b] text-white rounded-br-sm'
                          : 'bg-[#1f2c33] text-gray-100 rounded-bl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="bg-[#1f2c33] px-4 py-3 flex gap-2">
                <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-gray-400 text-sm">Type a message...</div>
                <button onClick={startDemo} className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700">
                  <Zap className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            <button onClick={startDemo} className="w-full mt-4 border-2 border-green-400 text-green-700 font-bold py-3 rounded-xl hover:bg-green-50 transition-colors">
              ▶ Replay Demo
            </button>
          </div>

          {/* Bot Commands */}
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-6">Bot Commands</h3>
            <div className="space-y-3">
              {BOT_COMMANDS.map(({ cmd, desc, example, icon: Icon }) => (
                <button key={cmd} onClick={() => openWhatsApp(example)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all text-left flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-gray-800">{cmd}</span>
                      <code className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{example}</code>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-10 text-white text-center shadow-xl">
          <h2 className="text-3xl font-black mb-4">Start Shopping on WhatsApp</h2>
          <p className="text-green-100 mb-8 max-w-xl mx-auto">Join thousands of Nigerians already shopping on LastMart via WhatsApp. No app download needed!</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => openWhatsApp('Hi')}
              className="flex items-center justify-center gap-3 bg-white text-green-700 font-black px-8 py-4 rounded-2xl hover:bg-green-50 transition-colors shadow-lg text-lg">
              <MessageCircle className="w-6 h-6" /> Chat with LastMart Bot
            </button>
            <Link href="/marketplace"
              className="flex items-center justify-center gap-3 bg-green-700 text-white font-bold px-8 py-4 rounded-2xl hover:bg-green-800 transition-colors text-lg">
              <ShoppingCart className="w-6 h-6" /> Shop on Web Instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
