import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";

// Importamos los nuevos componentes modulares
import TabRangosYFormulas from "./TabRangosYFormulas";
import TabAreasImpresion from "./TabAreasImpresion";
import GestionExamenes from "./GestionExamenes";
import GestionMicrobiologia from "./GestionMicrobiologia";

export default function AdminRangosGlobales() {
  const [activeTab, setActiveTab] = useState("RANGOS");
  
  // El orquestador controla si alguna de las hijas tiene cambios sin guardar
  const [isDirtyRangos, setIsDirtyRangos] = useState(false);
  const [isDirtyAreas, setIsDirtyAreas] = useState(false);

  function intentarCambiarPestana(nuevaPestana) {
    if (isDirtyRangos || isDirtyAreas) {
      toast.error("⚠️ Tienes cambios sin guardar. Guárdalos antes de cambiar de pestaña.", { duration: 4000 });
      return;
    }
    setActiveTab(nuevaPestana);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#f3f4f6", fontFamily: "'Segoe UI', Roboto, sans-serif", overflow: "hidden" }}>
      <Toaster position="top-right" />
      
      {/* Estilos Globales compartidos por las hijas */}
      <style>{`
        .lis-scroll::-webkit-scrollbar { width: 6px; }
        .lis-scroll::-webkit-scrollbar-track { background: transparent; }
        .lis-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .master-list-item { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 4px; }
        .master-list-item:hover { background-color: #f1f5f9; }
        .master-list-item.active { background-color: #0ea5e9; color: white; border-left: 4px solid #0284c7; }
        .master-list-item.active .text-gray-500 { color: #e0f2fe; }
        .data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .data-table th { background-color: #f8fafc; padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
        .data-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
        .data-table tr:hover td { background-color: #f0f9ff; }
        .data-table tr.group-start td { border-top: 2px solid #cbd5e1; }
        .data-table tr.variation-row td { background-color: #f8fafc; border-bottom: 1px dashed #cbd5e1; }
        .cell-input { background: transparent; border: 1px solid #cbd5e1; padding: 6px; font-size: 12px; color: #0f172a; outline: none; border-radius: 4px; transition: all 0.2s; }
        .cell-input:focus { background: white; border-color: #0ea5e9; box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2); }
        .btn-action { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; color: #64748b; transition: all 0.2s; }
        .btn-action:hover { background: #e2e8f0; color: #0f172a; }
        .btn-action.delete:hover { background: #fee2e2; color: #ef4444; }
        .tab-btn { padding: 12px 24px; font-size: 13px; font-weight: 800; cursor: pointer; border: none; outline: none; transition: 0.3s; background: transparent; color: #94a3b8; }
        .tab-btn.active { color: #fff; border-bottom: 3px solid #38bdf8; background: rgba(255,255,255,0.05); }
        .tab-btn:hover:not(.active) { color: #e2e8f0; background: rgba(255,255,255,0.02); }
      `}</style>

      {/* MENÚ SUPERIOR */}
      <div style={{ background: "#0f172a", display: "flex", padding: "0 16px", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
        <button className={`tab-btn ${activeTab === "RANGOS" ? "active" : ""}`} onClick={() => intentarCambiarPestana("RANGOS")}>🧪 RANGOS Y FÓRMULAS</button>
        <button className={`tab-btn ${activeTab === "AREAS" ? "active" : ""}`} onClick={() => intentarCambiarPestana("AREAS")}>📂 ÁREAS Y ORDEN DE IMPRESIÓN</button>
        <button className={`tab-btn ${activeTab === "CATALOGO" ? "active" : ""}`} onClick={() => intentarCambiarPestana("CATALOGO")}>📋 CATÁLOGO DE EXÁMENES</button>
        <button className={`tab-btn ${activeTab === "MICROBIOLOGIA" ? "active" : ""}`} onClick={() => intentarCambiarPestana("MICROBIOLOGIA")}>🧫 MICROBIOLOGÍA</button>
      </div>

      {/* RENDERIZADO OCULTO (Para no perder el estado interno al cambiar de pestaña) */}
      <div style={{ display: activeTab === "RANGOS" ? "flex" : "none", flex: 1, overflow: "hidden" }}>
        <TabRangosYFormulas isDirty={isDirtyRangos} setIsDirty={setIsDirtyRangos} />
      </div>

      <div style={{ display: activeTab === "AREAS" ? "flex" : "none", flex: 1, overflow: "hidden" }}>
        <TabAreasImpresion isDirty={isDirtyAreas} setIsDirty={setIsDirtyAreas} />
      </div>

      <div style={{ display: activeTab === "CATALOGO" ? "flex" : "none", flex: 1, overflow: "hidden" }}>
        <GestionExamenes />
      </div>

      <div style={{ display: activeTab === "MICROBIOLOGIA" ? "flex" : "none", flex: 1, overflow: "hidden" }}>
        <GestionMicrobiologia />
      </div>
    </div>
  );
}