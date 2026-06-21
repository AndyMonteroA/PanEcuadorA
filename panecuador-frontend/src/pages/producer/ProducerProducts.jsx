import { useState, useEffect, useRef } from 'react';
import { producerAPI } from '../../services/api';
import { categoriesAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiRefreshCw, FiImage, FiGrid, FiList, FiUploadCloud, FiCamera, FiTrash2 } from 'react-icons/fi';

export default function ProducerProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const [workers, setWorkers] = useState([]);
  const [assignedWorker, setAssignedWorker] = useState('');
  const [replenishments, setReplenishments] = useState([]);

  useEffect(() => { loadProducts(); loadCategories(); loadWorkers(); loadReplenishments(); }, []);

  const loadReplenishments = async () => {
    try { const res = await producerAPI.getReplenishments(); setReplenishments(res.data.data); }
    catch (err) { console.error(err); }
  };

  const handleDeleteReplenishment = async (id) => {
    if (!confirm('¿Cancelar esta orden de producción?')) return;
    try {
      await producerAPI.deleteReplenishment(id);
      showAlert('✅ Orden de producción cancelada.', 'success');
      loadReplenishments();
    } catch (err) { showAlert(err.response?.data?.message || 'Error al cancelar orden', 'error'); }
  };

  const loadWorkers = async () => {
    try { const res = await producerAPI.getWorkers(); setWorkers(res.data.data); }
    catch (err) { console.error(err); }
  };

  const loadProducts = async () => {
    setLoading(true);
    try { const res = await producerAPI.getProducts(); setProducts(res.data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try { const res = await categoriesAPI.getAll(); setCategories(res.data.data); }
    catch (err) { console.error(err); }
  };

  const openCreate = () => {
    setForm({ nombre: '', descripcion: '', ingredientes: '', peso_gramos: '', precio: '', stock: '0',
      id_categoria: '', tiempo_elaboracion_min: '30', vida_util_dias: '3', complejidad: '3', num_ingredientes: '5' });
    setImageFile(null);
    setImagePreview(null);
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (p) => {
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', ingredientes: p.ingredientes || '',
      peso_gramos: p.peso_gramos || '', precio: p.precio, stock: p.stock, id_categoria: p.id_categoria || '',
      disponible: p.disponible, tiempo_elaboracion_min: p.tiempo_elaboracion_min || '30',
      vida_util_dias: p.vida_util_dias || '3', complejidad: p.complejidad || '3', num_ingredientes: p.num_ingredientes || '5' });
    setImageFile(null);
    setImagePreview(null);
    setModal({ open: true, mode: 'edit', data: p });
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
    if (file && file.type.startsWith('image/')) handleImageChange(file);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(k => {
        formData.append(k, (form[k] === '' || form[k] === null || form[k] === undefined) ? '' : form[k]);
      });
      if (imageFile) formData.append('imagen', imageFile);
      if (modal.mode === 'create') { await producerAPI.createProduct(formData); showAlert('Producto creado', 'success'); }
      else { await producerAPI.updateProduct(modal.data.id_producto, formData); showAlert('Producto actualizado', 'success'); }
      setModal({ open: false, mode: 'create', data: null }); loadProducts();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
    finally { setSaving(false); }
  };

  const handleCreateReplenishment = async (e) => {
    e.preventDefault();
    try {
      await producerAPI.createReplenishment({
        id_producto: renewModal.product.id_producto,
        cantidad: parseInt(renewStock),
        id_trabajador: assignedWorker || null
      });
      showAlert('✅ Tarea de reposición enviada a la cola de cocina.', 'success');
      setRenewModal({ open: false, product: null });
      setRenewStock('');
      setAssignedWorker('');
      loadProducts();
      loadReplenishments();
    } catch (err) { showAlert(err.response?.data?.message || 'Error al crear la tarea', 'error'); }
  };

  const showAlert = (msg, type) => { setAlert({ message: msg, type }); setTimeout(() => setAlert(null), 4000); };

  const getFreshnessBadge = (p) => {
    if (!p.fecha_vencimiento_stock) return null;
    const h = (new Date(p.fecha_vencimiento_stock) - new Date()) / 3600000;
    if (h <= 0) return <span className="admin-badge badge-cancelado">Vencido</span>;
    if (h <= 24) return <span className="admin-badge badge-pendiente">⚠️ {Math.round(h)}h</span>;
    if (h <= 48) return <span className="admin-badge badge-en_camino">{Math.round(h/24)}d</span>;
    return <span className="admin-badge badge-entregado">Fresco ✓</span>;
  };

  const renderImageSection = () => {
    const currentImage = imagePreview || (modal.data?.imagen_principal);
    if (currentImage) {
      return (
        <div className="image-preview-container" onClick={() => fileInputRef.current?.click()}>
          <img src={currentImage} alt="Preview" />
          <div className="image-change-overlay"><FiCamera size={20} /><span>Cambiar imagen</span></div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageChange(e.target.files[0])} />
        </div>
      );
    }
    return (
      <div className={`image-upload-zone ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
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
        <h2>Mis Productos</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="view-toggle">
            <button className={viewMode === 'cards' ? 'active-view' : ''} onClick={() => setViewMode('cards')}><FiGrid size={15} /> Cards</button>
            <button className={viewMode === 'table' ? 'active-view' : ''} onClick={() => setViewMode('table')}><FiList size={15} /> Tabla</button>
          </div>
          <button className="btn-admin btn-admin-primary" onClick={openCreate}><FiPlus /> Nuevo Producto</button>
        </div>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      <div className="admin-table-wrapper">
        <div className="admin-table-header"><h3>{products.length} productos</h3></div>

        {loading ? <div className="admin-loading">Cargando...</div> : (
          <>
            {/* CARD VIEW */}
            {viewMode === 'cards' && (
              <div className="product-cards-grid">
                {products.map(p => (
                  <div className="product-card" key={p.id_producto}>
                    <div className="product-card-image" onClick={() => openEdit(p)}>
                      {p.imagen_principal ? <img src={p.imagen_principal} alt={p.nombre} /> : <div className="image-placeholder">🍞</div>}
                      <div className="image-overlay"><FiEdit2 size={18} /> Editar producto</div>
                    </div>
                    <div className="product-card-body">
                      <div className="product-card-title">{p.nombre}</div>
                      {p.descripcion && <div className="product-card-desc">{p.descripcion}</div>}
                      <div className="product-card-attrs">
                        <div className="product-card-attr"><span className="attr-label">Precio</span><span className="attr-value price">${parseFloat(p.precio).toFixed(2)}</span></div>
                        <div className="product-card-attr"><span className="attr-label">Stock</span><span className="attr-value">{p.stock} uds</span></div>
                        <div className="product-card-attr"><span className="attr-label">Categoría</span><span className="attr-value">{p.categoria_nombre || '—'}</span></div>
                        <div className="product-card-attr"><span className="attr-label">Peso</span><span className="attr-value">{p.peso_gramos ? `${p.peso_gramos}g` : '—'}</span></div>
                        {p.tiempo_elaboracion_min && <div className="product-card-attr"><span className="attr-label">Elaboración</span><span className="attr-value">{p.tiempo_elaboracion_min} min</span></div>}
                        {p.vida_util_dias && <div className="product-card-attr"><span className="attr-label">Vida útil</span><span className="attr-value">{p.vida_util_dias} días</span></div>}
                      </div>
                      <div className="product-card-badges">
                        <span className={`admin-badge ${p.disponible ? 'badge-available' : 'badge-unavailable'}`}>{p.disponible ? 'Disponible' : 'No disponible'}</span>
                        {getFreshnessBadge(p)}
                      </div>
                    </div>
                    <div className="product-card-footer">
                      <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => { setRenewStock(''); setRenewModal({open:true,product:p}); }} title="Planificar elaboración"><FiRefreshCw size={14} /></button>
                      <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => openEdit(p)} title="Editar"><FiEdit2 size={14} /></button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && <div className="admin-empty" style={{gridColumn:'1/-1'}}><div className="admin-empty-icon">📦</div><p>No tienes productos aún</p></div>}
              </div>
            )}

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
              <table className="admin-table">
                <thead>
                  <tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Frescura</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id_producto}>
                      <td>
                        <div className="product-cell">
                          {p.imagen_principal ? <img src={p.imagen_principal} className="product-img" alt="" /> :
                            <div className="product-img" style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>🍞</div>}
                          <span className="product-name">{p.nombre}</span>
                        </div>
                      </td>
                      <td>{p.categoria_nombre || '—'}</td>
                      <td style={{fontWeight:600,color:'var(--color-primary)'}}>${parseFloat(p.precio).toFixed(2)}</td>
                      <td>{p.stock}</td>
                      <td>{getFreshnessBadge(p) || <span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>Sin fecha</span>}</td>
                      <td><span className={`admin-badge ${p.disponible ? 'badge-available' : 'badge-unavailable'}`}>{p.disponible ? 'Disponible' : 'No disponible'}</span></td>
                      <td>
                        <div style={{display:'flex',gap:'6px'}}>
                          <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => { setRenewStock(''); setRenewModal({open:true,product:p}); }} title="Planificar elaboración"><FiRefreshCw size={14} /></button>
                          <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => openEdit(p)} title="Editar"><FiEdit2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan={7} className="admin-empty">No tienes productos aún</td></tr>}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Cola de Producción */}
      <div className="admin-section-header" style={{ marginTop: '40px' }}>
        <h2>📋 Cola de Producción Interna (Reposición de Stock)</h2>
      </div>

      <div className="admin-table-wrapper" style={{ marginBottom: '40px' }}>
        <div className="admin-table-header">
          <h3>{replenishments.length} órdenes en cola</h3>
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>Producto</th><th>Cantidad</th><th>Asignado A</th><th>Estado</th><th>Fecha Creación</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {replenishments.map(r => (
              <tr key={r.id_tarea}>
                <td>#{r.id_tarea}</td>
                <td style={{ fontWeight: 600, color: '#fff' }}>{r.producto_nombre}</td>
                <td>{r.cantidad} unidades</td>
                <td>
                  {r.trabajador_nombre
                    ? `👷 ${r.trabajador_nombre} ${r.trabajador_apellido}`
                    : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>— Cualquier operario —</span>
                  }
                </td>
                <td><span className={`admin-badge badge-${r.estado}`}>{r.estado}</span></td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{new Date(r.fecha_creacion).toLocaleString('es-EC')}</td>
                <td>
                  {r.estado === 'pendiente' && (
                    <button className="btn-admin btn-admin-sm btn-admin-delete" onClick={() => handleDeleteReplenishment(r.id_tarea)} title="Cancelar producción">
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {replenishments.length === 0 && (
              <tr><td colSpan={7} className="admin-empty">No hay órdenes de producción planificadas hoy</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Planificar Elaboración */}
      {renewModal.open && (
        <div className="admin-modal-overlay" onClick={() => { setRenewModal({open:false,product:null}); setAssignedWorker(''); }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{maxWidth:420}}>
            <h2>🥣 Planificar Elaboración</h2>
            <p style={{color:'var(--text-secondary)',fontSize:'0.85rem',marginBottom:'16px'}}>
              Se enviará una orden de cocción/preparación de <strong style={{color:'#fff'}}>{renewModal.product?.nombre}</strong> a la cola de la cocina. El stock de la tienda aumentará automáticamente una vez que el operario complete la tarea.
            </p>
            <form onSubmit={handleCreateReplenishment}>
              <div className="admin-form-group">
                <label>Cantidad a elaborar *</label>
                <input type="number" min="1" className="admin-input" value={renewStock} onChange={e => setRenewStock(e.target.value)} placeholder="Ej: 20" required />
              </div>
              <div className="admin-form-group">
                <label>Asignar a (opcional)</label>
                <select className="admin-select" value={assignedWorker} onChange={e => setAssignedWorker(e.target.value)}>
                  <option value="">— Cualquier operario disponible —</option>
                  {workers.map(w => (
                    <option key={w.id_trabajador} value={w.id_trabajador}>👷 {w.nombre} {w.apellido} ({w.especialidad})</option>
                  ))}
                </select>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-admin btn-admin-ghost" onClick={() => { setRenewModal({open:false,product:null}); setAssignedWorker(''); }}>Cancelar</button>
                <button type="submit" className="btn-admin btn-admin-primary">Crear Tarea</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crear/Editar Modal */}
      {modal.open && (
        <div className="admin-modal-overlay" onClick={() => { setModal({open:false,mode:'create',data:null}); setImagePreview(null); }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>{modal.mode === 'create' ? '✨ Nuevo Producto' : '✏️ Editar Producto'}</h2>
            <form onSubmit={handleSave}>
              {/* Image Upload Section */}
              <div className="admin-form-group">
                <label><FiImage size={14} /> Imagen del producto</label>
                {renderImageSection()}
              </div>

              <div className="admin-form-group"><label>Nombre *</label><input className="admin-input" value={form.nombre} onChange={e => setForm({...form,nombre:e.target.value})} required /></div>
              <div className="admin-form-group"><label>Descripción</label><textarea className="admin-textarea" value={form.descripcion} onChange={e => setForm({...form,descripcion:e.target.value})} /></div>
              <div className="admin-form-row">
                <div className="admin-form-group"><label>Categoría</label>
                  <select className="admin-select" value={form.id_categoria} onChange={e => setForm({...form,id_categoria:e.target.value})}>
                    <option value="">Seleccionar</option>{categories.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="admin-form-group"><label>Precio ($) *</label><input type="number" step="0.01" min="0" className="admin-input" value={form.precio} onChange={e => setForm({...form,precio:e.target.value})} required /></div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group"><label>Stock</label><input type="number" min="0" className="admin-input" value={form.stock} onChange={e => setForm({...form,stock:e.target.value})} /></div>
                <div className="admin-form-group"><label>Peso (gramos)</label><input type="number" min="0" className="admin-input" value={form.peso_gramos} onChange={e => setForm({...form,peso_gramos:e.target.value})} /></div>
              </div>
              <div className="admin-form-group"><label>Ingredientes</label><textarea className="admin-textarea" value={form.ingredientes} onChange={e => setForm({...form,ingredientes:e.target.value})} /></div>
              <div className="admin-form-row">
                <div className="admin-form-group"><label>Tiempo elaboración (min)</label><input type="number" min="1" className="admin-input" value={form.tiempo_elaboracion_min} onChange={e => setForm({...form,tiempo_elaboracion_min:e.target.value})} /></div>
                <div className="admin-form-group"><label>Vida útil (días)</label><input type="number" min="1" max="3" className="admin-input" value={form.vida_util_dias} onChange={e => setForm({...form,vida_util_dias:e.target.value})} /></div>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-admin btn-admin-ghost" onClick={() => { setModal({open:false,mode:'create',data:null}); setImagePreview(null); }}>Cancelar</button>
                <button type="submit" className="btn-admin btn-admin-primary" disabled={saving}>{saving ? 'Guardando...' : (modal.mode === 'create' ? 'Crear' : 'Guardar')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
