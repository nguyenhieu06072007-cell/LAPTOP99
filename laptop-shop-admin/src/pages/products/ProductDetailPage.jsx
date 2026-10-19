import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { 
  HiOutlinePencilSquare, HiOutlineTrash, HiOutlineArrowLeft,
  HiOutlinePhoto, HiOutlineStar, HiStar
} from 'react-icons/hi2';

const formatVND = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('vi-VN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
});

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [deleteDialog, setDeleteDialog] = useState(false);
  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);
  const [targetReplaceImgId, setTargetReplaceImgId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productRes, historyRes] = await Promise.all([
        api.get(`/products/${id}`),
        api.get(`/products/${id}/price-history`).catch(() => ({ data: [] }))
      ]);
      const p = productRes.data.data;
      setProduct(p);
      setImages(p?.images || []);
      setPriceHistory(historyRes.data?.data || []);
    } catch (err) {
      toast.error('Lỗi tải dữ liệu sản phẩm');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDeleteProduct = async () => {
    try {
      await api.delete(`/products/${id}`);
      toast.success('Xóa sản phẩm thành công');
      navigate('/products');
    } catch (err) {
      toast.error('Lỗi xóa sản phẩm');
      setDeleteDialog(false);
    }
  };

  const handleRestoreProduct = async () => {
    try {
      await api.post(`/products/${id}/restore`);
      toast.success('Khôi phục sản phẩm thành công');
      fetchData();
    } catch (err) {
      toast.error('Lỗi khôi phục sản phẩm');
    }
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      setUploading(true);
      await api.post(`/products/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Tải ảnh lên thành công');
      fetchData();
    } catch (err) {
      toast.error('Lỗi tải ảnh lên');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReplaceImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !targetReplaceImgId) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      await api.put(`/products/${id}/images/${targetReplaceImgId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Thay đổi ảnh thành công');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lỗi thay đổi ảnh');
    } finally {
      setUploading(false);
      setTargetReplaceImgId(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Bạn có chắc muốn xóa ảnh này?')) return;
    try {
      await api.delete(`/products/${id}/images/${imageId}`);
      toast.success('Xóa ảnh thành công');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lỗi xóa ảnh');
    }
  };

  const handleSetThumbnail = async (imageId) => {
    try {
      await api.patch(`/products/${id}/images/${imageId}`, { is_thumbnail: true });
      toast.success('Cập nhật ảnh đại diện thành công');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lỗi cập nhật ảnh đại diện');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!product) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/products')} className="text-gray-500 hover:text-gray-700">
            <HiOutlineArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            {product.name}
            {product.deleted_at && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Đã xóa</span>}
          </h1>
        </div>
        <div className="flex space-x-3">
          {product.deleted_at ? (
            <button onClick={handleRestoreProduct} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium shadow-sm">
              Khôi phục
            </button>
          ) : (
            <>
              <Link to={`/products/${id}/edit`} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <HiOutlinePencilSquare className="-ml-1 mr-2 h-5 w-5 text-gray-500" /> Sửa
              </Link>
              <button onClick={() => setDeleteDialog(true)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
                <HiOutlineTrash className="-ml-1 mr-2 h-5 w-5" /> Xóa
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cột trái: Thông tin chính */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Thông tin cơ bản</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">SKU / Barcode</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{product.sku} / {product.barcode || '-'}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Phân loại</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {product.brand?.name} - {product.category?.name}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Trạng thái</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <StatusBadge status={product.status} />
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Mô tả ngắn</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-wrap">{product.short_description || '-'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Hình ảnh</h3>
              <div>
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <input type="file" accept="image/*" className="hidden" ref={replaceFileInputRef} onChange={handleReplaceImage} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                  <HiOutlinePhoto className="-ml-0.5 mr-1.5 h-4 w-4" />
                  {uploading ? 'Đang tải...' : 'Thêm ảnh'}
                </button>
              </div>
            </div>
            <div className="p-4">
              {images.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Chưa có hình ảnh nào</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map(img => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-2xs">
                      <img
                        src={img.url}
                        alt="Product"
                        className="w-full h-32 object-contain bg-slate-50 p-2"
                        onError={(e) => { e.currentTarget.src = '/laptop-placeholder.svg'; }}
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetThumbnail(img.id)}
                          className={`p-1.5 rounded-full transition ${img.is_thumbnail ? 'bg-yellow-400 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'}`}
                          title={img.is_thumbnail ? 'Ảnh đại diện' : 'Đặt làm ảnh đại diện'}
                        >
                          {img.is_thumbnail ? <HiStar className="h-5 w-5" /> : <HiOutlineStar className="h-5 w-5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetReplaceImgId(img.id);
                            replaceFileInputRef.current?.click();
                          }}
                          className="p-1.5 rounded-full bg-white/90 text-blue-600 hover:bg-white transition"
                          title="Thay ảnh này"
                        >
                          <HiOutlinePencilSquare className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          className="p-1.5 rounded-full bg-white/90 text-red-600 hover:bg-red-600 hover:text-white transition"
                          title="Xóa ảnh"
                        >
                          <HiOutlineTrash className="h-5 w-5" />
                        </button>
                      </div>
                      {img.is_thumbnail && (
                        <div className="absolute top-1 left-1 bg-yellow-400 text-white text-xs px-2 py-0.5 rounded shadow-xs font-medium">Ảnh đại diện</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Lịch sử giá</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày thay đổi</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá cũ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá mới</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người thay đổi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {priceHistory.map(hist => (
                    <tr key={hist.id}>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(hist.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 line-through">{formatVND(hist.old_price)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatVND(hist.new_price)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{hist.changed_by_name || 'Hệ thống'}</td>
                    </tr>
                  ))}
                  {priceHistory.length === 0 && <tr><td colSpan="4" className="px-4 py-4 text-center text-gray-500">Chưa có lịch sử thay đổi giá</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Cột phải: Thống kê & Mua hàng */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Thông tin Bán hàng</h3>
            </div>
            <div className="px-4 py-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Giá bán</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{formatVND(product.price)}</p>
                {product.sale_price && (
                  <p className="text-sm text-red-500 line-through">Giá KM: {formatVND(product.sale_price)}</p>
                )}
              </div>
              {can && can('cost:read') && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Giá vốn</p>
                  <p className="mt-1 text-base font-semibold text-gray-700">{formatVND(product.cost_price)}</p>
                </div>
              )}
              <hr className="border-gray-200" />
              <div>
                <p className="text-sm font-medium text-gray-500">Tồn kho</p>
                <div className="mt-1 flex items-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    product.stock_quantity > product.low_stock_threshold ? 'bg-green-100 text-green-800' : 
                    product.stock_quantity > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stock_quantity} sản phẩm
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Đã bán</p>
                <p className="mt-1 text-base font-semibold text-gray-900">{product.sold_count} sản phẩm</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Lượt xem</p>
                <p className="mt-1 text-base font-semibold text-gray-900">{product.view_count} lượt</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Bảo hành & Tình trạng</h3>
            </div>
            <div className="px-4 py-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Thời gian bảo hành</p>
                <p className="mt-1 text-sm text-gray-900">{product.warranty_months} tháng</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Tình trạng máy</p>
                <p className="mt-1 text-sm text-gray-900">
                  {product.condition_type === 'new' ? 'Mới' : product.condition_type === 'like_new' ? 'Like New' : 'Cũ'} 
                  ({product.condition_percent}%)
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <ConfirmDialog
        isOpen={deleteDialog}
        title="Xóa sản phẩm"
        message={`Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"? Sản phẩm sẽ được đưa vào thùng rác.`}
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeleteDialog(false)}
      />
    </div>
  );
}
