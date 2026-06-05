import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiFilter, FiGrid, FiList, FiChevronDown } from 'react-icons/fi';
import ProductCard from '../components/product/ProductCard';
import { productsAPI, categoriesAPI } from '../services/api';
import './Catalogo.css';

export default function Catalogo() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    categoria: searchParams.get('categoria') || '',
    search: searchParams.get('search') || '',
    ordenar: 'reciente',
    min_precio: '',
    max_precio: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    categoriesAPI.getAll().then(res => setCategories(res.data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      categoria: searchParams.get('categoria') || prev.categoria,
      search: searchParams.get('search') || ''
    }));
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  async function fetchProducts(page = 1) {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (filters.categoria) params.categoria = filters.categoria;
      if (filters.search) params.search = filters.search;
      if (filters.ordenar) params.ordenar = filters.ordenar;
      if (filters.min_precio) params.min_precio = filters.min_precio;
      if (filters.max_precio) params.max_precio = filters.max_precio;

      const res = await productsAPI.getAll(params);
      setProducts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoading(false);
    }
  }

  const activeCategory = categories.find(c => c.id_categoria == filters.categoria);

  return (
    <div className="catalogo-page">
      <div className="container">
        {/* Header */}
        <div className="catalogo-header">
          <div>
            <h1 className="catalogo-title">
              {filters.search
                ? `Resultados para "${filters.search}"`
                : activeCategory
                ? activeCategory.nombre
                : 'Todos los Productos'}
            </h1>
            <p className="catalogo-count">{pagination.total} productos encontrados</p>
          </div>
          <div className="catalogo-controls">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FiFilter /> Filtros
            </button>
            <select
              className="sort-select"
              value={filters.ordenar}
              onChange={(e) => setFilters({ ...filters, ordenar: e.target.value })}
            >
              <option value="reciente">Más recientes</option>
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
              <option value="nombre">Nombre A-Z</option>
              <option value="calificacion">Mejor calificados</option>
              <option value="tiempo">Menor tiempo elaboración</option>
              <option value="complejidad">Menor complejidad</option>
            </select>
          </div>
        </div>

        <div className="catalogo-layout">
          {/* Sidebar filters */}
          <aside className={`catalogo-sidebar ${showFilters ? 'sidebar-open' : ''}`}>
            <div className="filter-section">
              <h3 className="filter-title">Categorías</h3>
              <button
                className={`filter-option ${!filters.categoria ? 'active' : ''}`}
                onClick={() => setFilters({ ...filters, categoria: '' })}
              >
                Todas
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id_categoria}
                  className={`filter-option ${filters.categoria == cat.id_categoria ? 'active' : ''}`}
                  onClick={() => setFilters({ ...filters, categoria: cat.id_categoria })}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>

            <div className="filter-section">
              <h3 className="filter-title">Precio</h3>
              <div className="price-range">
                <input
                  type="number"
                  className="input price-input"
                  placeholder="Min"
                  value={filters.min_precio}
                  onChange={(e) => setFilters({ ...filters, min_precio: e.target.value })}
                  min="0"
                  step="0.01"
                />
                <span>—</span>
                <input
                  type="number"
                  className="input price-input"
                  placeholder="Max"
                  value={filters.max_precio}
                  onChange={(e) => setFilters({ ...filters, max_precio: e.target.value })}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
              onClick={() => setFilters({
                categoria: '', search: '', ordenar: 'reciente',
                min_precio: '', max_precio: ''
              })}
            >
              Limpiar filtros
            </button>
          </aside>

          {/* Products grid */}
          <main className="catalogo-main">
            {loading ? (
              <div className="products-grid">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="product-skeleton">
                    <div className="skeleton" style={{ height: '200px' }} />
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="skeleton" style={{ height: '14px', width: '60%' }} />
                      <div className="skeleton" style={{ height: '18px', width: '90%' }} />
                      <div className="skeleton" style={{ height: '14px', width: '40%' }} />
                      <div className="skeleton" style={{ height: '24px', width: '30%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <span className="empty-emoji">🔍</span>
                <h3>No se encontraron productos</h3>
                <p>Intenta con otros filtros o términos de búsqueda</p>
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {products.map(product => (
                    <ProductCard key={product.id_producto} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="pagination">
                    {Array.from({ length: pagination.totalPages }, (_, i) => (
                      <button
                        key={i + 1}
                        className={`page-btn ${pagination.page === i + 1 ? 'active' : ''}`}
                        onClick={() => fetchProducts(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
