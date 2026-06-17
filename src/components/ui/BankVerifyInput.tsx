'use client';
/**
 * BankVerifyInput — Reusable bank account verification component.
 *
 * When the user selects a bank (via dropdown) AND types a 10-digit account number,
 * this component auto-calls GET /api/payment/verify-account to resolve the
 * account holder's name from the bank's records (via Paystack API).
 *
 * Props:
 *   onVerified(data)  – called when account resolves successfully
 *   token             – auth token for API call
 *   className         – optional wrapper class
 */

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Loader, AlertCircle, Building2 } from 'lucide-react';

interface Bank { name: string; code: string; }

interface VerifiedAccount {
  account_name:   string;
  account_number: string;
  bank_name:      string;
  bank_code:      string;
  demo?:          boolean;
}

interface Props {
  token:      string | null;
  onVerified: (data: VerifiedAccount) => void;
  className?: string;
  required?:  boolean;
}

export default function BankVerifyInput({ token, onVerified, className = '', required }: Props) {
  const [banks, setBanks]               = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName]   = useState('');
  const [status, setStatus]             = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg]         = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /* Load bank list on mount */
  useEffect(() => {
    fetch('/api/payment/banks', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => { if (d.success) setBanks(d.data); })
      .catch(() => {});
  }, [token]);

  /* Auto-verify when account number reaches 10 digits and bank is selected */
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (accountNumber.length === 10 && selectedBank) {
      setStatus('loading');
      setAccountName('');
      setErrorMsg('');

      timerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/payment/verify-account?account_number=${accountNumber}&bank_code=${selectedBank.code}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
          const data = await res.json();
          if (data.success && data.data?.account_name) {
            setAccountName(data.data.account_name);
            setStatus('success');
            onVerified({
              account_name:   data.data.account_name,
              account_number: accountNumber,
              bank_name:      selectedBank.name,
              bank_code:      selectedBank.code,
              demo:           data.data.demo,
            });
          } else {
            setStatus('error');
            setErrorMsg(data.error || 'Account not found. Check the number and bank.');
          }
        } catch {
          setStatus('error');
          setErrorMsg('Network error. Please try again.');
        }
      }, 600);
    } else if (accountNumber.length < 10) {
      setStatus('idle');
      setAccountName('');
      setErrorMsg('');
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [accountNumber, selectedBank]); // eslint-disable-line

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Bank selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bank Name {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            value={selectedBank?.code || ''}
            onChange={e => {
              const bank = banks.find(b => b.code === e.target.value) || null;
              setSelectedBank(bank);
              setAccountName('');
              setStatus('idle');
            }}
          >
            <option value="">Select your bank</option>
            {banks.map(b => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Account number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Number {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={10}
          placeholder="10-digit account number"
          value={accountNumber}
          onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
          className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors
            ${status === 'success' ? 'border-green-400 bg-green-50 focus:ring-green-400'
            : status === 'error'   ? 'border-red-300 bg-red-50 focus:ring-red-300'
            : 'border-gray-200 focus:ring-orange-500'}`}
        />
        <p className="text-xs text-gray-400 mt-1">
          {accountNumber.length}/10 digits
          {!selectedBank && accountNumber.length > 0 && <span className="text-orange-500 ml-2">← Select a bank first</span>}
        </p>
      </div>

      {/* Verification status */}
      {status === 'loading' && (
        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 rounded-xl px-4 py-3 text-sm">
          <Loader size={15} className="animate-spin flex-shrink-0" />
          <span>Verifying account with {selectedBank?.name}…</span>
        </div>
      )}

      {status === 'success' && accountName && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle size={16} className="flex-shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-semibold">{accountName}</p>
            <p className="text-xs text-green-600">{selectedBank?.name} · {accountNumber}</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
