const { PORT, API_BASE_URL, VERCEL_URL } = require("../config/env");

const PRODUCTION_HOST = "maallem-backend.vercel.app";

const getRequestBaseUrl = (req) => {
  if (!req?.headers) return null;
  const protocol =
    req.headers["x-forwarded-proto"]?.split(",")[0]?.trim() ||
    (req.secure ? "https" : "http") ||
    "https";
  const host =
    req.headers["x-forwarded-host"]?.split(",")[0]?.trim() || req.headers.host;
  if (!host) return null;
  return `${protocol}://${host}`;
};

const getServerBaseUrls = (req) => {
  const urls = [];
  const fromRequest = getRequestBaseUrl(req);
  if (fromRequest) urls.push(fromRequest);
  if (API_BASE_URL) urls.push(API_BASE_URL.replace(/\/$/, ""));
  else if (VERCEL_URL) urls.push(`https://${VERCEL_URL}`);
  urls.push(`https://${PRODUCTION_HOST}`);
  urls.push(`http://localhost:${PORT}`);
  return [...new Set(urls)];
};

const buildServers = (req) => {
  const bases = getServerBaseUrls(req);
  const servers = [];
  for (const base of bases) {
    servers.push({
      url: `${base}/api/v1`,
      description: `${base} — API v1`,
    });
    servers.push({
      url: `${base}/api`,
      description: `${base} — API alias`,
    });
  }
  return servers;
};

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Maallem API",
    version: "1.0.0",
    description:
      "Maallem backend — Authentication, Profiles, Projects & Proposals.\n\n" +
      "**Production:** https://maallem-backend.vercel.app\n\n" +
      "**Auth:** Register/login, refresh token, profile (`/me`).\n\n" +
      "**Profiles:** Public listing by ID; worker/company manage their profile via `/worker/me` and `/company/me` (multipart for images).\n\n" +
      "**Projects:** Clients (`user` role) post and manage projects. Public listing and details.\n\n" +
      "**Proposals:** Workers submit proposals on open projects. Clients accept/reject proposals.\n\n" +
      "**Chat:** Clients start conversations with workers; both can list conversations, send/receive messages (text, image, or file), and mark messages as read.\n\n" +
      "**Users (Client Dashboard):** Single private endpoint aggregating the client's projects, pending proposals, conversations, and summary stats.\n\n" +
      "**AI Estimation:** Analyze a natural-language task description (Arabic/English), extract dimensions via OpenAI, then compute quantities and pricing using a rule engine and internal material prices (no supplier contact).",
    contact: {
      name: "Maallem Team",
    },
  },
  tags: [
    { name: "Auth", description: "Registration, login, tokens" },
    {
      name: "Profiles - Workers (Public)",
      description: "No authentication required",
    },
    {
      name: "Profiles - Companies (Public)",
      description: "No authentication required",
    },
    {
      name: "Profiles - Worker (Me)",
      description: "Worker role + Bearer token",
    },
    {
      name: "Profiles - Company (Me)",
      description: "Company role + Bearer token",
    },
    {
      name: "Projects (Public)",
      description: "Public project listing and details",
    },
    {
      name: "Projects (Client)",
      description: "Client (`user` role) + Bearer token",
    },
    {
      name: "Projects (Worker)",
      description: "Worker role — assigned projects + Bearer token",
    },
    { name: "Proposals (Worker)", description: "Worker role + Bearer token" },
    {
      name: "Proposals (Client)",
      description: "Client (`user` role) + Bearer token",
    },
    {
      name: "Chat (Client)",
      description: "Client (`user` role) + Bearer token",
    },
    { name: "Chat", description: "Client (`user`) or worker + Bearer token" },
    {
      name: "Users (Client)",
      description: "Client (`user` role) private dashboard + Bearer token",
    },
    {
      name: "Notifications",
      description:
        "User notifications (read, delete, list, unread count) + Bearer token",
    },
    { name: "Pusher", description: "Pusher real-time channels authentication" },
    {
      name: "Bookings",
      description:
        "Agreement and Escrow payment workflow between Client and Worker",
    },
    {
      name: "AI",
      description:
        "AI-powered task analysis and cost estimation (OpenAI extraction + rule engine)",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste accessToken from login/register response",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
        },
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
        },
      },
      Location: {
        type: "object",
        properties: {
          address: { type: "string", example: "شارع التحرير، المعادي" },
          city: { type: "string", example: "القاهرة" },
          coordinates: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["Point"], example: "Point" },
              coordinates: {
                type: "array",
                items: { type: "number" },
                minItems: 2,
                maxItems: 2,
                example: [31.2357, 30.0444],
                description: "[longitude, latitude]",
              },
            },
          },
        },
      },
      UserPublic: {
        type: "object",
        properties: {
          _id: { type: "string", example: "674a1b2c3d4e5f6789012345" },
          name: { type: "string", example: "أحمد محمد" },
          email: { type: "string", example: "worker@mail.com" },
          role: { type: "string", enum: ["user", "worker", "company"] },
        },
      },
      User: {
        allOf: [
          { $ref: "#/components/schemas/UserPublic" },
          {
            type: "object",
            properties: {
              phone: { type: "string", example: "01012345678" },
              isVerified: { type: "boolean", example: false },
              isActive: { type: "boolean", example: true },
              workerProfile: { type: "string", nullable: true },
              companyProfile: { type: "string", nullable: true },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        ],
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "phone", "password", "confirmPassword"],
        properties: {
          name: { type: "string", minLength: 2, example: "أحمد محمد" },
          email: {
            type: "string",
            format: "email",
            example: "worker@mail.com",
          },
          phone: {
            type: "string",
            pattern: "^[0-9]{10,15}$",
            example: "01012345678",
          },
          password: { type: "string", minLength: 8, example: "password123" },
          confirmPassword: { type: "string", example: "password123" },
          role: {
            type: "string",
            enum: ["user", "worker", "company"],
            default: "user",
            example: "worker",
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "worker@mail.com",
          },
          password: { type: "string", example: "password123" },
        },
      },
      RefreshTokenRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
      },
      LogoutRequest: {
        type: "object",
        properties: {
          refreshToken: {
            type: "string",
            description:
              "Optional — removes specific refresh token from device",
          },
        },
      },
      AuthTokensData: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
        },
      },
      WorkerProfile: {
        type: "object",
        properties: {
          _id: { type: "string" },
          user: { $ref: "#/components/schemas/UserPublic" },
          avatar: {
            type: "string",
            format: "uri",
            example: "https://res.cloudinary.com/.../avatar.jpg",
          },
          bio: { type: "string", example: "فني سباكة وكهرباء..." },
          experience: { type: "string", example: "8 سنوات خبرة" },
          specializations: {
            type: "array",
            items: { type: "string" },
            example: ["سباكة", "كهرباء", "صيانة عامة"],
          },
          location: { $ref: "#/components/schemas/Location" },
          phone: { type: "string", example: "01098765432" },
          knownWorkerName: { type: "string", example: "أحمد السباك" },
          portfolioImages: {
            type: "array",
            items: { type: "string", format: "uri" },
          },
          isProfileComplete: { type: "boolean", example: true },
          averageRating: { type: "number", example: 4.5 },
          totalReviews: { type: "integer", example: 12 },
          recentReviews: {
            type: "array",
            items: {
              type: "object",
              properties: {
                _id: { type: "string" },
                rating: { type: "number" },
                comment: { type: "string" },
                reviewer: {
                  type: "object",
                  properties: {
                    _id: { type: "string" },
                    name: { type: "string" },
                    avatar: { type: "string" }
                  }
                },
                createdAt: { type: "string", format: "date-time" }
              }
            }
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CompanyProfile: {
        type: "object",
        properties: {
          _id: { type: "string" },
          user: { $ref: "#/components/schemas/UserPublic" },
          logo: { type: "string", format: "uri" },
          companyName: { type: "string", example: "شركة البناء الحديث" },
          bio: { type: "string", example: "شركة مقاولات عامة..." },
          employeeCount: { type: "integer", example: 25 },
          location: { $ref: "#/components/schemas/Location" },
          contactPhones: {
            type: "array",
            items: { type: "string" },
            example: ["0223456789", "01012345678"],
          },
          projectImages: {
            type: "array",
            items: { type: "string", format: "uri" },
          },
          isProfileComplete: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      WorkerProfileBody: {
        type: "object",
        description:
          "Use as multipart/form-data fields (text). Arrays can be comma-separated or JSON string.",
        properties: {
          bio: { type: "string" },
          experience: { type: "string" },
          specializations: {
            type: "string",
            description:
              'JSON array or comma-separated, e.g. ["سباكة","كهرباء"] or سباكة,كهرباء',
            example: "سباكة,كهرباء,صيانة عامة",
          },
          location: {
            type: "string",
            description:
              'JSON object or plain address, e.g. {"address":"...","city":"القاهرة"}',
            example: '{"address":"شارع التحرير","city":"القاهرة"}',
          },
          phone: { type: "string", example: "01098765432" },
          knownWorkerName: { type: "string", description: "Worker who referred or is known to this worker", example: "أحمد السباك" },
          avatar: {
            type: "string",
            format: "binary",
            description: "Profile photo",
          },
          idCard: {
            type: "string",
            format: "binary",
            description: "National ID Card photo (Required)",
          },
          portfolioImages: {
            type: "array",
            items: { type: "string", format: "binary" },
            description: "Previous work photos (max 10)",
          },
          removePortfolioImages: {
            type: "string",
            description:
              "URLs to remove (JSON array or single URL) — update only",
          },
        },
      },
      CompanyProfileBody: {
        type: "object",
        description: "Use as multipart/form-data fields (text).",
        properties: {
          companyName: { type: "string", example: "شركة البناء الحديث" },
          bio: { type: "string" },
          employeeCount: { type: "integer", example: 25 },
          location: {
            type: "string",
            example: '{"address":"التجمع الخامس","city":"القاهرة"}',
          },
          contactPhones: {
            type: "string",
            description:
              'JSON array or comma-separated, e.g. ["0223456789","01012345678"]',
            example: "0223456789,01012345678",
          },
          logo: { type: "string", format: "binary" },
          projectImages: {
            type: "array",
            items: { type: "string", format: "binary" },
            description: "Previous project photos (max 10)",
          },
          removeProjectImages: {
            type: "string",
            description: "URLs to remove — update only",
          },
        },
      },
      Project: {
        type: "object",
        properties: {
          _id: { type: "string", example: "674a1b2c3d4e5f6789012345" },
          client: { $ref: "#/components/schemas/UserPublic" },
          worker: {
            allOf: [{ $ref: "#/components/schemas/UserPublic" }],
            nullable: true,
            description:
              "Targeted worker (User _id) when project is sent directly to a worker",
          },
          title: { type: "string", example: "تصليح سباكة" },
          description: {
            type: "string",
            example: "تسريب في الحمام يحتاج إصلاح عاجل",
          },
          category: { type: "string", example: "plumbing" },
          location: { $ref: "#/components/schemas/Location" },
          budget: { type: "number", example: 500 },
          status: {
            type: "string",
            enum: ["open", "closed", "in-progress"],
            example: "open",
          },
          isDirect: {
            type: "boolean",
            example: true,
            description:
              "True when the project was sent directly to a specific worker (private, not in public listing)",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateProjectRequest: {
        type: "object",
        required: ["title"],
        properties: {
          title: {
            type: "string",
            minLength: 3,
            maxLength: 200,
            example: "تصليح سباكة",
          },
          description: {
            type: "string",
            maxLength: 5000,
            example: "تسريب في الحمام",
          },
          category: { type: "string", maxLength: 100, example: "plumbing" },
          location: { $ref: "#/components/schemas/Location" },
          budget: { type: "number", minimum: 0, example: 500 },
          status: {
            type: "string",
            enum: ["open", "closed", "in-progress"],
            default: "open",
          },
          workerId: {
            type: "string",
            description:
              "Worker User _id or Worker profile _id — when set, the worker is notified automatically",
            example: "674a1b2c3d4e5f6789012346",
          },
        },
      },
      UpdateProjectRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          title: { type: "string", minLength: 3, maxLength: 200 },
          description: { type: "string", maxLength: 5000 },
          category: { type: "string", maxLength: 100 },
          location: { $ref: "#/components/schemas/Location" },
          budget: { type: "number", minimum: 0 },
        },
      },
      PatchProjectStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["open", "closed", "in-progress"],
            example: "in-progress",
          },
        },
      },
      AssignedProjectSummary: {
        type: "object",
        properties: {
          total: { type: "integer", example: 5 },
          open: { type: "integer", example: 2 },
          inProgress: { type: "integer", example: 2 },
          closed: { type: "integer", example: 1 },
        },
      },
      AssignedProject: {
        allOf: [
          { $ref: "#/components/schemas/Project" },
          {
            type: "object",
            properties: {
              myProposal: {
                allOf: [{ $ref: "#/components/schemas/Proposal" }],
                nullable: true,
                description: "This worker's proposal on the project, if any",
              },
            },
          },
        ],
      },
      WorkerOfferHistoryItem: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "Project _id for direct requests, Proposal _id for submitted offers",
          },
          kind: { type: "string", enum: ["direct_request", "proposal"] },
          status: {
            type: "string",
            enum: [
              "awaiting_proposal",
              "pending",
              "accepted",
              "rejected",
              "withdrawn",
            ],
            example: "pending",
          },
          isDirect: { type: "boolean", example: true },
          client: { $ref: "#/components/schemas/UserPublic" },
          project: {
            type: "object",
            properties: {
              _id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              budget: { type: "number" },
              status: {
                type: "string",
                enum: ["open", "closed", "in-progress"],
              },
              location: { $ref: "#/components/schemas/Location" },
              isDirect: { type: "boolean" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          proposal: {
            allOf: [{ $ref: "#/components/schemas/Proposal" }],
            nullable: true,
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      WorkerOfferHistorySummary: {
        type: "object",
        properties: {
          total: { type: "integer", example: 8 },
          awaitingProposal: { type: "integer", example: 2 },
          pending: { type: "integer", example: 3 },
          accepted: { type: "integer", example: 2 },
          rejected: { type: "integer", example: 1 },
          withdrawn: { type: "integer", example: 0 },
        },
      },
      Proposal: {
        type: "object",
        properties: {
          _id: { type: "string", example: "674a1b2c3d4e5f6789012346" },
          project: { $ref: "#/components/schemas/Project" },
          worker: { $ref: "#/components/schemas/UserPublic" },
          message: { type: "string", example: "أقدر أخلصها في يومين" },
          price: { type: "number", example: 450 },
          estimatedDuration: { type: "string", example: "2 days" },
          status: {
            type: "string",
            enum: ["pending", "accepted", "rejected", "withdrawn"],
            example: "pending",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateProposalRequest: {
        type: "object",
        required: ["price"],
        properties: {
          message: {
            type: "string",
            maxLength: 3000,
            example: "أقدر أخلصها في يومين",
          },
          price: { type: "number", minimum: 0, example: 450 },
          estimatedDuration: {
            type: "string",
            maxLength: 200,
            example: "2 days",
          },
        },
      },
      UpdateProposalRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          message: { type: "string", maxLength: 3000 },
          price: { type: "number", minimum: 0 },
          estimatedDuration: { type: "string", maxLength: 200 },
        },
      },
      PatchProposalStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["accepted", "rejected"],
            example: "accepted",
            description:
              "Accepting a proposal sets the project to `in-progress` and rejects other pending proposals.",
          },
        },
      },
      Conversation: {
        type: "object",
        properties: {
          _id: { type: "string", example: "674a1b2c3d4e5f6789012347" },
          client: { $ref: "#/components/schemas/UserPublic" },
          worker: { $ref: "#/components/schemas/UserPublic" },
          project: {
            type: "string",
            nullable: true,
            description: "Optional linked project MongoDB _id",
            example: "674a1b2c3d4e5f6789012345",
          },
          lastMessage: { $ref: "#/components/schemas/Message" },
          lastMessageAt: { type: "string", format: "date-time" },
          unreadCount: {
            type: "object",
            properties: {
              client: { type: "integer", example: 0 },
              worker: { type: "integer", example: 2 },
            },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Message: {
        type: "object",
        properties: {
          _id: { type: "string", example: "674a1b2c3d4e5f6789012348" },
          conversation: { type: "string", example: "674a1b2c3d4e5f6789012347" },
          sender: { $ref: "#/components/schemas/UserPublic" },
          senderRole: {
            type: "string",
            enum: ["user", "worker"],
            example: "user",
          },
          type: {
            type: "string",
            enum: ["text", "image", "file"],
            example: "text",
          },
          content: {
            type: "string",
            nullable: true,
            example: "مرحباً، هل أنت متاح؟",
          },
          fileUrl: { type: "string", format: "uri", nullable: true },
          fileName: { type: "string", nullable: true, example: "plan.pdf" },
          isRead: { type: "boolean", example: false },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      StartConversationRequest: {
        type: "object",
        required: ["workerId"],
        properties: {
          workerId: {
            type: "string",
            description: "Worker user MongoDB _id",
            example: "674a1b2c3d4e5f6789012346",
          },
          projectId: {
            type: "string",
            description: "Optional project to link to the conversation",
            example: "674a1b2c3d4e5f6789012345",
          },
        },
      },
      ClientDashboardSummary: {
        type: "object",
        properties: {
          projects: {
            type: "object",
            properties: {
              total: { type: "integer", example: 5 },
              open: { type: "integer", example: 2 },
              inProgress: { type: "integer", example: 1 },
              closed: { type: "integer", example: 2 },
            },
          },
          pendingProposals: {
            type: "integer",
            example: 3,
            description: "Proposals awaiting client accept/reject",
          },
          unreadMessages: { type: "integer", example: 2 },
        },
      },
      ClientProjectWithProposals: {
        allOf: [
          { $ref: "#/components/schemas/Project" },
          {
            type: "object",
            properties: {
              proposals: {
                type: "object",
                properties: {
                  pending: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Proposal" },
                  },
                  accepted: {
                    oneOf: [
                      { $ref: "#/components/schemas/Proposal" },
                      { type: "null" },
                    ],
                  },
                  counts: {
                    type: "object",
                    properties: {
                      pending: { type: "integer" },
                      accepted: { type: "integer" },
                      rejected: { type: "integer" },
                      withdrawn: { type: "integer" },
                      total: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      PendingProposalWithProject: {
        allOf: [
          { $ref: "#/components/schemas/Proposal" },
          {
            type: "object",
            properties: {
              project: {
                type: "object",
                nullable: true,
                properties: {
                  _id: { type: "string" },
                  title: { type: "string" },
                  status: {
                    type: "string",
                    enum: ["open", "closed", "in-progress"],
                  },
                  category: { type: "string" },
                },
              },
            },
          },
        ],
      },
      ClientDashboard: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          summary: { $ref: "#/components/schemas/ClientDashboardSummary" },
          projects: {
            type: "array",
            items: { $ref: "#/components/schemas/ClientProjectWithProposals" },
          },
          pendingProposals: {
            type: "array",
            items: { $ref: "#/components/schemas/PendingProposalWithProject" },
            description:
              "Flat list of pending proposals across all projects (action items)",
          },
          conversations: {
            type: "array",
            items: { $ref: "#/components/schemas/Conversation" },
          },
        },
      },
      SendMessageBody: {
        type: "object",
        description:
          "Send as **multipart/form-data**. For text messages provide `content`. " +
          "For image/file messages upload `file` (images set type `image`, other files set type `file`).",
        properties: {
          content: {
            type: "string",
            description: "Required for text messages",
            example: "مرحباً",
          },
          file: {
            type: "string",
            format: "binary",
            description: "Image or document attachment",
          },
        },
      },
      Notification: {
        type: "object",
        properties: {
          _id: { type: "string", example: "674a1b2c3d4e5f6789012349" },
          recipient: {
            type: "string",
            description: "User ID of the recipient",
            example: "674a1b2c3d4e5f6789012345",
          },
          type: {
            type: "string",
            enum: [
              "new_proposal",
              "proposal_accepted",
              "proposal_rejected",
              "new_message",
              "payment_received",
              "new_review",
              "booking_status_changed",
            ],
            example: "new_proposal",
          },
          title: { type: "string", example: "New Proposal Received" },
          message: {
            type: "string",
            example:
              'Ahmad Mohammad submitted a proposal on your project "تصليح سباكة"',
          },
          isRead: { type: "boolean", example: false },
          data: {
            type: "object",
            properties: {
              projectId: {
                type: "string",
                nullable: true,
                example: "674a1b2c3d4e5f6789012345",
              },
              proposalId: {
                type: "string",
                nullable: true,
                example: "674a1b2c3d4e5f6789012346",
              },
              conversationId: {
                type: "string",
                nullable: true,
                example: "674a1b2c3d4e5f6789012347",
              },
              paymentId: { type: "string", nullable: true, example: null },
              reviewId: { type: "string", nullable: true, example: null },
              bookingId: { type: "string", nullable: true, example: null },
            },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PusherAuthRequest: {
        type: "object",
        required: ["socket_id", "channel_name"],
        properties: {
          socket_id: { type: "string", example: "1234.5678" },
          channel_name: {
            type: "string",
            example: "private-user-674a1b2c3d4e5f6789012345",
          },
        },
      },
      PusherAuthResponse: {
        type: "object",
        properties: {
          auth: {
            type: "string",
            example: "9a5cc772ee86fc417d71:436f568a52de0...",
          },
        },
      },
      Booking: {
        type: "object",
        properties: {
          _id: { type: "string", example: "674a1b2c3d4e5f6789012350" },
          client: { $ref: "#/components/schemas/UserPublic" },
          provider: { $ref: "#/components/schemas/UserPublic" },
          project: {
            type: "string",
            nullable: true,
            example: "674a1b2c3d4e5f6789012345",
          },
          proposal: {
            type: "string",
            nullable: true,
            example: "674a1b2c3d4e5f6789012346",
          },
          service: { type: "string", nullable: true, example: null },
          price: { type: "number", example: 1500 },
          escrowAmount: { type: "number", example: 0 },
          commissionAmount: { type: "number", example: 150 },
          status: {
            type: "string",
            enum: [
              "pending_payment",
              "paid",
              "delivered",
              "completed",
              "disputed",
              "refunded",
              "cancelled",
            ],
            example: "completed",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateBookingRequest: {
        type: "object",
        required: ["providerId", "price"],
        properties: {
          providerId: {
            type: "string",
            description: "Worker user MongoDB _id",
            example: "674a1b2c3d4e5f6789012346",
          },
          price: { type: "number", minimum: 0, example: 1500 },
          projectId: {
            type: "string",
            description: "Optional project ID",
            example: "674a1b2c3d4e5f6789012345",
          },
          proposalId: {
            type: "string",
            description: "Optional proposal ID",
            example: "674a1b2c3d4e5f6789012346",
          },
          serviceId: {
            type: "string",
            description: "Optional service ID",
            example: null,
          },
        },
      },
      ResolveDisputeRequest: {
        type: "object",
        required: ["resolution"],
        properties: {
          resolution: {
            type: "string",
            enum: ["refund", "release"],
            example: "refund",
          },
        },
      },
      AiAnalyzeRequest: {
        type: "object",
        required: ["serviceType", "description"],
        properties: {
          serviceType: {
            type: "string",
            enum: ["painting", "ceramic", "plumbing"],
            example: "painting",
            description: "Type of construction service",
          },
          description: {
            type: "string",
            minLength: 5,
            maxLength: 2000,
            example: "أريد دهان غرفة 4×5 متر وارتفاعها 3 متر",
            description:
              "Natural language description of the task (Arabic or English)",
          },
        },
      },
      AiEstimationMaterial: {
        type: "object",
        properties: {
          sku: { type: "string", example: "PAINT001" },
          name: { type: "string", example: "White Paint" },
          quantity: { type: "number", example: 8 },
          unit: { type: "string", example: "liter" },
        },
      },
      AiEstimationResult: {
        type: "object",
        properties: {
          serviceType: {
            type: "string",
            enum: ["painting", "ceramic", "plumbing"],
            example: "painting",
          },
          estimatedArea: {
            type: "number",
            example: 54,
            description:
              "Wall area (painting), floor area (ceramic), or bathroom area (plumbing) in m²",
          },
          laborHours: { type: "number", example: 8 },
          materials: {
            type: "array",
            items: { $ref: "#/components/schemas/AiEstimationMaterial" },
          },
        },
      },
      MaterialPrice: {
        type: "object",
        properties: {
          _id: { type: "string", example: "674a1b2c3d4e5f6789012351" },
          sku: { type: "string", example: "PAINT001" },
          name: { type: "string", example: "White Paint" },
          unit: { type: "string", example: "liter" },
          unitPrice: { type: "number", example: 150 },
          category: {
            type: "string",
            enum: ["painting", "ceramic", "plumbing"],
            example: "painting",
          },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid token",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Forbidden: {
        description: "Wrong role for this endpoint",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ValidationError: {
        description: "Validation failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description: "Create account with role `user`, `worker`, or `company`.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Registered successfully",
                    },
                    data: { $ref: "#/components/schemas/AuthTokensData" },
                  },
                },
              },
            },
          },
          409: { description: "Email already in use" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Logged in successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Logged in successfully",
                    },
                    data: { $ref: "#/components/schemas/AuthTokensData" },
                  },
                },
              },
            },
          },
          401: { description: "Invalid email or password" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshTokenRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Token refreshed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Token refreshed" },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string" },
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Invalid or expired refresh token" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user",
        description:
          "Returns user with populated `workerProfile` and `companyProfile` if set.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (current device)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LogoutRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Logged out",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        message: { example: "Logged out successfully" },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/auth/logout-all": {
      post: {
        tags: ["Auth"],
        summary: "Logout from all devices",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Logged out from all devices",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Logged out from all devices",
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/profiles/workers": {
      get: {
        tags: ["Profiles - Workers (Public)"],
        summary: "List all worker profiles",
        description: "No authentication required.",
        parameters: [
          {
            name: "city",
            in: "query",
            schema: { type: "string" },
            description: "Filter by city (partial match)",
            example: "القاهرة",
          },
          {
            name: "specialization",
            in: "query",
            schema: { type: "string" },
            description: "Filter by specialization",
            example: "سباكة",
          },
          {
            name: "lat",
            in: "query",
            schema: { type: "number" },
            example: 30.0444,
          },
          {
            name: "lng",
            in: "query",
            schema: { type: "number" },
            example: 31.2357,
          },
          {
            name: "radius",
            in: "query",
            schema: { type: "integer" },
            description: "Max distance in meters (default 10000)",
          },
        ],

        responses: {
          200: {
            description: "List of worker profiles",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    count: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        profiles: {
                          type: "array",
                          items: { $ref: "#/components/schemas/WorkerProfile" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/profiles/workers/{id}": {
      get: {
        tags: ["Profiles - Workers (Public)"],
        summary: "Get worker profile by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Worker profile MongoDB _id",
          },
        ],
        responses: {
          200: {
            description: "Worker profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        profile: { $ref: "#/components/schemas/WorkerProfile" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/profiles/companies": {
      get: {
        tags: ["Profiles - Companies (Public)"],
        summary: "List all company profiles",
        parameters: [
          {
            name: "city",
            in: "query",
            schema: { type: "string" },
            example: "القاهرة",
          },
          {
            name: "name",
            in: "query",
            schema: { type: "string" },
            description: "Filter by company name",
            example: "بناء",
          },
        ],
        responses: {
          200: {
            description: "List of company profiles",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    count: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        profiles: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/CompanyProfile",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/profiles/companies/{id}": {
      get: {
        tags: ["Profiles - Companies (Public)"],
        summary: "Get company profile by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Company profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        profile: {
                          $ref: "#/components/schemas/CompanyProfile",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/profiles/worker/me": {
      post: {
        tags: ["Profiles - Worker (Me)"],
        summary: "Create my worker profile",
        description:
          "Requires `worker` role. Send as **multipart/form-data** if uploading images.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/WorkerProfileBody" },
            },
          },
        },
        responses: {
          201: {
            description: "Profile created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Worker profile created",
                    },
                    data: {
                      type: "object",
                      properties: {
                        profile: { $ref: "#/components/schemas/WorkerProfile" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          409: { description: "Profile already exists" },
        },
      },
      get: {
        tags: ["Profiles - Worker (Me)"],
        summary: "Get my worker profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "My worker profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        profile: { $ref: "#/components/schemas/WorkerProfile" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      put: {
        tags: ["Profiles - Worker (Me)"],
        summary: "Update my worker profile (full)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/WorkerProfileBody" },
            },
          },
        },
        responses: {
          200: {
            description: "Profile updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Worker profile updated",
                    },
                    data: {
                      type: "object",
                      properties: {
                        profile: { $ref: "#/components/schemas/WorkerProfile" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
      patch: {
        tags: ["Profiles - Worker (Me)"],
        summary: "Update my worker profile (partial)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/WorkerProfileBody" },
            },
          },
        },
        responses: {
          200: { description: "Profile updated (same as PUT)" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Profiles - Worker (Me)"],
        summary: "Delete my worker profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Profile deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Worker profile deleted",
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/profiles/company/me": {
      post: {
        tags: ["Profiles - Company (Me)"],
        summary: "Create my company profile",
        description:
          "Requires `company` role. **multipart/form-data** for logo and project images.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/CompanyProfileBody" },
            },
          },
        },
        responses: {
          201: {
            description: "Profile created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Company profile created",
                    },
                    data: {
                      type: "object",
                      properties: {
                        profile: {
                          $ref: "#/components/schemas/CompanyProfile",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          409: { description: "Profile already exists" },
        },
      },
      get: {
        tags: ["Profiles - Company (Me)"],
        summary: "Get my company profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "My company profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        profile: {
                          $ref: "#/components/schemas/CompanyProfile",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      put: {
        tags: ["Profiles - Company (Me)"],
        summary: "Update my company profile (full)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/CompanyProfileBody" },
            },
          },
        },
        responses: {
          200: { description: "Profile updated" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Profiles - Company (Me)"],
        summary: "Update my company profile (partial)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/CompanyProfileBody" },
            },
          },
        },
        responses: {
          200: { description: "Profile updated" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Profiles - Company (Me)"],
        summary: "Delete my company profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Profile deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Company profile deleted",
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/projects": {
      get: {
        tags: ["Projects (Public)"],
        summary: "List all projects",
        description:
          "No authentication required. Returns **public** projects only (excludes direct/private projects sent to a specific worker). Filter by status, city, or category.",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["open", "closed", "in-progress"] },
            example: "open",
          },
          {
            name: "city",
            in: "query",
            schema: { type: "string" },
            description: "Filter by city (partial match)",
            example: "القاهرة",
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            example: "plumbing",
          },
        ],
        responses: {
          200: {
            description: "List of projects",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    count: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        projects: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Project" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Projects (Client)"],
        summary: "Create a new project",
        description:
          "Requires `user` role (Client). When `workerId` is provided, the project is **direct/private** — visible only to the client and that worker, and excluded from public project listing.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProjectRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Project created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Project created" },
                    data: {
                      type: "object",
                      properties: {
                        project: { $ref: "#/components/schemas/Project" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/projects/assigned/me": {
      get: {
        tags: ["Projects (Worker)"],
        summary: "List projects assigned to me",
        description:
          "Requires `worker` role. Returns projects where the client sent the project directly to this worker, " +
          "including the worker's own proposal (`myProposal`) and a status summary. " +
          "Filter by `status` query param.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["open", "closed", "in-progress"] },
            example: "open",
          },
        ],
        responses: {
          200: {
            description: "Assigned projects for the authenticated worker",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Assigned projects fetched",
                    },
                    data: {
                      type: "object",
                      properties: {
                        projects: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/AssignedProject",
                          },
                        },
                        count: { type: "integer", example: 3 },
                        summary: {
                          $ref: "#/components/schemas/AssignedProjectSummary",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/projects/{id}": {
      get: {
        tags: ["Projects (Public)"],
        summary: "Get project by ID",
        description:
          "Public projects are visible to everyone. **Direct/private** projects (with `worker` assigned) require authentication as the client or assigned worker.",
        security: [{ bearerAuth: [] }, {}],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Project MongoDB _id",
          },
        ],
        responses: {
          200: {
            description: "Project details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        project: { $ref: "#/components/schemas/Project" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      put: {
        tags: ["Projects (Client)"],
        summary: "Update project",
        description: "Requires `user` role. Only the project owner can update.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProjectRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Project updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Project updated" },
                    data: {
                      type: "object",
                      properties: {
                        project: { $ref: "#/components/schemas/Project" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Projects (Client)"],
        summary: "Delete project",
        description:
          "Requires `user` role. Only the project owner can delete. Also deletes all related proposals.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Project deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Project deleted" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/projects/{id}/status": {
      patch: {
        tags: ["Projects (Client)", "Projects (Worker)"],
        summary: "Change project status",
        description:
          "Requires `user` or `worker` role. The project owner (client) or the assigned worker can change status " +
          "(e.g. worker moves project to `in-progress` when starting, or `closed` when done).",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PatchProjectStatusRequest",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Status updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Project status updated",
                    },
                    data: {
                      type: "object",
                      properties: {
                        project: { $ref: "#/components/schemas/Project" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/projects/{id}/proposals": {
      get: {
        tags: ["Proposals (Client)"],
        summary: "List proposals on a project",
        description:
          "Requires `user` role. Only the project owner can view proposals.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Project MongoDB _id",
          },
        ],
        responses: {
          200: {
            description: "List of proposals",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    count: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        proposals: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Proposal" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      post: {
        tags: ["Proposals (Worker)"],
        summary: "Submit a proposal on a project",
        description:
          "Requires `worker` role. Project must be `open`. One proposal per worker per project.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Project MongoDB _id",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProposalRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Proposal submitted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Proposal submitted" },
                    data: {
                      type: "object",
                      properties: {
                        proposal: { $ref: "#/components/schemas/Proposal" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Project is not open for proposals" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { description: "Already submitted a proposal for this project" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/proposals/my": {
      get: {
        tags: ["Proposals (Worker)"],
        summary: "Get my proposals",
        description:
          "Requires `worker` role. Returns all proposals submitted by the authenticated worker.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of my proposals",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    count: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        proposals: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Proposal" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/proposals/my/history": {
      get: {
        tags: ["Proposals (Worker)"],
        summary: "Get my full offer history",
        description:
          "Requires `worker` role. Returns a unified timeline of everything related to this worker: " +
          "direct client requests (`direct_request` / `awaiting_proposal`), submitted proposals (`pending`), " +
          "accepted, rejected, and withdrawn offers. Optional filters: `status`, `clientId`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "awaiting_proposal",
                "pending",
                "accepted",
                "rejected",
                "withdrawn",
              ],
            },
            example: "pending",
          },
          {
            name: "clientId",
            in: "query",
            schema: { type: "string" },
            description: "Filter history for a specific client User _id",
          },
        ],
        responses: {
          200: {
            description: "Worker offer history",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Offer history fetched",
                    },
                    data: {
                      type: "object",
                      properties: {
                        history: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/WorkerOfferHistoryItem",
                          },
                        },
                        count: { type: "integer", example: 5 },
                        summary: {
                          $ref: "#/components/schemas/WorkerOfferHistorySummary",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/proposals/{id}": {
      put: {
        tags: ["Proposals (Worker)"],
        summary: "Update my proposal",
        description:
          "Requires `worker` role. Only pending proposals can be updated.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Proposal MongoDB _id",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProposalRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Proposal updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Proposal updated" },
                    data: {
                      type: "object",
                      properties: {
                        proposal: { $ref: "#/components/schemas/Proposal" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Only pending proposals can be updated" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Proposals (Worker)"],
        summary: "Withdraw my proposal",
        description:
          "Requires `worker` role. Only pending proposals can be withdrawn.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Proposal withdrawn",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Proposal withdrawn" },
                  },
                },
              },
            },
          },
          400: { description: "Only pending proposals can be withdrawn" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/proposals/{id}/status": {
      patch: {
        tags: ["Proposals (Client)"],
        summary: "Accept or reject a proposal",
        description:
          "Requires `user` role. Only the project owner can accept/reject. " +
          "Accepting sets the project to `in-progress` and rejects other pending proposals.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Proposal MongoDB _id",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PatchProposalStatusRequest",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Proposal status updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Proposal accepted" },
                    data: {
                      type: "object",
                      properties: {
                        proposal: { $ref: "#/components/schemas/Proposal" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Only pending proposals can be accepted or rejected",
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/users/me/dashboard": {
      get: {
        tags: ["Users (Client)"],
        summary: "Get client dashboard",
        description:
          "Requires `user` role. **Private** — returns all data for the authenticated client in one response: " +
          "profile, project stats, projects with nested proposals (pending + accepted), " +
          "a flat list of pending proposals needing action, and chat conversations with unread counts.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Client dashboard",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Dashboard fetched" },
                    data: { $ref: "#/components/schemas/ClientDashboard" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/chat/conversations": {
      post: {
        tags: ["Chat (Client)"],
        summary: "Start or get a conversation",
        description:
          "Requires `user` role. Returns an existing conversation with the worker or creates a new one. " +
          "One conversation per client–worker pair.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StartConversationRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Conversation ready",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Conversation ready" },
                    data: {
                      type: "object",
                      properties: {
                        conversation: {
                          $ref: "#/components/schemas/Conversation",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "workerId is required" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      get: {
        tags: ["Chat"],
        summary: "Get my conversations",
        description:
          "Requires `user` or `worker` role. Returns conversations sorted by most recent message.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of conversations",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Conversations fetched",
                    },
                    data: {
                      type: "object",
                      properties: {
                        conversations: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Conversation" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/chat/conversations/{id}/messages": {
      get: {
        tags: ["Chat"],
        summary: "Get messages in a conversation",
        description:
          "Requires `user` or `worker` role. Only participants can access. Messages are returned oldest first.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Conversation MongoDB _id",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 30 },
          },
        ],
        responses: {
          200: {
            description: "Paginated messages",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Messages fetched" },
                    data: {
                      type: "object",
                      properties: {
                        messages: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Message" },
                        },
                        pagination: {
                          type: "object",
                          properties: {
                            page: { type: "integer", example: 1 },
                            limit: { type: "integer", example: 30 },
                            total: { type: "integer", example: 45 },
                            pages: { type: "integer", example: 2 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { description: "Not a participant in this conversation" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      post: {
        tags: ["Chat"],
        summary: "Send a message",
        description:
          "Requires `user` or `worker` role. Text: send `content` in multipart or JSON body. " +
          "Image/file: upload `file` field (multipart). Triggers a real-time event via Pusher.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Conversation MongoDB _id",
          },
        ],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/SendMessageBody" },
            },
          },
        },
        responses: {
          201: {
            description: "Message sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Message sent" },
                    data: {
                      type: "object",
                      properties: {
                        message: { $ref: "#/components/schemas/Message" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Message content is required (for text messages)",
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { description: "Not a participant in this conversation" },
          404: { $ref: "#/components/responses/NotFound" },
          500: { description: "File upload failed" },
        },
      },
    },
    "/chat/conversations/{id}/read": {
      patch: {
        tags: ["Chat"],
        summary: "Mark messages as read",
        description:
          "Requires `user` or `worker` role. Marks unread messages from the other participant as read " +
          "and resets your unread count. Notifies the other participant via Pusher.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Conversation MongoDB _id",
          },
        ],
        responses: {
          200: {
            description: "Messages marked as read",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Messages marked as read",
                    },
                    data: { type: "object", nullable: true, example: null },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { description: "Not a participant in this conversation" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get my notifications",
        description:
          "Returns paginated list of notifications for the authenticated user, sorted by newest first.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 20 },
            description: "Number of notifications per page",
          },
        ],
        responses: {
          200: {
            description: "Notifications fetched successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Notifications fetched",
                    },
                    data: {
                      type: "object",
                      properties: {
                        notifications: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Notification" },
                        },
                        unreadCount: { type: "integer", example: 2 },
                        pagination: {
                          type: "object",
                          properties: {
                            page: { type: "integer", example: 1 },
                            limit: { type: "integer", example: 20 },
                            total: { type: "integer", example: 5 },
                            pages: { type: "integer", example: 1 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/notifications/unread-count": {
      get: {
        tags: ["Notifications"],
        summary: "Get unread notifications count",
        description:
          "Returns the total number of unread notifications for the authenticated user.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Unread count fetched successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Unread count fetched",
                    },
                    data: {
                      type: "object",
                      properties: {
                        unreadCount: { type: "integer", example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        description:
          "Marks all unread notifications of the authenticated user as read.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "All notifications marked as read successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "All notifications marked as read",
                    },
                    data: { type: "object", nullable: true, example: null },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark a single notification as read",
        description:
          "Marks a specific notification of the authenticated user as read.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Notification MongoDB _id",
          },
        ],
        responses: {
          200: {
            description: "Notification marked as read successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Notification marked as read",
                    },
                    data: {
                      type: "object",
                      properties: {
                        notification: {
                          $ref: "#/components/schemas/Notification",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/notifications/{id}": {
      delete: {
        tags: ["Notifications"],
        summary: "Delete a notification",
        description:
          "Deletes a specific notification belonging to the authenticated user.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Notification MongoDB _id",
          },
        ],
        responses: {
          200: {
            description: "Notification deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Notification deleted",
                    },
                    data: { type: "object", nullable: true, example: null },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/pusher/auth": {
      post: {
        tags: ["Pusher"],
        summary: "Authorize Pusher channel subscription",
        description:
          "Authorizes subscription to private channels: `private-user-{userId}` for notifications, " +
          "or `private-conversation-{conversationId}` for chats. The authenticated user must be a participant " +
          "or the recipient to successfully authorize.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PusherAuthRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Channel subscription authorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PusherAuthResponse" },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: {
            description:
              "Forbidden — user is not authorized to subscribe to this channel",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Forbidden" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/bookings": {
      post: {
        tags: ["Bookings"],
        summary: "Create a booking (Agreement)",
        description:
          "Requires `user` role. Creates a new booking in `pending_payment` status.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateBookingRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Booking created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Booking created" },
                    data: {
                      type: "object",
                      properties: {
                        booking: { $ref: "#/components/schemas/Booking" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid recipient role" },
          401: { $ref: "#/components/responses/Unauthorized" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
      get: {
        tags: ["Bookings"],
        summary: "List my bookings",
        description:
          "Returns a paginated list of bookings. For clients, returns bookings they created. For workers/companies, returns bookings assigned to them. For admins, returns all bookings.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 20 },
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string" },
            description: "Filter by status",
          },
          {
            name: "clientId",
            in: "query",
            schema: { type: "string" },
            description: "Filter by client ID (Admin only)",
          },
          {
            name: "providerId",
            in: "query",
            schema: { type: "string" },
            description: "Filter by provider ID (Admin only)",
          },
        ],
        responses: {
          200: {
            description: "Bookings fetched",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Bookings fetched" },
                    data: {
                      type: "object",
                      properties: {
                        bookings: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Booking" },
                        },
                        pagination: {
                          type: "object",
                          properties: {
                            page: { type: "integer", example: 1 },
                            limit: { type: "integer", example: 20 },
                            total: { type: "integer", example: 10 },
                            pages: { type: "integer", example: 1 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/bookings/{id}": {
      get: {
        tags: ["Bookings"],
        summary: "Get booking details by ID",
        description:
          "Returns full details of a specific booking. Allowed for the client, the provider, or admin users.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Booking MongoDB _id",
          },
        ],
        responses: {
          200: {
            description: "Booking details fetched",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Booking fetched" },
                    data: {
                      type: "object",
                      properties: {
                        booking: { $ref: "#/components/schemas/Booking" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/bookings/{id}/pay": {
      post: {
        tags: ["Bookings"],
        summary: "Pay for a booking (Escrow deposit)",
        description:
          "Requires `user` role. Charges the client, places the funds in platform escrow, and changes status to `paid`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Booking MongoDB _id",
          },
        ],
        responses: {
          200: {
            description: "Booking paid successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Payment successful" },
                    data: {
                      type: "object",
                      properties: {
                        booking: { $ref: "#/components/schemas/Booking" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid booking status" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/bookings/{id}/deliver": {
      post: {
        tags: ["Bookings"],
        summary: "Deliver work (Mark as completed by provider)",
        description:
          "Requires `worker` or `company` role. Changes the booking status to `delivered`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Booking MongoDB _id",
          },
        ],
        responses: {
          200: {
            description: "Work delivered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Work delivered successfully",
                    },
                    data: {
                      type: "object",
                      properties: {
                        booking: { $ref: "#/components/schemas/Booking" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Work can only be delivered after payment" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/bookings/{id}/approve": {
      post: {
        tags: ["Bookings"],
        summary: "Approve delivery (Release escrow funds)",
        description:
          "Requires `user` role. Releases the escrowed funds to the provider's balance (minus the 10% platform commission) and sets status to `completed`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Booking MongoDB _id",
          },
        ],
        responses: {
          200: {
            description: "Delivery approved and funds released",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Delivery approved and funds released",
                    },
                    data: {
                      type: "object",
                      properties: {
                        booking: { $ref: "#/components/schemas/Booking" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Booking is not in delivered status" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/bookings/{id}/dispute": {
      post: {
        tags: ["Bookings"],
        summary: "Dispute booking delivery or progress",
        description:
          "Allowed for client or provider. Sets the booking status to `disputed` for admin mediation.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Booking MongoDB _id",
          },
        ],
        responses: {
          200: {
            description: "Dispute opened successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Dispute opened successfully",
                    },
                    data: {
                      type: "object",
                      properties: {
                        booking: { $ref: "#/components/schemas/Booking" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description:
              "Dispute can only be opened for paid or delivered bookings",
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/ai/analyze": {
      post: {
        tags: ["AI"],
        summary: "Analyze task description and estimate cost",
        description:
          "No authentication required.\n\n" +
          "**Flow:**\n" +
          "1. OpenAI extracts structured dimensions from the description (JSON only — no calculations).\n" +
          "2. Rule engine computes areas, material quantities, and labor hours.\n" +
          "3. BOQ is generated from estimation rules.\n" +
          "4. Material prices are fetched from MongoDB (`materialprices` collection).\n" +
          "5. Total cost is calculated and the estimation is saved to `aiestimations`.\n\n" +
          "**Supported service types:** `painting`, `ceramic`, `plumbing`.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AiAnalyzeRequest" },
              examples: {
                painting: {
                  summary: "Painting a room",
                  value: {
                    serviceType: "painting",
                    description: "أريد دهان غرفة 4×5 متر وارتفاعها 3 متر",
                  },
                },
                ceramic: {
                  summary: "Ceramic floor installation",
                  value: {
                    serviceType: "ceramic",
                    description: "أريد تركيب سيراميك لغرفة 4×5 متر",
                  },
                },
                plumbing: {
                  summary: "Bathroom plumbing",
                  value: {
                    serviceType: "plumbing",
                    description: "أريد أعمال سباكة لحمام 6 متر مربع",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Estimation completed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Estimation completed successfully",
                    },
                    data: { $ref: "#/components/schemas/AiEstimationResult" },
                  },
                },
                example: {
                  success: true,
                  message: "Estimation completed successfully",
                  data: {
                    serviceType: "painting",
                    estimatedArea: 54,
                    laborHours: 8,
                    materials: [
                      {
                        sku: "PAINT001",
                        name: "White Paint",
                        quantity: 8,
                        unit: "liter",
                      },
                    ],
                  },
                },
              },
            },
          },
          422: {
            description:
              "Validation failed or could not extract dimensions from description",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description:
              "Material price not found in database (run seed:materials first)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "OpenAI API key not configured",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          502: {
            description: "OpenAI returned invalid or empty response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/ai/history": {
      get: {
        tags: ["AI"],
        summary: "Get AI estimation history",
        description: "Requires authentication. Retrieves the history of all AI estimations requested by the authenticated user or worker.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "History retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "AI interaction history retrieved successfully" },
                    data: {
                      type: "array",
                      items: {
                        type: "object"
                      }
                    }
                  }
                }
              }
            }
          },
          401: { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/bookings/{id}/resolve-dispute": {
      post: {
        tags: ["Bookings"],
        summary: "Mediate and resolve dispute",
        description:
          "Requires `admin` role. Resolves the dispute. If `refund`, releases escrow to client's balance. If `release`, releases escrow (after commission) to provider's balance.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Booking MongoDB _id",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResolveDisputeRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Dispute resolved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Dispute resolved" },
                    data: {
                      type: "object",
                      properties: {
                        booking: { $ref: "#/components/schemas/Booking" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description:
              "Booking is not in disputed status or invalid resolution",
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/bookings/{id}/releases": {
      post: {
        tags: ["Bookings"],
        summary: "Create releases for a booking",
        description: "Creates milestones/releases. The total amount must equal the booking price.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Booking MongoDB _id",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  releases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", example: "Phase 1" },
                        amount: { type: "number", example: 50 },
                        dueDate: { type: "string", format: "date-time" }
                      },
                      required: ["name", "amount"]
                    }
                  }
                },
                required: ["releases"]
              }
            }
          }
        },
        responses: {
          201: { description: "Releases created successfully" },
          400: { description: "Bad request or validation error" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        }
      },
      get: {
        tags: ["Bookings"],
        summary: "Get releases for a booking",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Booking MongoDB _id",
          },
        ],
        responses: {
          200: { description: "Releases fetched successfully" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        }
      }
    },
    "/bookings/{id}/releases/{releaseId}/deliver": {
      post: {
        tags: ["Bookings"],
        summary: "Deliver a specific release",
        description: "Requires worker/company role.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "releaseId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Release delivered" },
          400: { description: "Bad request" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        }
      }
    },
    "/bookings/{id}/releases/{releaseId}/approve": {
      post: {
        tags: ["Bookings"],
        summary: "Approve a specific release",
        description: "Requires user (client) role. Approves release and transfers funds.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "releaseId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Release approved" },
          400: { description: "Bad request" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        }
      }
    },
    "/ai-recommendations": {
      post: {
        tags: ["AI"],
        summary: "Get AI recommendations based on user story",
        description: "Requires Bearer token. Analyzes the user's problem description using OpenAI, extracts the required service type and city, and returns a list of recommended workers from the database.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["story"],
                properties: {
                  story: {
                    type: "string",
                    example: "أنا ساكن في القاهرة وعندي مشكلة في مواسير المطبخ بتسرب مياه",
                    minLength: 5,
                    maxLength: 3000
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Recommendations generated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Recommendations generated successfully" },
                    data: {
                      type: "object",
                      properties: {
                        analysis: {
                          type: "object",
                          properties: {
                            detectedService: { type: "string", example: "plumbing" },
                            detectedCity: { type: "string", example: "القاهرة" },
                            messageAr: { type: "string", example: "لقد قمنا بتحديد الخدمة كأعمال سباكة بسبب وجود تسريب في المياه..." }
                          }
                        },
                        recommendations: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              _id: { type: "string" },
                              specializations: { type: "array", items: { type: "string" } },
                              location: { $ref: "#/components/schemas/Location" },
                              user: {
                                type: "object",
                                properties: {
                                  name: { type: "string" },
                                  email: { type: "string" },
                                  phone: { type: "string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          422: { $ref: "#/components/responses/ValidationError" }
        }
      }
    },
    "/admin/workers/{id}/approve": {
      put: {
        tags: ["Admin"],
        summary: "Approve a worker",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: { 200: { description: "Worker approved" } }
      }
    },
    "/admin/users/{id}/status": {
      put: {
        tags: ["Admin"],
        summary: "Update user active status",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { isActive: { type: "boolean" } } } } } },
        responses: { 200: { description: "User status updated" } }
      }
    },
    "/admin/payments/payouts": {
      get: {
        tags: ["Admin"],
        summary: "List payout requests",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Payouts listed" } }
      }
    },
    "/admin/payments/payouts/{id}/status": {
      put: {
        tags: ["Admin"],
        summary: "Update payout request status",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" } } } } } },
        responses: { 200: { description: "Payout status updated" } }
      }
    },
    "/admin/dashboard/stats": {
      get: {
        tags: ["Admin"],
        summary: "Get dashboard statistics",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Dashboard stats" } }
      }
    },
    "/reviews/{workerId}": {
      post: {
        tags: ["Reviews"],
        summary: "Add a review for a worker",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "workerId", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rating"],
                properties: {
                  rating: { type: "number", minimum: 1, maximum: 5 },
                  comment: { type: "string", maxLength: 1000 },
                  booking: { type: "string" },
                  project: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Review added successfully" },
          400: { description: "Bad request" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" }
        }
      },
      get: {
        tags: ["Reviews"],
        summary: "Get all reviews for a worker",
        parameters: [
          { name: "workerId", in: "path", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: { 200: { description: "List of reviews" } }
      }
    }
  },
};

const buildSwaggerSpec = (req) => ({
  ...swaggerDocument,
  servers: buildServers(req),
});

module.exports = { swaggerDocument, buildSwaggerSpec, buildServers };
