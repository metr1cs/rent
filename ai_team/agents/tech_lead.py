from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class TechLeadAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "TechLeadAgent",
            AgentPolicy(
                role="Architecture and technical decisions",
                non_negotiables=[
                    "Single source of truth for API contracts",
                    "No release without QA + Security + DevOps gates",
                ],
                acceptance_checks=[
                    "Architecture documented",
                    "Release checklist green",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Architecture: Web (React) + API (Node) + CI/CD + PM2 runtime",
            "Contract-first: /api/venues, /api/owner, /api/bookings, /api/payments",
            "Decision: modal-first UX for speed and focus",
            "Release gates: build, smoke API, e2e critical path",
        ] + self._enforce_policy()

        handoff = {
            "backend": "Implement contract and domain rules",
            "frontend": "Implement premium UI and modal flows",
            "qa": "Prepare critical-path tests",
        }

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs, handoff=handoff)
