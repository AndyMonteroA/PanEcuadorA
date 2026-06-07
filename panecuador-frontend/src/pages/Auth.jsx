import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiUser, FiPhone, FiEye, FiEyeOff } from 'react-icons/fi';
import logoImg from '../assets/logo.png';
import './Auth.css';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(form.email, form.password);
      // Redirigir según el rol del usuario
      if (userData.rol === 'admin') {
        navigate('/admin');
      } else if (userData.rol === 'productor') {
        navigate('/productor');
      } else if (userData.rol === 'trabajador') {
        navigate('/trabajador');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-visual">
          <div className="auth-visual-content">
            <img src={logoImg} alt="PanEcuador Logo" className="auth-visual-logo" style={{ maxWidth: '180px', margin: '0 auto var(--space-lg)', display: 'block', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }} />
            <h2>Bienvenido de vuelta</h2>
            <p>Los mejores productos de panadería y pastelería ecuatoriana te esperan</p>
          </div>
        </div>

        <div className="auth-form-section">
          <div className="auth-form-wrapper">
            <div className="auth-form-logo-container" style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src={logoImg} alt="PanEcuador Logo" style={{ maxHeight: '60px', objectFit: 'contain' }} />
            </div>
            <h1 className="auth-title" style={{ textAlign: 'center' }}>Iniciar Sesión</h1>
            <p className="auth-subtitle" style={{ textAlign: 'center' }}>Ingresa a tu cuenta PanEcuador</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <div className="input-with-icon">
                  <FiMail className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="tu@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Contraseña</label>
                <div className="input-with-icon">
                  <FiLock className="input-icon" />
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    className="input"
                    placeholder="Tu contraseña"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Ingresar'}
              </button>
            </form>

            <p className="auth-switch">
              ¿No tienes cuenta? <Link to="/registro" className="auth-link">Regístrate aquí</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', password: '', telefono: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-visual">
          <div className="auth-visual-content">
            <img src={logoImg} alt="PanEcuador Logo" className="auth-visual-logo" style={{ maxWidth: '180px', margin: '0 auto var(--space-lg)', display: 'block', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }} />
            <h2>Únete a PanEcuador</h2>
            <p>Crea tu cuenta y empieza a disfrutar de productos artesanales ecuatorianos</p>
          </div>
        </div>

        <div className="auth-form-section">
          <div className="auth-form-wrapper">
            <div className="auth-form-logo-container" style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src={logoImg} alt="PanEcuador Logo" style={{ maxHeight: '60px', objectFit: 'contain' }} />
            </div>
            <h1 className="auth-title" style={{ textAlign: 'center' }}>Crear Cuenta</h1>
            <p className="auth-subtitle" style={{ textAlign: 'center' }}>Completa tus datos para registrarte</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-row">
                <div className="input-group">
                  <label htmlFor="nombre">Nombre</label>
                  <div className="input-with-icon">
                    <FiUser className="input-icon" />
                    <input
                      id="nombre"
                      type="text"
                      className="input"
                      placeholder="Tu nombre"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label htmlFor="apellido">Apellido</label>
                  <div className="input-with-icon">
                    <FiUser className="input-icon" />
                    <input
                      id="apellido"
                      type="text"
                      className="input"
                      placeholder="Tu apellido"
                      value={form.apellido}
                      onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="reg-email">Email</label>
                <div className="input-with-icon">
                  <FiMail className="input-icon" />
                  <input
                    id="reg-email"
                    type="email"
                    className="input"
                    placeholder="tu@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="telefono">Teléfono (opcional)</label>
                <div className="input-with-icon">
                  <FiPhone className="input-icon" />
                  <input
                    id="telefono"
                    type="tel"
                    className="input"
                    placeholder="0991234567"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="reg-password">Contraseña</label>
                <div className="input-with-icon">
                  <FiLock className="input-icon" />
                  <input
                    id="reg-password"
                    type={showPass ? 'text' : 'password'}
                    className="input"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Crear Cuenta'}
              </button>
            </form>

            <p className="auth-switch">
              ¿Ya tienes cuenta? <Link to="/login" className="auth-link">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
