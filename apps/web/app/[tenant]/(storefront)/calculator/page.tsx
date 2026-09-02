import { CalculatorClient } from './CalculatorClient';

export default async function CalculatorPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return <CalculatorClient tenantSlug={tenant} />;
}
