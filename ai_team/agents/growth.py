from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class GrowthAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "GrowthAgent",
            AgentPolicy(
                role="Traffic and conversion growth",
                non_negotiables=[
                    "Growth experiments should not hurt core UX",
                    "Only measurable experiments are allowed",
                ],
                acceptance_checks=[
                    "Acquisition channels mapped",
                    "Experiment backlog prioritized",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Growth plan: SEO landing clusters by event type and city",
            "Lifecycle: post-booking review request and rebooking nudges",
            "Conversion experiments: hero search copy and category ordering",
        ] + self._enforce_policy()

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
