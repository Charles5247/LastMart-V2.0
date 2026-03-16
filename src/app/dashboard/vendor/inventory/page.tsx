'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { AlertTriangle, ArrowLeft, Package, Edit2, CheckCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStock, setEditingStock] = useState<{ id: string; stock: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'vendor')) { router.push('/auth/login'); return; }
    if (user && vendor) fetchProducts();
  }, [user, vendor, isLoading]);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await fetch(`/api/products?vendor_id=${vendor!.id}&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setProducts(data.data);
    setLoading(false);
  };

  const updateStock = async (productId: string, newStock: number) => {
    if (newStock < 0) { toast.error('Stock cannot be negative'); return; }
    setSaving(true);
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const res = await fetch(`/api/products/${productId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...product, stock: newStock, images: product.images || [], tags: product.tags || [] })
    });
    const data = await res.json();
    if (data.success) { toast.success('Stock updated!'); fetchProducts(); setEditingStock(null); }
    else toast.error(data.error || 'Failed');
    setSaving(false);
  };

  const lowStock = products.filter(p => p.stock < 5);
  const outOfStock = products.filter(p => p.stock === 0);
  const goodStock = products.filter(p => p.stock >= 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/vendor" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Inventory Management</h1>
            <p className="text-gray-500 text-sm">{products.length} products tracked</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Out of Stock', count: outOfStock.length, color: 'from-red-400 to-red-600', icon: '🔴' },
            { label: 'Low Stock (<5)', count: lowStock.length, color: 'from-yellow-400 to-orange-500', icon: '🟡' },
            { label: 'Good Stock', count: goodStock.length, color: 'from-green-400 to-green-600', icon: '🟢' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-3xl font-black text-gray-800">{s.count}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Critical alerts */}
        {(outOfStock.length > 0 || lowStock.length > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Stock Alerts</p>
              <p className="text-red-700 text-sm">{outOfStock.length} product(s) out of stock, {lowStock.filter(p => p.stock > 0).length} with low stock. Update them now to avoid missed sales.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-5">Product</div>
                <div className="col-span-2 text-center">Price</div>
                <div className="col-span-2 text-center">Stock</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-1 text-center">Edit</div>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {products.map(product => (
                <div key={product.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5 flex items-center gap-3">
                      <img src={product.images?.[0] || `https://picsum.photos/seed/${product.id}/60/60`} alt={product.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.category_name}</p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-sm font-bold text-gray-800">{formatPrice(product.price)}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      {editingStock?.id === product.id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" value={editingStock!.stock} onChange={e => setEditingStock({ id: product.id, stock: parseInt(e.target.value) || 0 })} className="w-16 border border-orange-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none" />
                          <button onClick={() => updateStock(product.id, editingStock!.stock)} disabled={saving} className="w-7 h-7 bg-green-500 text-white rounded-lg flex items-center justify-center text-xs">
                            {saving ? '...' : '✓'}
                          </button>
                        </div>
                      ) : (
                        <span className={`text-sm font-bold ${product.stock === 0 ? 'text-red-600' : product.stock < 5 ? 'text-yellow-600' : 'text-green-600'}`}>{product.stock}</span>
                      )}
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${product.stock === 0 ? 'bg-red-100 text-red-700' : product.stock < 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {product.stock === 0 ? 'Out of Stock' : product.stock < 5 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => setEditingStock(editingStock?.id === product.id ? null : { id: product.id, stock: product.stock })} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
