# 🌿 FISIOBISS — Canal Mayorista B2B

Sistema de gestión B2B con **Google Sheets como base de datos**.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | **Next.js 14** + React 18 |
| Base de datos | **Google Sheets** (vía Service Account) |
| API | Next.js API Routes (servidor) |
| Gráficos | Recharts |

---

## Instalación

```bash
npm install
cp .env.local.example .env.local   # Configura tus credenciales
npm run dev
```

## Configuración de Google Sheets (una sola vez)

### Paso 1 — Crear Service Account en Google Cloud
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un proyecto (o usa uno existente)
3. **APIs & Services → Biblioteca → Busca "Google Sheets API" → Activar**
4. **IAM & Admin → Service Accounts → Crear Service Account**
5. Nombre: `fisiobiss-sheets` → Crear → Continuar → Listo
6. Clic en la service account creada → **Claves → Agregar clave → JSON**
7. Se descarga un archivo JSON con las credenciales

### Paso 2 — Configurar el Google Sheet
1. Crea un **Google Sheet nuevo** en blanco
2. Copia el **ID del Sheet** de la URL:  
   `docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit`
3. Abre el Sheet → **Compartir** → pega el email de la service account → **Editor**

### Paso 3 — Configurar `.env.local`
```env
GOOGLE_SHEET_ID=tu_sheet_id_aqui
GOOGLE_SERVICE_ACCOUNT_EMAIL=nombre@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
```
> La clave privada viene del JSON descargado. Reemplaza los saltos de línea reales por `\n`.

### Paso 4 — Cargar datos históricos
```
npm run dev → Parámetros → Cargar datos históricos
```
Esto crea automáticamente las hojas **BD_VENTAS** y **CONFIG** en el Sheet.

---

## Estructura del proyecto

```
fisiobiss-b2b/
├── app/
│   ├── api/
│   │   ├── orders/
│   │   │   ├── route.js          ← GET todos / POST nuevo
│   │   │   ├── [id]/route.js     ← PATCH estado / PUT completo / DELETE
│   │   │   └── seed/route.js     ← POST carga masiva histórica
│   │   └── config/route.js       ← GET nextId
│   ├── layout.jsx
│   ├── page.jsx                  ← Página principal
│   └── globals.css
├── components/
│   ├── AppShell.jsx
│   ├── Dashboard.jsx
│   ├── NuevoPedido.jsx
│   ├── Pedidos.jsx
│   ├── Rentabilidad.jsx
│   ├── Setup.jsx
│   ├── QuotationView.jsx
│   └── ui/
│       ├── ConnError.jsx
│       ├── DateFilter.jsx
│       ├── Splash.jsx
│       └── shared.js
├── hooks/
│   └── usefirestore.js           ← Hook useOrders (polling 30s)
└── lib/
    ├── googleSheets.js           ← Capa de acceso a Sheets (solo servidor)
    ├── db.js                     ← Funciones cliente → API Routes
    ├── constants.js              ← Productos, colores, helpers
    └── seeddata.js               ← 259 pedidos históricos
```

## Flujo de datos

```
Componente cliente
      ↓ import { addOrder } from lib/db.js
lib/db.js → fetch("/api/orders", POST)
      ↓
app/api/orders/route.js  (servidor Next.js)
      ↓ import { addOrder } from lib/googleSheets.js
lib/googleSheets.js → Google Sheets API
      ↓
Google Sheet (BD_VENTAS)
```

## Actualización en tiempo real
La app sincroniza automáticamente cada **30 segundos** usando polling.  
Botón **⟳** en la barra de navegación fuerza sincronización manual.
