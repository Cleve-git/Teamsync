# TeamSync — Team Collaboration Platform

A full-stack team collaboration platform built for school groups, campus projects, and professional teams.

## 🚀 Live Demo
https://teamsync-rho.vercel.app/

## ✨ Features

- **Kanban Board** — Manage tasks with To Do, In Progress, and Done columns. Filter by member, priority, and deadline.
- **Real-time Team Chat** — In-project messaging with mention support, reply, edit, and delete.
- **Member Roulette** — Randomly assign members to roles with a spin wheel.
- **Role Management** — Create custom roles (Frontend, Backend, QC, etc.) and assign multiple members per role.
- **Smart Notifications** — Bell icon with badge for unread messages and mentions.
- **Invite System** — Invite members via email (with accept/decline flow) or via a unique 6-character invite code.
- **Profile Management** — Edit name, bio, and profile picture.
- **Task Comments** — Comment on individual tasks with real-time updates.
- **Landing Page** — Public-facing landing page showcasing the platform.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Deployment | Vercel |

## 🗄️ Database Schema

- `profiles` — User profiles (name, bio, avatar)
- `projects` — Projects with unique invite codes
- `project_members` — Project membership with roles (admin/member)
- `project_roles` — Custom roles per project
- `role_members` — Member-to-role assignments
- `tasks` — Tasks with priority, status, deadline, and assignee
- `task_comments` — Comments on tasks
- `messages` — Real-time chat messages per project
- `notifications` — Mention notifications
- `invite_requests` — Email invite requests with accept/decline
- `join_notifications` — Notifications when someone joins via invite code

## 🏃 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/Cleve-git/Teamsync.git
cd teamsync
```

2. Install dependencies
```bash
npm install
```

3. Setup environment variables
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📁 Project Structure
teamsync/
├── app/
│   ├── dashboard/          # Dashboard & project pages
│   │   ├── profile/        # Profile edit page
│   │   └── projects/[id]/  # Project detail + Kanban + Chat
│   │       └── roulette/   # Member roulette page
│   ├── login/              # Login page
│   ├── register/           # Register page
│   └── page.tsx            # Landing page
├── components/             # Reusable components
│   ├── KanbanBoard.js
│   ├── ProjectChat.js
│   ├── RolesBoard.js
│   ├── CreateProjectModal.js
│   ├── CreateTaskModal.js
│   ├── TaskCommentModal.js
│   ├── InviteMemberModal.js
│   └── JoinProjectModal.js
└── lib/supabase/           # Supabase client setup

## 👤 Author

Built by Nasyith Nabhan
