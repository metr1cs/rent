<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->string('name');
            $table->boolean('featured')->default(false);
            $table->timestamps();
        });

        Schema::create('owners', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password_hash');
            $table->date('trial_ends_at');
            $table->enum('trial_status', ['active', 'expired'])->default('active');
            $table->enum('subscription_status', ['inactive', 'active'])->default('inactive');
            $table->string('subscription_plan')->default('monthly_2000');
            $table->date('next_billing_date')->nullable();
            $table->timestamps();
        });

        Schema::create('venues', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->foreignId('owner_id')->constrained('owners')->cascadeOnDelete();
            $table->string('title');
            $table->string('region');
            $table->string('city');
            $table->string('address', 500);
            $table->string('category');
            $table->unsignedInteger('capacity');
            $table->unsignedInteger('area_sqm');
            $table->unsignedInteger('price_per_hour');
            $table->text('description');
            $table->json('amenities_json');
            $table->json('images_json');
            $table->json('next_available_dates_json');
            $table->decimal('rating', 3, 1)->default(0);
            $table->unsignedInteger('reviews_count')->default(0);
            $table->boolean('instant_booking')->default(false);
            $table->unsignedInteger('metro_minutes')->default(10);
            $table->string('cancellation_policy')->default('Бесплатная отмена за 48 часов');
            $table->string('phone', 40)->default('+7 (995) 592-62-60');
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->index(['category', 'region', 'is_published']);
        });

        Schema::create('lead_requests', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->string('name');
            $table->string('phone', 60);
            $table->text('comment')->default('');
            $table->enum('status', ['new', 'in_progress', 'call_scheduled', 'confirmed', 'rejected'])->default('new');
            $table->timestamps();
            $table->index(['venue_id', 'status', 'created_at']);
        });

        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->string('author');
            $table->unsignedTinyInteger('rating');
            $table->text('text');
            $table->string('requester_name');
            $table->string('requester_phone', 60);
            $table->string('source_lead_request_id');
            $table->boolean('verified')->default(true);
            $table->enum('status', ['pending', 'published', 'hidden'])->default('pending');
            $table->unsignedTinyInteger('risk_score')->default(0);
            $table->json('risk_flags_json');
            $table->timestamps();
            $table->index(['venue_id', 'status', 'created_at']);
        });

        Schema::create('review_moderation_audit', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->string('review_id');
            $table->string('venue_id');
            $table->enum('previous_status', ['pending', 'published', 'hidden']);
            $table->enum('next_status', ['published', 'hidden']);
            $table->string('note', 400)->nullable();
            $table->string('moderator', 120);
            $table->timestamps();
            $table->index(['review_id', 'created_at']);
        });

        Schema::create('support_requests', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->string('name');
            $table->string('phone', 60);
            $table->text('message');
            $table->string('page', 400)->default('-');
            $table->enum('status', ['new', 'in_progress', 'resolved', 'rejected'])->default('new');
            $table->string('assigned_to', 120)->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });

        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->string('event_name', 80);
            $table->json('meta_json');
            $table->timestamps();
            $table->index(['event_name', 'created_at']);
        });

        Schema::create('admin_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('token', 100)->unique();
            $table->string('moderator', 80);
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_sessions');
        Schema::dropIfExists('analytics_events');
        Schema::dropIfExists('support_requests');
        Schema::dropIfExists('review_moderation_audit');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('lead_requests');
        Schema::dropIfExists('venues');
        Schema::dropIfExists('owners');
        Schema::dropIfExists('categories');
    }
};
