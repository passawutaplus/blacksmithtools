import { completeThaiAddress } from "./thai-address";

const KEY = "bs-checkout-profile";

export type SavedCheckoutAddress = {
  fullName: string;
  phone: string;
  email: string;
  line1: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  customerNote: string;
};

export type SavedCheckoutBilling = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  taxId: string;
};

export type CheckoutProfile = {
  address: SavedCheckoutAddress;
  billing?: SavedCheckoutBilling;
  wantReceipt: boolean;
};

function blankAddress(): SavedCheckoutAddress {
  return {
    fullName: "",
    phone: "",
    email: "",
    line1: "",
    subdistrict: "",
    district: "",
    province: "",
    postalCode: "",
    customerNote: "",
  };
}

export function readCheckoutProfile(): CheckoutProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutProfile;
    if (!parsed?.address) return null;
    const address = { ...blankAddress(), ...parsed.address };
    const billing = parsed.billing
      ? {
          ...parsed.billing,
          ...completeThaiAddress({
            province: parsed.billing.province,
            district: parsed.billing.district,
            subdistrict: parsed.billing.subdistrict ?? "",
            postalCode: parsed.billing.postalCode,
          }),
        }
      : undefined;
    return {
      address: {
        ...address,
        ...completeThaiAddress({
          province: address.province,
          district: address.district,
          subdistrict: address.subdistrict,
          postalCode: address.postalCode,
        }),
      },
      billing,
      wantReceipt: Boolean(parsed.wantReceipt),
    };
  } catch {
    return null;
  }
}

export function saveCheckoutProfile(profile: CheckoutProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // private mode / quota
  }
}
