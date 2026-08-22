"use client";

import { TrackOrderForm } from "@/components/TrackOrderForm";

export function PortalTrackCard({
  lineUrl,
  lineId,
}: {
  lineUrl: string;
  lineId: string;
}) {
  return <TrackOrderForm variant="portal" lineUrl={lineUrl} lineId={lineId} />;
}
