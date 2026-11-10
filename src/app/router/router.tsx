import type { RouteObject } from "react-router";
import { createBrowserRouter, Navigate } from "react-router";
import { AuthLayout, DashboardLayout } from "@/app/layouts";
import { RequireAuth, RequireGuest } from "@/features/auth";
import { CatalogPage } from "@/pages/catalog/ui";
import { DashboardPage } from "@/pages/dashboard/ui";
import { FindingFormPage } from "@/pages/finding-form/ui";
import { LoginPage } from "@/pages/login/ui";
import { ProjectDetailPage } from "@/pages/project-detail";
import { ProjectNewPage } from "@/pages/project-new/ui";
import { ProjectsPage } from "@/pages/projects/ui";
import { ReportPage, ReportsIndexPage } from "@/pages/reports/ui";
import { RolesPage, UsersPage } from "@/pages/users/ui";

export const routes: RouteObject[] = [
  {
    element: (
      <RequireGuest>
        <AuthLayout />
      </RequireGuest>
    ),
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: (
      <RequireAuth>
        <DashboardLayout />
      </RequireAuth>
    ),
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/projects", element: <ProjectsPage /> },
      {
        path: "/projects/new",
        element: (
          <RequireAuth roles={["tech_lead", "super_admin"]}>
            <ProjectNewPage />
          </RequireAuth>
        ),
      },
      { path: "/projects/:projectId", element: <ProjectDetailPage /> },
      {
        path: "/projects/:projectId/findings/new",
        element: (
          <RequireAuth roles={["pentester", "super_admin"]}>
            <FindingFormPage />
          </RequireAuth>
        ),
      },
      { path: "/projects/:projectId/report", element: <ReportPage /> },
      { path: "/findings", element: <Navigate to="/projects" replace /> },
      { path: "/reports", element: <ReportsIndexPage /> },
      { path: "/catalog", element: <CatalogPage /> },
      {
        path: "/users",
        element: (
          <RequireAuth roles={["super_admin"]}>
            <UsersPage />
          </RequireAuth>
        ),
      },
      {
        path: "/roles",
        element: (
          <RequireAuth roles={["super_admin"]}>
            <RolesPage />
          </RequireAuth>
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
];

export const router = createBrowserRouter(routes);
