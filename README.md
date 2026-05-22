# 🌿 FISIOBISS — Canal Mayorista B2B

Sistema de gestión de ventas B2B con Firebase Firestore en tiempo real.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | **Next.js 14** + React 18 |
| Base de datos | **Firebase Firestore** (tiempo real) |
| Gráficos | Recharts |
| Estilos | CSS-in-JS (inline styles, paleta personalizada) |

> No se requiere backend propio — Firebase es el backend.

---

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar Firebase
cp .env.local.example .env.local
# Edita .env.local con tus credenciales de Firebase

# 3. Iniciar en desarrollo
npm run dev
```

## Configuración de Firebase

### Paso 1 — Crear proyecto
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. **Crear proyecto** → Nombre: `fisiobiss-b2b`
3. **Agregar app web** → Copia las credenciales a `.env.local`

### Paso 2 — Firestore
1. En el menú izquierdo → **Firestore Database**
2. **Crear base de datos** → Modo producción
3. Región: `us-central1` o `southamerica-east1`

### Paso 3 — Reglas de seguridad
En Firestore → Reglas, pega esto (para desarrollo):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
> ⚠️ Para producción, implementa autenticación Firebase Auth.

### Paso 4 — Cargar datos históricos
Al iniciar la app, ve a la pestaña **⚙ Config** → **Cargar datos históricos**.
Esto carga los 259 pedidos históricos (Nov 2025 → May 2026) a Firestore.

---

## Estructura del proyecto

```
fisiobiss-b2b/
├── app/
│   ├── layout.jsx          ← Layout raíz Next.js
│   ├── page.jsx            ← Página principal
│   └── globals.css         ← Estilos globales
├── components/
│   ├── AppShell.jsx        ← Navegación + layout general
│   ├── Dashboard.jsx       ← Dashboard con KPIs y gráficos
│   ├── NuevoPedido.jsx     ← Formulario de ingreso de pedido
│   ├── Pedidos.jsx         ← Base de datos de pedidos
│   ├── Rentabilidad.jsx    ← P&L y análisis de rentabilidad
│   ├── Setup.jsx           ← Pantalla de primer uso
│   ├── ConnError.jsx       ← Pantalla de error de conexión
│   ├── QuotationView.jsx   ← Vista de cotización imprimible
│   └── ui/
│       ├── DateFilter.jsx  ← Filtro de fechas reutilizable
│       ├── Splash.jsx      ← Pantalla de carga
│       └── shared.js       ← Estilos y helpers compartidos
├── lib/
│   ├── firebase.js         ← Inicialización Firebase
│   ├── firestore.js        ← Operaciones CRUD Firestore
│   ├── constants.js        ← Productos, regiones, colores
│   └── seedData.js         ← 259 pedidos históricos
└── hooks/
    └── useFirestore.js     ← Hook tiempo real con onSnapshot
```

## Colección Firestore

```
orders/{PED-XXX}
  id, fecha, vendedor, cliente, telefono, email,
  direccion, region, estado, medioPago,
  subtotal, costoEnvio, totalPagar, totalUnidades, cogs,
  items: [...], notas, timestamp, createdAt

config/app
  nextId: 260
```

## Despliegue en producción

```bash
npm run build
npm start
# O despliega en Vercel: vercel --prod
```
