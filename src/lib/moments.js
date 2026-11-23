export function normalizeMoment(item, currentUserId) {
  const imageUrls = Array.isArray(item.image_urls) && item.image_urls.length > 0
    ? item.image_urls
    : Array.isArray(item.imageUrls) && item.imageUrls.length > 0
      ? item.imageUrls
      : item.image_url ? [item.image_url] : [];
  const likedByUser = Array.isArray(item.moment_likes)
    ? item.moment_likes.some((like) => (typeof like === 'string' ? like : like.user_id) === currentUserId)
    : Boolean(item.isLiked);

  return {
    id: item.id,
    userId: item.user_id || item.userId,
    userName: item.profile?.full_name || item.userName || 'Campus Student',
    userCollege: item.profile?.college_name || item.userCollege || '',
    userRole: item.userRole || 'STUDENT',
    eventTitle: item.events?.title || item.eventTitle || 'Campus Moment',
    caption: item.caption || '',
    imageUrls,
    storagePath: item.storage_path || '',
    likesCount: Number(item.likes_count ?? item.likesCount ?? 0),
    isLiked: likedByUser,
    createdAt: item.created_at || item.createdAt || new Date().toISOString(),
  };
}
