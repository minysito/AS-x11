// SPDX-License-Identifier: GPL-3.0-or-later
use crate::device::Battery;
use tauri::{image::Image, menu::{Menu, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState}, AppHandle, Manager};

// Pixel font stays sharp at the small Windows notification-area size.
const DIGITS: [[u8; 5]; 10] = [
    [7,5,5,5,7], [2,6,2,2,7], [7,1,7,4,7], [7,1,7,1,7], [5,5,7,1,1],
    [7,4,7,1,7], [7,4,7,5,7], [7,1,1,1,1], [7,5,7,5,7], [7,5,7,1,7],
];

/// A self-contained monochrome badge: bright digits on an opaque dark tile.
/// Contrast does not depend on the Windows taskbar tint or wallpaper.
pub fn battery_icon(battery: Option<&Battery>) -> Image<'static> {
    let current = battery.filter(|b| b.known);
    let text = current.map(|b| b.percentage.min(100).to_string()).unwrap_or("-".into());
    let mut pixels = vec![0u8; 32*32*4];
    let mut paint = |x: usize, y: usize, rgba: [u8;4]| {
        let at = (y*32+x)*4;
        pixels[at..at+4].copy_from_slice(&rgba);
    };
    // Two-tone edge remains visible on both light and dark taskbars.
    for y in 0..32 { for x in 0..32 {
        let corner = (x < 2 || x > 29) && (y < 2 || y > 29);
        if !corner { paint(x,y,if x==0 || y==0 || x==31 || y==31 { [169,179,193,255] } else { [15,20,29,255] }); }
    } }
    let sx = if text.len()==3 {2} else {4};
    let sy = 4;
    let width = text.len()*4*sx-sx;
    let x0 = (32-width)/2;
    for (i,ch) in text.chars().enumerate() {
        let glyph=ch.to_digit(10).map(|n|DIGITS[n as usize]).unwrap_or([0,0,7,0,0]);
        for (row,bits) in glyph.iter().enumerate() { for col in 0..3 {
            if bits & (1 << (2-col)) != 0 { for dy in 0..sy { for dx in 0..sx {
                paint(x0+i*4*sx+col*sx+dx,3+row*sy+dy,[255,255,255,255]);
            } } }
        } }
    }
    // Level strip adds a second visual cue, without recoloring the number.
    if let Some(b)=current {
        let filled=(b.percentage.min(100) as usize*26).div_ceil(100);
        for y in 27..30 { for x in 3..29 {
            paint(x,y,if x-3<filled {[245,247,250,255]} else {[66,75,89,255]});
        } }
        if b.charging {
            for (x,y) in [(17,24),(16,25),(15,26),(14,27),(15,27),(16,27),(17,27),(16,28),(15,29),(14,30)] {
                paint(x,y,[255,255,255,255]);
            }
        }
    }
    Image::new_owned(pixels,32,32)
}

pub fn update(app: &AppHandle, battery: Option<&Battery>, connected: bool) {
    if let Some(tray) = app.tray_by_id("battery") {
        let current = if connected { battery } else { None };
        let _ = tray.set_icon(Some(battery_icon(current)));
        let tip = if !connected { "AS x11 · Ratón apagado o sin conexión".into() }
            else if let Some(b) = current.filter(|b| b.known) {
                format!("AS x11 · {}%{}", b.percentage, if b.charging { " · Cargando" } else if b.percentage <= 20 { " · Batería baja" } else { "" })
            } else { "AS x11 · Esperando batería".into() };
        let _ = tray.set_tooltip(Some(tip));
    }
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app,"open","Abrir AS x11",true,None::<&str>)?;
    let quit = MenuItem::with_id(app,"quit","Salir",true,None::<&str>)?;
    let menu = Menu::with_items(app,&[&open,&quit])?;
    TrayIconBuilder::with_id("battery")
        .icon(battery_icon(None)).tooltip("AS x11 · Esperando batería")
        .menu(&menu).show_menu_on_left_click(false)
        .on_menu_event(|app,event| match event.id.as_ref() {
            "open" => show(app), "quit" => app.exit(0), _ => {}
        })
        .on_tray_icon_event(|tray,event| {
            if matches!(event,TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. }) { show(tray.app_handle()); }
        }).build(app)?;
    Ok(())
}

pub fn show(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") { let _ = window.show(); let _ = window.unminimize(); let _ = window.set_focus(); }
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn icon_is_valid_for_every_percentage() {
        for percentage in 0..=100 { let icon = battery_icon(Some(&Battery { known:true, percentage, ..Default::default() })); assert_eq!(icon.rgba().len(),32*32*4); assert!(icon.rgba().chunks(4).any(|p|p[3]==255)); }
    }
}
