import { useState } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../supabaseClient";

export default function ModalCobro({ ordenCobro, onClose, onSuccess }) {
  const [metodoPagoCobro, setMetodoPagoCobro] = useState("efectivo");

  // Calculamos la deuda exacta
  const total = Number(ordenCobro.finanzas?.total || 0);
  const abonoPrevio = Number(ordenCobro.finanzas?.abono || 0);
  const saldoDeudor = total - abonoPrevio;
  
  async function procesarCobroSaldo(e) {
    e.preventDefault();
    const toastId = toast.loading("Registrando pago y liquidando deuda...");
    try {
      const { error } = await supabase
        .from('cotizaciones')
        .update({ 
           pagada: true, 
           estado: "pagada", // 🚀 ESTO ES CLAVE: Le avisa a la App Móvil que ya se pagó y la pinta de Verde
           fecha_pago: new Date().toISOString(),
           metodo_pago: metodoPagoCobro,
           abono: total // 🚀 Al pagar el saldo, el abono se iguala al total de la factura
        })
        .eq('id', ordenCobro.cotizacion_id);
      
      if (error) throw error;
      toast.success("¡Saldo liquidado exitosamente!", { id: toastId });
      onSuccess();
      onClose();
    } catch(err) { 
      toast.error("Error al cobrar: " + err.message, { id: toastId }); 
    }
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050 }}>
      <div style={{ background: "#fff", border: "1px solid #999", width: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ background: "#d97706", color: "#fff", padding: "10px 15px", fontWeight: "bold", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
          <span>💰 Liquidación de Saldo Pendiente</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>X</button>
        </div>
        <form onSubmit={procesarCobroSaldo}>
          <div style={{ padding: "20px" }}>
            <p style={{ margin: "0 0 15px 0", fontSize: "13px", color: "#475569" }}>
              El paciente <b>{ordenCobro.paciente_nombre?.toUpperCase()}</b> tiene una deuda asociada a la orden médica <b>{ordenCobro.codigo_orden}</b>.
            </p>
            <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", padding: "15px", borderRadius: "6px", textAlign: "center", marginBottom: "15px" }}>
              <span style={{ display: "block", fontSize: "12px", color: "#b45309", marginBottom: "5px" }}>Saldo Pendiente a Cobrar:</span>
              <span style={{ fontSize: "28px", fontWeight: "900", color: "#b45309" }}>${saldoDeudor.toFixed(2)}</span>
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px", fontWeight: "bold" }}>Método con el que cancela el saldo:</label>
              <select className="lis-input" style={{ width: "100%", height: "30px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={metodoPagoCobro} onChange={e => setMetodoPagoCobro(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>
          </div>
          <div style={{ background: "#f8fafc", padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="lis-btn" style={{ background: "#f3f4f6", border: "1px solid #9ca3af", padding: "4px 12px", borderRadius: "2px" }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="lis-btn" style={{ fontWeight: "bold", border: "1px solid #16a34a", color: "white", background: "#22c55e", padding: "4px 12px", borderRadius: "2px", cursor: "pointer" }}>✅ Registrar Pago</button>
          </div>
        </form>
      </div>
    </div>
  );
}