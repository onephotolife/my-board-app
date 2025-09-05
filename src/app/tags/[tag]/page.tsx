import { normalizeTag } from '@/app/utils/hashtag';

import TagDetailClient from './TagDetailClient';

export default async function TagPage({ params }: { params: { tag: string } }) {
  const key = normalizeTag(decodeURIComponent(params.tag));
  return <TagDetailClient tagKey={key} />;
}
