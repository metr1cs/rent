const apiBase = (process.env.API_BASE_URL || "http://localhost:8090").replace(/\/+$/, "");

async function jsonFetch(url, init = {}) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const health = await jsonFetch(`${apiBase}/health`);
  assert(health.ok, "API health failed");

  const venues = await jsonFetch(`${apiBase}/api/venues`);
  assert(venues.ok && Array.isArray(venues.data) && venues.data.length > 0, "No venues");
  const venue = venues.data[0];

  const leadPayload = {
    name: "Smoke Tester",
    phone: "+79991234567",
    comment: "Smoke flow for verified review"
  };
  const lead = await jsonFetch(`${apiBase}/api/venues/${encodeURIComponent(venue.id)}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leadPayload)
  });
  assert(lead.ok, "Failed to create lead request");

  const ownerRequests = await jsonFetch(`${apiBase}/api/owner/requests?ownerId=${encodeURIComponent(venue.ownerId)}`);
  assert(ownerRequests.ok, "Failed to fetch owner requests");
  const createdRequest = ownerRequests.data.find((item) => item.phone === leadPayload.phone && item.venueId === venue.id);
  assert(createdRequest, "Lead request not found in owner queue");

  const confirm = await jsonFetch(`${apiBase}/api/owner/requests/${encodeURIComponent(createdRequest.id)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId: venue.ownerId, status: "confirmed" })
  });
  assert(confirm.ok, "Failed to confirm lead request");

  const review = await jsonFetch(`${apiBase}/api/venues/${encodeURIComponent(venue.id)}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      author: "Smoke Tester",
      requesterName: "Smoke Tester",
      requesterPhone: "+79991234567",
      rating: 4,
      text: "Подтверждаю бронирование. Площадка соответствует описанию и требованиям мероприятия."
    })
  });
  assert(review.ok, "Failed to create verified review");
  assert(review.data?.review?.verified === true, "Review is not verified");

  const visibleReviews = await jsonFetch(`${apiBase}/api/venues/${encodeURIComponent(venue.id)}/reviews`);
  assert(visibleReviews.ok, "Failed to fetch venue reviews");
  const createdReview = visibleReviews.data.find((item) => item.id === review.data.review.id);
  assert(createdReview, "Published review is not visible on public endpoint");

  console.log("Smoke OK:");
  console.log(`- venue: ${venue.id}`);
  console.log(`- lead confirmed: ${createdRequest.id}`);
  console.log(`- review: ${review.data.review.id} (${review.data.review.status})`);
}

main().catch((error) => {
  console.error("Smoke FAIL:", error.message);
  process.exit(1);
});
