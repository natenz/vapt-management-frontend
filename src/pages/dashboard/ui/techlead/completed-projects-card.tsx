import { Building2, CheckCircle2, FolderKanban } from "lucide-react";
import { Link } from "react-router";
import { ProjectStatusBadge, type Project } from "@/entities/project";
import { fmtDate } from "@/shared/lib/format";
import { BentoCard } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { CardEmpty, CardSkeleton, ColumnLabel } from "../superadmin/card-states";

interface CompletedProjectsCardProps {
  projects: readonly Project[];
  isLoading: boolean;
}

export function CompletedProjectsCard({ projects, isLoading }: CompletedProjectsCardProps) {
  return (
    <BentoCard
      colSpan={12}
      role="region"
      aria-label="Projects Selesai"
      title="Projects Selesai"
      icon={<CheckCircle2 />}
      action={
        <Button asChild variant="link" className="h-auto p-0 text-xs">
          <Link to="/projects">Buka semua projects</Link>
        </Button>
      }
    >
      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : projects.length === 0 ? (
        <CardEmpty>Belum ada projects yang selesai.</CardEmpty>
      ) : (
        <div className="overflow-x-auto">
          <Table boxed>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <ColumnLabel icon={<FolderKanban />}>Projects</ColumnLabel>
                </TableHead>
                <TableHead>
                  <ColumnLabel icon={<Building2 />}>Klien</ColumnLabel>
                </TableHead>
                <TableHead>Selesai</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.slice(0, 6).map((project) => (
                <TableRow key={project.project_id}>
                  <TableCell>
                    <Link
                      to={`/projects/${project.project_id}`}
                      className="rounded-xs text-title-sm font-normal text-ink focus-ring hover:text-brand"
                    >
                      {project.project_name}
                    </Link>
                  </TableCell>
                  <TableCell>{project.client_name}</TableCell>
                  <TableCell className="tabular">{fmtDate(project.end_date)}</TableCell>
                  <TableCell>
                    <ProjectStatusBadge name={project.status?.status_name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </BentoCard>
  );
}
