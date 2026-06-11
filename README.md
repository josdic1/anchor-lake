# Anchor Lake

Full-stack reservation and point-of-sale platform for private clubs, dining rooms, and hospitality teams.

## Overview

Anchor Lake is a role-based dining management system built for private clubs that need more than a basic booking form.

It supports member reservations, staff seating workflows, kitchen execution boards, dietary flag tracking, admin controls, and operational reporting in one connected system.

The goal is simple: replace messy spreadsheets, scattered notes, and manual coordination with a clean, reliable tool built around real dining-room operations.

## Live Demo

[View Live App](https://anchor-lake.netlify.app/)

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS
- Netlify

### Backend

- Python
- FastAPI
- Pydantic
- PostgreSQL
- Railway

## Core Features

- Member reservation flow
- Role-based access for members, staff, and admins
- Dining room and table/room management
- Meal window logic for lunch, dinner, after-hours, and special events
- Real-time kitchen and service workflow support
- Booking status tracking
- Dietary restriction and allergy flagging
- Admin dashboard for operational oversight
- PDF report generation
- PostgreSQL-backed persistent data
- Production deployment through Railway and Netlify

## Booking Workflow

Anchor Lake supports a structured booking lifecycle:

```txt
DRAFT → CONFIRMED → SEATED → SERVICE → COMPLETED
