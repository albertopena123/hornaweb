import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string }>;
}) {
  const params = await searchParams;
  const query = params.mesa ? `?mesa=${encodeURIComponent(params.mesa)}` : "";
  redirect(`/actas${query}`);
}
