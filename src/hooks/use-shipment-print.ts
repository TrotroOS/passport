"use client";

import { useCallback, useEffect } from "react";

const PRINT_BODY_CLASS = "shipment-print-active";

export function useShipmentPrint() {
  useEffect(() => {
    const cleanup = () => document.body.classList.remove(PRINT_BODY_CLASS);

    window.addEventListener("afterprint", cleanup);
    return () => {
      window.removeEventListener("afterprint", cleanup);
      cleanup();
    };
  }, []);

  return useCallback(() => {
    document.body.classList.add(PRINT_BODY_CLASS);
    window.print();
  }, []);
}
