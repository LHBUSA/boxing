import { ImageResponse } from "next/og";
import { BrandShare, SHARE_SIZE } from "@/components/ShareCard";

export const size = SHARE_SIZE;
export const contentType = "image/png";
export const alt = "PropBetEdge Boxing: fight intelligence";

export default function OG() {
  return new ImageResponse(<BrandShare />, size);
}
