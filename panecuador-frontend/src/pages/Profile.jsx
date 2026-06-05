import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiMapPin, FiCreditCard, FiEdit2, FiTrash2, FiPlus, FiSave } from 'react-icons/fi';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nombre: '', apellido: '', telefono: '' });
  const [activeTab, setActiveTab] = useState('datos');

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
              <h2>Mis Direcciones</h2>
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
                <p className="text-muted">No tienes direcciones guardadas. Puedes agregarlas al hacer un pedido.</p>
              )}
            </div>
          )}

          {activeTab === 'pagos' && (
            <div className="profile-section animate-fade-in">
              <h2>Métodos de Pago</h2>
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
                <p className="text-muted">No tienes métodos de pago. Puedes agregarlos al hacer un pedido.</p>
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
