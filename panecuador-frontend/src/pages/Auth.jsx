import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { FiMail, FiLock, FiUser, FiPhone, FiEye, FiEyeOff, FiArrowLeft, FiCheck } from 'react-icons/fi';
import logoImg from '../assets/logo.png';
import './Auth.css';

/* ============================================================
   LOGIN
   ============================================================ */
export function Login() {
  const { login, loginWithGoogle } = useAuth();
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
      if (userData.rol === 'admin') navigate('/admin');
      else if (userData.rol === 'productor') navigate('/productor');
      else if (userData.rol === 'trabajador') navigate('/trabajador');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Google Login handler
  const handleGoogleResponse = useCallback(async (response) => {
    setError('');
    setLoading(true);
    try {
      const userData = await loginWithGoogle(response.credential);
      if (userData.rol === 'admin') navigate('/admin');
      else if (userData.rol === 'productor') navigate('/productor');
      else if (userData.rol === 'trabajador') navigate('/trabajador');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar con Google');
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  useEffect(() => {
    // Load Google Identity Services
    if (!window.google?.accounts) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogle();
      document.body.appendChild(script);
    } else {
      initGoogle();
    }

    function initGoogle() {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          callback: handleGoogleResponse,
        });
        const btnContainer = document.getElementById('google-login-btn');
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center'
          });
        }
      }
    }
  }, [handleGoogleResponse]);

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

            {/* Google Login Button */}
            <div id="google-login-btn" className="google-btn-container"></div>

            <div className="auth-divider">
              <span>o inicia con email</span>
            </div>

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

              <div className="auth-forgot">
                <Link to="/recuperar-password" className="auth-link">¿Olvidaste tu contraseña?</Link>
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

/* ============================================================
   REGISTER
   ============================================================ */
export function Register() {
  const { register, loginWithGoogle } = useAuth();
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

  const handleGoogleResponse = useCallback(async (response) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(response.credential);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse con Google');
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  useEffect(() => {
    if (!window.google?.accounts) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogle();
      document.body.appendChild(script);
    } else {
      initGoogle();
    }

    function initGoogle() {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          callback: handleGoogleResponse,
        });
        const btnContainer = document.getElementById('google-register-btn');
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'center'
          });
        }
      }
    }
  }, [handleGoogleResponse]);

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

            {/* Google Register Button */}
            <div id="google-register-btn" className="google-btn-container"></div>

            <div className="auth-divider">
              <span>o regístrate con email</span>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-row">
                <div className="input-group">
                  <label htmlFor="nombre">Nombre</label>
                  <div className="input-with-icon">
                    <FiUser className="input-icon" />
                    <input id="nombre" type="text" className="input" placeholder="Tu nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                  </div>
                </div>
                <div className="input-group">
                  <label htmlFor="apellido">Apellido</label>
                  <div className="input-with-icon">
                    <FiUser className="input-icon" />
                    <input id="apellido" type="text" className="input" placeholder="Tu apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="reg-email">Email</label>
                <div className="input-with-icon">
                  <FiMail className="input-icon" />
                  <input id="reg-email" type="email" className="input" placeholder="tu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="telefono">Teléfono (opcional)</label>
                <div className="input-with-icon">
                  <FiPhone className="input-icon" />
                  <input id="telefono" type="tel" className="input" placeholder="0991234567" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="reg-password">Contraseña</label>
                <div className="input-with-icon">
                  <FiLock className="input-icon" />
                  <input id="reg-password" type={showPass ? 'text' : 'password'} className="input" placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
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

/* ============================================================
   FORGOT PASSWORD
   ============================================================ */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-single">
        <div className="auth-form-section">
          <div className="auth-form-wrapper">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src={logoImg} alt="PanEcuador Logo" style={{ maxHeight: '60px', objectFit: 'contain' }} />
            </div>

            {sent ? (
              <div className="auth-success-state">
                <div className="success-icon"><FiCheck /></div>
                <h1 className="auth-title" style={{ textAlign: 'center' }}>¡Revisa tu email!</h1>
                <p className="auth-subtitle" style={{ textAlign: 'center' }}>
                  Si el correo <strong>{email}</strong> está registrado, recibirás un enlace 
                  para restablecer tu contraseña. Revisa tu bandeja de entrada y spam.
                </p>
                <Link to="/login" className="btn btn-primary btn-lg auth-submit">
                  <FiArrowLeft /> Volver al login
                </Link>
              </div>
            ) : (
              <>
                <h1 className="auth-title" style={{ textAlign: 'center' }}>Recuperar contraseña</h1>
                <p className="auth-subtitle" style={{ textAlign: 'center' }}>
                  Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
                </p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="input-group">
                    <label htmlFor="forgot-email">Email</label>
                    <div className="input-with-icon">
                      <FiMail className="input-icon" />
                      <input
                        id="forgot-email"
                        type="email"
                        className="input"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                    {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Enviar enlace de recuperación'}
                  </button>
                </form>

                <p className="auth-switch">
                  <Link to="/login" className="auth-link"><FiArrowLeft size={14} /> Volver al login</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RESET PASSWORD (with token from URL)
   ============================================================ */
export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, form.password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-single">
        <div className="auth-form-section">
          <div className="auth-form-wrapper">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src={logoImg} alt="PanEcuador Logo" style={{ maxHeight: '60px', objectFit: 'contain' }} />
            </div>

            {success ? (
              <div className="auth-success-state">
                <div className="success-icon"><FiCheck /></div>
                <h1 className="auth-title" style={{ textAlign: 'center' }}>¡Contraseña actualizada!</h1>
                <p className="auth-subtitle" style={{ textAlign: 'center' }}>
                  Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login...
                </p>
                <Link to="/login" className="btn btn-primary btn-lg auth-submit">
                  Ir al login
                </Link>
              </div>
            ) : (
              <>
                <h1 className="auth-title" style={{ textAlign: 'center' }}>Nueva contraseña</h1>
                <p className="auth-subtitle" style={{ textAlign: 'center' }}>
                  Ingresa tu nueva contraseña
                </p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="input-group">
                    <label htmlFor="new-password">Nueva contraseña</label>
                    <div className="input-with-icon">
                      <FiLock className="input-icon" />
                      <input
                        id="new-password"
                        type={showPass ? 'text' : 'password'}
                        className="input"
                        placeholder="Mínimo 6 caracteres"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={6}
                      />
                      <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                        {showPass ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="confirm-password">Confirmar contraseña</label>
                    <div className="input-with-icon">
                      <FiLock className="input-icon" />
                      <input
                        id="confirm-password"
                        type={showPass ? 'text' : 'password'}
                        className="input"
                        placeholder="Repite tu contraseña"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                    {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Guardar nueva contraseña'}
                  </button>
                </form>

                <p className="auth-switch">
                  <Link to="/login" className="auth-link"><FiArrowLeft size={14} /> Volver al login</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
