'use client';
import { useState, type ChangeEventHandler, type FormEvent, type HTMLInputTypeAttribute, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bike, Eye, EyeOff, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { setStoredToken, setStoredUser, decodeToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
    {children}
  </div>
);

const Input = ({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
}) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} required
    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow" />
);

export default function RiderRegisterPage() {
  const router = useRouter();
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [showPw,  setShowPw]  = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirm_password: '',
    city: '', vehicle_type: 'bicycle', license_plate: '', has_vehicle: 'yes',
  });

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'rider' }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) { setError(data.message ?? 'Registration failed'); return; }

      const token = data.data?.token;
      if (token) {
        const user = decodeToken(token);
        if (user) { setStoredToken(token); setStoredUser(user); }
      }
      toast.success('Application submitted! Welcome to the LastMart rider fleet.');
      router.replace('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4 shadow-lg">
            <Bike className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Become a Rider</h1>
          <p className="text-gray-500 mt-1">Earn money delivering orders in your city</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step >= s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 2 && <div className={`w-12 h-1 rounded ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-black text-gray-900 text-lg mb-4">Personal Details</h2>
              <Field label="Full Name"><Input value={form.name} onChange={(e:any)=>update('name',e.target.value)} placeholder="Your full legal name" /></Field>
              <Field label="Email Address"><Input type="email" value={form.email} onChange={(e:any)=>update('email',e.target.value)} placeholder="rider@example.com" /></Field>
              <Field label="Phone Number"><Input value={form.phone} onChange={(e:any)=>update('phone',e.target.value)} placeholder="+234 812 345 6789" /></Field>
              <Field label="City / Area"><Input value={form.city} onChange={(e:any)=>update('city',e.target.value)} placeholder="e.g. Lagos, Mainland" /></Field>
              <Field label="Password">
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e=>update('password',e.target.value)} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Min. 8 characters" />
                  <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password">
                <Input type="password" value={form.confirm_password} onChange={(e:any)=>update('confirm_password',e.target.value)} placeholder="Repeat password" />
              </Field>
              <button type="button" onClick={() => setStep(2)}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-colors">
                Continue <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-black text-gray-900 text-lg mb-4">Vehicle Details</h2>
              <Field label="Vehicle Type">
                <select value={form.vehicle_type} onChange={e=>update('vehicle_type',e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="bicycle">Bicycle</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="car">Car</option>
                  <option value="tricycle">Tricycle (Keke)</option>
                </select>
              </Field>
              <Field label="License Plate (if applicable)">
                <input value={form.license_plate} onChange={e=>update('license_plate',e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. LND-234-AA" />
              </Field>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-2">
                <p className="text-sm text-green-800 font-semibold mb-1">What happens next?</p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• We'll review your application within 24 hours</li>
                  <li>• You'll receive a verification email</li>
                  <li>• Complete KYC to start accepting deliveries</li>
                </ul>
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-black text-sm transition-colors disabled:opacity-60">
                  {loading ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Already a rider?{' '}
            <Link href="/auth/login" className="text-green-600 hover:text-green-700 font-bold">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
