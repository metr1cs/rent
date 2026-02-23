from ai_team.interaction_audit import run_audit


MISSION = (
    "Запустить премиальную платформу аренды площадок для мероприятий: "
    "8 популярных категорий на главной, 10-15 карточек в категории, "
    "страница площадки с телефоном и заявкой, кабинет арендодателя с подпиской 2000 RUB/месяц, "
    "светлая/темная тема, анимации, AI-поиск и строгий release-gate"
)


def main() -> None:
    analytics = run_audit(MISSION)

    print("=" * 88)
    print("INTERACTION AUDIT")
    print("=" * 88)
    print("mission:", analytics["mission"])
    print("quality_gate_passed:", analytics["quality_gate_passed"])
    print("total_score:", analytics["total_score"])
    print("policy_rate:", analytics["policy_rate"])
    print("handoff_coverage:", analytics["handoff_coverage"])
    print("prompt_links_count:", analytics["prompt_links_count"])
    print("weakest_agent:", analytics["weakest_agent"])
    print("strongest_agent:", analytics["strongest_agent"])

    print("\nPROMPT LINKS (sample):")
    for item in analytics["prompt_links"][:6]:
        print(f"- {item['src_agent']} -> {item['dst_agent']}: {item['prompt'][:130]}...")

    print("\nRECOMMENDATIONS:")
    for rec in analytics["recommendations"]:
        print("-", rec)


if __name__ == "__main__":
    main()
