"use client";

import { useCallback, useEffect } from "react";

export const SHIPMENT_PRINT_BODY_CLASS = "shipment-print-active";

function schedulePrint() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}

export function useShipmentPrint() {
  useEffect(() => {
    const onBeforePrint = () => {
      document.body.classList.add(SHIPMENT_PRINT_BODY_CLASS);
    };

    const cleanup = () => {
      document.body.classList.remove(SHIPMENT_PRINT_BODY_CLASS);
    };

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", cleanup);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", cleanup);
      cleanup();
    };
  }, []);

  return useCallback(() => {
    document.body.classList.add(SHIPMENT_PRINT_BODY_CLASS);
    schedulePrint();
  }, []);
}
