from __future__ import annotations

import time
from datetime import datetime

from ai_team.trainer import AutoTrainer


MISSION_POOL = [
    "Собрать премиальный лендинг + каталог + модальные сценарии брони",
    "Оптимизировать конверсию поиска в бронь и сократить drop-off",
    "Усилить стабильность API и release gate качества",
]


def main() -> None:
    trainer = AutoTrainer()

    for idx, mission in enumerate(MISSION_POOL, start=1):
        result = trainer.train_once(mission)
        print(f"[{datetime.now().isoformat()}] cycle={idx} mission={mission}")
        print(f"quality_gate_passed={result['quality_gate_passed']} agents={result['agents_scored']}")
        print("scores:")
        for agent, score in sorted(result["scores"].items()):
            print(f"  - {agent}: {score}")
        print("-" * 70)
        time.sleep(1)


if __name__ == "__main__":
    main()
