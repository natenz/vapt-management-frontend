import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { getProject } from "@/entities/project";
import { CreateFindingForm } from "@/features/create-finding";
import { Alert } from "@/shared/ui/alert";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";

export function FindingFormPage() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const navigate = useNavigate();
  const project = useQuery({ queryKey: ["project", id], queryFn: () => getProject(id) });
  const back = () => navigate(`/projects/${id}`);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Tambah Finding" description={project.data?.project_name ?? "Catat vulnerability yang ditemukan pada asset."} />
      {project.error ? <Alert tone="error" title="Gagal memuat proyek">{project.error.message}</Alert> : null}
      {project.isLoading ? <Skeleton className="h-64" /> : null}
      {project.data ? <CreateFindingForm project={project.data} onSuccess={back} onCancel={back} /> : null}
    </div>
  );
}
