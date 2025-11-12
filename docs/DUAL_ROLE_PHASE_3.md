# Phase 3: Approval Workflow

> **Duration:** 2 days  
> **Priority:** 🟡 IMPORTANT  
> **Deliverable:** Admins can approve/reject proposals with review workflow

---

## 🎯 Objectives

1. Add approval fields to `proposals` table
2. Implement approval status flow (draft → submitted → approved/rejected)
3. Create approval endpoints (submit, approve, reject)
4. Build approval queue UI for admins
5. Show review status to field agents

**Approval Flow:**
```
draft → submitted → [approved | rejected] → revision → submitted
  ↑                                            ↓
  └────────── agent can re-work ──────────────┘
```

---

## 🗄️ Backend Tasks

### Task 3.1: Database Migration (1 hora)

```python
# backend/alembic/versions/20241107_add_proposal_approval.py

def upgrade():
    # Add approval status enum
    approval_enum = postgresql.ENUM(
        'draft', 'submitted', 'approved', 'rejected', 'revision',
        name='approval_status'
    )
    approval_enum.create(op.get_bind(), checkfirst=True)
    
    # Add approval fields to proposals
    op.add_column('proposals', sa.Column(
        'approval_status',
        sa.String(20),
        nullable=False,
        server_default='draft'
    ))
    
    op.add_column('proposals', sa.Column(
        'reviewed_by',
        sa.UUID(),
        sa.ForeignKey('users.id', name='fk_proposals_reviewer'),
        nullable=True
    ))
    
    op.add_column('proposals', sa.Column(
        'reviewed_at',
        sa.DateTime(),
        nullable=True
    ))
    
    op.add_column('proposals', sa.Column(
        'review_comments',
        sa.Text(),
        nullable=True
    ))
    
    op.add_column('proposals', sa.Column(
        'submitted_at',
        sa.DateTime(),
        nullable=True
    ))
    
    # Indexes for approval queries
    op.create_index(
        'ix_proposals_approval_status',
        'proposals',
        ['approval_status']
    )
    
    op.create_index(
        'ix_proposals_approval_submitted',
        'proposals',
        ['approval_status', 'submitted_at']
    )

def downgrade():
    op.drop_index('ix_proposals_approval_submitted', 'proposals')
    op.drop_index('ix_proposals_approval_status', 'proposals')
    op.drop_column('proposals', 'submitted_at')
    op.drop_column('proposals', 'review_comments')
    op.drop_column('proposals', 'reviewed_at')
    op.drop_column('proposals', 'reviewed_by')
    op.drop_column('proposals', 'approval_status')
    op.execute('DROP TYPE IF EXISTS approval_status')
```

---

### Task 3.2: Proposal Model Update (30 min)

```python
# backend/app/models/proposal.py
from enum import Enum
from datetime import datetime

class ApprovalStatus(str, Enum):
    DRAFT = "draft"              # Field agent is editing
    SUBMITTED = "submitted"       # Ready for admin review
    APPROVED = "approved"         # Admin approved
    REJECTED = "rejected"         # Admin rejected
    REVISION = "revision"         # Agent re-working after rejection

class Proposal(BaseModel):
    # ... existing fields
    
    # Approval workflow (NEW)
    approval_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=ApprovalStatus.DRAFT,
        index=True
    )
    
    reviewed_by: Mapped[UUID | None] = mapped_column(
        UUID,
        ForeignKey("users.id", name="fk_proposals_reviewer"),
        nullable=True
    )
    
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )
    
    review_comments: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="When agent submitted for review"
    )
    
    # Relationships
    reviewer: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[reviewed_by]
    )
    
    # Helper methods
    def review_time_hours(self) -> float | None:
        """Calculate review time (SLA tracking)"""
        if self.submitted_at and self.reviewed_at:
            delta = self.reviewed_at - self.submitted_at
            return delta.total_seconds() / 3600
        return None
    
    def can_be_submitted(self) -> bool:
        """Check if proposal can be submitted for review"""
        return self.approval_status in [ApprovalStatus.DRAFT, ApprovalStatus.REVISION]
    
    def can_be_reviewed(self) -> bool:
        """Check if proposal can be reviewed"""
        return self.approval_status == ApprovalStatus.SUBMITTED
```

---

### Task 3.3: Approval Endpoints (2 horas)

```python
# backend/app/api/v1/proposals.py (ADD TO EXISTING)

@router.post("/{proposal_id}/submit")
async def submit_proposal_for_review(
    proposal_id: UUID,
    user: CurrentUser,  # Field agent
    db: AsyncDB
):
    """
    Submit proposal for admin review.
    
    Changes status from draft/revision → submitted.
    """
    
    # Load proposal
    result = await db.execute(
        select(Proposal)
        .options(selectinload(Proposal.project))
        .where(Proposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()
    
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    # Permission check (only owner can submit)
    if str(proposal.project.user_id) != str(user.id):
        raise HTTPException(403, "Not your proposal")
    
    # Status check
    if not proposal.can_be_submitted():
        raise HTTPException(
            400,
            f"Cannot submit proposal in {proposal.approval_status} status"
        )
    
    # Update status
    proposal.approval_status = ApprovalStatus.SUBMITTED
    proposal.submitted_at = datetime.utcnow()
    
    await db.commit()
    
    # Create timeline event
    await create_timeline_event(
        db=db,
        project_id=proposal.project_id,
        event_type="proposal_submitted",
        title="Proposal submitted for review",
        description=f"{user.display_name} submitted proposal for admin review",
        actor=user.email
    )
    
    # TODO: Send notification to admins (Phase 3.5)
    
    return {"status": "submitted", "message": "Proposal submitted for review"}

@router.post("/{proposal_id}/approve")
async def approve_proposal(
    proposal_id: UUID,
    comments: str | None = Body(None, embed=True),
    admin: CurrentAdmin,
    db: AsyncDB
):
    """
    Approve a proposal (admin only).
    
    Changes status: submitted → approved
    """
    
    result = await db.execute(
        select(Proposal)
        .options(selectinload(Proposal.project).selectinload(Project.user))
        .where(Proposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()
    
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    # Status check
    if not proposal.can_be_reviewed():
        raise HTTPException(
            400,
            f"Cannot review proposal in {proposal.approval_status} status"
        )
    
    # Update approval status
    proposal.approval_status = ApprovalStatus.APPROVED
    proposal.reviewed_by = admin.id
    proposal.reviewed_at = datetime.utcnow()
    proposal.review_comments = comments
    
    await db.commit()
    
    # Create timeline event
    await create_timeline_event(
        db=db,
        project_id=proposal.project_id,
        event_type="proposal_approved",
        title="Proposal approved",
        description=f"Admin {admin.display_name} approved the proposal",
        actor=admin.email
    )
    
    # TODO: Send notification to agent (Phase 3.5)
    
    return {
        "status": "approved",
        "message": "Proposal approved successfully"
    }

@router.post("/{proposal_id}/reject")
async def reject_proposal(
    proposal_id: UUID,
    comments: str = Body(..., embed=True),  # REQUIRED
    admin: CurrentAdmin,
    db: AsyncDB
):
    """
    Reject a proposal with feedback (admin only).
    
    Changes status: submitted → rejected
    Agent can then re-work (rejected → revision → submitted)
    """
    
    if not comments or not comments.strip():
        raise HTTPException(
            400,
            "Rejection reason is required"
        )
    
    result = await db.execute(
        select(Proposal)
        .options(selectinload(Proposal.project).selectinload(Project.user))
        .where(Proposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()
    
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    if not proposal.can_be_reviewed():
        raise HTTPException(
            400,
            f"Cannot review proposal in {proposal.approval_status} status"
        )
    
    # Update to rejected
    proposal.approval_status = ApprovalStatus.REJECTED
    proposal.reviewed_by = admin.id
    proposal.reviewed_at = datetime.utcnow()
    proposal.review_comments = comments
    
    await db.commit()
    
    # Create timeline event
    await create_timeline_event(
        db=db,
        project_id=proposal.project_id,
        event_type="proposal_rejected",
        title="Proposal rejected",
        description=f"Admin {admin.display_name} requested revisions: {comments[:100]}",
        actor=admin.email
    )
    
    # TODO: Send notification to agent (Phase 3.5)
    
    return {
        "status": "rejected",
        "message": "Proposal rejected. Agent can revise and resubmit."
    }

@router.post("/{proposal_id}/revise")
async def start_proposal_revision(
    proposal_id: UUID,
    user: CurrentUser,
    db: AsyncDB
):
    """
    Mark rejected proposal as being revised.
    
    Changes status: rejected → revision
    """
    
    result = await db.execute(
        select(Proposal)
        .options(selectinload(Proposal.project))
        .where(Proposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()
    
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    # Permission check
    if str(proposal.project.user_id) != str(user.id):
        raise HTTPException(403, "Not your proposal")
    
    # Status check
    if proposal.approval_status != ApprovalStatus.REJECTED:
        raise HTTPException(400, "Can only revise rejected proposals")
    
    proposal.approval_status = ApprovalStatus.REVISION
    await db.commit()
    
    return {"status": "revision", "message": "Proposal marked for revision"}
```

---

### Task 3.4: Admin Approval Queue Endpoint (1 hora)

```python
# backend/app/api/v1/admin.py (ADD TO EXISTING)

@router.get("/approval-queue", response_model=list[ProposalDetail])
async def get_approval_queue(
    admin: CurrentAdmin,
    db: AsyncDB
):
    """
    Get all proposals awaiting approval.
    
    Returns proposals in 'submitted' status, ordered by submission time.
    """
    
    result = await db.execute(
        select(Proposal)
        .options(
            selectinload(Proposal.project)
            .selectinload(Project.user),  # Agent who created
            selectinload(Proposal.project)
            .selectinload(Project.location_rel)
            .selectinload(Location.company)
        )
        .where(Proposal.approval_status == ApprovalStatus.SUBMITTED)
        .order_by(Proposal.submitted_at.asc())  # FIFO
    )
    
    proposals = result.scalars().all()
    return [ProposalDetail.model_validate(p) for p in proposals]
```

---

### Task 3.5: Update Proposal Schemas (30 min)

```python
# backend/app/schemas/proposal.py

class ProposalDetail(BaseSchema):
    id: UUID
    project_id: UUID
    version: int
    ai_output: dict | None
    
    # Approval fields (NEW)
    approval_status: str
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    review_comments: str | None
    submitted_at: datetime | None
    
    created_at: datetime
    updated_at: datetime
    
    # Related objects
    project: "ProjectSummary | None"
    reviewer: "UserRead | None"
```

---

## 💻 Frontend Tasks

### Task 3.6: Approval Queue Component (3 horas)

```typescript
// frontend/components/features/admin-dashboard/approval-queue.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Eye } from "lucide-react";
import { AdminAPI } from "@/lib/api/admin";
import type { ProposalDetail } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";
import ApprovalDialog from "./approval-dialog";

export default function ApprovalQueue() {
  const [proposals, setProposals] = useState<ProposalDetail[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.getApprovalQueue();
      setProposals(data);
    } catch (error) {
      console.error("Failed to load approval queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    setSelectedProposal(null);
    loadQueue(); // Refresh
  };

  const handleReject = () => {
    setSelectedProposal(null);
    loadQueue(); // Refresh
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Approval Queue
              </CardTitle>
              <CardDescription>
                Proposals awaiting your review
              </CardDescription>
            </div>
            <Badge variant="secondary">{proposals.length} pending</Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No proposals pending review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map(proposal => (
                <div
                  key={proposal.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {proposal.project?.name || "Untitled Project"}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>By {proposal.project?.user?.first_name || proposal.project?.user?.email}</span>
                      <span>•</span>
                      <span>Submitted {formatDate(proposal.submitted_at)}</span>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => setSelectedProposal(proposal)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      {selectedProposal && (
        <ApprovalDialog
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </>
  );
}
```

---

### Task 3.7: Approval Dialog Component (2 horas)

```typescript
// frontend/components/features/admin-dashboard/approval-dialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ProposalsAPI } from "@/lib/api/proposals";
import type { ProposalDetail } from "@/lib/api/types";
import { toast } from "sonner";

interface ApprovalDialogProps {
  proposal: ProposalDetail;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export default function ApprovalDialog({
  proposal,
  onClose,
  onApprove,
  onReject
}: ApprovalDialogProps) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    try {
      setLoading(true);
      await ProposalsAPI.approve(proposal.id, comments || undefined);
      toast.success("Proposal approved successfully");
      onApprove();
    } catch (error) {
      toast.error("Failed to approve proposal");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      toast.error("Please provide rejection reason");
      return;
    }

    try {
      setLoading(true);
      await ProposalsAPI.reject(proposal.id, comments);
      toast.success("Proposal rejected. Agent will be notified.");
      onReject();
    } catch (error) {
      toast.error("Failed to reject proposal");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Review Proposal: {proposal.project?.name}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">
              By {proposal.project?.user?.first_name || proposal.project?.user?.email}
            </Badge>
            <Badge>Version {proposal.version}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 my-4">
          {/* AI-Generated Content */}
          <div>
            <h3 className="font-semibold mb-2">AI-Generated Report</h3>
            <div className="border rounded-lg p-4 bg-muted/30 prose prose-sm max-w-none">
              {proposal.ai_output ? (
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(proposal.ai_output, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No content available</p>
              )}
            </div>
          </div>

          {/* Review Comments */}
          <div>
            <Label htmlFor="comments">
              Review Comments
              <span className="text-muted-foreground ml-2">
                (Required for rejection, optional for approval)
              </span>
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add your feedback, suggestions, or reasons for rejection..."
              rows={4}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={loading}
          >
            Reject
          </Button>
          <Button onClick={handleApprove} disabled={loading}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 3.8: Proposals API Client Updates (1 hora)

```typescript
// frontend/lib/api/proposals.ts (ADD TO EXISTING)

export class ProposalsAPI {
  // ... existing methods
  
  /**
   * Submit proposal for admin review
   */
  static async submit(proposalId: string): Promise<void> {
    return apiClient.post(`/api/v1/proposals/${proposalId}/submit`);
  }
  
  /**
   * Approve proposal (admin only)
   */
  static async approve(proposalId: string, comments?: string): Promise<void> {
    return apiClient.post(`/api/v1/proposals/${proposalId}/approve`, {
      comments
    });
  }
  
  /**
   * Reject proposal (admin only)
   */
  static async reject(proposalId: string, comments: string): Promise<void> {
    return apiClient.post(`/api/v1/proposals/${proposalId}/reject`, {
      comments
    });
  }
  
  /**
   * Start revision on rejected proposal
   */
  static async startRevision(proposalId: string): Promise<void> {
    return apiClient.post(`/api/v1/proposals/${proposalId}/revise`);
  }
}
```

---

### Task 3.9: Field Agent - Proposal Status Display (1 hora)

```typescript
// frontend/components/features/proposals/proposal-status-badge.tsx

import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Edit } from "lucide-react";

interface ProposalStatusBadgeProps {
  status: string;
  reviewComments?: string | null;
}

export default function ProposalStatusBadge({
  status,
  reviewComments
}: ProposalStatusBadgeProps) {
  const config = {
    draft: {
      variant: "secondary" as const,
      label: "Draft",
      icon: Edit
    },
    submitted: {
      variant: "outline" as const,
      label: "Pending Review",
      icon: Clock
    },
    approved: {
      variant: "default" as const,
      label: "Approved",
      icon: CheckCircle
    },
    rejected: {
      variant: "destructive" as const,
      label: "Needs Revision",
      icon: XCircle
    },
    revision: {
      variant: "secondary" as const,
      label: "In Revision",
      icon: Edit
    }
  };

  const { variant, label, icon: Icon } = config[status as keyof typeof config] || config.draft;

  return (
    <div className="space-y-2">
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
      
      {status === "rejected" && reviewComments && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <p className="font-semibold mb-1">Admin Feedback:</p>
          <p>{reviewComments}</p>
        </div>
      )}
    </div>
  );
}
```

---

## ✅ Phase 3 Checklist

### Backend
- [ ] Migration adds approval fields
- [ ] Proposal model has ApprovalStatus enum
- [ ] Submit endpoint works
- [ ] Approve endpoint works
- [ ] Reject endpoint (with required comments)
- [ ] Revise endpoint works
- [ ] Approval queue endpoint returns submitted proposals
- [ ] Timeline events created for each action

### Frontend
- [ ] Approval queue component displays pending proposals
- [ ] Approval dialog shows proposal content
- [ ] Admin can approve with optional comments
- [ ] Admin can reject with required comments
- [ ] Field agents see proposal status badges
- [ ] Rejected proposals show admin feedback
- [ ] Submit button works for field agents

### Testing
- [ ] Field agent can submit proposal
- [ ] Admin sees proposal in queue
- [ ] Admin can approve → status changes
- [ ] Admin can reject → agent sees feedback
- [ ] Agent can start revision → resubmit
- [ ] Timeline events are created
- [ ] Proper permission checks (403 errors)

---

## 🚀 Optional: Phase 3.5 - Notifications

### Email Notifications
- Admin receives email when proposal submitted
- Agent receives email when proposal approved/rejected

### Implementation:
```python
# backend/app/services/notification_service.py
async def notify_proposal_submitted(proposal: Proposal):
    admins = await get_all_admins(db)
    for admin in admins:
        await send_email(
            to=admin.email,
            subject="New proposal needs review",
            body=f"Review: {FRONTEND_URL}/admin/proposals/{proposal.id}"
        )
```

---

## Summary

Phase 3 implements complete approval workflow:
- ✅ Proposals have clear status flow
- ✅ Admins review in queue (FIFO)
- ✅ Field agents see review status/feedback
- ✅ Timeline tracking for audit trail
- ✅ Extensible for notifications later

**Next:** Testing & Polish (Phase 4)
