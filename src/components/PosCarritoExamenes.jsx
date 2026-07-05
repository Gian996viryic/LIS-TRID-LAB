import React, { useEffect, useRef } from "react";

export default function PosCarritoExamenes({
  searchInputRef, busquedaExamen, setBusquedaExamen, handleSearchKeyDown,
  resultadosExamenes, highlightedIndex, setHighlightedIndex, agregarExamenAlCarrito,
  carritoExamenes, cuponAplicado, eliminarDelCarrito
}) {
  
  // 🚀 REFERENCIA PARA EL SCROLL AUTOMÁTICO
  const listRef = useRef(null);

  useEffect(() => {
    // Si la lista de resultados está abierta y hay un elemento seleccionado
    if (highlightedIndex >= 0 && listRef.current) {
      const activeItem = listRef.current.children[highlightedIndex];
      if (activeItem) {
        // Hace que el contenedor haga scroll exacto hasta el elemento
        activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex]);

  return (
    <>
      <div style={{ position: "relative" }}>
        <input 
          ref={searchInputRef} type="text" className="lis-input" placeholder="🔍 Buscar examen por código o nombre..." 
          value={busquedaExamen} onChange={(e) => setBusquedaExamen(e.target.value)} onKeyDown={handleSearchKeyDown}
          style={{ width: "100%", height: "30px", padding: "4px 8px", border: "2px solid #22c55e", borderRadius: "4px", fontWeight: "bold" }} 
        />
        {resultadosExamenes.length > 0 && (
          <div 
            ref={listRef} // 🚀 CONECTAMOS LA REFERENCIA AQUÍ
            style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #ccc", zIndex: 10, maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
          >
            {resultadosExamenes.map((ex, i) => (
              <div 
                key={ex.id} 
                style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: highlightedIndex === i ? "#bae6fd" : "white" }} 
                onClick={() => agregarExamenAlCarrito(ex)} onMouseEnter={() => setHighlightedIndex(i)}
              >
                <div>
                  <div style={{ fontWeight: "bold", color: "#0369a1" }}>{ex.articulo}</div>
                  <div style={{ fontSize: "10px", color: "#666" }}>
                    {Array.isArray(ex.lab_areas) ? ex.lab_areas[0]?.nombre : ex.lab_areas?.nombre || 'General'} | Cód: <span style={{ fontWeight: "bold" }}>{ex.codigo}</span>
                  </div>
                </div>
                <div style={{ fontWeight: "bold", color: "#111" }}>${Number(ex.precio_normal || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, background: "white", border: "1px solid #ccc", marginTop: "10px", overflowY: "auto", minHeight: "150px", maxHeight: "260px" }}>
        {carritoExamenes.length === 0 ? (
           <div style={{ padding: "20px", textAlign: "center", color: "#999", fontStyle: "italic", fontSize: "11px" }}>El carrito está vacío.</div>
        ) : (
           carritoExamenes.map(item => {
             const isConvenio = cuponAplicado && cuponAplicado.tipo === 'convenio';
             const pNormal = Number(item.precio_normal || 0);
             const pConvenio = Number(item.precio_convenio || pNormal);
             const precioFinalItem = isConvenio ? pConvenio : pNormal;
             const tieneDesc = isConvenio && (pConvenio < pNormal);

             return (
               <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
                 <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontWeight: "bold", fontSize: "11px" }}>{item.articulo}</span><span style={{ fontSize: "9px", color: "#666" }}>Cód: {item.codigo}</span></div>
                 <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {tieneDesc && <span style={{ textDecoration: "line-through", color: "#94a3b8", fontSize: "10px" }}>${pNormal.toFixed(2)}</span>}
                    <span style={{ fontWeight: "bold", color: tieneDesc ? "#16a34a" : "#111" }}>${precioFinalItem.toFixed(2)}</span>
                    <button type="button" onClick={() => eliminarDelCarrito(item.id)} style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                 </div>
               </div>
             );
           })
        )}
      </div>
    </>
  );
}