import React, { useState } from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { Button, Input, Textarea, Card, CardContent, Badge, Modal, ProductPlaceholder, Select } from '@bizx/ui';
import { Plus, Search, Archive, Image as ImageIcon, Upload, AlertCircle, Pencil } from 'lucide-react';
import { resolveMediaUrl } from '../lib/media';
import type { Product } from '@bizx/common-types';

export const ProductsView: React.FC = () => {
  const { products, categories, activeStore, createProduct, updateProduct, deleteProduct, isLoading } =
    useBusinessStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [priceUah, setPriceUah] = useState('');
  const [oldPriceUah, setOldPriceUah] = useState('');
  const [inventoryCount, setInventoryCount] = useState('10');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId('');
    setSku('');
    setPriceUah('');
    setOldPriceUah('');
    setInventoryCount('10');
    setDescription('');
    setIsActive(true);
    setImageFile(null);
    setImagePreview(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setCategoryId(product.categoryId || '');
    setSku(product.sku || '');
    setPriceUah((product.price / 100).toString());
    setOldPriceUah(product.oldPrice ? (product.oldPrice / 100).toString() : '');
    setInventoryCount(product.inventoryCount.toString());
    setDescription(product.description || '');
    setIsActive(product.isActive);
    setImageFile(null);
    setImagePreview(resolveMediaUrl(product.imageUrl) || product.imageUrl || null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const priceNum = parseFloat(priceUah.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Вкажіть коректну ціну товару');
      return;
    }

    const priceKopecks = Math.round(priceNum * 100);
    const oldPriceKopecks = oldPriceUah
      ? Math.round(parseFloat(oldPriceUah.replace(',', '.')) * 100)
      : undefined;
    const invCount = parseInt(inventoryCount, 10) || 0;

    let success = false;
    if (editingProduct) {
      success = await updateProduct(
        editingProduct.id,
        {
          name,
          categoryId: categoryId || undefined,
          sku: sku || undefined,
          price: priceKopecks,
          oldPrice: oldPriceKopecks,
          inventoryCount: invCount,
          description: description || undefined,
          isActive
        },
        imageFile || undefined
      );
    } else {
      success = await createProduct(
        {
          name,
          categoryId: categoryId || undefined,
          sku: sku || undefined,
          price: priceKopecks,
          oldPrice: oldPriceKopecks,
          inventoryCount: invCount,
          description: description || undefined,
          isActive
        },
        imageFile || undefined
      );
    }

    if (success) {
      setIsModalOpen(false);
      setEditingProduct(null);
      setName('');
      setCategoryId('');
      setSku('');
      setPriceUah('');
      setOldPriceUah('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
    } else {
      setFormError('Помилка при збереженні товару');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Каталог товарів</h1>
          <p className="text-sm text-slate-500 mt-1">
            Керуйте асортиментом, завантажуйте фотографії в R2 та встановлюйте ціни
          </p>
        </div>

        <Button onClick={openCreateModal} className="flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Додати товар
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Пошук за назвою або артикулом (SKU)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              options={[
                { value: 'all', label: 'Усі категорії' },
                ...categories.map((c) => ({ value: c.id, label: c.name }))
              ]}
              placeholder="Усі категорії"
            />
          </div>
        </div>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const resolvedImg = resolveMediaUrl(p.imageUrl);

            return (
              <Card
                key={p.id}
                className="border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:border-slate-300 transition-all"
              >
                {/* Product Image */}
                <div className="w-full h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b">
                  {resolvedImg ? (
                    <img
                      src={resolvedImg}
                      alt={p.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ProductPlaceholder className="w-16 h-16 opacity-75" />
                  )}

                  {p.oldPrice && (
                    <Badge variant="destructive" className="absolute top-2 left-2 text-[10px]">
                      Знижка
                    </Badge>
                  )}
                  <Badge
                    variant={p.inventoryCount > 0 ? 'secondary' : 'outline'}
                    className="absolute top-2 right-2 text-[10px] bg-white/90 backdrop-blur-sm"
                  >
                    {p.inventoryCount > 0 ? `${p.inventoryCount} в наявності` : 'Немає на складі'}
                  </Badge>
                </div>

                {/* Product Info */}
                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>{p.sku || 'Без артикулу'}</span>
                      <Badge variant={p.isActive ? 'success' : 'outline'} className="text-[10px]">
                        {p.isActive ? 'Активний' : 'Чернетка'}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-slate-900 line-clamp-2 text-sm">{p.name}</h3>
                    {p.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-slate-900">{formatPrice(p.price)} ₴</span>
                      {p.oldPrice && (
                        <span className="text-xs text-slate-400 line-through ml-2">
                          {formatPrice(p.oldPrice)} ₴
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-slate-700 hover:bg-slate-50"
                        onClick={() => openEditModal(p)}
                        title="Редагувати товар"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-slate-500 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-200"
                        onClick={() => {
                          if (confirm(`Архівувати товар "${p.name}"? Товар буде сховано з каталогу, але збережено в системному архіві.`)) {
                            void deleteProduct(p.id);
                          }
                        }}
                        title="Архівувати товар"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-slate-300 p-12 text-center">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">Товарів не знайдено</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Додайте свій перший товар або змініть критерії пошуку
          </p>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Створити товар
          </Button>
        </Card>
      )}

      {/* Modal for Creating / Editing Product */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? 'Редагування товару' : 'Новий товар'}
        description={
          editingProduct
            ? `Оновіть інформацію та параметри товару «${editingProduct.name}»`
            : 'Заповніть інформацію про товар та додайте фотографію для бакету R2'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Назва товару *</label>
            <Input
              required
              placeholder="Наприклад: Кава в зернах Colombia Supremo 250г"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Категорія</label>
              <Select
                value={categoryId}
                onChange={(val) => setCategoryId(val)}
                options={[
                  { value: '', label: 'Без категорії' },
                  ...categories.map((c) => ({ value: c.id, label: c.name }))
                ]}
                placeholder="Без категорії"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Артикул (SKU)</label>
              <Input
                placeholder="SKU-12345"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Ціна (₴) *</label>
              <Input
                required
                placeholder="250.00"
                value={priceUah}
                onChange={(e) => setPriceUah(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Стара ціна (₴)</label>
              <Input
                placeholder="290.00"
                value={oldPriceUah}
                onChange={(e) => setOldPriceUah(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Кількість (шт)</label>
              <Input
                type="number"
                min="0"
                value={inventoryCount}
                onChange={(e) => setInventoryCount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Опис товару</label>
            <Textarea
              placeholder="Смакові ноти, склад, характеристика..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCheckbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="isActiveCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Товар активний (відображається покупцям у додатку)
            </label>
          </div>

          {/* Image Upload Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Зображення товару</label>
            <div className="flex items-center gap-4 p-3 border border-dashed rounded-xl bg-slate-50">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg border bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <div className="flex-1">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                  <Upload className="w-3.5 h-3.5" /> Обрати файл (PNG, JPG, SVG)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  Файл автоматично завантажиться у Cloudflare R2
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Збереження...' : editingProduct ? 'Зберегти зміни' : 'Створити товар'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
