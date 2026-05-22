import { seedOrders } from "../lib/firestore";
import { SEED_DATA } from "../lib/seedData";
import { s } from "./ui/shared";

export default function Setup() {
  const handleSeed = async () => {
    if(confirm("Esto reestablecerá los datos de Firestore con la data semilla histórica. ¿Proceder?")) {
      const count = await seedOrders(SEED_DATA.orders);
      alert(`Inyectados exitosamente ${count} registros.`);
    }
  };

  return (
    <div style={s.card}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#52B788", marginBottom: 12 }}>Herramientas del Sistema</h3>
      <p style={{ fontSize: 13, color: "../lib/constants".sub, marginBottom: 20 }}>
        Inyecta el lote de datos históricos base en tu colección de Cloud Firestore para poblar de inmediato las analíticas de gráficos y tablas.
      </p>
      <button onClick={handleSeed} style={{ ...s.btn, backgroundColor: "#3A6A46" }}>Poblar Firestore con Lote Histórico</button>
    </div>
  );
}