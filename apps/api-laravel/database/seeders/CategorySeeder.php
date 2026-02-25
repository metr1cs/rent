<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            "Лофт",
            "Банкетный зал",
            "Ресторан для мероприятий",
            "Конференц-зал",
            "Переговорная",
            "Фотостудия",
            "Видеостудия / подкаст",
            "Коворкинг / event-space",
            "Выставочный зал",
            "Арт-пространство",
            "Концертная площадка",
            "Театр / сцена",
            "Спортзал / танцевальный",
            "Детское пространство",
            "Коттедж / загородный дом",
            "База отдыха",
            "Терраса / rooftop",
            "Теплоход / яхта",
            "Шоурум / pop-up",
            "Универсальный зал",
        ];

        foreach ($names as $index => $name) {
            DB::table('categories')->updateOrInsert(
                ['external_id' => 'CAT-' . ($index + 1)],
                [
                    'name' => $name,
                    'featured' => $index < 8,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
