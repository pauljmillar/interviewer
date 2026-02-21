import ReviewResponsesDetail from '@/components/ReviewResponsesDetail';

export default async function AdminInstanceResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReviewResponsesDetail instanceId={id} />;
}
