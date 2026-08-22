import "server-only";
import {
  applyCarrierTrackingUpdate,
  listTrackableShipmentRows,
  markShipmentTrackMeta,
} from "@/lib/db";
import {
  fetchTrack17Info,
  isTrack17Configured,
  registerTrack17,
  type Track17Snapshot,
} from "@/lib/track17";
import type { Order, Shipment } from "@/lib/types";

export async function registerShipmentTracking(order: Order, shipment: Shipment) {
  if (!isTrack17Configured()) return { skipped: true as const };
  if (!shipment.trackingNo.trim() || shipment.carrier === "pickup") {
    return { skipped: true as const };
  }
  try {
    await registerTrack17({
      trackingNo: shipment.trackingNo,
      carrier: shipment.carrier,
      tag: shipment.id,
      postalCode: order.address.postalCode,
      consignee: order.address.fullName,
      phone: order.address.phone,
    });
    await markShipmentTrackMeta(shipment.id, { registered: true, error: null });
    return { ok: true as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : "ลงทะเบียนไม่สำเร็จ";
    await markShipmentTrackMeta(shipment.id, { error: message });
    return { ok: false as const, error: message };
  }
}

export async function applyTrackSnapshots(snapshots: Track17Snapshot[]) {
  const results = [];
  for (const snapshot of snapshots) {
    results.push(await applyCarrierTrackingUpdate(snapshot));
  }
  return results;
}

export async function syncOpenShipmentsFromTrack17() {
  if (!isTrack17Configured()) return { skipped: true as const, synced: 0 };
  const rows = await listTrackableShipmentRows();
  for (const { shipment, order } of rows) {
    if (!shipment.trackRegisteredAt) {
      await registerShipmentTracking(order, shipment);
    }
  }
  const stillOpen = await listTrackableShipmentRows();
  if (stillOpen.length === 0) return { skipped: false as const, synced: 0 };
  const snapshots = await fetchTrack17Info(
    stillOpen.map(({ shipment }) => ({ trackingNo: shipment.trackingNo, carrier: shipment.carrier })),
  );
  await applyTrackSnapshots(snapshots);
  return { skipped: false as const, synced: snapshots.length };
}
