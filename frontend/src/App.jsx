import { useCallback, useEffect, useMemo, useState } from "react";

import logoSim from "./assets/SIM.png";

/**
 * Solo origen Django en Railway (+ path si no es solo /). Ej: https://algo.up.railway.app — sin sufijo `/api`:
 * las rutas ya se piden como `${base}/api/...`. Si pegas …/api, se quita para no generar `/api/api/...` (404).
 */
function normalizeApiBase(raw) {
  let u = String(raw ?? "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) {
    const looksLocal = /^localhost\b/i.test(u) || /^127\./i.test(u);
    u = `${looksLocal ? "http" : "https"}://${u.replace(/^\/+/, "")}`;
  }
  try {
    const parsed = new URL(u);
    if (parsed.hostname.endsWith(".netlify.app")) return "";
    let path = parsed.pathname.replace(/\/+$/, "");
    while (/\/api$/i.test(path)) {
      path = path.replace(/\/api$/i, "");
    }
    return `${parsed.protocol}//${parsed.host}${path}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

const apiRoot = normalizeApiBase(import.meta.env.VITE_API_URL);

const MISSING_VITE_IN_PROD_MSG =
  "En Netlify define VITE_API_URL = https://TU-SERVICIO.up.railway.app (solo el dominio público del API de Railway, sin /api ni la URL *.netlify.app). Luego Clear cache and deploy.";

async function parseResponseJson(res, context) {
  const raw = await res.text();
  const t = raw.trim();
  if (t.startsWith("<") || raw.includes("<!doctype")) {
    if (import.meta.env.PROD && !apiRoot) {
      throw new Error(MISSING_VITE_IN_PROD_MSG);
    }
    throw new Error(
      `${context}: recibimos HTML en lugar de JSON — el navegador no está hablando con Django/Railway. Comprueba VITE_API_URL (solo https://TU-DOMINIO.up.railway.app, sin /api) y redeploy Netlify tras cambiar variables.`,
    );
  }
  try {
    return t ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`${context}: el cuerpo no es JSON válido.`);
  }
}

function formatDrfErrors(data) {
  if (!data || typeof data !== "object") return "";
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map(String).join(" ");
  return Object.entries(data)
    .map(([campo, val]) => {
      if (Array.isArray(val)) return `${campo}: ${val.join(" ")}`;
      if (val && typeof val === "object") return `${campo}: ${JSON.stringify(val)}`;
      return `${campo}: ${val}`;
    })
    .join(" · ");
}

async function messageFromFailedResponse(res, label) {
  const raw = await res.text();
  const t = raw.trim();
  const head = `${label}: HTTP ${res.status}`;
  if (t.startsWith("<") || raw.toLowerCase().includes("<!doctype")) {
    const dupApi =
      res.status === 404
        ? " Con 404 suele pasar si VITE_API_URL termina en …/api (la app pide …/api/api/…)."
        : "";
    return `${head} — Django devolvió página HTML en lugar del JSON.${dupApi} Revisa VITE_API_URL (solo origen Railway, sin /api) y los logs del servicio web en Railway.`;
  }
  try {
    const data = t ? JSON.parse(raw) : {};
    const body = formatDrfErrors(data);
    return body ? `${head} · ${body}` : `${head} ${res.statusText || ""}`.trim();
  } catch {
    return `${head}: ${t ? t.slice(0, 280) : res.statusText || "error"}`;
  }
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function App() {
  const [clientes, setClientes] = useState([]);
  const [segmentos, setSegmentos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    codigo_cliente: "",
    ciudad: "",
    fecha_registro: "",
    limite_credito: "",
    segmento: "",
  });

  const [nuevoSegmento, setNuevoSegmento] = useState("");
  const [segSaving, setSegSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (import.meta.env.PROD && !apiRoot) {
        throw new Error(MISSING_VITE_IN_PROD_MSG);
      }
      const base = apiRoot ? apiRoot : "";
      const [cr, sr] = await Promise.all([
        fetch(`${base}/api/clientes/`),
        fetch(`${base}/api/segmentos/`),
      ]);
      const [cJson, sJson] = await Promise.all([
        parseResponseJson(cr, "Clientes"),
        parseResponseJson(sr, "Segmentos"),
      ]);
      if (!cr.ok) throw new Error("No se pudo cargar clientes.");
      if (!sr.ok) throw new Error("No se pudo cargar segmentos.");
      const cList = Array.isArray(cJson) ? cJson : Array.isArray(cJson?.results) ? cJson.results : [];
      const sList = Array.isArray(sJson) ? sJson : Array.isArray(sJson?.results) ? sJson.results : [];
      setClientes(cList);
      setSegmentos(sList);
    } catch (e) {
      setError(e.message || "Error de red.");
      setClientes([]);
      setSegmentos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => {
      const blob = [
        c.nombre,
        c.codigo_cliente,
        c.ciudad,
        c.segmento_nombre || "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [clientes, search]);

  function resetForm() {
    setForm({
      nombre: "",
      codigo_cliente: "",
      ciudad: "",
      fecha_registro: new Date().toISOString().slice(0, 10),
      limite_credito: "0",
      segmento: segmentos[0]?.id ? String(segmentos[0].id) : "",
    });
    setEditingId(null);
  }

  useEffect(() => {
    if (showForm && !editingId && segmentos.length && !form.segmento) {
      setForm((f) => ({ ...f, segmento: String(segmentos[0].id) }));
    }
  }, [showForm, editingId, segmentos, form.segmento]);

  function openAdd() {
    resetForm();
    if (segmentos.length === 0) {
      setError(
        "Agregue al menos un segmento en Configuración antes de registrar clientes.",
      );
      document.getElementById("config")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setShowForm(true);
    setError(null);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setShowForm(true);
    setForm({
      nombre: c.nombre,
      codigo_cliente: c.codigo_cliente,
      ciudad: c.ciudad,
      fecha_registro: c.fecha_registro,
      limite_credito: String(c.limite_credito ?? 0),
      segmento: String(c.segmento),
    });
    setError(null);
  }

  async function guardarCliente(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        codigo_cliente: form.codigo_cliente.trim(),
        ciudad: form.ciudad.trim(),
        fecha_registro: form.fecha_registro,
        limite_credito: parseInt(form.limite_credito, 10) || 0,
        segmento: parseInt(form.segmento, 10),
      };
      const url =
        editingId != null
          ? `${apiRoot}/api/clientes/${editingId}/`
          : `${apiRoot}/api/clientes/`;
      const res = await fetch(url, {
        method: editingId != null ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let err = {};
        try {
          err = await parseResponseJson(res, "Cliente");
        } catch {
          err = {};
        }
        const msg = Object.values(err).flat().join(" ") || res.statusText;
        throw new Error(msg || "No se pudo guardar.");
      }
      setShowForm(false);
      resetForm();
      await loadAll();
    } catch (e2) {
      setError(e2.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function eliminarCliente(id) {
    if (!window.confirm("¿Eliminar este cliente del inventario?")) return;
    setError(null);
    try {
      const res = await fetch(`${apiRoot}/api/clientes/${id}/`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(await messageFromFailedResponse(res, "Eliminar"));
      }
      await loadAll();
    } catch (e) {
      setError(e.message || "Error al eliminar.");
    }
  }

  async function agregarSegmento(e) {
    e.preventDefault();
    const nombre = nuevoSegmento.trim();
    if (!nombre) return;
    setSegSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiRoot}/api/segmentos/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ nombre }),
      });
      if (!res.ok) {
        throw new Error(await messageFromFailedResponse(res, "Segmento"));
      }
      setNuevoSegmento("");
      await loadAll();
    } catch (e) {
      setError(e.message || "Error en segmento.");
    } finally {
      setSegSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#clientes">
        Ir al contenido
      </a>
      <header className="top-nav">
        <div className="brand">
          <img
            src={logoSim}
            alt="SIM"
            className="brand-isotype"
            decoding="async"
          />
          <h1>Página de administración — Inventario de clientes</h1>
        </div>
      </header>

      <main id="inicio">
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <section id="clientes" aria-labelledby="titulo-clientes">
          <h2 id="titulo-clientes" className="visually-hidden">
            Clientes
          </h2>
          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-icon" aria-hidden>
                🔍
              </span>
              <input
                type="search"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar en inventario"
              />
            </div>
            <button type="button" className="btn btn-success" onClick={openAdd}>
              <span aria-hidden>＋</span> Añadir
            </button>
          </div>

          {showForm && (
            <div className="card">
              <div className="card-head">
                {editingId != null ? "Editar cliente" : "Agregar cliente"}
              </div>
              <form className="card-body" onSubmit={guardarCliente}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="nombre">Nombre</label>
                    <input
                      id="nombre"
                      required
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="codigo">Código cliente</label>
                    <input
                      id="codigo"
                      required
                      disabled={editingId != null}
                      value={form.codigo_cliente}
                      onChange={(e) =>
                        setForm({ ...form, codigo_cliente: e.target.value })
                      }
                      title="Identificador único; no editable al editar."
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="ciudad">Ciudad</label>
                    <input
                      id="ciudad"
                      required
                      value={form.ciudad}
                      onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="segmento">Segmento</label>
                    <select
                      id="segmento"
                      required
                      value={form.segmento}
                      onChange={(e) => setForm({ ...form, segmento: e.target.value })}
                    >
                      {segmentos.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="fecha">Fecha de registro</label>
                    <input
                      id="fecha"
                      type="date"
                      required
                      value={form.fecha_registro}
                      onChange={(e) =>
                        setForm({ ...form, fecha_registro: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="credito">Límite crédito (entero)</label>
                    <input
                      id="credito"
                      type="number"
                      min={0}
                      step={1}
                      required
                      value={form.limite_credito}
                      onChange={(e) =>
                        setForm({ ...form, limite_credito: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-neutral"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Código</th>
                  <th>Ciudad</th>
                  <th>Segmento</th>
                  <th>Fecha registro</th>
                  <th>Límite crédito</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="empty-row">
                    <td colSpan={8}>Cargando registros...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={8}>No hay registros disponibles</td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.nombre}</td>
                      <td>{c.codigo_cliente}</td>
                      <td>{c.ciudad}</td>
                      <td>{c.segmento_nombre}</td>
                      <td>{formatDate(c.fecha_registro)}</td>
                      <td>
                        {c.limite_credito?.toLocaleString?.("es-MX") ??
                          c.limite_credito}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="btn btn-neutral btn-sm"
                            onClick={() => openEdit(c)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => eliminarCliente(c.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="config" style={{ marginTop: "2.5rem" }} aria-labelledby="titulo-config">
          <h2 id="titulo-config" className="section-title">
            Segmentos comerciales
          </h2>
          <div className="config-grid">
            <div className="card">
              <div className="card-head">Nuevo segmento</div>
              <form className="card-body" onSubmit={agregarSegmento}>
                <div className="field">
                  <label htmlFor="seg-nombre">Nombre del segmento</label>
                  <input
                    id="seg-nombre"
                    value={nuevoSegmento}
                    onChange={(e) => setNuevoSegmento(e.target.value)}
                    placeholder="Ej. PyME, Corporativo, Gobierno"
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-success" disabled={segSaving}>
                    {segSaving ? "Guardando..." : "Guardar segmento"}
                  </button>
                </div>
              </form>
            </div>
            <div className="card">
              <div className="card-head">Segmentos registrados</div>
              <div className="card-body">
                {segmentos.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    Sin segmentos. Cree uno para habilitar el alta de clientes.
                  </p>
                ) : (
                  <ul className="segment-list">
                    {segmentos.map((s) => (
                      <li key={s.id}>
                        <span>{s.nombre}</span>
                        <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                          id {s.id}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
