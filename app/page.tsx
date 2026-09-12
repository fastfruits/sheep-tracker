import { getCurrentUser } from '@/lib/data/posts';
import { ReportForm } from '@/components/report-form';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Report an escaped animal</h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        Farmers are alerted automatically when your description matches one of
        their registered animals.
      </p>
      <div className="mt-6 sm:mt-8">
        <ReportForm signedIn={!!user} />
      </div>
    </div>
  );
}
