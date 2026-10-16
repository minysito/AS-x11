// SPDX-License-Identifier: GPL-3.0-or-later
use openshark_lib::{device, prefs::NotifyPrefs, protocol::*};
use std::{sync::{Arc,Mutex},time::Instant};
fn main()->Result<(),String>{
    let conn=device::connect(None,None,Arc::new(Mutex::new(NotifyPrefs::default())))?;
    let settings=conn.read(REPORT_PROFILE_SETTINGS,PACKET_PROFILE_SETTINGS,0)?;
    let p=parse_profile_settings(&settings)?.current;
    let reports=[(REPORT_DPI,PACKET_DPI,p),(REPORT_LIGHTING,PACKET_LIGHTING,p),
        (REPORT_BUTTON_MAPPING,PACKET_BUTTON_MAPPING,p),(REPORT_POLLING_RATE,PACKET_POLLING_RATE,p),
        (REPORT_PROFILE_SETTINGS,PACKET_PROFILE_SETTINGS,0),(REPORT_DEVICE_VERSION,PACKET_DEVICE_VERSION,1)];
    for (id,len,param) in reports {conn.read(id,len,param)?;}
    let before=device::feature_read_count();let start=Instant::now();
    for _ in 0..100 {for (id,len,param) in reports {conn.read(id,len,param)?;}}
    let after=device::feature_read_count();
    assert_eq!(before,after,"Navigation must not issue feature reads");
    println!("PASS: 600 cached reads, zero additional HID requests, elapsed {:?}, connection {}",start.elapsed(),conn.info.connection);
    Ok(())
}
