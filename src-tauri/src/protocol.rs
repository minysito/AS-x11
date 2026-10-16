// SPDX-License-Identifier: GPL-3.0-or-later
//! Wire protocol for the Attack Shark X11 (and compatible Xenta-based mice).
//!
//! Every configuration is exchanged through HID **feature reports**. On Windows the
//! writes use a 64-byte buffer, and a report is
//! always identified by its first byte. Reads additionally require a short
//! "permission" dance (see [`crate::device`]).
//!
//! Layouts are based on public reverse engineering; see VALIDACION.md for local evidence.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Report identifiers
// ---------------------------------------------------------------------------

pub const REPORT_DPI: u8 = 0x04;
pub const REPORT_LIGHTING: u8 = 0x05;
pub const REPORT_POLLING_RATE: u8 = 0x06;
pub const REPORT_WAKE_UP: u8 = 0x07;
pub const REPORT_BUTTON_MAPPING: u8 = 0x08;
pub const REPORT_MACRO: u8 = 0x09;
pub const REPORT_DEVICE_VERSION: u8 = 0x0b;
pub const REPORT_PROFILE_SETTINGS: u8 = 0x0c;
pub const REPORT_READ_PERMISSION: u8 = 0xa0;

/// Size of the vendor feature report buffer used for writes (the largest packet,
/// the button map, is 59 bytes). Reads use each report's exact packet length.
pub const FEATURE_LEN: usize = 64;

/// Packet (logical) length for each report, used inside the payload.
pub const PACKET_DPI: u8 = 0x38;
pub const PACKET_LIGHTING: u8 = 0x0f;
pub const PACKET_POLLING_RATE: u8 = 0x09;
pub const PACKET_BUTTON_MAPPING: u8 = 0x3b;
pub const PACKET_DEVICE_VERSION: u8 = 0x08;
pub const PACKET_PROFILE_SETTINGS: u8 = 0x0a;

/// Number of profiles the firmware can hold.
pub const MAX_PROFILES: u8 = 5;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct Rgb {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/// Sum of `data[from..=to]`, as used by every X11 checksum.
fn checksum_sum(data: &[u8], from: usize, to: usize) -> u32 {
    data[from..=to].iter().map(|&b| b as u32).sum()
}

/// Write a 16-bit big-endian value at `idx`.
fn put_be16(data: &mut [u8], idx: usize, value: u32) {
    let v = value as u16;
    data[idx] = (v >> 8) as u8;
    data[idx + 1] = (v & 0xff) as u8;
}

/// Pad a logical packet up to the 64-byte write buffer size.
pub fn pad(packet: &[u8]) -> Vec<u8> {
    let mut out = vec![0u8; FEATURE_LEN];
    let n = packet.len().min(FEATURE_LEN);
    out[..n].copy_from_slice(&packet[..n]);
    out
}

// ---------------------------------------------------------------------------
// DPI (report 0x04)
// ---------------------------------------------------------------------------

/// PAW3311 DPI lookup table. Index `n` corresponds to a base DPI step.
pub const DPI_3311: &[u8] = &[
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x15, 0x16,
    0x17, 0x18, 0x19, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x29, 0x2a, 0x2b, 0x2c,
    0x2d, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x34, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x3b, 0x3d, 0x3e, 0x3f, 0x40, 0x41, 0x43,
    0x44, 0x45, 0x46, 0x47, 0x48, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x4f, 0x51, 0x52, 0x53, 0x54, 0x55, 0x57, 0x58, 0x59,
    0x5a, 0x5b, 0x5c, 0x5e, 0x5f, 0x60, 0x61, 0x62, 0x63, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f,
    0x70, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x79, 0x7a, 0x7b, 0x7c, 0x7d, 0x7f, 0x80, 0x81, 0x82, 0x83, 0x84, 0x86,
    0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8d, 0x8e, 0x8f, 0x90, 0x91, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x9a, 0x9b, 0x9c,
    0x9d, 0x9e, 0x9f, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xa7, 0xa8, 0xa9, 0xaa, 0xab, 0xac, 0xae, 0xaf, 0xb0, 0xb1, 0xb2,
    0xb3, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xbb, 0xbc, 0xbd, 0xbe, 0xbf, 0xc0, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc9,
    0xca, 0xcb, 0xcc, 0xcd, 0xcf, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xdb, 0xdd, 0xde, 0xdf,
    0xe0, 0xe1, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xea, 0xeb, 0x76, 0x77, 0x79, 0x7a, 0x7b, 0x7c, 0x7d, 0x7f, 0x80,
    0x81, 0x82, 0x83, 0x84, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8d,
];

pub struct DpiBytes {
    pub x: u8,
    pub y: u8,
    pub is_double: bool,
}

/// Encode a DPI value (50 - 26000) into sensor bytes.
pub fn dpi_to_bytes(dpi: u32) -> DpiBytes {
    // 0 means "unused stage" and is stored as a pair of zero bytes.
    if dpi == 0 {
        return DpiBytes { x: 0, y: 0, is_double: false };
    }

    let clamped = dpi.clamp(50, 26000);

    if clamped == 20100 {
        return DpiBytes { x: 0xeb, y: 1, is_double: true };
    }

    let mut is_double = false;
    let mut target = clamped;
    if clamped > 10000 {
        target = (clamped as f64 / 2.0).round() as u32;
        is_double = true;
    }

    // The sensor uses a 100-step table once values pass 5000 DPI, and 50-step
    // values below that. Doubling (the `is_double` flag) covers the >10000 range.
    let (x, y) = if target > 5000 && target % 100 == 0 {
        let index = (target / 100 - 1) as usize;
        (*DPI_3311.get(index).unwrap_or(&0), 1u8)
    } else {
        let index = ((target - 50) / 50) as usize;
        (*DPI_3311.get(index).unwrap_or(&0), 0u8)
    };

    DpiBytes { x, y, is_double }
}

/// Decode sensor bytes back into a DPI value.
pub fn bytes_to_dpi(x: u8, y: u8, is_double: bool) -> u32 {
    if x == 0 && y == 0 {
        return 0;
    }

    let mut value: u32 = if y == 0 {
        match DPI_3311.iter().position(|&b| b == x) {
            Some(i) => i as u32 * 50 + 50,
            None => 50,
        }
    } else if y == 1 {
        match DPI_3311.iter().position(|&b| b == x) {
            Some(i) => i as u32 * 100 + 100,
            None => 100,
        }
    } else {
        let combined = ((y as u32) << 8) | x as u32;
        let extra = combined.saturating_sub(199);
        10100 + extra * 100
    };

    if is_double {
        if x == 235 {
            return 20100;
        }
        value *= 2;
    }

    value.min(26000)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DpiConfig {
    pub profile_id: u8,
    pub lift_off_distance: u8,
    pub motion_sync: bool,
    pub angle_snap: bool,
    pub ripple_control: bool,
    pub active_stages: u8,
    pub current_stage: u8,
    pub values: Vec<u16>,
    pub colors: Vec<Rgb>,
    /// Extra parameter that controls the DPI indicator LED behaviour.
    #[serde(default = "default_dpi_indicator")]
    pub indicator: u8,
}

fn default_dpi_indicator() -> u8 {
    0x02
}

impl Default for DpiConfig {
    fn default() -> Self {
        DpiConfig {
            profile_id: 1,
            lift_off_distance: 0,
            motion_sync: false,
            angle_snap: false,
            ripple_control: true,
            active_stages: 0x3f,
            current_stage: 2,
            values: vec![800, 1600, 2400, 3200, 5000, 22000, 0, 0],
            colors: vec![
                Rgb { r: 0xff, g: 0x00, b: 0x00 },
                Rgb { r: 0x00, g: 0xff, b: 0x00 },
                Rgb { r: 0x00, g: 0x00, b: 0xff },
                Rgb { r: 0xff, g: 0xff, b: 0x00 },
                Rgb { r: 0x00, g: 0xff, b: 0xff },
                Rgb { r: 0xff, g: 0x00, b: 0xff },
                Rgb { r: 0xff, g: 0x40, b: 0x00 },
                Rgb { r: 0xff, g: 0xff, b: 0xff },
            ],
            indicator: 0x02,
        }
    }
}

impl DpiConfig {
    pub fn validate(&self) -> Result<(), String> {
        validate_profile(self.profile_id)?;
        if self.values.len() != 8 || self.colors.len() != 8 || self.active_stages == 0
            || !(1..=8).contains(&self.current_stage)
            || self.active_stages & (1 << (self.current_stage - 1)) == 0
            || self.lift_off_distance > 2 {
            return Err("Etapas de DPI no válidas: mantén activa la etapa actual".into());
        }
        for (i, &dpi) in self.values.iter().enumerate() {
            if self.active_stages & (1 << i) != 0 {
                let enc = dpi_to_bytes(dpi as u32);
                if !(50..=22000).contains(&dpi) || bytes_to_dpi(enc.x, enc.y, enc.is_double) != dpi as u32 {
                    return Err(format!("DPI {dpi} no representable por el sensor; usa un valor válido"));
                }
            }
        }
        Ok(())
    }

    pub fn build(&self) -> Vec<u8> {
        let mut b = vec![0u8; PACKET_DPI as usize];
        b[0] = REPORT_DPI;
        b[1] = PACKET_DPI;
        b[2] = self.profile_id;
        b[3] = (self.lift_off_distance << 4) | (self.angle_snap as u8);
        b[4] = ((self.motion_sync as u8) << 4) | (self.ripple_control as u8);
        b[5] = self.active_stages;

        let mut x_double = 0u8;
        let mut y_double = 0u8;
        for i in 0..8 {
            let dpi = *self.values.get(i).unwrap_or(&0) as u32;
            let enc = dpi_to_bytes(dpi);
            b[8 + i] = enc.x;
            b[16 + i] = enc.y;
            if enc.is_double {
                x_double |= 1 << i;
                y_double |= 1 << i;
            }
        }
        b[6] = x_double;
        b[7] = y_double;

        b[24] = self.current_stage;

        for i in 0..8 {
            let c = self.colors.get(i).copied().unwrap_or(Rgb { r: 0, g: 0, b: 0 });
            b[25 + i * 3] = c.r;
            b[26 + i * 3] = c.g;
            b[27 + i * 3] = c.b;
        }

        b[49] = self.indicator;
        let sum = checksum_sum(&b, 3, 49);
        put_be16(&mut b, 50, sum);
        b
    }

    pub fn parse(b: &[u8]) -> Result<Self, String> {
        if b.len() < 56 {
            return Err(format!("DPI report too short: {} bytes", b.len()));
        }
        if b[0] != REPORT_DPI {
            return Err(format!("unexpected DPI report id {:#04x}", b[0]));
        }

        let stored = ((b[50] as u32) << 8) | b[51] as u32;
        let computed = checksum_sum(b, 3, 49);
        if stored != computed {
            return Err(format!("DPI checksum mismatch: stored {stored:#06x}, computed {computed:#06x}"));
        }

        let x_double = b[6];
        let mut values = Vec::with_capacity(8);
        let mut colors = Vec::with_capacity(8);
        for i in 0..8 {
            let is_double = (x_double & (1 << i)) != 0;
            values.push(bytes_to_dpi(b[8 + i], b[16 + i], is_double) as u16);
            colors.push(Rgb { r: b[25 + i * 3], g: b[26 + i * 3], b: b[27 + i * 3] });
        }

        Ok(DpiConfig {
            profile_id: b[2],
            lift_off_distance: (b[3] & 0xf0) >> 4,
            angle_snap: (b[3] & 0x0f) == 0x01,
            motion_sync: (b[4] & 0xf0) >> 4 == 0x01,
            ripple_control: (b[4] & 0x0f) == 0x01,
            active_stages: b[5],
            current_stage: b[24],
            values,
            colors,
            indicator: b[49],
        })
    }
}

// ---------------------------------------------------------------------------
// Lighting / user preferences (report 0x05)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingConfig {
    pub profile_id: u8,
    /// 0 = off, 1 = static, 2 = breathing, 3 = neon, 4 = colour breathing,
    /// 5 = static (dpi), 6 = breathing (dpi).
    pub mode: u8,
    pub color: Rgb,
    /// LED speed 1..=5.
    pub speed: u8,
    /// Sleep time in minutes (0.5 ..= 30, step 0.5).
    pub sleep_time: f32,
    /// Deep sleep time in minutes (1 ..= 60).
    pub deep_sleep: u8,
    /// Key response in ms (4 ..= 50, step 2).
    pub key_response: u8,
    /// Brightness 1..=8.
    pub brightness: u8,
}

impl Default for LightingConfig {
    fn default() -> Self {
        LightingConfig {
            profile_id: 1,
            mode: 0,
            color: Rgb { r: 0, g: 255, b: 0 },
            speed: 3,
            sleep_time: 0.5,
            deep_sleep: 10,
            key_response: 8,
            brightness: 8,
        }
    }
}

impl LightingConfig {
    pub fn validate(&self) -> Result<(), String> {
        validate_profile(self.profile_id)?;
        if self.mode > 6 || !(1..=5).contains(&self.speed) || !(1..=8).contains(&self.brightness)
            || !(1..=60).contains(&self.deep_sleep) || !(4..=50).contains(&self.key_response)
            || self.key_response % 2 != 0 || !self.sleep_time.is_finite()
            || !(0.5..=30.0).contains(&self.sleep_time) || (self.sleep_time * 2.0).fract() != 0.0 {
            return Err("Parámetros de iluminación fuera de rango".into());
        }
        Ok(())
    }

    pub fn build(&self) -> Vec<u8> {
        let mut b = vec![0u8; PACKET_LIGHTING as usize];
        b[0] = REPORT_LIGHTING;
        b[1] = PACKET_LIGHTING;
        b[2] = self.profile_id;
        b[3] = (self.mode & 0x0f) << 4;
        b[4] = (self.deep_sleep & 0xf0) | (self.speed & 0x0f);
        b[5] = ((self.deep_sleep & 0x0f) << 4) | (self.brightness & 0x0f);
        b[6] = self.color.r;
        b[7] = self.color.g;
        b[8] = self.color.b;
        b[9] = (self.sleep_time * 2.0).round().clamp(1.0, 60.0) as u8;
        b[10] = (self.key_response / 2).clamp(2, 25);
        let sum = checksum_sum(&b, 3, 10);
        put_be16(&mut b, 11, sum);
        b
    }

    pub fn parse(b: &[u8]) -> Result<Self, String> {
        if b.len() < 13 {
            return Err(format!("lighting report too short: {} bytes", b.len()));
        }
        if b[0] != REPORT_LIGHTING {
            return Err(format!("unexpected lighting report id {:#04x}", b[0]));
        }

        let stored = ((b[11] as u32) << 8) | b[12] as u32;
        let computed = checksum_sum(b, 3, 10);
        if stored != computed {
            return Err(format!(
                "lighting checksum mismatch: stored {stored:#06x}, computed {computed:#06x}"
            ));
        }

        let i_sleep_h = (b[4] & 0xf0) >> 4;
        let i_sleep_l = (b[5] & 0xf0) >> 4;

        Ok(LightingConfig {
            profile_id: b[2],
            mode: (b[3] & 0xf0) >> 4,
            speed: b[4] & 0x0f,
            deep_sleep: ((i_sleep_h << 4) | i_sleep_l) as u8,
            brightness: b[5] & 0x0f,
            color: Rgb { r: b[6], g: b[7], b: b[8] },
            sleep_time: (b[9] as f32) / 2.0,
            key_response: b[10] * 2,
        })
    }
}

// ---------------------------------------------------------------------------
// Polling rate (report 0x06)
// ---------------------------------------------------------------------------

pub fn rate_to_byte(rate: u16) -> u8 {
    match rate {
        125 => 0x08,
        250 => 0x04,
        500 => 0x02,
        1000 => 0x01,
        _ => 0x01,
    }
}

pub fn validate_profile(id: u8) -> Result<(), String> {
    if !(1..=MAX_PROFILES).contains(&id) { return Err("Perfil fuera de rango (1–5)".into()); }
    Ok(())
}

pub fn validate_polling(id: u8, rate: u16) -> Result<(), String> {
    validate_profile(id)?;
    if ![125, 250, 500, 1000].contains(&rate) { return Err("Frecuencia no válida".into()); }
    Ok(())
}

pub fn byte_to_rate(byte: u8) -> Option<u16> {
    match byte {
        0x08 => Some(125),
        0x04 => Some(250),
        0x02 => Some(500),
        0x01 => Some(1000),
        _ => None,
    }
}

pub fn build_polling(profile_id: u8, rate: u16) -> Vec<u8> {
    let mut b = vec![0u8; PACKET_POLLING_RATE as usize];
    b[0] = REPORT_POLLING_RATE;
    b[1] = PACKET_POLLING_RATE;
    b[2] = profile_id;
    let rb = rate_to_byte(rate);
    b[3] = rb;
    b[4] = rb ^ 0xff;
    b
}

pub fn parse_polling(b: &[u8]) -> Result<u16, String> {
    if b.len() < 5 {
        return Err(format!("polling report too short: {} bytes", b.len()));
    }
    if b[0] != REPORT_POLLING_RATE {
        return Err(format!("unexpected polling report id {:#04x}", b[0]));
    }
    if b[4] != !b[3] {
        return Err("polling rate complement mismatch".into());
    }
    byte_to_rate(b[3]).ok_or_else(|| format!("unsupported polling rate byte {:#04x}", b[3]))
}

// ---------------------------------------------------------------------------
// Button mapping (report 0x08)
// ---------------------------------------------------------------------------

/// Byte offset of each of the 18 button slots inside the button mapping report.
pub const BUTTON_OFFSETS: [usize; 18] = [
    3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54,
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ButtonSlot {
    pub action: u8,
    pub modifiers: u8,
    pub usage: u8,
}

impl ButtonSlot {
    pub fn new(action: u8, modifiers: u8, usage: u8) -> Self {
        ButtonSlot { action, modifiers, usage }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ButtonConfig {
    pub profile_id: u8,
    pub slots: Vec<ButtonSlot>,
}

impl ButtonConfig {
    pub fn validate(&self) -> Result<(), String> {
        validate_profile(self.profile_id)?;
        if self.slots.len() != 18 { return Err("Se requieren 18 ranuras de botones".into()); }
        Ok(())
    }

    pub fn build(&self) -> Vec<u8> {
        let mut b = vec![0u8; PACKET_BUTTON_MAPPING as usize];
        b[0] = REPORT_BUTTON_MAPPING;
        b[1] = PACKET_BUTTON_MAPPING;
        b[2] = self.profile_id;
        for (i, off) in BUTTON_OFFSETS.iter().enumerate() {
            let slot = self.slots.get(i).cloned().unwrap_or(ButtonSlot::new(0x01, 0, 0));
            b[*off] = slot.action;
            b[*off + 1] = slot.modifiers;
            b[*off + 2] = slot.usage;
        }
        let sum = checksum_sum(&b, 3, 56);
        put_be16(&mut b, 57, sum);
        b
    }

    pub fn parse(b: &[u8]) -> Result<Self, String> {
        if b.len() < 59 {
            return Err(format!("button report too short: {} bytes", b.len()));
        }
        if b[0] != REPORT_BUTTON_MAPPING {
            return Err(format!("unexpected button report id {:#04x}", b[0]));
        }
        let stored = ((b[57] as u32) << 8) | b[58] as u32;
        let computed = checksum_sum(b, 3, 56);
        if stored != computed {
            return Err(format!(
                "button checksum mismatch: stored {stored:#06x}, computed {computed:#06x}"
            ));
        }
        let slots = BUTTON_OFFSETS
            .iter()
            .map(|&off| ButtonSlot { action: b[off], modifiers: b[off + 1], usage: b[off + 2] })
            .collect();
        Ok(ButtonConfig { profile_id: b[2], slots })
    }
}

// ---------------------------------------------------------------------------
// Profile settings (report 0x0c)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileSettings {
    pub current: u8,
    pub max: u8,
}

pub fn build_profile_settings(current: u8, max: u8) -> Vec<u8> {
    let mut b = vec![0u8; PACKET_PROFILE_SETTINGS as usize];
    b[0] = REPORT_PROFILE_SETTINGS;
    b[1] = PACKET_PROFILE_SETTINGS;
    b[2] = current;
    b[3] = !current & 0xff;
    b[4] = max;
    b[5] = !max & 0xff;
    b
}

pub fn parse_profile_settings(b: &[u8]) -> Result<ProfileSettings, String> {
    if b.len() < 6 {
        return Err(format!("profile settings report too short: {} bytes", b.len()));
    }
    if b[0] != REPORT_PROFILE_SETTINGS {
        return Err(format!("unexpected profile settings id {:#04x}", b[0]));
    }
    let current = b[2];
    let max = b[4];
    if (!current & 0xff) != b[3] {
        return Err("current profile checksum mismatch".into());
    }
    if (!max & 0xff) != b[5] {
        return Err("max profile checksum mismatch".into());
    }
    if max == 0 || max > MAX_PROFILES || current == 0 || current > max {
        return Err("profile settings out of range".into());
    }
    Ok(ProfileSettings { current, max })
}

// ---------------------------------------------------------------------------
// Device version (report 0x0b)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceVersion {
    pub device_id: u8,
    pub raw: Vec<u8>,
}

pub fn parse_device_version(b: &[u8]) -> Result<DeviceVersion, String> {
    if b.len() < 3 {
        return Err(format!("version report too short: {} bytes", b.len()));
    }
    if b[0] != REPORT_DEVICE_VERSION {
        return Err(format!("unexpected version report id {:#04x}", b[0]));
    }
    // The device id (0x55 for the X11) sits inside the payload; locate it robustly.
    let device_id = b
        .iter()
        .skip(2)
        .take(6)
        .copied()
        .find(|&byte| byte == 0x55)
        .unwrap_or(b[2]);
    Ok(DeviceVersion { device_id, raw: b[..8.min(b.len())].to_vec() })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dpi_roundtrip() {
        for &dpi in &[50u32, 400, 800, 1600, 2600, 5000, 8000, 10000, 12000, 16000, 22000, 20100, 26000] {
            let enc = dpi_to_bytes(dpi);
            let dec = bytes_to_dpi(enc.x, enc.y, enc.is_double);
            assert_eq!(dec, dpi, "dpi {dpi} decoded as {dec}");
        }
    }

    #[test]
    fn dpi_checksum() {
        let cfg = DpiConfig::default();
        let built = cfg.build();
        let parsed = DpiConfig::parse(&built).expect("parse");
        assert_eq!(parsed.values, cfg.values);
    }

    #[test]
    fn lighting_roundtrip() {
        let cfg = LightingConfig { profile_id: 1, mode: 1, color: Rgb { r: 255, g: 0, b: 255 }, speed: 3, sleep_time: 0.5, deep_sleep: 10, key_response: 8, brightness: 8 };
        let parsed = LightingConfig::parse(&cfg.build()).expect("parse");
        assert_eq!(parsed.mode, 1);
        assert_eq!(parsed.color, Rgb { r: 255, g: 0, b: 255 });
        assert_eq!(parsed.deep_sleep, 10);
        assert_eq!(parsed.sleep_time, 0.5);
        assert_eq!(parsed.key_response, 8);
    }

    #[test]
    fn polling_roundtrip() {
        for &r in &[125u16, 250, 500, 1000] {
            assert_eq!(parse_polling(&build_polling(1, r)).unwrap(), r);
        }
    }

    #[test]
    fn profile_roundtrip() {
        let p = parse_profile_settings(&build_profile_settings(1, 5)).unwrap();
        assert_eq!(p.current, 1);
        assert_eq!(p.max, 5);
    }

    #[test]
    fn captured_x11_lighting_packet() {
        // Captured on the user's X11 over both FA55 and FA60, 2026-10-15.
        let raw = [0x05,0x0f,0x01,0x10,0x03,0xa8,0x08,0xfd,0xd4,0x02,0x04,0x02,0x9a,0x00,0x00];
        let cfg = LightingConfig::parse(&raw).unwrap();
        assert_eq!(cfg.color, Rgb {r:8,g:253,b:212});
        assert_eq!(cfg.mode, 1);
        assert_eq!(cfg.build(), raw);
        let mut corrupt = raw;
        corrupt[6] ^= 1;
        assert!(LightingConfig::parse(&corrupt).is_err());
    }

    #[test]
    fn reject_invalid_settings() {
        assert!(validate_polling(1, 2000).is_err());
        assert!(validate_polling(0, 500).is_err());
        let mut polling = build_polling(1, 500);
        polling[4] ^= 1;
        assert!(parse_polling(&polling).is_err());
        assert!(parse_profile_settings(&build_profile_settings(5, 1)).is_err());
        let mut cfg = LightingConfig::default();
        cfg.sleep_time = f32::NAN;
        assert!(cfg.validate().is_err());
        let mut dpi = DpiConfig::default();
        dpi.active_stages = 0;
        assert!(dpi.validate().is_err());
    }
}
