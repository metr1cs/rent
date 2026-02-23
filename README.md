# AI Team Orchestrator

Каркас мульти-агентной команды: каждый агент отвечает за свой функционал и работает через единый оркестратор.

## Что внутри
- 11 агентов с отдельной логикой (PM, Tech Lead, Design, Frontend, Backend, QA, DevOps, Security, Growth, Analytics, Support)
- Единый протокол задач (`Task`) и результатов (`TaskResult`)
- Оркестратор со стадиями пайплайна и эскалацией блокеров
- "Обучение" агентов через playbook (чёткие системные правила и чек-листы)

## Запуск
```bash
python3 run_demo.py
```

## Как расширять
1. Добавить нового агента в `ai_team/agents/`
2. Зарегистрировать его в `ai_team/registry.py`
3. Добавить стадию в `ai_team/orchestrator.py`
