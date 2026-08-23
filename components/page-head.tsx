import Head from 'expo-router/head';

const SUFFIX = 'SheepFinder';

/**
 * Per-route document title and description for the web build.
 *
 * `expo-router/head` renders nothing on native, so this is safe to mount from
 * shared screens. Without it every statically-exported page ships an empty
 * `<title>`, which is poor for both search results and browser tabs.
 */
export function PageHead({ title, description }: { title?: string; description?: string }) {
  return (
    <Head>
      <title>{title ? `${title} · ${SUFFIX}` : SUFFIX}</title>
      {!!description && <meta name="description" content={description} />}
      {!!description && <meta property="og:description" content={description} />}
      <meta property="og:title" content={title ? `${title} · ${SUFFIX}` : SUFFIX} />
    </Head>
  );
}
