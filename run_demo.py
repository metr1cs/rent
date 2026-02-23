from ai_team.orchestrator import Orchestrator


def main() -> None:
    mission = (
        "Сделать high-end сайт аренды помещений с премиальным UX, модальными сценариями, "
        "тёмной/светлой темой, стабильным бэкендом, тестами и автодеплоем"
    )

    orchestrator = Orchestrator()
    report = orchestrator.run(mission)

    print("=" * 90)
    print("MISSION:")
    print(mission)
    print("=" * 90)
    print("DECISIONS:")
    for item in report.decisions:
        print(f"- {item}")

    print("\nDELIVERABLES:")
    for step in report.steps:
        print(f"\n[{step.stage}] {step.agent}")
        for out in step.outputs:
            print(f"  - {out}")
        if step.blockers:
            print("  BLOCKERS:")
            for blocker in step.blockers:
                print(f"    - {blocker}")

    print("\nFINAL QUALITY GATE:")
    print(f"- passed: {report.quality_gate_passed}")
    for gate in report.quality_notes:
        print(f"- {gate}")


if __name__ == "__main__":
    main()
