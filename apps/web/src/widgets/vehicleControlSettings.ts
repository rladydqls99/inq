export const VEHICLE_CONTROL_STORAGE_KEY = "inq:vehicle-control-enabled";
export const VEHICLE_CONTROL_CHANGE_EVENT = "inq:vehicle-control-change";

export function isVehicleControlEnabled(): boolean {
  if (typeof window === "undefined") return true;

  try {
    return window.localStorage.getItem(VEHICLE_CONTROL_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setVehicleControlEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(VEHICLE_CONTROL_STORAGE_KEY, String(enabled));
  } catch {
    // Keep the in-memory setting usable when storage is unavailable.
  }

  window.dispatchEvent(
    new CustomEvent<boolean>(VEHICLE_CONTROL_CHANGE_EVENT, { detail: enabled }),
  );
}
