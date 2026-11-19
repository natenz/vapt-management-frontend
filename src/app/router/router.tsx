import type { RouteObject } from "react-router";
import { createBrowserRouter, Navigate } from "react-router";
import { AuthLayout, DashboardLayout } from "@/app/layouts";
import { RequireAuth, RequireGuest } from "@/features/auth";
import { AccountPage } from "@/pages/account";
import { CatalogPage } from "@/pages/catalog";
import { DashboardPage } from "@/pages/dashboard";
import { FindingFormPage } from "@/pages/finding-form";
import { LoginPage } from "@/pages/login";
import { ProjectDetailPage } from "@/pages/project-detail";
import { ProjectNewPage } from "@/pages/project-new";
import { ProjectsPage } from "@/pages/projects";
import { ReportPage, ReportsIndexPage } from "@/pages/reports";
import { ResourcesPage } from "@/pages/resources";
import { RolesPage, UsersPage } from "@/pages/users";

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
      {
        path: "/resources",
        element: (
          <RequireAuth roles={["tech_lead", "super_admin"]}>
            <ResourcesPage />
          </RequireAuth>
        ),
      },
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
      { path: "/account", element: <AccountPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
];

export const router = createBrowserRouter(routes);
