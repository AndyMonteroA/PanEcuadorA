import { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiRefreshCw, FiGrid, FiList, FiUploadCloud, FiCamera } from 'react-icons/fi';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [producers, setProducers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [renewModal, setRenewModal] = useState({ open: false, product: null });
  const [renewStock, setRenewStock] = useState('');
  const [form, setForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadProducts(); loadMeta(); }, []);

  const loadProducts = async (page = 1, searchTerm = '') => {
    setLoading(true);
    try {
      const res = await adminAPI.getProducts({ page, limit: 15, search: searchTerm });
      setProducts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadMeta = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([adminAPI.getCategories(), adminAPI.getProducers()]);
      setCategories(catRes.data.data);
      setProducers(prodRes.data.data);
    } catch (err) { console.error(err); }
  };

  const handleSearch = (e) => { e.preventDefault(); loadProducts(1, search); };

  const openCreate = () => {
    setForm({
      nombre: '', descripcion: '', ingredientes: '', peso_gramos: '',
      precio: '', stock: '0', id_categoria: '', id_productor: '',
      tiempo_elaboracion_min: '30', vida_util_dias: '3', complejidad: '3', num_ingredientes: '5'
    });
    setImageFile(null);
    setImagePreview(null);
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (product) => {
    setForm({
      nombre: product.nombre || '', descripcion: product.descripcion || '',
      ingredientes: product.ingredientes || '', peso_gramos: product.peso_gramos || '',
      precio: product.precio || '', stock: product.stock || '0',
      id_categoria: product.id_categoria || '', id_productor: product.id_productor || '',
      disponible: product.disponible,
      tiempo_elaboracion_min: product.tiempo_elaboracion_min || '30',
      vida_util_dias: product.vida_util_dias || '3',
      complejidad: product.complejidad || '3', num_ingredientes: product.num_ingredientes || '5'
    });
    setImageFile(null);
    setImagePreview(null);
    setModal({ open: true, mode: 'edit', data: product });
  };

  const handleImageChange = (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageChange(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        formData.append(key, (form[key] === '' || form[key] === null || form[key] === undefined) ? '' : form[key]);
      });
      if (imageFile) formData.append('imagen', imageFile);
      if (modal.mode === 'create') {
        await adminAPI.createProduct(formData);
        showAlert('Producto creado exitosamente', 'success');
      } else {
        await adminAPI.updateProduct(modal.data.id_producto, formData);
        showAlert('Producto actualizado exitosamente', 'success');
      }
      setModal({ open: false, mode: 'create', data: null });
      loadProducts(pagination.page, search);
    } catch (err) { showAlert(err.response?.data?.message || 'Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try { await adminAPI.deleteProduct(id); showAlert('Producto eliminado', 'success'); loadProducts(pagination.page, search); }
    catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
  };

  const handleRenewStock = async (e) => {
    e.preventDefault();
    try {
      const res = await adminAPI.renewStock(renewModal.product.id_producto, parseInt(renewStock));
      showAlert(res.data.message, 'success');
      setRenewModal({ open: false, product: null });
      loadProducts(pagination.page, search);
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
  };

  const showAlert = (message, type) => { setAlert({ message, type }); setTimeout(() => setAlert(null), 4000); };

  const getFreshnessBadge = (product) => {
    if (!product.fecha_vencimiento_stock) return null;
    const now = new Date();
    const vence = new Date(product.fecha_vencimiento_stock);
    const horasRestantes = (vence - now) / (1000 * 60 * 60);

    if (horasRestantes <= 0) return <span className="admin-badge badge-cancelado">Vencido</span>;
    if (horasRestantes <= 24) return <span className="admin-badge badge-pendiente">⚠️ {Math.round(horasRestantes)}h</span>;
    if (horasRestantes <= 48) return <span className="admin-badge badge-en_camino">{Math.round(horasRestantes / 24)}d</span>;
    return <span className="admin-badge badge-entregado">Fresco ✓</span>;
  };

  const renderImageSection = () => {
    const currentImage = imagePreview || (modal.data?.imagen_principal);

    if (currentImage) {
      return (
        <div className="image-preview-container" onClick={() => fileInputRef.current?.click()}>
          <img src={currentImage} alt="Preview" />
          <div className="image-change-overlay">
            <FiCamera size={20} />
            <span>Cambiar imagen</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleImageChange(e.target.files[0])}
          />
        </div>
      );
    }

    return (
      <div
        className={`image-upload-zone ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="upload-icon"><FiUploadCloud size={36} /></div>
        <div className="upload-text">Arrastra una imagen aquí o haz clic para subir</div>
        <div className="upload-hint">PNG, JPG hasta 5MB</div>
        <input type="file" accept="image/*" onChange={(e) => handleImageChange(e.target.files[0])} />
      </div>
    );
  };

  return (
    <div>
      <div className="admin-section-header">
        <h2>Productos</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="view-toggle">
            <button className={viewMode === 'cards' ? 'active-view' : ''} onClick={() => setViewMode('cards')} title="Vista cards">
              <FiGrid size={15} /> Cards
            </button>
            <button className={viewMode === 'table' ? 'active-view' : ''} onClick={() => setViewMode('table')} title="Vista tabla">
              <FiList size={15} /> Tabla
            </button>
          </div>
          <button className="btn-admin btn-admin-primary" onClick={openCreate}><FiPlus /> Nuevo Producto</button>
        </div>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      <div className="admin-table-wrapper">
        <div className="admin-table-header">
          <h3>{pagination.total || 0} productos</h3>
          <div className="admin-table-actions">
            <form onSubmit={handleSearch}>
              <input type="text" className="admin-search" placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </form>
          </div>
        </div>

        {loading ? <div className="admin-loading">Cargando productos...</div> : (
          <>
            {/* CARD VIEW */}
            {viewMode === 'cards' && (
              <div className="product-cards-grid">
                {products.map(p => (
                  <div className="product-card" key={p.id_producto}>
                    <div className="product-card-image" onClick={() => openEdit(p)}>
                      {p.imagen_principal ? (
                        <img src={p.imagen_principal} alt={p.nombre} />
                      ) : (
                        <div className="image-placeholder">🍞</div>
                      )}
                      <div className="image-overlay">
                        <FiEdit2 size={18} /> Editar producto
                      </div>
                    </div>

                    <div className="product-card-body">
                      <div className="product-card-title">{p.nombre}</div>
                      <div className="product-card-producer">{p.productor_nombre || 'Sin productor'}</div>

                      {p.descripcion && <div className="product-card-desc">{p.descripcion}</div>}

                      <div className="product-card-attrs">
                        <div className="product-card-attr">
                          <span className="attr-label">Precio</span>
                          <span className="attr-value price">${parseFloat(p.precio).toFixed(2)}</span>
                        </div>
                        <div className="product-card-attr">
                          <span className="attr-label">Stock</span>
                          <span className="attr-value">{p.stock} uds</span>
                        </div>
                        <div className="product-card-attr">
                          <span className="attr-label">Categoría</span>
                          <span className="attr-value">{p.categoria_nombre || '—'}</span>
                        </div>
                        <div className="product-card-attr">
                          <span className="attr-label">Peso</span>
                          <span className="attr-value">{p.peso_gramos ? `${p.peso_gramos}g` : '—'}</span>
                        </div>
                        {p.tiempo_elaboracion_min && (
                          <div className="product-card-attr">
                            <span className="attr-label">Elaboración</span>
                            <span className="attr-value">{p.tiempo_elaboracion_min} min</span>
                          </div>
                        )}
                        {p.vida_util_dias && (
                          <div className="product-card-attr">
                            <span className="attr-label">Vida útil</span>
                            <span className="attr-value">{p.vida_util_dias} días</span>
                          </div>
                        )}
                      </div>

                      <div className="product-card-badges">
                        <span className={`admin-badge ${p.disponible ? 'badge-available' : 'badge-unavailable'}`}>
                          {p.disponible ? 'Disponible' : 'No disponible'}
                        </span>
                        {getFreshnessBadge(p)}
                      </div>
                    </div>

                    <div className="product-card-footer">
                      <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => { setRenewStock(p.stock || ''); setRenewModal({ open: true, product: p }); }} title="Renovar stock">
                        <FiRefreshCw size={14} />
                      </button>
                      <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => openEdit(p)} title="Editar">
                        <FiEdit2 size={14} />
                      </button>
                      <button className="btn-admin btn-admin-sm btn-admin-delete" onClick={() => handleDelete(p.id_producto, p.nombre)} title="Eliminar">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="admin-empty" style={{ gridColumn: '1 / -1' }}>
                    <div className="admin-empty-icon">📦</div>
                    <p>No se encontraron productos</p>
                  </div>
                )}
              </div>
            )}

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Frescura</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id_producto}>
                      <td>
                        <div className="product-cell">
                          {p.imagen_principal ? (
                            <img src={p.imagen_principal} className="product-img" alt="" />
                          ) : (
                            <div className="product-img" style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>🍞</div>
                          )}
                          <div>
                            <span className="product-name">{p.nombre}</span>
                            <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{p.productor_nombre || 'Sin productor'}</div>
                          </div>
                        </div>
                      </td>
                      <td>{p.categoria_nombre || '—'}</td>
                      <td style={{fontWeight:600,color:'var(--color-primary)'}}>${parseFloat(p.precio).toFixed(2)}</td>
                      <td>{p.stock}</td>
                      <td>
                        {getFreshnessBadge(p) || <span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>Sin fecha</span>}
                      </td>
                      <td>
                        <span className={`admin-badge ${p.disponible ? 'badge-available' : 'badge-unavailable'}`}>
                          {p.disponible ? 'Disponible' : 'No disponible'}
                        </span>
                      </td>
                      <td>
                        <div style={{display:'flex',gap:'6px'}}>
                          <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => { setRenewStock(p.stock || ''); setRenewModal({ open: true, product: p }); }} title="Renovar stock">
                            <FiRefreshCw size={14} />
                          </button>
                          <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => openEdit(p)} title="Editar"><FiEdit2 size={14} /></button>
                          <button className="btn-admin btn-admin-sm btn-admin-delete" onClick={() => handleDelete(p.id_producto, p.nombre)} title="Eliminar"><FiTrash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan={7} className="admin-empty">No se encontraron productos</td></tr>}
                </tbody>
              </table>
            )}

            {pagination.totalPages > 1 && (
              <div className="admin-pagination">
                <button disabled={pagination.page <= 1} onClick={() => loadProducts(pagination.page - 1, search)}>Anterior</button>
                <span className="admin-pagination-info">Página {pagination.page} de {pagination.totalPages}</span>
                <button disabled={pagination.page >= pagination.totalPages} onClick={() => loadProducts(pagination.page + 1, search)}>Siguiente</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal — Renovar Stock */}
      {renewModal.open && (
        <div className="admin-modal-overlay" onClick={() => setRenewModal({open:false,product:null})}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{maxWidth:420}}>
            <h2>🔄 Renovar Stock Fresco</h2>
            <p style={{color:'var(--text-secondary)',fontSize:'0.85rem',marginBottom:'16px'}}>
              Producto: <strong style={{color:'#fff'}}>{renewModal.product?.nombre}</strong><br/>
              Vida útil: <strong style={{color:'var(--color-primary)'}}>{renewModal.product?.vida_util_dias} días</strong><br/>
              Se actualizará la fecha de elaboración a <strong>AHORA</strong> y se calculará el vencimiento automáticamente.
            </p>
            <form onSubmit={handleRenewStock}>
              <div className="admin-form-group">
                <label>Nuevo Stock (unidades) *</label>
                <input type="number" min="1" className="admin-input" value={renewStock} onChange={e => setRenewStock(e.target.value)} required />
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-admin btn-admin-ghost" onClick={() => setRenewModal({open:false,product:null})}>Cancelar</button>
                <button type="submit" className="btn-admin btn-admin-primary">Renovar Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Crear / Editar */}
      {modal.open && (
        <div className="admin-modal-overlay" onClick={() => { setModal({ open: false, mode: 'create', data: null }); setImagePreview(null); }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>{modal.mode === 'create' ? '✨ Nuevo Producto' : '✏️ Editar Producto'}</h2>
            <form onSubmit={handleSave}>
              {/* Image Upload Section */}
              <div className="admin-form-group">
                <label><FiImage size={14} /> Imagen del producto</label>
                {renderImageSection()}
              </div>

              <div className="admin-form-group">
                <label>Nombre *</label>
                <input className="admin-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
              </div>
              <div className="admin-form-group">
                <label>Descripción</label>
                <textarea className="admin-textarea" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Categoría</label>
                  <select className="admin-select" value={form.id_categoria} onChange={e => setForm({...form, id_categoria: e.target.value})}>
                    <option value="">Sin categoría</option>
                    {categories.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Productor</label>
                  <select className="admin-select" value={form.id_productor} onChange={e => setForm({...form, id_productor: e.target.value})}>
                    <option value="">Sin productor</option>
                    {producers.map(p => <option key={p.id_productor} value={p.id_productor}>{p.nombre_negocio}</option>)}
                  </select>
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Precio ($) *</label>
                  <input type="number" step="0.01" min="0" className="admin-input" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} required />
                </div>
                <div className="admin-form-group">
                  <label>Stock</label>
                  <input type="number" min="0" className="admin-input" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Ingredientes</label>
                <textarea className="admin-textarea" value={form.ingredientes} onChange={e => setForm({...form, ingredientes: e.target.value})} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Peso (gramos)</label>
                  <input type="number" min="0" className="admin-input" value={form.peso_gramos} onChange={e => setForm({...form, peso_gramos: e.target.value})} />
                </div>
                <div className="admin-form-group">
                  <label>Tiempo elaboración (min)</label>
                  <input type="number" min="1" className="admin-input" value={form.tiempo_elaboracion_min} onChange={e => setForm({...form, tiempo_elaboracion_min: e.target.value})} />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Vida útil (días, máx 3)</label>
                  <input type="number" min="1" max="3" className="admin-input" value={form.vida_util_dias} onChange={e => setForm({...form, vida_util_dias: e.target.value})} />
                </div>
                <div className="admin-form-group">
                  <label>Complejidad (1-5)</label>
                  <input type="number" min="1" max="5" className="admin-input" value={form.complejidad} onChange={e => setForm({...form, complejidad: e.target.value})} />
                </div>
              </div>
              {modal.mode === 'edit' && (
                <div className="admin-form-group">
                  <label>Disponible</label>
                  <select className="admin-select" value={form.disponible} onChange={e => setForm({...form, disponible: e.target.value})}>
                    <option value={true}>Sí</option>
                    <option value={false}>No</option>
                  </select>
                </div>
              )}
              <div className="admin-modal-actions">
                <button type="button" className="btn-admin btn-admin-ghost" onClick={() => { setModal({open:false,mode:'create',data:null}); setImagePreview(null); }}>Cancelar</button>
                <button type="submit" className="btn-admin btn-admin-primary" disabled={saving}>
                  {saving ? 'Guardando...' : (modal.mode === 'create' ? 'Crear Producto' : 'Guardar Cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
