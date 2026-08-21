import type { DocumentRecord, Order, Payment, Product, Shipment, SiteSettings, WholesaleLead } from "./types";

export type AdminOrderRow = {
  order: Order;
  payment?: Payment;
  document?: DocumentRecord;
  shipments: Shipment[];
};

export type AdminDashboard = {
  shopName: string;
  paymentsLive: boolean;
  counts: {
    pendingPayment: number;
    awaitingSlip: number;
    paid: number;
    packing: number;
    shipped: number;
    open: number;
    wholesaleNew: number;
  };
  todayRevenue: number;
  monthRevenue: number;
  orderCount: number;
  wholesaleCount: number;
  recentWholesale: WholesaleLead[];
  lowStock: Product[];
  recent: AdminOrderRow[];
};

export type { SiteSettings, WholesaleLead };
