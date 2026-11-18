"use client";

import { useEffect } from "react";
import { captureUtmParams } from "@/app/utils/utm";

export default function UtmTracker() {
  useEffect(() => {
    captureUtmParams();
  }, []);

  return null;
}
