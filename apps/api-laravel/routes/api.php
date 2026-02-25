<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

if (!function_exists('api_now_iso')) {
    function api_now_iso(): string
    {
        return now()->toIso8601String();
    }
}

if (!function_exists('api_next_external_id')) {
    function api_next_external_id(string $table, string $prefix): string
    {
        $next = ((int) DB::table($table)->max('id')) + 1;
        return "{$prefix}{$next}";
    }
}

if (!function_exists('api_normalize_phone')) {
    function api_normalize_phone(string $value): string
    {
        return preg_replace('/[^\d+]/', '', $value) ?? '';
    }
}

if (!function_exists('api_owner_payload')) {
    function api_owner_payload(object $row): array
    {
        return [
            'id' => $row->external_id,
            'name' => $row->name,
            'email' => $row->email,
            'createdAt' => (string) $row->created_at,
            'trialEndsAt' => (string) $row->trial_ends_at,
            'trialStatus' => $row->trial_status,
            'subscriptionStatus' => $row->subscription_status,
            'subscriptionPlan' => $row->subscription_plan,
            'nextBillingDate' => $row->next_billing_date,
        ];
    }
}

if (!function_exists('api_venue_payload')) {
    function api_venue_payload(object $row): array
    {
        return [
            'id' => $row->external_id,
            'ownerId' => $row->owner_external_id,
            'title' => $row->title,
            'region' => $row->region,
            'city' => $row->city,
            'address' => $row->address,
            'category' => $row->category,
            'capacity' => (int) $row->capacity,
            'areaSqm' => (int) $row->area_sqm,
            'pricePerHour' => (int) $row->price_per_hour,
            'description' => $row->description,
            'amenities' => json_decode((string) $row->amenities_json, true) ?: [],
            'images' => json_decode((string) $row->images_json, true) ?: [],
            'nextAvailableDates' => json_decode((string) $row->next_available_dates_json, true) ?: [],
            'rating' => (float) $row->rating,
            'reviewsCount' => (int) $row->reviews_count,
            'instantBooking' => (bool) $row->instant_booking,
            'metroMinutes' => (int) $row->metro_minutes,
            'cancellationPolicy' => $row->cancellation_policy,
            'phone' => $row->phone,
            'isPublished' => (bool) $row->is_published,
        ];
    }
}

if (!function_exists('api_require_admin')) {
    function api_require_admin(Request $request): ?object
    {
        $token = (string) ($request->header('x-admin-session') ?? '');
        if (!$token) {
            return null;
        }
        return DB::table('admin_sessions')
            ->where('token', $token)
            ->where('expires_at', '>', now())
            ->first();
    }
}

if (!function_exists('api_refresh_venue_rating_by_internal_id')) {
    function api_refresh_venue_rating_by_internal_id(int $venueId): void
    {
        $rows = DB::table('reviews')
            ->where('venue_id', $venueId)
            ->where('verified', 1)
            ->where('status', 'published')
            ->get();

        if ($rows->count() === 0) {
            DB::table('venues')->where('id', $venueId)->update([
                'rating' => 0,
                'reviews_count' => 0,
                'updated_at' => now(),
            ]);
            return;
        }

        $avg = round($rows->avg('rating'), 1);
        DB::table('venues')->where('id', $venueId)->update([
            'rating' => $avg,
            'reviews_count' => $rows->count(),
            'updated_at' => now(),
        ]);
    }
}

Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'vmestoru-api-laravel']));

Route::get('/categories', function () {
    return response()->json(
        DB::table('categories')
            ->orderBy('id')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->external_id,
                'name' => $row->name,
                'featured' => (bool) $row->featured,
            ])
            ->values()
    );
});

Route::get('/home/featured-categories', function () {
    $categories = DB::table('categories')->where('featured', 1)->orderBy('id')->get();
    $venues = DB::table('venues as v')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('v.is_published', 1)
        ->select('v.*', 'o.external_id as owner_external_id')
        ->orderByDesc('v.rating')
        ->get();

    $result = $categories->map(function ($category) use ($venues) {
        $forCategory = $venues->filter(fn ($venue) => $venue->category === $category->name)->take(8)->values();
        return [
            'id' => $category->external_id,
            'name' => $category->name,
            'featured' => true,
            'venues' => $forCategory->map(fn ($item) => api_venue_payload($item))->values(),
        ];
    })->values();

    return response()->json($result);
});

Route::get('/venues', function (Request $request) {
    $query = DB::table('venues as v')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('v.is_published', 1)
        ->select('v.*', 'o.external_id as owner_external_id');

    if ($request->filled('q')) {
        $term = mb_strtolower((string) $request->query('q'));
        $query->whereRaw('LOWER(CONCAT(v.title, " ", v.description, " ", v.category)) LIKE ?', ["%{$term}%"]);
    }
    if ($request->filled('category')) $query->where('v.category', (string) $request->query('category'));
    if ($request->filled('region')) $query->where('v.region', (string) $request->query('region'));
    if ($request->filled('date')) $query->where('v.next_available_dates_json', 'like', '%"'.(string) $request->query('date').'"%');
    if ($request->filled('capacity')) $query->where('v.capacity', '>=', (int) $request->query('capacity'));
    if ($request->filled('areaMin')) $query->where('v.area_sqm', '>=', (int) $request->query('areaMin'));
    if ($request->filled('priceMax')) $query->where('v.price_per_hour', '<=', (int) $request->query('priceMax'));
    if ($request->boolean('instant')) $query->where('v.instant_booking', 1);
    if ($request->boolean('parking')) $query->where('v.amenities_json', 'like', '%Парковка%');
    if ($request->boolean('stage')) $query->where('v.amenities_json', 'like', '%Сцена%');
    if ($request->boolean('late')) $query->where('v.cancellation_policy', 'like', '%72%');

    $sort = (string) ($request->query('sort') ?? 'recommended');
    if ($sort === 'price_asc') $query->orderBy('v.price_per_hour');
    if ($sort === 'price_desc') $query->orderByDesc('v.price_per_hour');
    if ($sort === 'rating_desc') $query->orderByDesc('v.rating');
    if ($sort === 'recommended') $query->orderByRaw('(v.rating * 1.2 + v.reviews_count * 0.02) DESC');

    $rows = $query->get()->map(fn ($row) => api_venue_payload($row))->values();
    return response()->json($rows);
});

Route::get('/venues/{id}', function (string $id) {
    $row = DB::table('venues as v')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('v.external_id', $id)
        ->where('v.is_published', 1)
        ->select('v.*', 'o.external_id as owner_external_id')
        ->first();
    if (!$row) return response()->json(['message' => 'Venue not found'], 404);
    return response()->json(api_venue_payload($row));
});

Route::get('/venues/{id}/similar', function (string $id) {
    $venue = DB::table('venues')->where('external_id', $id)->first();
    if (!$venue) return response()->json(['message' => 'Venue not found'], 404);

    $rows = DB::table('venues as v')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('v.is_published', 1)
        ->where('v.external_id', '!=', $id)
        ->where(function ($q) use ($venue) {
            $q->where('v.category', $venue->category)->orWhere('v.region', $venue->region);
        })
        ->orderByRaw('(CASE WHEN v.category = ? THEN 3 ELSE 0 END + CASE WHEN v.region = ? THEN 2 ELSE 0 END + v.rating) DESC', [$venue->category, $venue->region])
        ->limit(8)
        ->select('v.*', 'o.external_id as owner_external_id')
        ->get();

    return response()->json($rows->map(fn ($row) => api_venue_payload($row))->values());
});

Route::get('/venues/{id}/reviews', function (string $id) {
    $venue = DB::table('venues')->where('external_id', $id)->first();
    if (!$venue) return response()->json(['message' => 'Venue not found'], 404);
    $rows = DB::table('reviews')
        ->where('venue_id', $venue->id)
        ->where('status', 'published')
        ->orderByDesc('created_at')
        ->get()
        ->map(fn ($row) => [
            'id' => $row->external_id,
            'venueId' => $id,
            'author' => $row->author,
            'rating' => (int) $row->rating,
            'text' => $row->text,
            'requesterName' => $row->requester_name,
            'requesterPhone' => $row->requester_phone,
            'sourceLeadRequestId' => $row->source_lead_request_id,
            'verified' => (bool) $row->verified,
            'status' => $row->status,
            'riskScore' => (int) $row->risk_score,
            'riskFlags' => json_decode((string) $row->risk_flags_json, true) ?: [],
            'createdAt' => (string) $row->created_at,
        ])->values();
    return response()->json($rows);
});

Route::post('/venues/{id}/reviews', function (Request $request, string $id) {
    $venue = DB::table('venues')->where('external_id', $id)->first();
    if (!$venue) return response()->json(['message' => 'Venue not found'], 404);

    $data = Validator::validate($request->all(), [
        'author' => 'required|string|min:2|max:120',
        'requesterName' => 'required|string|min:2|max:120',
        'requesterPhone' => 'required|string|min:6|max:60',
        'rating' => 'required|integer|min:1|max:5',
        'text' => 'required|string|min:4|max:600',
    ]);

    $phone = str_replace([' ', '(', ')', '-'], '', $data['requesterPhone']);
    $confirmedLead = DB::table('lead_requests')
        ->where('venue_id', $venue->id)
        ->where('status', 'confirmed')
        ->whereRaw('LOWER(name) = ?', [mb_strtolower($data['requesterName'])])
        ->whereRaw('REPLACE(REPLACE(REPLACE(REPLACE(phone, " ", ""), "(", ""), ")", ""), "-", "") = ?', [$phone])
        ->first();
    if (!$confirmedLead) {
        return response()->json(['message' => 'Отзыв доступен только после подтвержденной заявки на площадку'], 403);
    }

    $externalId = api_next_external_id('reviews', 'R-');
    $now = now();
    $riskScore = mb_strlen(trim($data['text'])) < 20 ? 60 : 10;
    $status = $riskScore >= 60 ? 'pending' : 'published';
    $riskFlags = $riskScore >= 60 ? ['very_short_text'] : [];

    DB::table('reviews')->insert([
        'external_id' => $externalId,
        'venue_id' => $venue->id,
        'author' => $data['author'],
        'rating' => (int) $data['rating'],
        'text' => $data['text'],
        'requester_name' => $data['requesterName'],
        'requester_phone' => $data['requesterPhone'],
        'source_lead_request_id' => $confirmedLead->external_id,
        'verified' => 1,
        'status' => $status,
        'risk_score' => $riskScore,
        'risk_flags_json' => json_encode($riskFlags, JSON_UNESCAPED_UNICODE),
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    api_refresh_venue_rating_by_internal_id((int) $venue->id);

    return response()->json([
        'review' => [
            'id' => $externalId,
            'venueId' => $id,
            'author' => $data['author'],
            'rating' => (int) $data['rating'],
            'text' => $data['text'],
            'requesterName' => $data['requesterName'],
            'requesterPhone' => $data['requesterPhone'],
            'sourceLeadRequestId' => $confirmedLead->external_id,
            'verified' => true,
            'status' => $status,
            'riskScore' => $riskScore,
            'riskFlags' => $riskFlags,
            'createdAt' => $now->toIso8601String(),
        ],
        'moderation' => [
            'status' => $status,
            'riskScore' => $riskScore,
            'riskFlags' => $riskFlags,
        ],
    ], 201);
});

Route::post('/venues/{id}/requests', function (Request $request, string $id) {
    $venue = DB::table('venues')->where('external_id', $id)->first();
    if (!$venue) return response()->json(['message' => 'Venue not found'], 404);

    $data = Validator::validate($request->all(), [
        'name' => 'required|string|min:2|max:120',
        'phone' => 'required|string|min:6|max:60',
        'comment' => 'nullable|string|max:800',
    ]);

    $duplicate = DB::table('lead_requests')
        ->where('venue_id', $venue->id)
        ->whereIn('status', ['new', 'in_progress', 'call_scheduled'])
        ->where('phone', $data['phone'])
        ->where('created_at', '>', now()->subMinutes(20))
        ->exists();
    if ($duplicate) {
        return response()->json(['message' => 'Заявка на эту площадку уже отправлена недавно.'], 409);
    }

    $externalId = api_next_external_id('lead_requests', 'L-');
    $now = now();
    DB::table('lead_requests')->insert([
        'external_id' => $externalId,
        'venue_id' => $venue->id,
        'name' => $data['name'],
        'phone' => $data['phone'],
        'comment' => $data['comment'] ?? '',
        'status' => 'new',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    return response()->json([
        'message' => 'Заявка отправлена арендодателю',
        'request' => [
            'id' => $externalId,
            'venueId' => $id,
            'name' => $data['name'],
            'phone' => $data['phone'],
            'comment' => $data['comment'] ?? '',
            'status' => 'new',
            'createdAt' => $now->toIso8601String(),
            'updatedAt' => $now->toIso8601String(),
        ],
    ], 201);
});

Route::post('/analytics/event', function (Request $request) {
    $data = Validator::validate($request->all(), [
        'event' => 'required|string|in:home_view,catalog_view,category_open,category_filter_apply,venue_view,lead_submit,owner_register,owner_login',
        'meta' => 'nullable|array',
    ]);
    DB::table('analytics_events')->insert([
        'external_id' => api_next_external_id('analytics_events', 'AE-'),
        'event_name' => $data['event'],
        'meta_json' => json_encode($data['meta'] ?? [], JSON_UNESCAPED_UNICODE),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    return response()->json(['ok' => true], 201);
});

Route::post('/monitor/frontend-error', function (Request $request) {
    Validator::validate($request->all(), [
        'path' => 'required|string|max:400',
        'message' => 'required|string|max:1500',
        'source' => 'nullable|string|max:120',
    ]);
    logger()->warning('frontend-error', $request->all());
    return response()->json(['ok' => true], 201);
});

Route::post('/support/requests', function (Request $request) {
    $input = $request->all();
    $message = trim((string) ($input['message'] ?? $input['text'] ?? $input['comment'] ?? ''));
    if ($message === '') return response()->json(['message' => 'Добавьте текст обращения в поддержку.'], 400);

    $payload = Validator::validate([
        'name' => $input['name'] ?? 'Пользователь',
        'phone' => $input['phone'] ?? 'не указан',
        'message' => $message,
        'page' => $input['page'] ?? '-',
    ], [
        'name' => 'required|string|min:1|max:120',
        'phone' => 'required|string|max:60',
        'message' => 'required|string|min:1|max:2000',
        'page' => 'required|string|max:400',
    ]);

    $externalId = api_next_external_id('support_requests', 'SR-');
    $now = now();
    DB::table('support_requests')->insert([
        'external_id' => $externalId,
        'name' => $payload['name'],
        'phone' => $payload['phone'],
        'message' => $payload['message'],
        'page' => $payload['page'],
        'status' => 'new',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    return response()->json(['message' => 'Запрос отправлен в поддержку.', 'requestId' => $externalId], 201);
});

Route::post('/owner/register', function (Request $request) {
    $data = Validator::validate($request->all(), [
        'name' => 'required|string|min:2|max:120',
        'email' => 'required|email|max:190',
        'password' => 'required|string|min:6|max:190',
    ]);

    $exists = DB::table('owners')->whereRaw('LOWER(email) = ?', [mb_strtolower($data['email'])])->exists();
    if ($exists) return response()->json(['message' => 'Email already exists'], 409);

    $externalId = api_next_external_id('owners', 'O-');
    DB::table('owners')->insert([
        'external_id' => $externalId,
        'name' => $data['name'],
        'email' => $data['email'],
        'password_hash' => Hash::make($data['password']),
        'trial_ends_at' => now()->addDays(90)->toDateString(),
        'trial_status' => 'active',
        'subscription_status' => 'inactive',
        'subscription_plan' => 'monthly_2000',
        'next_billing_date' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $owner = DB::table('owners')->where('external_id', $externalId)->first();
    return response()->json(['owner' => api_owner_payload($owner)], 201);
});

Route::post('/owner/login', function (Request $request) {
    $data = Validator::validate($request->all(), [
        'email' => 'required|email|max:190',
        'password' => 'required|string|min:6|max:190',
    ]);

    $owner = DB::table('owners')->whereRaw('LOWER(email) = ?', [mb_strtolower($data['email'])])->first();
    if (!$owner || !Hash::check($data['password'], $owner->password_hash)) {
        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    return response()->json(['owner' => api_owner_payload($owner)]);
});

Route::post('/owner/subscription/checkout', function (Request $request) {
    $data = Validator::validate($request->all(), [
        'ownerId' => 'required|string|min:2',
    ]);
    $owner = DB::table('owners')->where('external_id', $data['ownerId'])->first();
    if (!$owner) return response()->json(['message' => 'Owner not found'], 404);

    $nextBillingDate = now()->addDays(30)->toDateString();
    DB::table('owners')->where('id', $owner->id)->update([
        'subscription_status' => 'active',
        'next_billing_date' => $nextBillingDate,
        'updated_at' => now(),
    ]);

    return response()->json([
        'message' => 'Подписка активирована',
        'ownerId' => $data['ownerId'],
        'amountRub' => 2000,
        'periodDays' => 30,
        'nextBillingDate' => $nextBillingDate,
        'paymentMode' => 'mock',
    ]);
});

Route::get('/owner/subscription/status', function (Request $request) {
    $ownerId = (string) ($request->query('ownerId') ?? '');
    $owner = DB::table('owners')->where('external_id', $ownerId)->first();
    if (!$owner) return response()->json(['message' => 'Owner not found'], 404);

    return response()->json([
        'ownerId' => $ownerId,
        'status' => $owner->subscription_status,
        'trialStatus' => $owner->trial_status,
        'trialEndsAt' => (string) $owner->trial_ends_at,
        'trialDaysLeft' => max(0, now()->diffInDays($owner->trial_ends_at, false)),
        'nextBillingDate' => $owner->next_billing_date,
        'plan' => $owner->subscription_plan,
        'amountRub' => 2000,
    ]);
});

Route::get('/owner/profile', function (Request $request) {
    $ownerId = (string) ($request->query('ownerId') ?? '');
    if ($ownerId === '') return response()->json(['message' => 'ownerId is required'], 400);
    $owner = DB::table('owners')->where('external_id', $ownerId)->first();
    if (!$owner) return response()->json(['message' => 'Owner not found'], 404);
    return response()->json(['owner' => api_owner_payload($owner)]);
});

Route::get('/owner/venues', function (Request $request) {
    $ownerId = (string) ($request->query('ownerId') ?? '');
    $rows = DB::table('venues as v')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('o.external_id', $ownerId)
        ->select('v.*', 'o.external_id as owner_external_id')
        ->orderByDesc('v.id')
        ->get();
    return response()->json($rows->map(fn ($row) => api_venue_payload($row))->values());
});

Route::get('/owner/dashboard', function (Request $request) {
    $ownerId = (string) ($request->query('ownerId') ?? '');
    $owner = DB::table('owners')->where('external_id', $ownerId)->first();
    if (!$owner) return response()->json(['message' => 'Owner not found'], 404);

    $ownerVenueIds = DB::table('venues as v')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('o.external_id', $ownerId)
        ->pluck('v.id');
    $ownerVenuesCount = $ownerVenueIds->count();
    $ownerRequests = DB::table('lead_requests')->whereIn('venue_id', $ownerVenueIds)->get();

    $confirmed = $ownerRequests->where('status', 'confirmed')->count();
    return response()->json([
        'ownerId' => $ownerId,
        'trial' => [
            'status' => $owner->trial_status,
            'endsAt' => (string) $owner->trial_ends_at,
            'daysLeft' => max(0, now()->diffInDays($owner->trial_ends_at, false)),
        ],
        'metrics' => [
            'venuesTotal' => $ownerVenuesCount,
            'leadsTotal' => $ownerRequests->count(),
            'confirmedTotal' => $confirmed,
            'conversionRate' => $ownerRequests->count() ? round($confirmed * 100 / $ownerRequests->count(), 1) : 0,
            'viewsMock' => $ownerVenuesCount * 137 + 420,
        ],
    ]);
});

Route::get('/owner/requests', function (Request $request) {
    $ownerId = (string) ($request->query('ownerId') ?? '');
    if ($ownerId === '') return response()->json(['message' => 'ownerId is required'], 400);

    $rows = DB::table('lead_requests as r')
        ->join('venues as v', 'v.id', '=', 'r.venue_id')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('o.external_id', $ownerId)
        ->select('r.*', 'v.title as venue_title', 'v.address as venue_address', 'v.external_id as venue_external_id')
        ->orderByDesc('r.created_at')
        ->get()
        ->map(function ($row) {
            $ageMinutes = now()->diffInMinutes($row->created_at);
            return [
                'id' => $row->external_id,
                'venueId' => $row->venue_external_id,
                'name' => $row->name,
                'phone' => $row->phone,
                'comment' => $row->comment,
                'status' => $row->status,
                'createdAt' => (string) $row->created_at,
                'updatedAt' => (string) $row->updated_at,
                'venueTitle' => $row->venue_title,
                'venueAddress' => $row->venue_address,
                'responseSlaMinutes' => 30,
                'ageMinutes' => $ageMinutes,
                'isSlaBreached' => $row->status === 'new' && $ageMinutes > 30,
            ];
        })->values();

    return response()->json($rows);
});

Route::post('/owner/requests/{id}/status', function (Request $request, string $id) {
    $data = Validator::validate($request->all(), [
        'ownerId' => 'required|string|min:2',
        'status' => 'required|string|in:new,in_progress,call_scheduled,confirmed,rejected',
    ]);

    $lead = DB::table('lead_requests as r')
        ->join('venues as v', 'v.id', '=', 'r.venue_id')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('r.external_id', $id)
        ->where('o.external_id', $data['ownerId'])
        ->select('r.id')
        ->first();
    if (!$lead) return response()->json(['message' => 'Request not found'], 404);

    DB::table('lead_requests')->where('id', $lead->id)->update([
        'status' => $data['status'],
        'updated_at' => now(),
    ]);

    return response()->json(['message' => 'Статус обновлен']);
});

Route::post('/owner/venues', function (Request $request) {
    $data = Validator::validate($request->all(), [
        'ownerId' => 'required|string|min:2',
        'title' => 'required|string|min:2|max:255',
        'region' => 'required|string|min:2|max:255',
        'city' => 'required|string|min:2|max:255',
        'address' => 'required|string|min:2|max:500',
        'category' => 'required|string|min:2|max:255',
        'capacity' => 'required|integer|min:1',
        'areaSqm' => 'required|integer|min:1',
        'pricePerHour' => 'required|integer|min:1',
        'description' => 'required|string|min:10|max:4000',
        'amenities' => 'required',
        'images' => 'required|array|min:3|max:20',
    ]);

    $owner = DB::table('owners')->where('external_id', $data['ownerId'])->first();
    if (!$owner) return response()->json(['message' => 'Owner not found'], 404);

    $amenities = $data['amenities'];
    if (!is_array($amenities)) {
        $amenities = array_values(array_filter(array_map('trim', explode(',', (string) $amenities))));
    }
    if (count($amenities) < 2) return response()->json(['message' => 'Укажите минимум 2 удобства'], 400);

    $externalId = api_next_external_id('venues', 'V-OWN-');
    DB::table('venues')->insert([
        'external_id' => $externalId,
        'owner_id' => $owner->id,
        'title' => $data['title'],
        'region' => $data['region'],
        'city' => $data['city'],
        'address' => $data['address'],
        'category' => $data['category'],
        'capacity' => (int) $data['capacity'],
        'area_sqm' => (int) $data['areaSqm'],
        'price_per_hour' => (int) $data['pricePerHour'],
        'description' => $data['description'],
        'amenities_json' => json_encode(array_values($amenities), JSON_UNESCAPED_UNICODE),
        'images_json' => json_encode(array_values($data['images']), JSON_UNESCAPED_UNICODE),
        'next_available_dates_json' => json_encode([now()->addDay()->toDateString()]),
        'rating' => 0,
        'reviews_count' => 0,
        'instant_booking' => 0,
        'metro_minutes' => 10,
        'cancellation_policy' => 'Бесплатная отмена за 48 часов',
        'phone' => '+7 (995) 592-62-60',
        'is_published' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $row = DB::table('venues as v')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('v.external_id', $externalId)
        ->select('v.*', 'o.external_id as owner_external_id')
        ->first();

    return response()->json(api_venue_payload($row), 201);
});

Route::patch('/owner/venues/{id}', function (Request $request, string $id) {
    $data = Validator::validate($request->all(), [
        'ownerId' => 'required|string|min:2',
        'title' => 'required|string|min:2|max:255',
        'region' => 'required|string|min:2|max:255',
        'city' => 'required|string|min:2|max:255',
        'address' => 'required|string|min:2|max:500',
        'category' => 'required|string|min:2|max:255',
        'capacity' => 'required|integer|min:1',
        'areaSqm' => 'required|integer|min:1',
        'pricePerHour' => 'required|integer|min:1',
        'description' => 'required|string|min:10|max:4000',
        'amenities' => 'required',
        'images' => 'required|array|min:3|max:20',
    ]);

    $venue = DB::table('venues as v')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('v.external_id', $id)
        ->where('o.external_id', $data['ownerId'])
        ->select('v.id')
        ->first();
    if (!$venue) return response()->json(['message' => 'Venue not found'], 404);

    $amenities = is_array($data['amenities']) ? $data['amenities'] : array_filter(array_map('trim', explode(',', (string) $data['amenities'])));
    DB::table('venues')->where('id', $venue->id)->update([
        'title' => $data['title'],
        'region' => $data['region'],
        'city' => $data['city'],
        'address' => $data['address'],
        'category' => $data['category'],
        'capacity' => (int) $data['capacity'],
        'area_sqm' => (int) $data['areaSqm'],
        'price_per_hour' => (int) $data['pricePerHour'],
        'description' => $data['description'],
        'amenities_json' => json_encode(array_values($amenities), JSON_UNESCAPED_UNICODE),
        'images_json' => json_encode(array_values($data['images']), JSON_UNESCAPED_UNICODE),
        'updated_at' => now(),
    ]);
    return response()->json(['message' => 'Площадка обновлена']);
});

Route::delete('/owner/venues/{id}', function (Request $request, string $id) {
    $ownerId = (string) ($request->input('ownerId') ?? '');
    if ($ownerId === '') return response()->json(['message' => 'Invalid delete payload'], 400);

    $venue = DB::table('venues as v')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('v.external_id', $id)
        ->where('o.external_id', $ownerId)
        ->select('v.id')
        ->first();
    if (!$venue) return response()->json(['message' => 'Venue not found'], 404);

    DB::table('venues')->where('id', $venue->id)->delete();
    return response()->json(['message' => 'Площадка удалена']);
});

Route::post('/admin/auth', function (Request $request) {
    $data = Validator::validate($request->all(), [
        'accessKey' => 'nullable|string|min:4|max:160',
        'login' => 'nullable|string|min:3|max:80',
        'password' => 'nullable|string|min:6|max:160',
        'moderator' => 'nullable|string|min:2|max:80',
    ]);

    $envKey = (string) env('ADMIN_NOTIFY_KEY', '');
    $envLogin = (string) env('ADMIN_PANEL_LOGIN', '');
    $envPassword = (string) env('ADMIN_PANEL_PASSWORD', '');
    if ($envLogin === '' || $envPassword === '') {
        return response()->json(['message' => 'Admin auth is not configured'], 503);
    }
    $byKey = $envKey !== '' && ($data['accessKey'] ?? '') === $envKey;
    $byCredentials = ($data['login'] ?? '') === $envLogin && ($data['password'] ?? '') === $envPassword;
    if (!$byKey && !$byCredentials) return response()->json(['message' => 'Forbidden'], 403);

    $token = Str::random(48);
    $expiresAt = now()->addHours((int) env('ADMIN_SESSION_TTL_HOURS', 24));
    DB::table('admin_sessions')->insert([
        'token' => $token,
        'moderator' => $data['moderator'] ?? 'admin',
        'expires_at' => $expiresAt,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return response()->json(['token' => $token, 'moderator' => $data['moderator'] ?? 'admin', 'expiresAt' => $expiresAt->toIso8601String()], 201);
});

Route::get('/admin/session', function (Request $request) {
    $session = api_require_admin($request);
    if (!$session) return response()->json(['message' => 'Forbidden'], 403);
    return response()->json(['moderator' => $session->moderator, 'expiresAt' => (string) $session->expires_at]);
});

Route::middleware([\App\Http\Middleware\EnsureAdminSession::class])->group(function () {
    Route::get('/admin/overview', function () {
        return response()->json([
            'generatedAt' => api_now_iso(),
            'totals' => [
                'owners' => DB::table('owners')->count(),
                'venues' => DB::table('venues')->count(),
                'publishedVenues' => DB::table('venues')->where('is_published', 1)->count(),
                'hiddenVenues' => DB::table('venues')->where('is_published', 0)->count(),
                'leads' => DB::table('lead_requests')->count(),
                'supportRequests' => DB::table('support_requests')->count(),
                'reviews' => DB::table('reviews')->count(),
                'pendingReviews' => DB::table('reviews')->where('status', 'pending')->count(),
            ],
        ]);
    });

    Route::get('/admin/owners', fn () => response()->json(DB::table('owners')->orderByDesc('id')->get()->map(fn ($row) => api_owner_payload($row))->values()));

    Route::patch('/admin/owners/{id}/access', function (Request $request, string $id) {
        $data = Validator::validate($request->all(), [
            'trialStatus' => 'nullable|string|in:active,expired',
            'subscriptionStatus' => 'nullable|string|in:inactive,active',
        ]);
        $owner = DB::table('owners')->where('external_id', $id)->first();
        if (!$owner) return response()->json(['message' => 'Owner not found'], 404);
        DB::table('owners')->where('id', $owner->id)->update([
            'trial_status' => $data['trialStatus'] ?? $owner->trial_status,
            'subscription_status' => $data['subscriptionStatus'] ?? $owner->subscription_status,
            'updated_at' => now(),
        ]);
        return response()->json(['message' => 'Доступ арендодателя обновлен', 'ownerId' => $id]);
    });

    Route::get('/admin/venues', function () {
        $rows = DB::table('venues as v')
            ->join('owners as o', 'o.id', '=', 'v.owner_id')
            ->select('v.*', 'o.external_id as owner_external_id', 'o.name as owner_name', 'o.email as owner_email')
            ->orderByDesc('v.id')
            ->get()
            ->map(function ($row) {
                $item = api_venue_payload($row);
                $item['ownerName'] = $row->owner_name;
                $item['ownerEmail'] = $row->owner_email;
                return $item;
            })->values();
        return response()->json($rows);
    });

    Route::patch('/admin/venues/{id}', function (Request $request, string $id) {
        $data = Validator::validate($request->all(), ['isPublished' => 'nullable|boolean']);
        $venue = DB::table('venues')->where('external_id', $id)->first();
        if (!$venue) return response()->json(['message' => 'Venue not found'], 404);
        DB::table('venues')->where('id', $venue->id)->update([
            'is_published' => array_key_exists('isPublished', $data) ? (int) $data['isPublished'] : (int) $venue->is_published,
            'updated_at' => now(),
        ]);
        return response()->json(['message' => 'Площадка обновлена', 'venueId' => $id]);
    });

    Route::delete('/admin/venues/{id}', function (string $id) {
        $deleted = DB::table('venues')->where('external_id', $id)->delete();
        if (!$deleted) return response()->json(['message' => 'Venue not found'], 404);
        return response()->json(['message' => 'Площадка удалена администратором']);
    });

    Route::get('/admin/requests', function () {
        $rows = DB::table('lead_requests as r')
            ->join('venues as v', 'v.id', '=', 'r.venue_id')
            ->join('owners as o', 'o.id', '=', 'v.owner_id')
            ->select('r.*', 'v.title as venue_title', 'v.address as venue_address', 'v.external_id as venue_external_id', 'o.external_id as owner_external_id', 'o.name as owner_name')
            ->orderByDesc('r.created_at')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->external_id,
                'venueId' => $row->venue_external_id,
                'name' => $row->name,
                'phone' => $row->phone,
                'comment' => $row->comment,
                'status' => $row->status,
                'createdAt' => (string) $row->created_at,
                'updatedAt' => (string) $row->updated_at,
                'venueTitle' => $row->venue_title,
                'venueAddress' => $row->venue_address,
                'ownerId' => $row->owner_external_id,
                'ownerName' => $row->owner_name,
            ])->values();
        return response()->json($rows);
    });

    Route::patch('/admin/requests/{id}/status', function (Request $request, string $id) {
        $data = Validator::validate($request->all(), ['status' => 'required|string|in:new,in_progress,call_scheduled,confirmed,rejected']);
        $lead = DB::table('lead_requests')->where('external_id', $id)->first();
        if (!$lead) return response()->json(['message' => 'Request not found'], 404);
        DB::table('lead_requests')->where('id', $lead->id)->update(['status' => $data['status'], 'updated_at' => now()]);
        return response()->json(['message' => 'Статус заявки обновлен']);
    });

    Route::get('/admin/support', fn () => response()->json(DB::table('support_requests')->orderByDesc('created_at')->get()->map(fn ($row) => [
        'id' => $row->external_id,
        'name' => $row->name,
        'phone' => $row->phone,
        'message' => $row->message,
        'page' => $row->page,
        'status' => $row->status,
        'assignedTo' => $row->assigned_to,
        'createdAt' => (string) $row->created_at,
        'updatedAt' => (string) $row->updated_at,
    ])->values()));

    Route::patch('/admin/support/{id}', function (Request $request, string $id) {
        $data = Validator::validate($request->all(), [
            'status' => 'nullable|string|in:new,in_progress,resolved,rejected',
            'assignedTo' => 'nullable|string|min:1|max:120',
        ]);
        $item = DB::table('support_requests')->where('external_id', $id)->first();
        if (!$item) return response()->json(['message' => 'Support request not found'], 404);
        DB::table('support_requests')->where('id', $item->id)->update([
            'status' => $data['status'] ?? $item->status,
            'assigned_to' => $data['assignedTo'] ?? $item->assigned_to,
            'updated_at' => now(),
        ]);
        return response()->json(['message' => 'Обращение поддержки обновлено']);
    });

    Route::get('/admin/reviews', fn () => response()->json(DB::table('reviews as r')
        ->join('venues as v', 'v.id', '=', 'r.venue_id')
        ->select('r.*', 'v.title as venue_title', 'v.external_id as venue_external_id')
        ->orderByDesc('r.created_at')
        ->get()
        ->map(fn ($row) => [
            'id' => $row->external_id,
            'venueId' => $row->venue_external_id,
            'author' => $row->author,
            'rating' => (int) $row->rating,
            'text' => $row->text,
            'requesterName' => $row->requester_name,
            'requesterPhone' => $row->requester_phone,
            'sourceLeadRequestId' => $row->source_lead_request_id,
            'verified' => (bool) $row->verified,
            'status' => $row->status,
            'riskScore' => (int) $row->risk_score,
            'riskFlags' => json_decode((string) $row->risk_flags_json, true) ?: [],
            'createdAt' => (string) $row->created_at,
            'venueTitle' => $row->venue_title,
        ])->values()));

    Route::post('/admin/reviews/{id}/moderate', function (Request $request, string $id) {
        $data = Validator::validate($request->all(), [
            'status' => 'required|string|in:published,hidden',
            'note' => 'nullable|string|max:400',
            'moderator' => 'nullable|string|min:2|max:80',
        ]);
        $review = DB::table('reviews')->where('external_id', $id)->first();
        if (!$review) return response()->json(['message' => 'Review not found'], 404);

        DB::table('reviews')->where('id', $review->id)->update([
            'status' => $data['status'],
            'updated_at' => now(),
        ]);
        DB::table('review_moderation_audit')->insert([
            'external_id' => api_next_external_id('review_moderation_audit', 'RA-'),
            'review_id' => $id,
            'venue_id' => (string) $review->venue_id,
            'previous_status' => $review->status,
            'next_status' => $data['status'],
            'note' => $data['note'] ?? null,
            'moderator' => $data['moderator'] ?? 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        api_refresh_venue_rating_by_internal_id((int) $review->venue_id);
        return response()->json(['message' => 'Review moderated']);
    });

    Route::get('/admin/reviews/summary', function () {
        $pending = DB::table('reviews')->where('status', 'pending')->count();
        $published = DB::table('reviews')->where('status', 'published')->count();
        $hidden = DB::table('reviews')->where('status', 'hidden')->count();
        return response()->json([
            'total' => $pending + $published + $hidden,
            'pending' => $pending,
            'published' => $published,
            'hidden' => $hidden,
            'highRiskPending' => DB::table('reviews')->where('status', 'pending')->where('risk_score', '>=', 60)->count(),
            'recentActions' => DB::table('review_moderation_audit')->orderByDesc('created_at')->limit(20)->get(),
        ]);
    });
});

Route::post('/ai/search', function (Request $request) {
    $data = Validator::validate($request->all(), ['query' => 'required|string|min:3|max:500']);
    $term = mb_strtolower($data['query']);

    $venueQuery = DB::table('venues as v')
        ->join('owners as o', 'o.id', '=', 'v.owner_id')
        ->where('v.is_published', 1)
        ->select('v.*', 'o.external_id as owner_external_id');

    if (str_contains($term, 'лофт')) $venueQuery->where('v.category', 'like', '%Лофт%');
    if (preg_match('/(\d{2,4})\s*(м2|м²|кв)/u', $term, $m)) $venueQuery->where('v.area_sqm', '>=', (int) $m[1]);
    if (preg_match('/(\d{2,3})\s*(гостей|человек)/u', $term, $m)) $venueQuery->where('v.capacity', '>=', (int) $m[1]);
    if (preg_match('/до\s*(\d{3,6})/u', $term, $m)) $venueQuery->where('v.price_per_hour', '<=', (int) $m[1]);

    $venues = $venueQuery->limit(20)->orderByDesc('v.rating')->get()->map(fn ($row) => api_venue_payload($row))->values();
    return response()->json([
        'message' => 'AI-поиск выполнил подбор по вашему запросу',
        'filters' => [],
        'venues' => $venues,
        'hints' => ['Уточните город и дату для более точной выдачи'],
    ]);
});
