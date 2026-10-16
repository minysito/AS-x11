// SPDX-License-Identifier: GPL-3.0-or-later
fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        let manifest = std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap())
            .join("examples/diagnose.manifest");
        println!("cargo:rustc-link-arg-examples=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg-examples=/MANIFESTINPUT:{}", manifest.display());
        println!("cargo:rerun-if-changed=examples/diagnose.manifest");
    }
    tauri_build::build()
}
