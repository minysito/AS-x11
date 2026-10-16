// SPDX-License-Identifier: GPL-3.0-or-later
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "./toast";
import { queueSetting } from "./settingsQueue";
// The queue lives outside React: navigating never cancels the last edit.
export function useAutoApply<T>(key: string, write: (value:T) => Promise<void>) {
  const toast = useToast();
  const [saving,setSaving] = useState(false);
  const mounted = useRef(true), revision = useRef(0), writer = useRef(write);
  writer.current = write;
  useEffect(() => { mounted.current=true; return () => { mounted.current=false; }; },[]);
  const apply = useCallback((value:T) => {
    const current = ++revision.current;
    setSaving(true);
    queueSetting(key,value,v => writer.current(v)).catch(error => { if (revision.current === current) toast.err(String(error)); })
      .finally(() => { if (mounted.current && revision.current === current) setSaving(false); });
  },[key,toast]);
  return { apply,saving };
}

