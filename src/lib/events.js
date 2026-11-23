export function toUiEvent(event) {
  const college = Array.isArray(event.colleges) ? event.colleges[0] : event.colleges;
  const category = Array.isArray(event.categories) ? event.categories[0] : event.categories;

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    description: event.description,
    collegeId: event.college_id,
    collegeName: college?.name || 'Campus',
    collegeCode: college?.code || '',
    categoryId: event.category_id,
    categoryName: category?.name || 'Campus Event',
    subcategory: event.subcategory || '',
    startDate: event.start_date,
    endDate: event.end_date,
    startTime: event.start_time,
    endTime: event.end_time,
    venue: event.venue,
    city: event.city,
    address: event.address || '',
    latitude: event.latitude,
    longitude: event.longitude,
    coverImage: event.cover_image || '',
    registrationDeadline: event.registration_deadline,
    maxCapacity: event.max_capacity,
    registrationsCount: event.registrations_count || 0,
    isPaid: event.is_paid,
    feeInr: Number(event.fee_inr || 0),
    status: event.status,
    isFeatured: event.is_featured,
    rejectionReason: event.review_note || event.rejection_reason || '',
    organizerName: event.profiles?.full_name || '',
    organizerEmail: event.profiles?.email || '',
  };
}
