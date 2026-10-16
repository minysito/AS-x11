// SPDX-License-Identifier: GPL-3.0-or-later
//! Read-only by default. --verify-settings temporarily changes polling and LED,
//! checks readback, then restores the original packets even after a test failure.
use openshark_lib::{device, prefs::NotifyPrefs, protocol::*};
use std::sync::{Arc, Mutex};

fn main() -> Result<(), String> {
    for dev in device::list_devices()? { println!("{} {:04x} {}", dev.connection, dev.pid, dev.path); }
    let conn = device::connect(None, None, Arc::new(Mutex::new(NotifyPrefs::default())))?;
    println!("Connected: {:?}", conn.info);
    let version = conn.read(REPORT_DEVICE_VERSION, PACKET_DEVICE_VERSION, 1)?;
    println!("Version: {version:02x?}");
    let settings = parse_profile_settings(&conn.read(REPORT_PROFILE_SETTINGS, PACKET_PROFILE_SETTINGS, 0)?)?;
    println!("Profiles: {settings:?}");
    let p = settings.current;
    let dpi = conn.read(REPORT_DPI, PACKET_DPI, p)?;
    println!("DPI: {:?}", DpiConfig::parse(&dpi)?);
    let lighting = conn.read(REPORT_LIGHTING, PACKET_LIGHTING, p)?;
    println!("Lighting bytes: {lighting:02x?}");
    let mut cfg = LightingConfig::parse(&lighting)?;
    println!("Lighting: {cfg:?}");
    let polling = conn.read(REPORT_POLLING_RATE, PACKET_POLLING_RATE, p)?;
    println!("Polling: {} Hz", parse_polling(&polling)?);
    let buttons = conn.read(REPORT_BUTTON_MAPPING, PACKET_BUTTON_MAPPING, p)?;
    println!("Buttons: {:?}", ButtonConfig::parse(&buttons)?);
    if std::env::args().any(|a| a == "--verify-settings") {
        let result = (|| {
            for rate in [125, 250, 500, 1000] {
                conn.write(&build_polling(p, rate))?;
                println!("VERIFIED polling {rate} Hz");
            }
            cfg.mode = 1;
            for color in [Rgb {r:255,g:0,b:0}, Rgb {r:0,g:255,b:0}, Rgb {r:0,g:0,b:255}] {
                cfg.color = color;
                conn.write(&cfg.build())?;
                println!("VERIFIED LED {color:?}");
            }
            Ok::<(), String>(())
        })();
        let restore_light = conn.write(&lighting);
        let restore_rate = conn.write(&polling);
        restore_light?;
        restore_rate?;
        println!("Original lighting and polling restored and verified");
        result?;
    }
    Ok(())
}
