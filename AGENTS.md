# Forma

- Product: lightweight, privately deployed, single-workspace productivity tool.
- Keep the approved UI stack: shadcn/ui radix-nova, Lucide, Motion, react-resizable-panels, dnd-kit, Zustand.
- Use official @radix-ui/colors scales through src/themes.css semantic aliases; do not hardcode component colors. Palette and light/dark mode are independent persisted UI preferences.
- Prefer existing dependencies for UI components and behavior. Use TanStack Query for server state; never persist business records in Zustand.
- Backend is PocketBase 0.40.6 with versioned migrations. Never change a shipped migration; add a new migration.
- Keep account, authorization and business invariants on the server. Never place superuser credentials in the frontend.
- No default production accounts, example production data, or committed runtime databases/secrets.
- Run npm run lint, npm run typecheck, npm run build and npm test for meaningful changes. Integration tests must use isolated data and ports.
- Do not claim Docker runtime validation without a running engine and successful container checks.
- Keep deployment one application service with persistent data. Add infrastructure only when a concrete requirement needs it.
