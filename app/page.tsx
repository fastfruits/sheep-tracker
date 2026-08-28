import { getCurrentUser } from '@/lib/data/posts';
import { ReportForm } from '@/components/report-form';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Report an escaped animal</h1>
      <p className="mt-2 text-muted-foreground">
        Farmers are alerted automatically when your description matches one of
        their registered animals.
      </p>
      <div className="mt-8">
        <ReportForm signedIn={!!user} />
      </div>
    </div>
  );
}
