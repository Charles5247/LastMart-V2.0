export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending:    'bg-yellow-100 text-yellow-800',
    confirmed:  'bg-blue-100 text-blue-800',
    processing: 'bg-indigo-100 text-indigo-800',
    shipped:    'bg-purple-100 text-purple-800',
    delivered:  'bg-green-100 text-green-800',
    cancelled:  'bg-red-100 text-red-800',
    approved:   'bg-green-100 text-green-800',
    suspended:  'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}


export function formatImageUrl(url: string): string[] {
  if (!url) return []
  if (url.startsWith('http')) return [url];
  try {
    const parsed = JSON.parse(url);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return [parsed[0]];
    }else {
      return [url];
    }
  } catch {
    // Ignore JSON parse errors
  }
  return [];
}

export function formatStatus(status: number): string {
  const statusMap: Record<number, string> = {
    1: 'active',
    0: 'inactive'
  };
  return statusMap[status] || 'unknown';
}
