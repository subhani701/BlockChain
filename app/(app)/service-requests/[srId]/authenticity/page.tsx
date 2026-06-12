import { SrAuthenticityScreen } from '@/components/skf/sr-authenticity-screen';

export default async function SrAuthenticityPage({ params }: { params: Promise<{ srId: string }> }) {
  const { srId } = await params;
  return <SrAuthenticityScreen srId={srId} />;
}
