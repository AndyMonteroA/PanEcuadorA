import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiMapPin, FiCreditCard, FiEdit2, FiTrash2, FiPlus, FiSave, FiCheck, FiX } from 'react-icons/fi';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ECUADOR_PROVINCIAS } from '../data/ecuadorData';
import './Profile.css';

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nombre: '', apellido: '', telefono: '' });
  const [activeTab, setActiveTab] = useState('datos');

  // Address modal form
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    alias: '', calle: '', ciudad: 'Quito', provincia: 'Pichincha', referencia: '', es_principal: true
  });

  // Payment modal form
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [cardFields, setCardFields] = useState({
    number: '', name: '', expiry: '', cvv: '', tipo: 'tarjeta_credito'
  });

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchProfile();
  }, [isAuthenticated]);

  async function fetchProfile() {
    try {
      const res = await usersAPI.getProfile();
      setProfile(res.data.data);
      setEditForm({
        nombre: res.data.data.nombre,
        apellido: res.data.data.apellido,
        telefono: res.data.data.telefono || ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveProfile = async () => {
    try {
      await usersAPI.updateProfile(editForm);
      setEditing(false);
      fetchProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!confirm('¿Eliminar esta dirección?')) return;
    try {
      await usersAPI.deleteAddress(id);
      fetchProfile();
    } catch (err) {
      alert('Error al eliminar dirección');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.addAddress(newAddress);
      setShowAddAddress(false);
      setNewAddress({ alias: '', calle: '', ciudad: 'Quito', provincia: 'Pichincha', referencia: '', es_principal: true });
      fetchProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al agregar dirección');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const cleanNum = cardFields.number.replace(/\D/g, '');
    if (cleanNum.length < 16) {
      alert('El número de tarjeta debe tener 16 dígitos.');
      return;
    }
    const cleanExpiry = cardFields.expiry.replace(/\D/g, '');
    if (cleanExpiry.length < 4) {
      alert('Fecha de vencimiento inválida (Formato MM/YY).');
      return;
    }
    if (cardFields.cvv.length < 3) {
      alert('El CVV debe tener al menos 3 dígitos.');
      return;
    }

    try {
      const clean = cleanNum;
      const marca = clean.startsWith('4') ? 'Visa' : (clean.startsWith('5') || clean.startsWith('2')) ? 'Mastercard' : 'Visa';
      const ultimos_4_digitos = clean.slice(-4);
      const token_cifrado = `tok_${Math.random().toString(36).substring(2, 10)}`;

      await usersAPI.addPaymentMethod({
        tipo: cardFields.tipo,
        ultimos_4_digitos,
        marca,
        token_cifrado,
        es_principal: true
      });
      setShowAddPayment(false);
      setCardFields({ number: '', name: '', expiry: '', cvv: '', tipo: 'tarjeta_credito' });
      fetchProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al agregar tarjeta');
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="loading-screen"><div className="spinner" /><p>Cargando perfil...</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {profile?.fotoPerfil ? (
              <img src={profile.fotoPerfil} alt="" />
            ) : (
              <span>{profile?.nombre?.[0]}{profile?.apellido?.[0]}</span>
            )}
          </div>
          <div className="profile-header-info">
            <h1>{profile?.nombre} {profile?.apellido}</h1>
            <p>{profile?.email}</p>
            <span className="profile-member-since">
              Miembro desde {new Date(profile?.fechaRegistro).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button className={`tab-btn ${activeTab === 'datos' ? 'active' : ''}`}
            onClick={() => setActiveTab('datos')}>
            <FiUser size={16} /> Datos personales
          </button>
          <button className={`tab-btn ${activeTab === 'direcciones' ? 'active' : ''}`}
            onClick={() => setActiveTab('direcciones')}>
            <FiMapPin size={16} /> Direcciones
          </button>
          <button className={`tab-btn ${activeTab === 'pagos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pagos')}>
            <FiCreditCard size={16} /> Métodos de pago
          </button>
        </div>

        {/* Tab content */}
        <div className="profile-content card">
          {activeTab === 'datos' && (
            <div className="profile-section animate-fade-in">
              <div className="section-header-row">
                <h2>Datos personales</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>
                  <FiEdit2 /> {editing ? 'Cancelar' : 'Editar'}
                </button>
              </div>

              {editing ? (
                <div className="profile-form">
                  <div className="inline-row">
                    <div className="input-group">
                      <label>Nombre</label>
                      <input className="input" value={editForm.nombre}
                        onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label>Apellido</label>
                      <input className="input" value={editForm.apellido}
                        onChange={e => setEditForm({ ...editForm, apellido: e.target.value })} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Teléfono</label>
                    <input className="input" value={editForm.telefono}
                      onChange={e => setEditForm({ ...editForm, telefono: e.target.value })} />
                  </div>
                  <button className="btn btn-primary" onClick={handleSaveProfile}>
                    <FiSave /> Guardar cambios
                  </button>
                </div>
              ) : (
                <div className="profile-data-grid">
                  <div className="profile-data-item">
                    <span>Nombre</span>
                    <strong>{profile?.nombre} {profile?.apellido}</strong>
                  </div>
                  <div className="profile-data-item">
                    <span>Email</span>
                    <strong>{profile?.email}</strong>
                  </div>
                  <div className="profile-data-item">
                    <span>Teléfono</span>
                    <strong>{profile?.telefono || 'No registrado'}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'direcciones' && (
            <div className="profile-section animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Mis Direcciones</h2>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddAddress(!showAddAddress)}>
                  <FiPlus /> Nueva Dirección
                </button>
              </div>

              {showAddAddress && (
                <form className="inline-form card" onSubmit={handleAddAddress} style={{ padding: '16px', marginBottom: '20px' }}>
                  <input className="input" placeholder="Alias (ej: Casa, Oficina)" value={newAddress.alias}
                    onChange={e => setNewAddress({ ...newAddress, alias: e.target.value })} />
                  
                  <div className="inline-row">
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Provincia (Ecuador)</label>
                      <select className="input" required value={newAddress.provincia}
                        onChange={e => {
                          const prov = e.target.value;
                          const firstCanton = ECUADOR_PROVINCIAS[prov]?.[0] || '';
                          setNewAddress({ ...newAddress, provincia: prov, ciudad: firstCanton });
                        }}>
                        {Object.keys(ECUADOR_PROVINCIAS).map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cantón / Ciudad</label>
                      <select className="input" required value={newAddress.ciudad}
                        onChange={e => setNewAddress({ ...newAddress, ciudad: e.target.value })}>
                        {(ECUADOR_PROVINCIAS[newAddress.provincia || 'Pichincha'] || []).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <input className="input" placeholder="Calle principal, secundaria y # casa *" required value={newAddress.calle}
                    onChange={e => setNewAddress({ ...newAddress, calle: e.target.value })} />

                  <input className="input" placeholder="Referencia" value={newAddress.referencia}
                    onChange={e => setNewAddress({ ...newAddress, referencia: e.target.value })} />
                  
                  <button type="submit" className="btn btn-primary btn-sm">Guardar dirección</button>
                </form>
              )}

              {profile?.direcciones?.length > 0 ? (
                <div className="profile-list">
                  {profile.direcciones.map(addr => (
                    <div key={addr.id_direccion} className="profile-list-item">
                      <div>
                        <strong>{addr.alias || 'Dirección'} {addr.es_principal && '⭐'}</strong>
                        <p>{addr.calle}, {addr.ciudad}, {addr.provincia}</p>
                        {addr.referencia && <small>{addr.referencia}</small>}
                      </div>
                      <button className="btn-icon-sm" onClick={() => handleDeleteAddress(addr.id_direccion)}>
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                !showAddAddress && <p className="text-muted">No tienes direcciones guardadas.</p>
              )}
            </div>
          )}

          {activeTab === 'pagos' && (
            <div className="profile-section animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Métodos de Pago</h2>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddPayment(!showAddPayment)}>
                  <FiPlus /> Nueva Tarjeta
                </button>
              </div>

              {showAddPayment && (
                <form className="inline-form card" onSubmit={handleAddPayment} style={{ padding: '16px', marginBottom: '20px' }}>
                  <div className="input-group">
                    <label style={{ fontSize: '0.8rem' }}>Tipo</label>
                    <select className="input" value={cardFields.tipo}
                      onChange={e => setCardFields({ ...cardFields, tipo: e.target.value })}>
                      <option value="tarjeta_credito">💳 Tarjeta de Crédito</option>
                      <option value="tarjeta_debito">💳 Tarjeta de Débito</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label style={{ fontSize: '0.8rem' }}>Nombre del Titular (Solo letras)</label>
                    <input className="input" placeholder="TITULAR DE LA TARJETA" required maxLength={40}
                      value={cardFields.name}
                      onChange={e => {
                        const cleanLetters = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
                        setCardFields({ ...cardFields, name: cleanLetters.toUpperCase() });
                      }} />
                  </div>

                  <div className="input-group">
                    <label style={{ fontSize: '0.8rem' }}>Número de Tarjeta (16 dígitos)</label>
                    <input className="input" placeholder="4000 1234 5678 9010" required
                      value={cardFields.number}
                      onChange={e => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 16);
                        const formatted = clean.replace(/(.{4})/g, '$1 ').trim();
                        setCardFields({ ...cardFields, number: formatted });
                      }} />
                  </div>

                  <div className="inline-row">
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem' }}>Vencimiento (MM/YY)</label>
                      <input className="input" placeholder="MM/YY" required maxLength={5}
                        value={cardFields.expiry}
                        onChange={e => {
                          const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                          const formatted = clean.length >= 3 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
                          setCardFields({ ...cardFields, expiry: formatted });
                        }} />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem' }}>CVV</label>
                      <input className="input" placeholder="123" required type="password" maxLength={4}
                        value={cardFields.cvv}
                        onChange={e => setCardFields({ ...cardFields, cvv: e.target.value.replace(/\D/g, '') })} />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-sm">Guardar Tarjeta</button>
                </form>
              )}

              {profile?.metodosPago?.length > 0 ? (
                <div className="profile-list">
                  {profile.metodosPago.map(pm => (
                    <div key={pm.id_metodo} className="profile-list-item">
                      <div>
                        <strong>{pm.marca} •••• {pm.ultimos_4_digitos} {pm.es_principal && '⭐'}</strong>
                        <p>{pm.tipo.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !showAddPayment && <p className="text-muted">No tienes métodos de pago guardados.</p>
              )}
            </div>
          )}
        </div>

        {/* Logout */}
        <button className="btn btn-secondary profile-logout" onClick={() => { logout(); navigate('/'); }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
