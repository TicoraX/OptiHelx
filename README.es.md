# OptiHelx

[English](README.md) · **Español**

OptiHelx es un conjunto de herramientas de mantenimiento y optimización para Windows. Tiene 23 módulos escritos en Node.js, perfiles de optimización en un clic, una CLI sin interfaz gráfica, telemetría de hardware en vivo, un Health Score, un gestor de puntos de restauración, una paleta de comandos (`Ctrl+K`) y un panel en React que corre como app de escritorio (Tauri v2 o Electron) o en el navegador.

> Todo el procesamiento y el almacenamiento de reportes ocurre en tu equipo. No hay servicios en la nube ni telemetría propia. Solo dos módulos salen a la red: Update Checker consulta los gestores de paquetes oficiales y AdBlock descarga listas públicas de dominios.

## Módulos

| Módulo | Qué hace |
|---|---|
| Update Checker | Busca actualizaciones en winget (apps y drivers), pip, npm global y Chocolatey en paralelo. |
| Disk Cleanup | Escanea y limpia archivos temporales, la papelera de reciclaje, cachés de desarrollo (`uv`, `pnpm`, `cargo`) y de navegadores (Chrome, Edge, Firefox, Arc, Vivaldi, Opera). |
| Startup Optimizer | Audita y deshabilita programas de inicio, servicios automáticos y tareas de inicio de sesión. Guarda un manifiesto para reactivarlos y admite `dryRun`. |
| RAM Optimizer | Muestra el consumo de memoria por proceso y clasifica los procesos por riesgo: seguro, riesgoso o crítico para el sistema. |
| Network Optimizer | Revisa conectividad, latencia, tamaño de la caché DNS y adaptadores de red. Permite purgar y volver a registrar. |
| Services Optimizer | Lista los servicios automáticos y separa los de Microsoft de los de terceros. Permite detener y deshabilitar los que elijas. |
| Power Optimizer | Muestra el plan de energía activo, la batería y el consumo estimado. Cambia de plan y registra el cambio para poder deshacerlo. |
| App Manager | Lista las aplicaciones instaladas con winget y las desinstala en silencio por lotes. |
| Privacy Optimizer | Audita y endurece las directivas de privacidad de Windows (telemetría, ID de publicidad, Cortana, sensores, diagnósticos). |
| AdBlock Optimizer | Bloquea dominios de telemetría y publicidad escribiendo listas curadas (`adaway`, `danpollock`, `stevenblack`) en el archivo hosts, con backup automático. |
| Gaming Mode | Ajusta el sistema para juegos: HAGS, GameDVR, optimizaciones de pantalla completa, DirectStorage y prioridad de GPU. |
| System Integrity | Ejecuta verificaciones y reparaciones del almacén de componentes de Windows con SFC y DISM, con progreso en vivo. |
| Context Menu | Quita entradas residuales e innecesarias del menú contextual de Windows sin tocar las del sistema. |
| OEM Debloat | Detecta y desactiva software preinstalado de fabricantes (Dell, HP, Lenovo, ASUS, Acer) sin tocar controladores. |
| System Timers | Ajusta la latencia de interrupciones y la configuración de reloj de BCD (`useplatformclock`, `syntheticclock`, `tscsyncpolicy`). |
| Ghost Devices | Detecta dispositivos desconectados o duplicados en el Administrador de dispositivos y omite los buses del sistema (`PCI\`, `HTREE\`, `UEFI\`). |
| Search Indexer | Ajusta el servicio Windows Search y desactiva los resultados web y de Bing en el menú Inicio. |
| DNS Flush | Purga la caché del resolvedor DNS y vuelve a registrar los nombres de host. |
| Network Privacy | Desactiva protocolos de red inseguros o con fugas de datos (LLMNR, NetBIOS, WPAD, sondeo activo de NCSI). |
| Virtual Memory / Pagefile | Informa sobre el archivo de paginación, la paginación del kernel y las directivas de memoria. |
| WerFault Optimizer | Suprime los diálogos de cuelgue, la generación masiva de minidumps y la telemetría de errores de Windows. |
| SSD Health & TRIM | Lee la salud SMART de las unidades físicas, verifica que TRIM esté activo y ejecuta `defrag.exe /O /C`. |
| GPU Shader Cache | Busca y purga las cachés de sombreadores de DirectX, NVIDIA, AMD e Intel, útil contra los tirones después de actualizar drivers. |

Todos los módulos siguen el mismo patrón:

- El escaneo lee el sistema y genera un reporte en Markdown, un JSON de conteos y un JSON de elementos seleccionables. No modifica nada.
- La acción toca solo lo que seleccionaste. Puedes simularla antes con `dryRun`, y cada cambio aplicado queda en un historial (`changes.json`) para poder deshacerlo.

## Funciones

- Perfiles en un clic para escenarios frecuentes (Gaming, Oficina, Laptop y batería, Desarrollador). Cada perfil encadena varias acciones y admite `dryRun`.
- Una CLI sin interfaz (`server/cli.js`) ejecuta diagnósticos, limpieza, optimización de RAM, TRIM y perfiles desde PowerShell o CMD.
- La versión Electron se minimiza a la bandeja del sistema y ofrece acciones rápidas desde el menú del icono.
- Telemetría de hardware en vivo: CPU (uso, núcleos, frecuencia, gráfico histórico), RAM (usada, libre, sparkline en vivo), espacio libre por unidad y adaptadores de red activos con IP local y nombre del equipo.
- Una paleta de comandos (`Ctrl+K` / `Cmd+K`) lleva a cualquier módulo o vista, alterna el modo claro y oscuro y exporta reportes.
- Un Health Score de 0 a 100 califica el estado general del sistema, y Quick Optimize ejecuta en un clic los módulos más seguros.
- Large Files Hunter encuentra archivos pesados (umbral elegible de 100 MB a 5 GB, 250 MB por defecto) y los abre en el Explorador de archivos.
- Un gestor de puntos de restauración crea y lista puntos de restauración de Windows. Windows permite como máximo un punto automático cada 24 horas.

## CLI

El backend incluye una CLI para ejecutar diagnósticos y mantenimiento desde la terminal:

```powershell
# Estado consolidado de todos los módulos
node server/cli.js status

# Health Score y acciones recomendadas
node server/cli.js health

# Listar los perfiles disponibles
node server/cli.js profiles

# Simular el perfil Gaming sin cambiar nada
node server/cli.js profile gaming --dry-run

# Aplicar el perfil Gaming
node server/cli.js profile gaming

# Limpiar archivos temporales
node server/cli.js clean

# Optimizar la RAM
node server/cli.js ram

# Ejecutar TRIM en los SSD
node server/cli.js trim

# Purgar la caché de sombreadores de la GPU
node server/cli.js shaders
```

## Estructura del proyecto

```
OptiHelx/
├── server/
│   ├── server.js            # Express: rutas, seguridad, SSE, rate limiting
│   ├── cli.js               # CLI sin interfaz
│   ├── lib/                 # Lógica de los 23 módulos, en Node.js
│   │   ├── shared.js        # Whitelist de módulos, validadores, helpers de spawn, historial
│   │   ├── changes.js       # Deshacer cambios aplicados
│   │   ├── status.js        # Estado consolidado
│   │   ├── profiles.js      # Perfiles de optimización
│   │   ├── smartdisk.js     # Módulo SMART y TRIM
│   │   ├── shadercache.js   # Módulo de caché de sombreadores de GPU
│   │   └── <modulo>.js      # Un archivo por módulo: escaneo + acción
│   └── tests/               # Pruebas unitarias y de integración
├── frontend/                # React + Vite
│   ├── src/modules.js       # Registro declarativo de los 23 módulos
│   ├── src/styles/tokens.css# Tokens de diseño (color, espaciado, tipografía)
│   └── src/components/      # Componentes de la interfaz
├── src-tauri/               # App de escritorio Tauri v2 (empaqueta node.exe y el servidor)
├── electron/                # App de escritorio Electron (bandeja, electron-updater)
├── scripts/Notify.ps1       # Notificaciones semanales programadas
└── <modulo>/reports/        # Reportes, conteos, elementos, logs e historial de cambios
```

## Requisitos

- Windows 10 u 11 (64-bit)
- [Node.js 20+](https://nodejs.org/) y `npm >= 9`
- Para la versión Tauri: el toolchain de Rust
- Opcionales según el módulo: `winget`, `pip`, `npm`, `choco`. Los que falten se omiten sin error.

## Inicio rápido: app de escritorio

Clonar e instalar:

```powershell
git clone https://github.com/TicoraX/OptiHelx.git
cd OptiHelx
npm ci                     # instalación reproducible desde el lockfile
npm run build:frontend     # compila el frontend
```

Tauri v2 (la que se usó para el instalador NSIS de la v1.5.0):

```powershell
npm run tauri:dev          # modo desarrollo
npm run tauri:build        # genera el instalador NSIS
```

Electron (icono en la bandeja y auto-actualización vía GitHub Releases):

```powershell
npm start                  # abre la app
npm run dist               # genera el instalador en dist/ sin publicar
npm run release            # genera y publica un GitHub Release (requiere GITHUB_TOKEN con permiso repo)
```

## Inicio rápido: modo servidor web

Para correr solo el backend y abrir el panel en el navegador (`http://localhost:5173` en desarrollo o `http://localhost:3001` con el build estático):

```powershell
# Terminal 1: backend
cd server
npm start

# Terminal 2: frontend en modo desarrollo
cd frontend
npm run dev
```

## Seguridad

1. El servidor Express escucha solo en `127.0.0.1`, así que otras máquinas de la LAN o de internet no pueden alcanzarlo.
2. Los comandos se ejecutan con `spawn()`, arrays de argumentos y sin shell. La única excepción son las actualizaciones globales de npm, que pasan por el shell porque `npm` es un script `.cmd` en Windows.
3. Solo pueden ejecutarse los 23 módulos registrados en `MODULES`. Cualquier otro nombre de módulo recibe un HTTP 400.
4. Todo borrado en disco resuelve la ruta con `realpath` y verifica que quede dentro de una carpeta permitida (`%TEMP%`, cachés y similares).
5. Todo cambio en el sistema acepta el flag `dryRun`, que muestra qué cambiaría sin cambiarlo.
6. Cada cambio aplicado guarda su valor anterior en `changes.json`, así que cada uno se puede deshacer por separado.
7. Los endpoints usan `express-rate-limit` y los headers de seguridad de `helmet`.
