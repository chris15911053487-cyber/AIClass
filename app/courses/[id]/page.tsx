import Platform from '../../platform';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Platform route="/courses" id={id} />;
}
