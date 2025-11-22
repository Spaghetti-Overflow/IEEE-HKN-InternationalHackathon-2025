# HKN International Hackathon 2025 - Team 9 Spaghetti Overflow

![hackathon-banner](resources/Hackathon-banner.png)

Welcome to the Team 9 repository for the IEEE‑HKN International Hackathon 2025 — Spaghetti Overflow.

**This repo is the central place** where our team will develop work, gather resources, and prepare final submission artifacts.

## Event Overview

- **What:** IEEE‑HKN International Hackathon 2025 (virtual / distributed teams)
- **When:** 14 November 2025 – 23 November 2025
- **Launch Time:** 14 November 2025, 7:00 AM EST (12:00 AM UTC)
- **Submission Deadline:** 23 November 2025 @ 23:59 EST (04:59 UTC on 24 Nov)

## Tasks

This project targets the **IEEE-HKN Budget Hack 2025 – Smart Budget Scheduler for Chapter Growth** challenge:

- Design a **smart, user-friendly budgeting tool** for IEEE-HKN chapters.
- Help officers **plan yearly budgets**, manage real-time expenses and incomes, and forecast projections.
- Track **funding and administrative deadlines** in a dedicated, easy-to-scan view.
- Provide **exports and analytics** (CSV/PDF, charts, trends) to support reporting and decision-making.

Our implementation focuses on:

- A full-stack web app (React + Express + PostgreSQL) with academic-year aware budgets.
- Secure authentication with hashed passwords and cookie-based JWT sessions.
- Expense/income tracking with categories, notes, planned/recurring entries, and optional receipts.
- Event-linked budgeting, multiple budgets per user, and archived academic years.
- Containerized deployment via Docker Compose and Makefile helpers.

## Repository layout

- `app/` – Smart Budget Scheduler application:
	- `app/client/` – Vite + React SPA with login/register, dashboard pages, analytics, security panel (2FA), and responsive styles.
	- `app/server/` – Express API with PostgreSQL, authentication, budgeting/analytics routes, exports, and seed scripts.
	- `app/docker-compose.yml`, `app/Makefile`, `app/.env.example` – Container stack and helper commands.
- `docs/` – Presentation and documentation artifacts for the final pitch.
- `resources/` – Hackathon brief, detailed requirements (`TASKS.md`), and other reference material.

## Team 9 — Spaghetti Overflow

| Name | GitHub | LinkedIn | Email |
| ---- | ------ | -------- | ----- |
| Andrea Botticella | [![GitHub](https://img.shields.io/badge/GitHub-Profile-informational?logo=github)](https://github.com/Botti01)       | [![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?logo=linkedin)](https://www.linkedin.com/in/andrea-botticella-353169293/) | [![Email](https://img.shields.io/badge/Email-Send-blue?logo=gmail)](mailto:andrea.botticella@studenti.polito.it) |
| Elia Innocenti | [![GitHub](https://img.shields.io/badge/GitHub-Profile-informational?logo=github)](https://github.com/eliainnocenti) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?logo=linkedin)](https://www.linkedin.com/in/eliainnocenti/) | [![Email](https://img.shields.io/badge/Email-Send-blue?logo=gmail)](mailto:elia.innocenti@studenti.polito.it) |
| Renato Mignone    | [![GitHub](https://img.shields.io/badge/GitHub-Profile-informational?logo=github)](https://github.com/RenatoMignone) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?logo=linkedin)](https://www.linkedin.com/in/renato-mignone/)              | [![Email](https://img.shields.io/badge/Email-Send-blue?logo=gmail)](mailto:renato.mignone@studenti.polito.it)    |
| Simone Romano | [![GitHub](https://img.shields.io/badge/GitHub-Profile-informational?logo=github)](https://github.com/sroman0) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?logo=linkedin)](https://www.linkedin.com/in/simone-romano-383277307/) | [![Email](https://img.shields.io/badge/Email-Send-blue?logo=gmail)](mailto:simone.romano@studenti.polito.it) |
| Eric Ruiz Giménez | [![GitHub](https://img.shields.io/badge/GitHub-Profile-informational?logo=github)](https://github.com/thismanera) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?logo=linkedin)](https://www.linkedin.com/in/eric-ruiz-gimenez/) | [![Email](https://img.shields.io/badge/Email-Send-blue?logo=gmail)](mailto:eric.ruizgimenez@studenti.polito.it) |
| Claudia Sanna     | [![GitHub](https://img.shields.io/badge/GitHub-Profile-informational?logo=github)](https://github.com/sannaclaudia) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?logo=linkedin)](https://www.linkedin.com/in/claudiasanna1/)              | [![Email](https://img.shields.io/badge/Email-Send-blue?logo=gmail)](mailto:claudia.sanna@studenti.polito.it)    |
