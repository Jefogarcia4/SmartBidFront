# SmartBid Front

Portal de cotizaciones en **React 18 + TypeScript + Vite**, conectado al API SmartBid (.NET 8).

## Autenticación con Office 365 (Microsoft Entra ID)

El login soporta dos esquemas: **Basic** (email/contraseña) y **Office 365** vía MSAL.
Para habilitar el botón "Continuar con Microsoft":

1. En [Azure Portal](https://portal.azure.com) → Microsoft Entra ID → **App registrations** → *New registration*.
   - Supported account types: *Single tenant* (o el que aplique).
   - Redirect URI: tipo **Single-page application (SPA)** con `http://localhost:5173`.
2. Copia el **Application (client) ID** y el **Directory (tenant) ID**.
3. Pégalos en `.env` del front (`VITE_AAD_CLIENT_ID`, `VITE_AAD_TENANT_ID`) y en
   `appsettings.json` del API (sección `AzureAd`). Reinicia ambos.
4. El email de la cuenta Microsoft debe existir en `dbo.Users` (ej. carlos.green@smartbid.co);
   el API valida el token con Entra ID y mapea el usuario local con su rol.
5. Opcional (recomendado en producción): en *Expose an API* crea el scope `access_as_user`
   y ponlo en `VITE_AAD_API_SCOPE` (`api://<CLIENT_ID>/access_as_user`) para usar access tokens
   en lugar del idToken.

## Arquitectura

```
src/
├─ api/          → http.ts (fetch + Basic Auth) y services.ts (auth, catálogo, clientes, cotizaciones)
├─ types/        → DTOs espejo del API (api.ts)
├─ context/      → AuthContext (sesión Basic Auth) y CartContext (carrito de cotización)
├─ components/   → TopBar (familias), ProductTable, StatsBar, CartSidebar, ExportModal, Stepper
├─ pages/        → LoginPage y CatalogPage
└─ styles/       → global.css (design tokens con la paleta SmartBid)
```

Paleta: `#3E2682` · `#5F10D2` · `#AA78F5` · `#D5BCFA` · `#E4E6F3` (degradados en tabs, header de tabla, sidebar y botones).

## Puesta en marcha

1. Levanta el API (perfil **http**, puerto 5080):

   ```bash
   cd ../SmartBid
   dotnet run --project src/SmartBid.Api --launch-profile http
   ```

2. Instala dependencias y arranca el front:

   ```bash
   npm install
   npm run dev
   ```

3. Abre `http://localhost:5173` e ingresa con `admin@smartbid.co` / `Smartbid123*`
   (o `laura.rios@smartbid.co`).

> La URL del API se configura en `.env` (`VITE_API_URL`, por defecto `http://localhost:5080`).
> Si corres el API con el perfil https, cambia el valor a `https://localhost:7080`.

## Flujo implementado

1. **Login** con Basic Auth (valida contra `GET /api/auth/me`; credenciales en sessionStorage).
2. **Familias** (categorías) como tabs superiores → **subcategorías** como chips → **productos** en tabla con stepper de cantidad.
3. **Carrito lateral**: paquetes base con sus **add-ons compatibles** (`GET /api/products/{id}/addons`), respetando la regla del API de que un add-on requiere paquete base.
4. **Exportar Cotización**: selecciona cliente (`GET /api/clients`) → `POST /api/quotations` → `POST /api/quotations/{id}/items` por cada paquete (con add-ons anidados). El API congela precios (RN-004) y recalcula totales COP/USD.
