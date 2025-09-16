import UserSearchClient from './UserSearchClient';

export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <main style={{ padding: '40px 16px', maxWidth: 960, margin: '0 auto' }}>
      <UserSearchClient />
    </main>
  );
}
