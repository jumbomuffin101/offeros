from uuid import UUID

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt
from app.models.resume import ResumeVersion
from app.schemas.common import persistence_values
from app.schemas.workspace import WorkspaceResetRequest, WorkspaceResetResponse
from app.services.prep import PrepService


class WorkspaceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def reset(self, user_id: UUID, payload: WorkspaceResetRequest) -> WorkspaceResetResponse:
        summary = WorkspaceResetResponse(scope=payload.scope)
        try:
            if payload.scope in {"all", "applications"}:
                self.db.execute(delete(Application).where(Application.user_id == user_id))
                for application in payload.applications:
                    self.db.add(Application(user_id=user_id, **persistence_values(application)))
                summary.applications = len(payload.applications)

            if payload.scope in {"all", "resumes"}:
                self.db.execute(delete(ResumeVersion).where(ResumeVersion.user_id == user_id))
                for resume in payload.resumes:
                    self.db.add(ResumeVersion(user_id=user_id, **persistence_values(resume)))
                summary.resumes = len(payload.resumes)

            if payload.scope in {"all", "prep"}:
                self.db.execute(delete(CodingProblem).where(CodingProblem.user_id == user_id))
                self.db.execute(delete(BehavioralQuestion).where(BehavioralQuestion.user_id == user_id))
                self.db.execute(delete(SystemDesignPrompt).where(SystemDesignPrompt.user_id == user_id))
                for problem in payload.coding_problems:
                    values = persistence_values(problem)
                    PrepService._set_completion(CodingProblem, values)
                    self.db.add(CodingProblem(user_id=user_id, **values))
                for question in payload.behavioral_questions:
                    self.db.add(BehavioralQuestion(user_id=user_id, **persistence_values(question)))
                for prompt in payload.system_design_prompts:
                    self.db.add(SystemDesignPrompt(user_id=user_id, **persistence_values(prompt)))
                summary.coding_problems = len(payload.coding_problems)
                summary.behavioral_questions = len(payload.behavioral_questions)
                summary.system_design_prompts = len(payload.system_design_prompts)

            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return summary
