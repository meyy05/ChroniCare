# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Hosted deployment

If you deploy the frontend and backend separately, set `VITE_API_BASE_URL` in the frontend build environment to your backend API, for example `https://your-backend.example.com/api`.

If the frontend and backend are served from the same host, the app falls back to `${window.location.origin}/api` automatically.

If you want a single Node deployment, build the frontend first so `dist/` exists at the repo root, then start `backend/server.js`. The backend will serve the React build and the API from the same origin.
