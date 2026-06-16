'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { MessageCircle, ArrowLeft, Send, Search, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function VendorMessagesPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'vendor') { router.push('/'); return; }
    if (user) fetchConversations();
  }, [user, isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messages/conversations', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setConversations(data.data || []);
    } catch {}
    setLoading(false);
  };

  const openConversation = async (conv: any) => {
    setActiveConv(conv);
    try {
      const res = await fetch(`/api/messages/${conv.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setMessages(data.data || []);
    } catch {}
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${activeConv.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(m => [...m, data.data]);
        setNewMessage('');
        fetchConversations();
      }
    } catch { toast.error('Failed to send message'); }
    setSending(false);
  };

  const filteredConvs = conversations.filter(c =>
    c.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard/vendor" className="p-2 rounded-xl hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-orange-500" /> Buyer Messages
            </h1>
            <p className="text-gray-500 text-sm">{conversations.filter(c => c.unread_count > 0).length} unread conversations</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: '70vh' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-full md:w-80 border-r border-gray-100 flex flex-col">
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search buyers..." className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-orange-400" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredConvs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                    <MessageCircle className="w-12 h-12 mb-2 text-gray-200" />
                    <p className="text-sm font-medium">No conversations yet</p>
                    <p className="text-xs mt-1">Buyers will message you about products</p>
                  </div>
                ) : (
                  filteredConvs.map((conv: any) => (
                    <button key={conv.id} onClick={() => openConversation(conv)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeConv?.id === conv.id ? 'bg-orange-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-gray-800 truncate">{conv.buyer_name}</span>
                            {conv.unread_count > 0 && (
                              <span className="ml-2 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{conv.unread_count}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{conv.last_message || 'No messages yet'}</p>
                          <p className="text-xs text-gray-300 mt-0.5">{conv.last_message_at ? formatDate(conv.last_message_at) : ''}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 flex flex-col hidden md:flex">
              {!activeConv ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <MessageCircle className="w-16 h-16 text-gray-200 mb-3" />
                  <p className="font-medium">Select a conversation</p>
                  <p className="text-sm mt-1">to start messaging buyers</p>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">{activeConv.buyer_name}</div>
                      <div className="text-xs text-gray-400">Buyer</div>
                    </div>
                  </div>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg: any) => (
                      <div key={msg.id} className={`flex ${msg.sender_role === 'vendor' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                          msg.sender_role === 'vendor'
                            ? 'bg-orange-500 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}>
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.sender_role === 'vendor' ? 'text-orange-100' : 'text-gray-400'}`}>
                            {formatDate(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  {/* Input */}
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex gap-3">
                      <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Type a message..." className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                      <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                        className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 disabled:opacity-50">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
