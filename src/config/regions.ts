/**
 * States/provinces and postcode formats for countries we can validate.
 * Other countries get a free-text state and a lenient postcode check.
 */
export interface RegionInfo {
  states: string[];
  postcode: RegExp;
  /** Example shown in the error message. */
  postcodeExample: string;
}

export const REGIONS: Record<string, RegionInfo> = {
  IN: {
    states: [
      "Andhra Pradesh",
      "Assam",
      "Bihar",
      "Delhi",
      "Goa",
      "Gujarat",
      "Haryana",
      "Karnataka",
      "Kerala",
      "Madhya Pradesh",
      "Maharashtra",
      "Odisha",
      "Punjab",
      "Rajasthan",
      "Tamil Nadu",
      "Telangana",
      "Uttar Pradesh",
      "West Bengal",
    ],
    postcode: /^[1-9]\d{5}$/,
    postcodeExample: "400001",
  },
  BD: {
    states: ["Barishal", "Chattogram", "Dhaka", "Khulna", "Mymensingh", "Rajshahi", "Rangpur", "Sylhet"],
    postcode: /^\d{4}$/,
    postcodeExample: "1212",
  },
  VN: {
    states: [
      "Hà Nội",
      "Hồ Chí Minh City",
      "Đà Nẵng",
      "Hải Phòng",
      "Cần Thơ",
      "Khánh Hòa",
      "Bình Dương",
      "Đồng Nai",
    ],
    postcode: /^\d{6}$/,
    postcodeExample: "700000",
  },
  AE: {
    states: ["Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah", "Umm Al Quwain"],
    // UAE has no postcodes in general use.
    postcode: /^$|^\d{1,6}$/,
    postcodeExample: "",
  },
  GB: {
    states: ["England", "Northern Ireland", "Scotland", "Wales"],
    postcode: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    postcodeExample: "SW1A 1AA",
  },
};

export const GENERIC_POSTCODE = /^[A-Za-z0-9 -]{0,12}$/;

export function validPostcode(country: string, postcode: string): boolean {
  const info = REGIONS[country];
  if (!postcode) return true;
  return (info?.postcode ?? GENERIC_POSTCODE).test(postcode.trim());
}
