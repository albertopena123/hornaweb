import type { Metadata } from "next";
import PhotoFrameClient from "./PhotoFrameClient";

export const metadata: Metadata = {
  title: "Tu foto con marco · Ahora Nación",
  description: "Súmate a la campaña: ponle el marco oficial de Ahora Nación a tu foto y compártela.",
};

export default function Page() {
  return <PhotoFrameClient />;
}
