import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

export default function TablaAntibiograma({ antibiograma = [], onActualizar }) {
  const [gruposBacterianos, setGruposBacterianos] = useState([]);
  const [catalogoAntibioticos, setCatalogoAntibioticos] = useState([]);
  const [breakpointsDB, setBreakpointsDB] = useState([]); // 🚀 Guardamos todos los breakpoints en memoria
  
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("");
  const [antibioticoManual, setAntibioticoManual] = useState("");
  const [cargando, setLoading] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  async function cargarDatosIniciales() {
    try {
      // Catálogo para búsqueda
      const { data: antData } = await supabase.from("lab_antibioticos").select("nombre").order("nombre");
      if (antData) setCatalogoAntibioticos(antData.map(a => a.nombre));

      // Breakpoints para auto-rellenado (Forzado a MIC)
      const { data: breakData } = await supabase.from("lab_breakpoints").select("*").eq("metodo", "MIC");
      if (breakData) {
        setBreakpointsDB(breakData);
        const gruposUnicos = [...new Set(breakData.map(b => b.bacteria_grupo).filter(Boolean))].sort();
        setGruposBacterianos(gruposUnicos);
      }
    } catch (error) {
      console.error("Error cargando catálogos de antibiograma:", error);
    }
  }

  async function cargarPanel() {
    if (!grupoSeleccionado) return toast.error("Seleccione un grupo bacteriano");
    setLoading(true);
    const toastId = toast.loading("Cargando panel...");

    try {
      const { data, error } = await supabase
        .from("lab_breakpoints")
        .select("antibiotico")
        .eq("bacteria_grupo", grupoSeleccionado)
        .eq("metodo", "MIC"); 

      if (error) throw error;

      if (!data || data.length === 0) {
        toast("No hay antibióticos configurados para este grupo (MIC).", { id: toastId, icon: "ℹ️" });
        setLoading(false);
        return;
      }

      const existentes = antibiograma.map(a => a.antibiotico.toUpperCase());
      const nuevos = data
        .filter(d => !existentes.includes(d.antibiotico.toUpperCase()))
        .map(d => ({
          antibiotico: d.antibiotico,
          metodo: "MIC",
          valor: "",
          interpretacion: ""
        }));

      if (nuevos.length > 0) {
        onActualizar([...antibiograma, ...nuevos]);
        toast.success(`Panel ${grupoSeleccionado} cargado`, { id: toastId });
      } else {
        toast("Los antibióticos de este panel ya están en la lista.", { id: toastId, icon: "ℹ️" });
      }
    } catch (error) {
      toast.error("Error al cargar el panel", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  function agregarManual() {
    if (!antibioticoManual) return;
    const existe = antibiograma.find(a => a.antibiotico.toUpperCase() === antibioticoManual.toUpperCase());
    
    if (existe) {
      toast.error("El antibiótico ya está en la lista");
      return;
    }

    onActualizar([
      ...antibiograma,
      { antibiotico: antibioticoManual, metodo: "MIC", valor: "", interpretacion: "" }
    ]);
    setAntibioticoManual("");
  }

  // 🚀 LÓGICA MAESTRA DE AUTO-RELLENADO Y BORRADO DE SEGURIDAD
  function actualizarFila(index, campo, valor) {
    const nuevaLista = [...antibiograma];
    nuevaLista[index][campo] = valor;
    
    if (campo === "interpretacion") {
        const antib = nuevaLista[index].antibiotico;
        
        // Buscamos las reglas exactas en la BD para este antibiótico
        let bp = breakpointsDB.find(b => b.antibiotico.toUpperCase() === antib.toUpperCase() && b.bacteria_grupo === grupoSeleccionado);
        if (!bp) bp = breakpointsDB.find(b => b.antibiotico.toUpperCase() === antib.toUpperCase()) || {};

        // Auto-rellenamos si hay valor, limpiamos si es NULL o no existe
        if (valor === "S") nuevaLista[index].valor = bp.sensible || "";
        else if (valor === "I") nuevaLista[index].valor = bp.intermedio || "";
        else if (valor === "R") nuevaLista[index].valor = bp.resistente || "";
        else nuevaLista[index].valor = ""; 
    }
    
    onActualizar(nuevaLista);
  }

  function eliminarFila(index) {
    const nuevaLista = antibiograma.filter((_, i) => i !== index);
    onActualizar(nuevaLista);
  }

  function limpiarTodo() {
    if (window.confirm("¿Seguro que desea limpiar todo el antibiograma?")) {
      onActualizar([]);
    }
  }

  return (
    <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      
      <div style={{ background: "#f8fafc", padding: "10px 15px", borderBottom: "1px solid #cbd5e1", display: "flex", gap: "15px", alignItems: "flex-end", flexWrap: "wrap" }}>
        
        <div>
          <label style={{ display: "block", fontSize: "10px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>MÉTODO DE LECTURA</label>
          <div style={{ padding: "6px 15px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#e2e8f0", color: "#334155", fontWeight: "bold" }}>
            MIC (C.I.M)
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "5px" }}>
          <div>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>CARGA RÁPIDA (PANEL BACTERIANO)</label>
            <select value={grupoSeleccionado} onChange={e => setGrupoSeleccionado(e.target.value)} style={{ padding: "6px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", width: "200px", cursor: "pointer", background: "#fff" }}>
              <option value="">-- Seleccione un grupo --</option>
              {gruposBacterianos.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <button onClick={cargarPanel} disabled={cargando} style={{ padding: "6px 12px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
            ⚡ Cargar Panel
          </button>
        </div>

        <div style={{ width: "1px", background: "#cbd5e1", margin: "0 5px" }}></div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", flex: 1 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>AÑADIR ANTIBIÓTICO MANUALMENTE</label>
            <input 
              type="text" 
              list="lista-antibioticos" 
              value={antibioticoManual} 
              onChange={e => setAntibioticoManual(e.target.value)} 
              placeholder="Ej: Amikacina" 
              style={{ padding: "6px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", width: "100%" }} 
            />
            <datalist id="lista-antibioticos">
              {catalogoAntibioticos.map(a => <option key={a} value={a} />)}
            </datalist>
          </div>
          <button onClick={agregarManual} style={{ padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
            + Añadir
          </button>
        </div>

        {antibiograma.length > 0 && (
          <button onClick={limpiarTodo} style={{ padding: "6px 12px", background: "#fff", color: "#ef4444", border: "1px solid #fca5a5", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
            🗑️ Limpiar Todo
          </button>
        )}
      </div>

      <div style={{ padding: "15px", background: "#f8fafc", overflowX: "auto" }}>
        {antibiograma.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8", fontStyle: "italic", border: "1px dashed #cbd5e1", borderRadius: "6px" }}>
            El antibiograma está vacío. Cargue un panel o añada antibióticos manualmente.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <thead>
              <tr style={{ background: "#e2e8f0", color: "#334155", textAlign: "left" }}>
                <th style={{ padding: "8px 12px", border: "1px solid #cbd5e1" }}>Antibiótico</th>
                <th style={{ padding: "8px 12px", border: "1px solid #cbd5e1", width: "100px", textAlign: "center" }}>Método</th>
                <th style={{ padding: "8px 12px", border: "1px solid #cbd5e1", width: "120px", textAlign: "center" }}>C.I.M</th>
                <th style={{ padding: "8px 12px", border: "1px solid #cbd5e1", width: "150px" }}>Interpretación</th>
                <th style={{ padding: "8px 12px", border: "1px solid #cbd5e1", width: "50px", textAlign: "center" }}>Quitar</th>
              </tr>
            </thead>
            <tbody>
              {antibiograma.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "6px 12px", border: "1px solid #e2e8f0", fontWeight: "bold", color: "#0f172a" }}>
                    {item.antibiotico}
                  </td>
                  <td style={{ padding: "6px 12px", border: "1px solid #e2e8f0", textAlign: "center", color: "#64748b" }}>
                    {item.metodo}
                  </td>
                  <td style={{ padding: "6px 12px", border: "1px solid #e2e8f0" }}>
                    <input 
                      type="text" 
                      value={item.valor} 
                      onChange={e => actualizarFila(index, "valor", e.target.value)} 
                      placeholder="Ej: <=1" 
                      style={{ width: "100%", padding: "4px", border: "1px solid #cbd5e1", borderRadius: "3px", outline: "none", textAlign: "center" }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", border: "1px solid #e2e8f0" }}>
                    <select 
                      value={item.interpretacion} 
                      onChange={e => actualizarFila(index, "interpretacion", e.target.value)}
                      style={{ 
                        width: "100%", padding: "5px", borderRadius: "3px", outline: "none", cursor: "pointer", fontWeight: "bold",
                        border: item.interpretacion === "S" ? "1px solid #22c55e" : item.interpretacion === "R" ? "1px solid #ef4444" : item.interpretacion === "I" ? "1px solid #eab308" : "1px solid #cbd5e1",
                        background: item.interpretacion === "S" ? "#dcfce7" : item.interpretacion === "R" ? "#fee2e2" : item.interpretacion === "I" ? "#fef9c3" : "#fff",
                        color: item.interpretacion === "S" ? "#15803d" : item.interpretacion === "R" ? "#b91c1c" : item.interpretacion === "I" ? "#a16207" : "#334155"
                      }}
                    >
                      <option value="">- Seleccione -</option>
                      <option value="S">S - Sensible</option>
                      <option value="I">I - Intermedio / SDD</option>
                      <option value="R">R - Resistente</option>
                    </select>
                  </td>
                  <td style={{ padding: "6px 12px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                    <button onClick={() => eliminarFila(index)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px" }} title="Eliminar fila">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}