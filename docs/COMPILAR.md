# Compilar y publicar

## Requisitos Windows x64

- Node.js 24 LTS y npm.
- Rust estable con objetivo `x86_64-pc-windows-msvc`.
- Visual Studio Build Tools: desarrollo de escritorio con C++ y Windows SDK.
- Microsoft Edge WebView2 Runtime.

```powershell
npm ci
npm test
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
npm run tauri dev
```

Para generar el portable y los instaladores:

```powershell
npm run tauri build
```

El ejecutable queda en `src-tauri/target/release/openshark.exe`; MSI y NSIS en
`src-tauri/target/release/bundle/`. Los compiladores y utilidades de empaquetado
pueden descargarse en el primer build. Los lockfiles fijan las dependencias;
eso no garantiza binarios idénticos bit a bit entre toolchains distintos.

## Diagnóstico del hardware

```powershell
cargo run --locked --manifest-path src-tauri/Cargo.toml --example diagnose
cargo run --locked --manifest-path src-tauri/Cargo.toml --example cache_check
```

Estas dos pruebas solo leen. El argumento `--verify-settings` de diagnose cambia
temporalmente sondeo y LED, comprueba la lectura y trata de restaurar el estado;
úsalo únicamente cuando quieras realizar esa prueba física.

## Releases

`.github/workflows/windows.yml` verifica cada push/PR. Al publicar un tag `v*`,
genera un release con los instaladores, portable, fuentes y SHA256. El permiso de
escritura se limita al trabajo de publicación del tag. No requiere un token personal.
Los binarios no están firmados con un certificado comercial.

Antes de publicar, actualiza de forma consistente `package.json`, `package-lock.json`,
`src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json` y la versión
visible. Conserva LICENSE y las atribuciones junto a las fuentes y en los recursos
del instalador. Genera el inventario con `scripts/collect-licenses.ps1` después de
instalar las dependencias. No publiques tokens OAuth, preferencias personales,
logs con rutas de usuario ni binarios del software original.
