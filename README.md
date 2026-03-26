# ⚡ Codeforces Problem Explorer

A sleek, dark-themed web app to browse, filter, and track Codeforces problems — powered by the official [Codeforces API](https://codeforces.com/apiHelp).

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/StrandedDev/codeforces_tracker.git
cd codeforces_tracker

# Install dependencies
npm install
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Vite provides hot-reload so changes appear instantly.

### Production Build

```bash
npm run build
```

The output is generated in the `dist/` folder. To preview the production build locally:

```bash
npm run preview
```

---

## ✨ Features

### 🔍 Problem Browser
- Browse **all problems** from the Codeforces problemset (10,000+)
- **6 filter options** — by Problem Index, Rating, Tag, Division, Name search, and Solved status
- **Sortable columns** — click column headers or use the sort dropdown (ID, Rating, Name — ascending/descending)
- **Clickable tags** — click any tag on a problem to instantly filter by it
- **Pagination** with first/last page navigation

### 🔗 Codeforces Handle Integration
- **Connect your handle** — enter your Codeforces username to load your profile and submissions
- **Persistent via `localStorage`** — your handle is saved locally and auto-reconnects on page reload
- **Disconnect anytime** — click ✕ to clear your data

### 👤 User Profile Panel
- Toggle an expandable profile card showing:
  - Avatar with rank-colored border
  - Handle with rank color and rank badge
  - **Stats** — Current Rating, Max Rating, Total Solved, In Problem Set, Contribution, Friend Of count
  - **Solve progress bar** with percentage

### ✅ Solved Problem Tracking
- Fetches all your accepted submissions from the Codeforces API
- **Green ✓ checkmarks** in the Status column for solved problems
- **Green-tinted row highlighting** for solved problems
- **Solved/Unsolved filter** — quickly see only what you've solved or what's left
- **Per-page and total solved counts** in the stats bar

### 🏷️ Smart Problem Index Dropdown
- Properly sorted: single letters first (A, B, C...), then multi-character indexes (A1, A2, B1, B2...)

### 🏛️ Accurate Division Detection
- Fetches the actual contest list from the API and parses division info from contest names (e.g., `"Codeforces Round #800 (Div. 2)"`)


---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| [React 19](https://react.dev/) | UI framework |
| [TypeScript 5](https://www.typescriptlang.org/) | Type safety |
| [Vite 7](https://vite.dev/) | Build tool & dev server |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling |
| [Codeforces API](https://codeforces.com/apiHelp) | Problem data, contests, user info & submissions |

---

## 📁 Project Structure

```
├── index.html              # Entry HTML
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
└── src/
    ├── main.tsx            # React entry point
    ├── App.tsx             # Main application component
    ├── api.ts              # Codeforces API fetch functions
    ├── types.ts            # TypeScript type definitions
    ├── utils.ts            # Rating/rank color utilities
    ├── index.css           # Global styles & Tailwind imports
    └── utils/
        └── cn.ts           # Tailwind class merge utility
```

---

## 🌐 API Endpoints Used

| Endpoint | Description |
|---|---|
| `GET /api/problemset.problems` | Fetch all problems with tags and ratings |
| `GET /api/contest.list` | Fetch all contests (for division detection) |
| `GET /api/user.info?handles={handle}` | Fetch user profile info |
| `GET /api/user.status?handle={handle}` | Fetch user submissions (for solved tracking) |

All requests go to `https://codeforces.com/api/`. No API key required.

> **Note:** If running from `file://`, you may hit CORS restrictions. Use `npm run dev` (localhost) to avoid this.

---

## 📸 Usage

1. **Browse problems** — The app loads all problems on start
2. **Filter** — Use dropdowns and search to narrow results, then click **Apply** (or change filters directly)
3. **Connect your handle** — Type your Codeforces username in the header and press Enter or click **Connect**
4. **Track progress** — Solved problems are highlighted in green with ✓ marks
5. **Click tags** — Click any tag badge to filter by that tag instantly
6. **Sort** — Click column headers (ID, Name, Rating) to toggle sort direction

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [Codeforces](https://codeforces.com/) for providing the free public API
- [Mike Mirzayanov](https://codeforces.com/profile/MikeMirzayanov) for creating Codeforces
