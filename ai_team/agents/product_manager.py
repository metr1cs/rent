from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class ProductManagerAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "ProductManagerAgent",
            AgentPolicy(
                role="Prioritization and scope control",
                non_negotiables=[
                    "One clear North Star metric per release",
                    "Scope only features that improve search -> booking conversion",
                ],
                acceptance_checks=[
                    "MVP scope fits one release train",
                    "Every task has owner and measurable outcome",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "North Star: confirmed bookings/week",
            "Release scope: search, filters, premium listing cards, modal booking flow, owner subscription",
            "Backlog split: P0 (core flow), P1 (conversion polish), P2 (post-release growth)",
        ] + self._enforce_policy()

        handoff = {
            "tech_lead": "Define architecture and release gates",
            "design": "Design premium UX for core flow only",
        }

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs, handoff=handoff)
