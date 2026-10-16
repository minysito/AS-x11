# AS x11 · Configurador

[![Windows build](https://github.com/minysito/AS-x11/actions/workflows/windows.yml/badge.svg)](https://github.com/minysito/AS-x11/actions/workflows/windows.yml)
[![GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](LICENSE)

Configurador **no oficial** para el **Attack Shark X11**, en Windows x64.
React, TypeScript, Tauri y Rust; comunicación HID nativa por cable USB y receptor de 2,4 GHz.

## Descargar

**[Última versión e instaladores](https://github.com/minysito/AS-x11/releases/latest)**

| Descarga 0.3.2 | Uso |
| --- | --- |
| [Instalador EXE](https://github.com/minysito/AS-x11/releases/download/v0.3.2/AS-x11-0.3.2-setup.exe) | Opción recomendada; actualiza los accesos |
| [Instalador MSI](https://github.com/minysito/AS-x11/releases/download/v0.3.2/AS-x11-0.3.2-x64.msi) | Instalación alternativa |
| [Portable](https://github.com/minysito/AS-x11/releases/download/v0.3.2/AS-x11-0.3.2.exe) | Ejecutar sin instalar |
| [Fuentes completas](https://github.com/minysito/AS-x11/releases/download/v0.3.2/AS-x11-0.3.2-source.zip) | Código, recursos, licencias y herramientas de compilación |
| [SHA256](https://github.com/minysito/AS-x11/releases/download/v0.3.2/SHA256.txt) | Comprobar integridad de los archivos |

Las descargas versionadas se conservan en Releases. El código también se puede
descargar desde Code → Download ZIP o clonar. No se publica el software original
del fabricante ni se necesita para compilar esta app.

## Qué permite hacer

- Cambiar etapas de DPI, colores, efectos LED, brillo y tiempos de energía.
- Seleccionar **125, 250, 500 o 1000 Hz**.
- Configurar **cinco clics**: izquierdo, derecho, central y los dos laterales.
- Explorar el X11 en **SVG vectorial interactivo**, con vistas superior y lateral,
  rueda acanalada animada, respuesta a las pulsaciones y LED vinculado al perfil.
- Ver batería en la bandeja del sistema y activar **Iniciar con Windows** mediante una casilla.
- Seleccionar perfiles y exportar/importar copias JSON.

Los cambios se aplican al utilizar el control, sin Guardar. Las escrituras se verifican
leyendo el firmware. La navegación utiliza caché para evitar consultas HID al cambiar
de pantalla. El enlace inalámbrico se recupera por eventos y comprobación periódica.

## Empezar

Instala y abre el acceso directo de la versión actual. Cierra el configurador
original antes de cambiar ajustes. Conecta un cable USB de datos o el receptor
de 2,4 GHz, enciende el ratón y muévelo para despertarlo si está suspendido.

**Ajustes → Iniciar con Windows** es opcional y se aplica inmediatamente. Al iniciar
sesión, la app permanece en la bandeja sin abrir la ventana. Pulsa su icono para abrir;
usa el menú Salir para terminar. Windows puede colocar el icono entre los ocultos.

Descargar un portable nuevo **no actualiza una instalación antigua**. Comprueba
la versión visible si un acceso antiguo sigue abriendo la 0.1.0.

## Documentación

- [Guía de uso y solución de problemas](docs/USO.md)
- [Cómo funciona: interfaz, HID, caché y reconexión](docs/ARQUITECTURA.md)
- [Requisitos, compilación y publicación](docs/COMPILAR.md)
- [Pruebas físicas y límites de validación](docs/VALIDACION.md)
- [Licencia, atribuciones y dependencias](NOTICE.md)
- [Sistema visual NEXUS](design.md)

## Compilar

Necesitas Windows x64, Node.js 24 LTS, Rust MSVC, Visual Studio Build Tools con
C++/Windows SDK y WebView2.

```powershell
npm ci
npm test
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
npm run tauri build
```

Para desarrollo: `npm run tauri dev`. Los resultados quedan en
`src-tauri/target/release/` y su subcarpeta `bundle/`. Los lockfiles fijan las
dependencias. GitHub Actions comprueba el código y publica los archivos al crear
un tag `v*` que coincida con la versión del proyecto.

## Compatibilidad y alcance

Probado físicamente en un X11 con `1D57:FA55` por cable y `1D57:FA60` por 2,4 GHz.
Las lecturas posteriores verifican los ajustes almacenados; no constituyen una
medición externa de la frecuencia física ni una prueba visual del LED.

No se garantiza X11SE, R1, Bluetooth ni todas las revisiones del X11. La luz de la
base conserva sus controles independientes. No incluye editor de macros, aunque
permite asignar macros almacenadas. Google Drive requiere configuración OAuth propia
y no está validado con cuenta externa; utiliza copias JSON si prefieres configuración local.
Los binarios no están firmados con certificado comercial. No hay actualizador automático.

## Licencia y fuentes

**GPL-3.0-or-later**, texto completo en [LICENSE](LICENSE); archivos propios marcados
con SPDX. Se conservan las licencias de las dependencias y la atribución MIT de
[HarukaYamamoto0/attack-shark-x11-driver](https://github.com/HarukaYamamoto0/attack-shark-x11-driver),
commit `e4d68c0a191bbbf5ac6cf3919d5fb9bdf0823a0f`, usado como referencia de protocolo.
Consulta [NOTICE.md](NOTICE.md).

Proyecto comunitario no afiliado a Attack Shark. Las marcas pertenecen a sus titulares.
