import { StyleDetailPage } from "@/components/pages/StyleDetailPage";

export const metadata = { title: "Style" };

export default async function Page({ params }: { params: Promise<{ styleId: string }> }) {
  const { styleId } = await params;
  return <StyleDetailPage styleId={styleId} />;
}
