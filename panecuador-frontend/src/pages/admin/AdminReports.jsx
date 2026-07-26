import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  FiTrendingUp, FiDollarSign, FiShoppingBag, FiUsers, FiAward, 
  FiPieChart, FiTag, FiRefreshCw, FiAlertCircle 
} from 'react-icons/fi';

const COLORS = ['#C47F3B', '#D4A017', '#8D5B28', '#4A3728', '#22C55E', '#3B82F6', '#EC4899', '#8B5CF6'];

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getReports();
      setData(res.data.data);
    } catch (err) {
      console.error('Error al cargar reportes:', err);
      setError('No se pudieron cargar los datos de inteligencia de negocios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" style={{ width: 36, height: 36 }} />
        <p>Cargando análisis de Inteligencia de Negocios (BI)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-empty">
        <FiAlertCircle size={32} color="var(--color-error)" />
        <p>{error}</p>
        <button className="btn-admin btn-admin-primary" onClick={fetchReports}>Reintentar</button>
      </div>
    );
  }

  const { ventasDiarias, topProductos, ventasPorCategoria, usuariosPorSemana, rendimientoProductores, cuponesUsados, panpassStats, kpis } = data;

  return (
    <div className="admin-reports-page">
      <div className="admin-section-header">
        <div>
          <h2>📊 Inteligencia de Negocios (BI)</h2>
          <p className="admin-subtitle-text">Análisis predictivo, métricas de rendimiento y estadísticas clave de PanEcuador</p>
        </div>
        <button className="btn-admin btn-admin-ghost" onClick={fetchReports}>
          <FiRefreshCw /> Actualizar Datos
        </button>
      </div>

      {/* KPI Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card accent">
          <span className="stat-label"><FiDollarSign size={14} /> Ticket Promedio</span>
          <span className="stat-value">${kpis.ticketPromedio.toFixed(2)}</span>
          <span className="stat-sub">Promedio por pedido realizado</span>
        </div>

        <div className="admin-stat-card info">
          <span className="stat-label"><FiShoppingBag size={14} /> Pedidos Históricos</span>
          <span className="stat-value">{kpis.totalPedidosHistorico}</span>
          <span className="stat-sub">{kpis.pedidosEntregados} entregados exitosamente</span>
        </div>

        <div className="admin-stat-card success">
          <span className="stat-label"><FiUsers size={14} /> Conversión y Satisfacción</span>
          <span className="stat-value">
            {kpis.totalPedidosHistorico > 0 
              ? `${((kpis.pedidosEntregados / kpis.totalPedidosHistorico) * 100).toFixed(1)}%` 
              : '100%'}
          </span>
          <span className="stat-sub">Efectividad de entrega</span>
        </div>

        <div className="admin-stat-card warning">
          <span className="stat-label"><FiAlertCircle size={14} /> Devoluciones & Cancelados</span>
          <span className="stat-value">{kpis.totalDevoluciones} / {kpis.pedidosCancelados}</span>
          <span className="stat-sub">Devoluciones / Pedidos Cancelados</span>
        </div>
      </div>

      {/* Chart 1: Ventas Diarias (Últimos 30 Días) */}
      <div className="admin-card bi-chart-card">
        <div className="bi-chart-header">
          <h3><FiTrendingUp /> Ventas Diarias e Ingresos (Últimos 30 Días)</h3>
          <span className="bi-badge">Tendencia Temporal</span>
        </div>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={ventasDiarias} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C47F3B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#C47F3B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="fecha" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                formatter={(value, name) => [name === 'total_ventas' ? `$${parseFloat(value).toFixed(2)}` : value, name === 'total_ventas' ? 'Ventas' : 'Pedidos']}
                contentStyle={{ background: '#1A120B', borderRadius: '8px', color: '#fff', border: 'none' }}
              />
              <Area type="monotone" dataKey="total_ventas" name="total_ventas" stroke="#C47F3B" fillOpacity={1} fill="url(#colorVentas)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bi-grid-2">
        {/* Chart 2: Top Productos Más Vendidos */}
        <div className="admin-card bi-chart-card">
          <div className="bi-chart-header">
            <h3><FiAward /> Top 10 Productos Más Vendidos</h3>
            <span className="bi-badge">Unidades Vendidas</span>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={topProductos} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" stroke="#888" fontSize={12} />
                <YAxis dataKey="nombre" type="category" stroke="#888" fontSize={11} width={120} />
                <Tooltip 
                  formatter={(val, name) => [name === 'cantidad_vendida' ? `${val} uds` : `$${val}`, name === 'cantidad_vendida' ? 'Cantidad' : 'Ingresos']}
                  contentStyle={{ background: '#1A120B', borderRadius: '8px', color: '#fff', border: 'none' }}
                />
                <Bar dataKey="cantidad_vendida" fill="#D4A017" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Ventas por Categoría */}
        <div className="admin-card bi-chart-card">
          <div className="bi-chart-header">
            <h3><FiPieChart /> Ingresos por Categoría</h3>
            <span className="bi-badge">Participación de Mercado</span>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={ventasPorCategoria}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="total_ingresos"
                  nameKey="categoria"
                  label={({ categoria, percent }) => `${categoria} (${(percent * 100).toFixed(0)}%)`}
                >
                  {ventasPorCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val) => [`$${parseFloat(val).toFixed(2)}`, 'Ingresos']}
                  contentStyle={{ background: '#1A120B', borderRadius: '8px', color: '#fff', border: 'none' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bi-grid-2" style={{ marginTop: 'var(--space-xl)' }}>
        {/* Chart 4: Registro de Usuarios */}
        <div className="admin-card bi-chart-card">
          <div className="bi-chart-header">
            <h3><FiUsers /> Nuevos Usuarios por Semana</h3>
            <span className="bi-badge">Crecimiento de Clientes</span>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={usuariosPorSemana} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="semana" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: '#1A120B', borderRadius: '8px', color: '#fff', border: 'none' }}
                />
                <Bar dataKey="nuevos_usuarios" name="Nuevos Usuarios" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Rendimiento por Productor */}
        <div className="admin-card bi-chart-card">
          <div className="bi-chart-header">
            <h3><FiAward /> Rendimiento por Artesano / Productor</h3>
            <span className="bi-badge">Ingresos Generados</span>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={rendimientoProductores} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="productor" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  formatter={(val) => [`$${parseFloat(val).toFixed(2)}`, 'Generado']}
                  contentStyle={{ background: '#1A120B', borderRadius: '8px', color: '#fff', border: 'none' }}
                />
                <Bar dataKey="total_generado" name="Ingresos Generados ($)" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Seccion 6: Cupones y Membresias */}
      <div className="bi-grid-2" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="admin-card">
          <h3 className="admin-card-title"><FiTag /> Cupones Promocionales Más Usados</h3>
          <table className="admin-table" style={{ marginTop: 'var(--space-md)' }}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descuento</th>
                <th>Usos Totales</th>
              </tr>
            </thead>
            <tbody>
              {cuponesUsados.map((c, i) => (
                <tr key={i}>
                  <td><strong>{c.codigo}</strong></td>
                  <td>{c.tipo_descuento === 'porcentaje' ? `${c.valor}%` : `$${c.valor}`}</td>
                  <td><span className="badge badge-success">{c.usos} veces</span></td>
                </tr>
              ))}
              {cuponesUsados.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center' }}>No hay cupones registrados aún</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-card">
          <h3 className="admin-card-title"><FiAward /> Membresías PanPass Activas</h3>
          <table className="admin-table" style={{ marginTop: 'var(--space-md)' }}>
            <thead>
              <tr>
                <th>Plan de Membresía</th>
                <th>Suscripciones Activas</th>
              </tr>
            </thead>
            <tbody>
              {panpassStats.map((p, i) => (
                <tr key={i}>
                  <td><strong>{p.membresia}</strong></td>
                  <td><span className="badge badge-info">{p.suscripciones_activas} suscriptores</span></td>
                </tr>
              ))}
              {panpassStats.length === 0 && (
                <tr><td colSpan={2} style={{ textAlign: 'center' }}>No hay planes activos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
