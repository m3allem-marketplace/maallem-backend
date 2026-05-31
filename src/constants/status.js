const PROJECT_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  IN_PROGRESS: "in-progress",
};

const PROJECT_STATUS_VALUES = Object.values(PROJECT_STATUS);

const PROPOSAL_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
};

const PROPOSAL_STATUS_VALUES = Object.values(PROPOSAL_STATUS);

module.exports = {
  PROJECT_STATUS,
  PROJECT_STATUS_VALUES,
  PROPOSAL_STATUS,
  PROPOSAL_STATUS_VALUES,
};
