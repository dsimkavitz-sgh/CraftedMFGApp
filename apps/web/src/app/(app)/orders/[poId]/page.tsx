import { OrderDetailPage } from "@/components/pages/OrderDetailPage";

export const metadata = { title: "Purchase order" };

export default async function Page({ params }: { params: Promise<{ poId: string }> }) {
  const { poId } = await params;
  return <OrderDetailPage poId={poId} />;
}
