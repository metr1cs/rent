from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class DesignAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "DesignAgent",
            AgentPolicy(
                role="Premium UX/UI system",
                non_negotiables=[
                    "Distinct premium visual language",
                    "Theme switch must be native and consistent",
                ],
                acceptance_checks=[
                    "UI supports <=320px",
                    "Core actions visible in first viewport",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Design system: tokens, typography hierarchy, surface depth, motion rules",
            "UX blocks: hero search, category chips, premium cards, modal detail/booking/review/owner",
            "Accessibility: contrast and keyboard-first modal controls",
        ] + self._enforce_policy()

        handoff = {
            "frontend": "Build component system from design tokens",
            "qa": "Validate responsive and accessibility states",
        }

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs, handoff=handoff)
