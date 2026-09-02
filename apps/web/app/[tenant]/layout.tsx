import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { resolveTenantFromParam } from '@/lib/tenant';

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantParam } = await params;
  const tenant = await resolveTenantFromParam(tenantParam);

  if (!tenant) notFound();

  const brandPrimary = tenant.brandPrimaryColor || '#10b981';
  const brandFont = tenant.brandFontFamily || "'Inter', ui-sans-serif, system-ui, sans-serif";

  return (
    <>
      {/* Dynamic runtime CSS injection for this tenant's logo/brand/font — no rebuild or redeploy per white-label tenant. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `:root { --tenant-brand-primary: ${brandPrimary}; --tenant-brand-font: ${brandFont}; }`,
        }}
      />
      {children}
    </>
  );
}
