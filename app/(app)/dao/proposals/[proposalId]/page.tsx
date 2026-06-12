import { DaoProposalScreen } from '@/components/skf/dao-proposal-screen';

export default async function DaoProposalPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  return <DaoProposalScreen proposalId={proposalId} />;
}
