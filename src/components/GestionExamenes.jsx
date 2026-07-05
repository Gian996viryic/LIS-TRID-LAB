import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../supabaseClient";

export default function GestionExamenes() {
  const [examenes, setExamenes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  // Estado del formulario
  const [examenSeleccionado, setExamenSeleccionado] = useState(null);
  
  // 🚀 NUEVO ESTADO: Controla si se crea el analito automáticamente
  const [crearAnalito, setCrearAnalito] = useState(true);

  const [form, setForm] = useState({
    codigo: "",
    articulo: "",
    precio_normal: "",
    precio_convenio: "",
    lab_area_id: "",
    orden_impresion: 999,
    activo: true
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    try {
      // 1. Cargar exámenes
      const { data: dataExamenes, error: errExamenes } = await supabase
        .from("examenes")
        .select("*")
        .order("articulo", { ascending: true });
      if (errExamenes) throw errExamenes;

      // 2. Cargar áreas para el select
      const { data: dataAreas, error: errAreas } = await supabase
        .from("lab_areas")
        .select("id, nombre")
        .order("nombre", { ascending: true });
      if (!errAreas && dataAreas) setAreas(dataAreas);

      setExamenes(dataExamenes || []);
    } catch (error) {
      toast.error("Error al cargar datos: " + error.message);
    } finally {
      setCargando(false);
    }
  }

  // Filtrado inteligente en tiempo real
  const examenesFiltrados = examenes.filter(ex => 
    (ex.articulo && ex.articulo.toLowerCase().includes(busqueda.toLowerCase())) ||
    (ex.codigo && ex.codigo.toLowerCase().includes(busqueda.toLowerCase()))
  );

  function seleccionarExamen(ex) {
    setExamenSeleccionado(ex);
    setForm({
      codigo: ex.codigo || "",
      articulo: ex.articulo || "",
      precio_normal: ex.precio_normal || "",
      precio_convenio: ex.precio_convenio || "",
      lab_area_id: ex.lab_area_id || "",
      orden_impresion: ex.orden_impresion || 999,
      activo: ex.activo !== false // Si es null, asumimos true
    });
  }

  function prepararNuevoExamen() {
    setExamenSeleccionado(null);
    setCrearAnalito(true); // 🚀 Reseteamos el switch a true al crear uno nuevo
    setForm({
      codigo: "",
      articulo: "",
      precio_normal: "",
      precio_convenio: "",
      lab_area_id: areas.length > 0 ? areas[0].id : "",
      orden_impresion: 999,
      activo: true
    });
  }

  async function guardarExamen(e) {
    e.preventDefault();
    if (!form.codigo.trim() || !form.articulo.trim()) return toast.error("El Código y Nombre son obligatorios.");

    const loadingToast = toast.loading("Guardando examen...");

    try {
      // 1. Validar que el CÓDIGO no esté duplicado
      const { data: existeCodigo } = await supabase
        .from("examenes")
        .select("id")
        .eq("codigo", form.codigo.trim())
        .neq("id", examenSeleccionado?.id || "00000000-0000-0000-0000-000000000000") // Ignora el actual si estamos editando
        .maybeSingle();

      if (existeCodigo) {
        toast.dismiss(loadingToast);
        return toast.error("❌ El código ingresado ya le pertenece a otro examen.");
      }

      // 2. Preparar datos a guardar
      const datosGuardar = {
        codigo: form.codigo.trim().toUpperCase(),
        articulo: form.articulo.trim().toUpperCase(),
        precio_normal: parseFloat(form.precio_normal) || 0,
        precio_convenio: parseFloat(form.precio_convenio) || 0,
        lab_area_id: form.lab_area_id || null,
        orden_impresion: parseInt(form.orden_impresion) || 999,
        activo: form.activo
      };

      let errorDb;

      if (examenSeleccionado) {
        // ACTUALIZAR
        const { error } = await supabase.from("examenes").update(datosGuardar).eq("id", examenSeleccionado.id);
        errorDb = error;
      } else {
        // CREAR NUEVO (Agregamos .select() para obtener el ID recién creado)
        const { data, error } = await supabase.from("examenes").insert([datosGuardar]).select();
        errorDb = error;

        // 🚀 MAGIA: Si se guardó el examen y el switch está encendido, creamos el analito
        if (!error && data && data.length > 0 && crearAnalito) {
          const nuevoExamenId = data[0].id;
          
          await supabase.from("lab_catalogo_analitos").insert([{
            examen_id: nuevoExamenId,
            nombre_analito: form.articulo.trim().toUpperCase(), // Usa el mismo nombre del examen
            unidad: "",
            orden_visual: 1
          }]);
        }
      }

      if (errorDb) throw errorDb;

      toast.dismiss(loadingToast);
      toast.success(examenSeleccionado ? "Examen actualizado." : "Examen y analito creados exitosamente.");
      
      // Recargar lista y limpiar
      cargarDatos();
      prepararNuevoExamen();

    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error al guardar: " + error.message);
    }
  }

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", backgroundColor: "#f8fafc" }}>
      
      {/* PANEL IZQUIERDO: BUSCADOR Y LISTA */}
      <div style={{ width: "300px", borderRight: "1px solid #cbd5e1", display: "flex", flexDirection: "column", backgroundColor: "#fff" }}>
        
        <div style={{ padding: "15px", borderBottom: "1px solid #cbd5e1" }}>
          <button 
            onClick={prepararNuevoExamen}
            style={{ width: "100%", padding: "10px", backgroundColor: "#0284c7", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", marginBottom: "15px" }}
          >
            ➕ Crear Nuevo Examen
          </button>

          <input 
            type="text" 
            placeholder="🔍 Buscar por código o nombre..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: "100%", padding: "10px", border: "1px solid #94a3b8", borderRadius: "6px", boxSizing: "border-box", outline: "none" }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {cargando ? <p style={{ textAlign: "center", color: "#64748b" }}>Cargando catálogo...</p> : null}
          
          {examenesFiltrados.map(ex => (
            <div 
              key={ex.id} 
              onClick={() => seleccionarExamen(ex)}
              style={{ 
                padding: "12px", 
                borderBottom: "1px solid #f1f5f9", 
                cursor: "pointer", 
                backgroundColor: examenSeleccionado?.id === ex.id ? "#e0f2fe" : "transparent",
                borderLeft: examenSeleccionado?.id === ex.id ? "4px solid #0284c7" : "4px solid transparent",
                opacity: ex.activo ? 1 : 0.5 // Los inactivos se ven transparentes
              }}
            >
              <div style={{ fontWeight: "bold", color: "#1e293b", fontSize: "13px" }}>{ex.articulo}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{ex.codigo}</span>
                {!ex.activo && <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: "bold" }}>INACTIVO</span>}
              </div>
            </div>
          ))}
          
          {!cargando && examenesFiltrados.length === 0 && (
            <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "13px", marginTop: "20px" }}>No hay coincidencias</p>
          )}
        </div>
      </div>

      {/* PANEL DERECHO: FORMULARIO */}
      <div style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: "#fff", padding: "25px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
          
          <h2 style={{ margin: "0 0 20px 0", color: "#0f172a", borderBottom: "2px solid #f1f5f9", paddingBottom: "10px" }}>
            {examenSeleccionado ? "✏️ Editar Examen" : "✨ Nuevo Examen"}
          </h2>

          <form onSubmit={guardarExamen} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            
            <div style={{ display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "5px" }}>Código del Examen *</label>
                <input required value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})} placeholder="Ej: HEM-01" style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "5px" }}>Nombre del Examen (Artículo) *</label>
                <input required value={form.articulo} onChange={e => setForm({...form, articulo: e.target.value.toUpperCase()})} placeholder="Ej: HEMOGRAMA COMPLETO" style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "5px" }}>Precio Normal ($)</label>
                <input type="number" step="0.01" value={form.precio_normal} onChange={e => setForm({...form, precio_normal: e.target.value})} placeholder="0.00" style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "5px" }}>Precio Convenio ($)</label>
                <input type="number" step="0.01" value={form.precio_convenio} onChange={e => setForm({...form, precio_convenio: e.target.value})} placeholder="0.00" style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "5px" }}>Área de Laboratorio</label>
                <select value={form.lab_area_id} onChange={e => setForm({...form, lab_area_id: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box", backgroundColor: "#fff" }}>
                  <option value="">-- Seleccionar Área --</option>
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "5px" }}>Orden de Impresión</label>
                <input type="number" value={form.orden_impresion} onChange={e => setForm({...form, orden_impresion: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* 🚀 NUEVA OPCIÓN: Solo aparece cuando se está creando un examen nuevo */}
            {!examenSeleccionado && (
              <div style={{ marginTop: "10px", padding: "15px", backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
                <input 
                  type="checkbox" 
                  id="crearAnalito"
                  checked={crearAnalito} 
                  onChange={e => setCrearAnalito(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0284c7" }}
                />
                <label htmlFor="crearAnalito" style={{ cursor: "pointer", fontWeight: "bold", color: "#0369a1" }}>
                  Crear analito (Recomendado para poder añadirle rangos)
                </label>
              </div>
            )}

            <div style={{ marginTop: "10px", padding: "15px", backgroundColor: form.activo ? "#f0fdf4" : "#fef2f2", border: `1px solid ${form.activo ? "#bbf7d0" : "#fecaca"}`, borderRadius: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
              <input 
                type="checkbox" 
                id="estadoActivo"
                checked={form.activo} 
                onChange={e => setForm({...form, activo: e.target.checked})}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="estadoActivo" style={{ cursor: "pointer", fontWeight: "bold", color: form.activo ? "#16a34a" : "#dc2626" }}>
                {form.activo ? "Examen Activo (Visible en el Cotizador y LIS)" : "Examen Inactivo (Oculto para los cajeros)"}
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
              {examenSeleccionado && (
                <button type="button" onClick={prepararNuevoExamen} style={{ padding: "10px 20px", backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                  Cancelar Edición
                </button>
              )}
              <button type="submit" style={{ padding: "10px 25px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                {examenSeleccionado ? "Actualizar Examen" : "Crear Examen"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}