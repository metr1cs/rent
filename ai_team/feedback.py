from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from ai_team.models import OrchestrationReport
from ai_team.scoring import score_report


BASE_DIR = Path(__file__).resolve().parent
MEMORY_DIR = BASE_DIR / "memory"
PLAYBOOK_DIR = BASE_DIR / "playbooks"
RUN_LOG_FILE = MEMORY_DIR / "runs.jsonl"
AGENT_STATS_FILE = MEMORY_DIR / "agent_stats.json"


def _ensure_paths() -> None:
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    PLAYBOOK_DIR.mkdir(parents=True, exist_ok=True)


def _load_agent_stats() -> dict[str, dict[str, float]]:
    if AGENT_STATS_FILE.exists():
        return json.loads(AGENT_STATS_FILE.read_text(encoding="utf-8"))
    return {}


def _save_agent_stats(stats: dict[str, dict[str, float]]) -> None:
    AGENT_STATS_FILE.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")


def persist_run(report: OrchestrationReport) -> dict[str, float]:
    _ensure_paths()
    step_scores, total_score = score_report(report)

    payload = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "mission": report.mission,
        "quality_gate_passed": report.quality_gate_passed,
        "total_score": total_score,
        "step_scores": [
            {"agent": item.agent, "score": item.score, "reasons": item.reasons} for item in step_scores
        ],
    }

    with RUN_LOG_FILE.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False) + "\n")

    stats = _load_agent_stats()
    for item in step_scores:
        agent_stat = stats.setdefault(item.agent, {"count": 0.0, "avg": 0.0})
        count = agent_stat["count"] + 1
        avg = ((agent_stat["avg"] * agent_stat["count"]) + item.score) / count
        agent_stat["count"] = count
        agent_stat["avg"] = round(avg, 3)

    _save_agent_stats(stats)
    return {item.agent: item.score for item in step_scores}


def _baseline_playbook(agent: str) -> dict[str, list[str]]:
    return {
        "agent": agent,
        "version": ["v1"],
        "focus": ["keep quality gate green"],
        "tighten": [],
        "relax": [],
    }


def update_playbooks(latest_scores: dict[str, float]) -> None:
    _ensure_paths()

    for agent, score in latest_scores.items():
        playbook_file = PLAYBOOK_DIR / f"{agent}.json"

        if playbook_file.exists():
            data = json.loads(playbook_file.read_text(encoding="utf-8"))
        else:
            data = _baseline_playbook(agent)

        if score < 0.70:
            data["tighten"].append(f"score={score}: add stricter checklist and extra validation pass")
            data["focus"].append("reduce blockers on next run")
        elif score > 0.88:
            data["relax"].append(f"score={score}: keep flow lean, avoid over-processing")
            data["focus"].append("preserve speed while maintaining quality")
        else:
            data["focus"].append(f"score={score}: keep current strategy")

        data["version"].append(datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"))

        playbook_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
