import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import Home from './pages/Home';
import { Login, Register } from './pages/Auth';
import Catalogo from './pages/Catalogo';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import PanPass from './pages/PanPass';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import Notifications from './pages/Notifications';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCategories from './pages/admin/AdminCategories';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProducers from './pages/admin/AdminProducers';
import AdminWorkers from './pages/admin/AdminWorkers';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminReturns from './pages/admin/AdminReturns';

import './App.css';

// Componente para proteger rutas admin
function AdminRoute({ children }) {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Rutas del Admin — sin Navbar/Footer */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="productos" element={<AdminProducts />} />
              <Route path="pedidos" element={<AdminOrders />} />
              <Route path="categorias" element={<AdminCategories />} />
              <Route path="productores" element={<AdminProducers />} />
              <Route path="trabajadores" element={<AdminWorkers />} />
              <Route path="cupones" element={<AdminCoupons />} />
              <Route path="devoluciones" element={<AdminReturns />} />
              <Route path="usuarios" element={<AdminUsers />} />
            </Route>

            {/* Rutas del cliente — con Navbar/Footer */}
            <Route
              path="*"
              element={
                <div className="app">
                  <Navbar />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/registro" element={<Register />} />
                      <Route path="/catalogo" element={<Catalogo />} />
                      <Route path="/producto/:id" element={<ProductDetail />} />
                      <Route path="/carrito" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/pedidos" element={<Orders />} />
                      <Route path="/panpass" element={<PanPass />} />
                      <Route path="/perfil" element={<Profile />} />
                      <Route path="/favoritos" element={<Favorites />} />
                      <Route path="/notificaciones" element={<Notifications />} />
                      
                      {/* 404 */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <Footer />
                </div>
              }
            />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

function NotFound() {
  return (
    <div style={{
      paddingTop: 'calc(var(--navbar-height) + 38px + 60px)',
      paddingBottom: '60px',
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '5rem', display: 'block', marginBottom: '16px' }}>🔍</span>
        <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>Página no encontrada</h2>
        <p style={{ color: 'var(--text-muted)' }}>La página que buscas no existe.</p>
        <a href="/" className="btn btn-primary" style={{ marginTop: '24px', display: 'inline-flex' }}>
          Ir al inicio
        </a>
      </div>
    </div>
  );
}

export default App;
