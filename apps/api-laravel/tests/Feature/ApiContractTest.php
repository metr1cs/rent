<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_categories_endpoint_returns_seeded_items(): void
    {
        $this->seed();

        $response = $this->getJson('/api/categories');
        $response->assertOk();
        $response->assertJsonCount(20);
        $response->assertJsonFragment(['id' => 'CAT-1', 'name' => 'Лофт']);
    }

    public function test_owner_register_login_and_profile_flow(): void
    {
        $this->seed();

        $register = $this->postJson('/api/owner/register', [
            'name' => 'Owner QA',
            'email' => 'owner.qa@example.com',
            'password' => 'secret123',
        ]);
        $register->assertCreated();
        $register->assertJsonPath('owner.id', 'O-1');

        $login = $this->postJson('/api/owner/login', [
            'email' => 'owner.qa@example.com',
            'password' => 'secret123',
        ]);
        $login->assertOk();
        $login->assertJsonPath('owner.email', 'owner.qa@example.com');

        $profile = $this->getJson('/api/owner/profile?ownerId=O-1');
        $profile->assertOk();
        $profile->assertJsonPath('owner.name', 'Owner QA');
    }

    public function test_owner_can_create_venue_and_get_it_in_owner_list(): void
    {
        $this->seed();

        $this->postJson('/api/owner/register', [
            'name' => 'Owner QA',
            'email' => 'owner2.qa@example.com',
            'password' => 'secret123',
        ])->assertCreated();

        $create = $this->postJson('/api/owner/venues', [
            'ownerId' => 'O-1',
            'title' => 'Лофт на Невском',
            'region' => 'Санкт-Петербург',
            'city' => 'Санкт-Петербург',
            'address' => 'Невский проспект, 1',
            'category' => 'Лофт',
            'capacity' => 40,
            'areaSqm' => 120,
            'pricePerHour' => 7000,
            'description' => 'Подходит для камерных мероприятий и съемок.',
            'amenities' => ['Парковка', 'Сцена', 'Проектор'],
            'images' => ['https://example.com/1.webp', 'https://example.com/2.webp', 'https://example.com/3.webp'],
        ]);
        $create->assertCreated();
        $create->assertJsonPath('id', 'V-OWN-1');

        $list = $this->getJson('/api/owner/venues?ownerId=O-1');
        $list->assertOk();
        $list->assertJsonCount(1);
        $list->assertJsonPath('0.title', 'Лофт на Невском');
    }
}
