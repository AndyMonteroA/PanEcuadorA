import { useState, useEffect } from 'react';
import { siteConfigAPI } from '../../services/api';
import {
  FiSave, FiRefreshCw, FiLayout, FiType, FiImage, FiGlobe,
  FiMail, FiPhone, FiInstagram, FiFacebook, FiEye, FiCheck
} from 'react-icons/fi';

const SECTIONS = [
  {
    key: 'identidad',
    label: '🏷️ Identidad',
    icon: FiType,
    fields: [
      { key: 'sitio_nombre',     label: 'Nombre del sitio',   tipo: 'texto',  placeholder: 'PanEcuador' },
      { key: 'sitio_subtitulo',  label: 'Subtítulo',          tipo: 'texto',  placeholder: 'Panadería artesanal ecuatoriana' },
      { key: 'sitio_logo_url',   label: 'URL del Logo',       tipo: 'imagen', placeholder: 'https://...' },
    ]
  },
  {
    key: 'colores',
    label: '🎨 Colores',
    icon: FiLayout,
    fields: [
      { key: 'color_primario',   label: 'Color primario (botones, links)', tipo: 'color' },
      { key: 'color_secundario', label: 'Color secundario',                tipo: 'color' },
      { key: 'color_acento',     label: 'Color acento (estrellas)',        tipo: 'color' },
    ]
  },
  {
    key: 'banner',
    label: '📢 Banner Superior',
    icon: FiEye,
    fields: [
      { key: 'banner_activo',    label: 'Activar banner',          tipo: 'boolean' },
      { key: 'banner_texto',     label: 'Texto del banner',        tipo: 'texto', placeholder: '🎉 ¡Envío gratis en pedidos mayores a $25!' },
      { key: 'banner_color',     label: 'Color de fondo',          tipo: 'color' },
    ]
  },
  {
    key: 'hero',
    label: '🦸 Sección Hero',
    icon: FiImage,
    fields: [
      { key: 'hero_titulo',      label: 'Título principal',        tipo: 'texto', placeholder: 'Pan artesanal ecuatoriano' },
      { key: 'hero_subtitulo',   label: 'Descripción del hero',   tipo: 'textarea', placeholder: 'Recetas tradicionales...' },
      { key: 'hero_cta_texto',   label: 'Texto botón CTA',        tipo: 'texto', placeholder: 'Ver Catálogo' },
    ]
  },
  {
    key: 'contacto',
    label: '📞 Contacto & Redes',
    icon: FiGlobe,
    fields: [
      { key: 'contacto_email',   label: 'Email de contacto',       tipo: 'texto', placeholder: 'hola@panecuador.online', icon: FiMail },
      { key: 'contacto_telefono',label: 'Teléfono',                tipo: 'texto', placeholder: '+593 99 000 0000', icon: FiPhone },
      { key: 'redes_instagram',  label: 'URL Instagram',           tipo: 'texto', placeholder: 'https://instagram.com/...', icon: FiInstagram },
      { key: 'redes_facebook',   label: 'URL Facebook',            tipo: 'texto', placeholder: 'https://facebook.com/...', icon: FiFacebook },
    ]
  },
  {
    key: 'footer',
    label: '🦶 Footer',
    icon: FiLayout,
    fields: [
      { key: 'footer_texto',     label: 'Texto del footer', tipo: 'textarea', placeholder: '© 2026 PanEcuador...' },
    ]
  },
];

export default function AdminSiteConfig() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('identidad');

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await siteConfigAPI.getAdmin();
      // Flatten: { clave: { valor, tipo, descripcion } } → { clave: valor }
      const flat = {};
      Object.entries(res.data.data).forEach(([k, v]) => { flat[k] = v.valor; });
      setConfig(flat);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await siteConfigAPI.update(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const currentSection = SECTIONS.find(s => s.key === activeSection);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-screen"><div className="spinner" /><p>Cargando configuración...</p></div>
      </div>
    );
  }

  // Preview values applied dynamically
  const previewStyle = {
    '--preview-primary': config.color_primario || '#E86A2E',
    '--preview-secondary': config.color_secundario || '#2D6A4F',
    '--preview-accent': config.color_acento || '#F5A623',
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-page-title">⚙️ Configuración del Sitio</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>
            Personaliza el aspecto y contenido de tu tienda desde aquí
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={fetchConfig} disabled={saving}>
            <FiRefreshCw size={16} /> Recargar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: '140px' }}
          >
            {saving ? <><div className="spinner-sm" /> Guardando...</> : saved ? <><FiCheck /> ¡Guardado!</> : <><FiSave /> Guardar cambios</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Sidebar navigation */}
        <nav style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px',
          boxShadow: 'var(--shadow-sm)',
          position: 'sticky',
          top: '90px'
        }}>
          {SECTIONS.map(sec => (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: activeSection === sec.key ? 'var(--color-primary)' : 'transparent',
                color: activeSection === sec.key ? 'white' : 'var(--text-secondary)',
                fontWeight: activeSection === sec.key ? '700' : '500',
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                marginBottom: '4px',
              }}
            >
              <sec.icon size={16} />
              {sec.label}
            </button>
          ))}
        </nav>

        {/* Form panel */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ marginBottom: '24px', fontSize: '1.1rem', fontWeight: '700' }}>
            {currentSection?.label}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {currentSection?.fields.map(field => (
              <div key={field.key}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}>
                  {field.label}
                </label>

                {field.tipo === 'color' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="color"
                      value={config[field.key] || '#E86A2E'}
                      onChange={e => handleChange(field.key, e.target.value)}
                      style={{ width: '56px', height: '44px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="input"
                      value={config[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder="#E86A2E"
                      style={{ maxWidth: '160px', fontFamily: 'monospace' }}
                    />
                    <div style={{
                      width: '44px', height: '44px',
                      borderRadius: '8px',
                      background: config[field.key] || '#E86A2E',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }} />
                  </div>
                ) : field.tipo === 'boolean' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <div
                      onClick={() => handleChange(field.key, config[field.key] === 'true' ? 'false' : 'true')}
                      style={{
                        width: '52px', height: '28px',
                        borderRadius: '14px',
                        background: config[field.key] === 'true' ? 'var(--color-primary)' : '#d1d5db',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        left: config[field.key] === 'true' ? '28px' : '4px',
                        width: '20px', height: '20px',
                        borderRadius: '50%',
                        background: 'white',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        transition: 'left 0.2s',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {config[field.key] === 'true' ? 'Activado' : 'Desactivado'}
                    </span>
                  </label>
                ) : field.tipo === 'textarea' ? (
                  <textarea
                    className="input"
                    value={config[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    rows={3}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                ) : (
                  <input
                    type="text"
                    className="input"
                    value={config[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder || ''}
                  />
                )}

                {/* Live preview for color */}
                {field.tipo === 'color' && activeSection === 'colores' && field.key === 'color_primario' && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: config[field.key] || '#E86A2E',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    Vista previa: Botón con color primario
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Preview block for banner section */}
          {activeSection === 'banner' && config.banner_activo === 'true' && (
            <div style={{
              marginTop: '24px',
              padding: '12px 20px',
              borderRadius: '8px',
              background: config.banner_color || '#2D6A4F',
              color: 'white',
              textAlign: 'center',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              👁️ Vista previa: {config.banner_texto || 'Tu anuncio aquí'}
            </div>
          )}

          {/* Preview block for hero section */}
          {activeSection === 'hero' && (
            <div style={{
              marginTop: '24px',
              padding: '24px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1a0a00 0%, #3d1c00 100%)',
              color: 'white',
            }}>
              <p style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '8px' }}>VISTA PREVIA DEL HERO</p>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>
                {config.hero_titulo || 'Título del hero'}
              </h2>
              <p style={{ opacity: 0.8, marginBottom: '16px', fontSize: '0.9rem' }}>
                {config.hero_subtitulo || 'Descripción aquí'}
              </p>
              <div style={{
                display: 'inline-block',
                padding: '10px 24px',
                borderRadius: '8px',
                background: config.color_primario || '#E86A2E',
                color: 'white',
                fontWeight: '700',
                fontSize: '0.875rem'
              }}>
                {config.hero_cta_texto || 'Ver Catálogo'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save success notification */}
      {saved && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--color-success)',
          color: 'white',
          padding: '14px 20px',
          borderRadius: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease',
        }}>
          <FiCheck /> ¡Configuración guardada correctamente!
        </div>
      )}
    </div>
  );
}
