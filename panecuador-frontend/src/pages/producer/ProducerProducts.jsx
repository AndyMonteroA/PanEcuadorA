import { useState, useEffect } from 'react';
import { producerAPI } from '../../services/api';
import { adminAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiRefreshCw, FiImage } from 'react-icons/fi';

export default function ProducerProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [renewModal, setRenewModal] = useState({ open: false, product: null });
  const [renewStock, setRenewStock] = useState('');
  const [form, setForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const [workers, setWorkers] = useState([]);
  const [assignedWorker, setAssignedWorker] = useState('');

  useEffect(() => { loadProducts(); loadCategories(); loadWorkers(); }, []);

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
    try { const res = await adminAPI.getCategories(); setCategories(res.data.data); }
    catch (err) { console.error(err); }
  };

  const openCreate = () => {
    setForm({ nombre: '', descripcion: '', ingredientes: '', peso_gramos: '', precio: '', stock: '0',
      id_categoria: '', tiempo_elaboracion_min: '30', vida_util_dias: '3', complejidad: '3', num_ingredientes: '5' });
    setImageFile(null);
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (p) => {
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', ingredientes: p.ingredientes || '',
      peso_gramos: p.peso_gramos || '', precio: p.precio, stock: p.stock, id_categoria: p.id_categoria || '',
      disponible: p.disponible, tiempo_elaboracion_min: p.tiempo_elaboracion_min || '30',
      vida_util_dias: p.vida_util_dias || '3', complejidad: p.complejidad || '3', num_ingredientes: p.num_ingredientes || '5' });
    setImageFile(null);
    setModal({ open: true, mode: 'edit', data: p });
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(k => { if (form[k] !== '' && form[k] != null) formData.append(k, form[k]); });
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

  return (
    <div>
      <div className="admin-section-header">
        <h2>Mis Productos</h2>
        <button className="btn-admin btn-admin-primary" onClick={openCreate}><FiPlus /> Nuevo Producto</button>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      <div className="admin-table-wrapper">
        <div className="admin-table-header"><h3>{products.length} productos</h3></div>
        {loading ? <div className="admin-loading">Cargando...</div> : (
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
                  <td style={{fontWeight:600}}>${parseFloat(p.precio).toFixed(2)}</td>
                  <td>{p.stock}</td>
                  <td>{getFreshnessBadge(p) || <span style={{color:'#52525b',fontSize:'0.75rem'}}>Sin fecha</span>}</td>
                  <td><span className={`admin-badge ${p.disponible ? 'badge-available' : 'badge-unavailable'}`}>{p.disponible ? 'Disponible' : 'No disponible'}</span></td>
                  <td>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => { setRenewStock(''); setRenewModal({open:true,product:p}); }} title="Planificar elaboración (Reponer Stock)"><FiRefreshCw size={14} /></button>
                      <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => openEdit(p)} title="Editar"><FiEdit2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={7} className="admin-empty">No tienes productos aún</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Planificar Elaboración (Reposición de Stock) */}
      {renewModal.open && (
        <div className="admin-modal-overlay" onClick={() => { setRenewModal({open:false,product:null}); setAssignedWorker(''); }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{maxWidth:400}}>
            <h2>🥣 Planificar Elaboración</h2>
            <p style={{color:'#a1a1aa',fontSize:'0.85rem',marginBottom:'16px'}}>
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
                    <option key={w.id_trabajador} value={w.id_trabajador}>
                      👷 {w.nombre} {w.apellido} ({w.especialidad})
                    </option>
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
        <div className="admin-modal-overlay" onClick={() => setModal({open:false,mode:'create',data:null})}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>{modal.mode === 'create' ? '✨ Nuevo Producto' : '✏️ Editar Producto'}</h2>
            <form onSubmit={handleSave}>
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
              <div className="admin-form-group"><label><FiImage size={14} /> Imagen del producto</label><input type="file" accept="image/*" className="admin-input" onChange={e => setImageFile(e.target.files[0])} /></div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-admin btn-admin-ghost" onClick={() => setModal({open:false,mode:'create',data:null})}>Cancelar</button>
                <button type="submit" className="btn-admin btn-admin-primary" disabled={saving}>{saving ? 'Guardando...' : (modal.mode === 'create' ? 'Crear' : 'Guardar')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
