import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo360 from '../../assets/Logo.png';
import { useAuth } from '../../hooks/useAuth';

const CHART_HEIGHTS = [38, 62, 44, 78, 52, 88, 68, 82, 58, 94, 72, 86];

const METRICS = [
  { label: 'Pedidos Hoy',  value: '1,284',  delta: '+8.3%',  up: true  },
  { label: 'Ingresos',     value: '$94.7K', delta: '+12.1%', up: true  },
  { label: 'Stock Activo', value: '99.2%',  delta: '-0.4%',  up: false },
];

const MODULES = ['Ventas', 'Inventario', 'RRHH', 'Contabilidad', 'Reportes', 'CRM'];

const LoginPage: React.FC = () => {
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [rememberMe,   setRememberMe]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error, clearError, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();

  // Redirige al dashboard si ya hay sesión activa
  useEffect(() => {
    if (!isInitializing && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, isInitializing, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await login({ username, password });
      navigate('/dashboard', { replace: true });
    } catch {
      // El error ya es gestionado por el hook
    }
  };

  return (
    <div className="erp-login">

      {/* Panel izquierdo: Branding */}
      <div className="erp-brand">
        <div className="erp-brand__grid"   aria-hidden="true" />
        <div className="erp-brand__glow erp-brand__glow--a" aria-hidden="true" />
        <div className="erp-brand__glow erp-brand__glow--b" aria-hidden="true" />
        <div className="erp-brand__glow erp-brand__glow--c" aria-hidden="true" />

        <div className="erp-brand__content">

          <div className="erp-brand__logo-wrap">
            <img src={logo360} alt="Gestion 360" className="erp-brand__logo" />
          </div>

          <h1 className="erp-brand__title">
            Gestion <em>360</em>
          </h1>
          <p className="erp-brand__sub">Enterprise Resource Planning</p>
          <p className="erp-brand__tagline">
            Plataforma integral de gestion empresarial para operaciones
            complejas y toma de decisiones en tiempo real.
          </p>

          {/* Metricas decorativas */}
          <div className="erp-metrics" aria-hidden="true">
            {METRICS.map((m) => (
              <div className="erp-metric" key={m.label}>
                <span className="erp-metric__label">{m.label}</span>
                <span className="erp-metric__value">{m.value}</span>
                <span className={`erp-metric__delta erp-metric__delta--${m.up ? 'up' : 'down'}`}>
                  {m.delta}
                </span>
              </div>
            ))}
          </div>

          {/* Grafico de barras decorativo */}
          <div className="erp-chart" aria-hidden="true">
            {CHART_HEIGHTS.map((h, i) => (
              <div key={i} className="erp-chart__bar" style={{ height: `${h}%` }} />
            ))}
          </div>

          {/* Pills de modulos */}
          <div className="erp-modules" aria-hidden="true">
            {MODULES.map((mod) => (
              <span className="erp-module-pill" key={mod}>{mod}</span>
            ))}
          </div>

        </div>

        <div className="erp-brand__footer">
          <span>2026 Gestion 360 . ERP Empresarial</span>
          <span className="erp-brand__version">v4.2.1</span>
        </div>
      </div>

      {/* Panel derecho: Formulario */}
      <div className="erp-form-panel">
        <div className="erp-card">

          <div className="erp-card__header">
            <div className="erp-card__icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h2 className="erp-card__title">Acceso al Sistema</h2>
            <p className="erp-card__subtitle">Ingresa tus credenciales corporativas</p>
          </div>

          <form onSubmit={handleSubmit} className="erp-form" autoComplete="on">

            <div className="erp-field">
              <label htmlFor="username" className="erp-field__label">Usuario</label>
              <div className="erp-field__wrap">
                <svg className="erp-field__icon" width="15" height="15"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="username"
                  type="text"
                  className="erp-field__input"
                  placeholder="Nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="erp-field">
              <label htmlFor="password" className="erp-field__label">Contraseña</label>
              <div className="erp-field__wrap">
                <svg className="erp-field__icon" width="15" height="15"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="erp-field__input erp-field__input--has-action"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => { clearError(); setPassword(e.target.value); }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="erp-field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="erp-options">
              <label className="erp-chk">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="erp-chk__box" aria-hidden="true" />
                <span className="erp-chk__label">Recordar sesión</span>
              </label>
              <a href="#forgot" className="erp-link">¿Olvidaste tu contraseña?</a>
            </div>

            {error && (
              <div className="erp-alert" role="alert">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="erp-btn" disabled={isLoading}>
              {isLoading ? (
                <svg className="erp-btn__spinner" width="16" height="16"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              ) : null}
              <span>{isLoading ? 'Verificando...' : 'Iniciar Sesión'}</span>
              {!isLoading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </button>

          </form>

          <div className="erp-divider"><span>o accede con</span></div>

          <button type="button" className="erp-btn-sso">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            Single Sign-On (SSO)
          </button>

        </div>

        <p className="erp-form-panel__footer">
          Sistema protegido . Solo personal autorizado
        </p>
      </div>

    </div>
  );
};

export default LoginPage;
