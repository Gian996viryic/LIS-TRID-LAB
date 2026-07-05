import React from "react";

export default function PosCajaCobro({
  cuponInput, setCuponInput, cuponAplicado, setCuponAplicado, aplicarCupon,
  subtotal, descuento, total, estadoPago, setEstadoPago, metodoPago, setMetodoPago,
  montoAbono, setMontoAbono, saldoPendiente
}) {
  return (
    <>
      <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", padding: "10px", borderRadius: "6px", marginTop: "10px", fontSize: "13px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", marginBottom: "10px" }}>
           <div style={{ flex: 1 }}>
             <label style={{ fontSize: "10px", color: "#555" }}>Cupón de Descuento</label>
             <div style={{ display: "flex" }}>
               <input 
                 type="text" 
                 className="lis-input" 
                 style={{ flex: 1, height: "26px", borderRight: "none", borderRadius: "4px 0 0 4px", textTransform: "uppercase", padding: "4px 8px", border: "1px solid #9ca3af" }} 
                 value={cuponInput} 
                 onChange={(e) => setCuponInput(e.target.value)} 
                 // 👇 AQUÍ ESTÁ LA MEJORA DEL ENTER 👇
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     e.preventDefault(); // Bloquea que el formulario se envíe accidentalmente
                     aplicarCupon();     // Llama a la función que valida el descuento
                   }
                 }}
                 disabled={!!cuponAplicado} 
               />
               {cuponAplicado ? (<button type="button" onClick={() => { setCuponAplicado(null); setCuponInput(""); }} style={{ background: "#dc2626", color: "white", border: "none", padding: "0 10px", borderRadius: "0 4px 4px 0", cursor: "pointer", fontWeight: "bold" }}>✕</button>) : (<button type="button" onClick={aplicarCupon} style={{ background: "#0284c7", color: "white", border: "none", padding: "0 10px", borderRadius: "0 4px 4px 0", cursor: "pointer", fontWeight: "bold" }}>Aplicar</button>)}
             </div>
           </div>
           <div style={{ flex: 1 }}>
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ color: "#64748b" }}>Subtotal:</span> <span>${subtotal.toFixed(2)}</span></div>
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ color: cuponAplicado ? "#16a34a" : "#64748b" }}>Desc {cuponAplicado && cuponAplicado.tipo !== 'convenio' ? `(${cuponAplicado.porcentaje}%)` : (cuponAplicado?.tipo === 'convenio' ? '(Convenio)' : '')}:</span> <span style={{ color: cuponAplicado ? "#16a34a" : "inherit" }}>-${descuento.toFixed(2)}</span></div>
           </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", paddingTop: "6px", borderTop: "2px solid #cbd5e1", fontWeight: "900", fontSize: "15px", color: "#0f172a" }}><span>TOTAL A PAGAR:</span><span style={{ color: "#0f766e" }}>${total.toFixed(2)}</span></div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "#fff", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "6px", marginTop: "10px" }}>
         <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
               <label style={{ fontSize: "10px", color: "#555", display: "block", marginBottom: "2px" }}>Estado de Pago</label>
               <select className="lis-input" style={{ width: "100%", height: "26px", fontWeight: "bold", padding: "2px 6px", border: "1px solid #9ca3af", borderRadius: "4px", color: estadoPago === "PAGADO" ? "#16a34a" : estadoPago === "ABONO" ? "#d97706" : "#dc2626" }} value={estadoPago} onChange={e => { setEstadoPago(e.target.value); if(e.target.value !== "ABONO") setMontoAbono(""); }}>
                  <option value="PENDIENTE">❌ Pendiente</option><option value="ABONO">💰 Abono (Parcial)</option><option value="PAGADO">✅ Pagado Completo</option>
               </select>
            </div>
            {estadoPago !== "PENDIENTE" && (
              <div style={{ flex: 1 }}>
                 <label style={{ fontSize: "10px", color: "#555", display: "block", marginBottom: "2px" }}>Método</label>
                 <select className="lis-input" style={{ width: "100%", height: "26px", padding: "2px 6px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                    <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tc">Tarjeta</option>
                 </select>
              </div>
            )}
         </div>
         {estadoPago === "ABONO" && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
               <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "10px", color: "#555", display: "block", marginBottom: "2px" }}>Monto Abonado ($)</label>
                  <input type="number" step="0.01" min="0.01" max={total - 0.01} className="lis-input" style={{ width: "100%", height: "26px", borderColor: "#d97706", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={montoAbono} onChange={e => setMontoAbono(e.target.value)} required />
               </div>
               <div style={{ flex: 1, textAlign: "right" }}>
                  <span style={{ fontSize: "10px", color: "#64748b", display: "block" }}>Saldo Pendiente:</span>
                  <span style={{ fontWeight: "bold", color: "#dc2626", fontSize: "14px" }}>${saldoPendiente.toFixed(2)}</span>
               </div>
            </div>
         )}
      </div>
    </>
  );
}