import { t } from "@/i18n";
import { request } from "./auth";

export interface PortfolioImage {
  id: string;
  url: string;
  orderIndex: number;
}

export interface PortfolioProject {
  id: string;
  supplierId: string;
  title: string;
  description: string | null;
  categoryTag: string | null;
  orderIndex: number;
  isBeforeAfter: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  coverImageUrl: string | null;
  images: PortfolioImage[];
}

export interface PortfolioStats {
  totalPhotos: number;
  totalViews: number;
  totalLikes: number;
}

export interface PortfolioListResponse {
  projects: PortfolioProject[];
  stats: PortfolioStats;
}

export interface CreateProjectPayload {
  title: string;
  description?: string;
  categoryTag?: string;
  isBeforeAfter?: boolean;
}

export interface UpdateProjectPayload {
  title?: string;
  description?: string;
  categoryTag?: string;
  isBeforeAfter?: boolean;
}

export interface ReorderPayload {
  order: Array<{ id: string; orderIndex: number }>;
}

export const getPortfolio = async (): Promise<PortfolioListResponse> => {
  return request<PortfolioListResponse>(
    "/api/providers/portfolio",
    { method: "GET", headers: { "Content-Type": "application/json" } },
    t("providerDashboard.portfolio.errors.listFailed"),
  );
};

export const getPortfolioProject = async (projectId: string): Promise<{ project: PortfolioProject }> => {
  return request<{ project: PortfolioProject }>(
    `/api/providers/portfolio/${projectId}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
    t("providerDashboard.portfolio.errors.loadFailed"),
  );
};

export const createPortfolioProject = async (payload: CreateProjectPayload): Promise<{ project: PortfolioProject }> => {
  return request<{ project: PortfolioProject }>(
    "/api/providers/portfolio",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    t("providerDashboard.portfolio.errors.createFailed"),
  );
};

export const updatePortfolioProject = async (
  projectId: string,
  payload: UpdateProjectPayload,
): Promise<{ project: PortfolioProject }> => {
  return request<{ project: PortfolioProject }>(
    `/api/providers/portfolio/${projectId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    t("providerDashboard.portfolio.errors.updateFailed"),
  );
};

export const deletePortfolioProject = async (projectId: string): Promise<{ message: string }> => {
  return request<{ message: string }>(
    `/api/providers/portfolio/${projectId}`,
    { method: "DELETE", headers: { "Content-Type": "application/json" } },
    t("providerDashboard.portfolio.errors.deleteFailed"),
  );
};

export const uploadPortfolioImage = async (
  projectId: string,
  fileBase64: string,
  fileName?: string,
  mimeType?: string,
): Promise<{ image: { id: string; projectId: string; url: string; orderIndex: number } }> => {
  return request<{ image: { id: string; projectId: string; url: string; orderIndex: number } }>(
    `/api/providers/portfolio/${projectId}/images`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileBase64, fileName, mimeType }),
    },
    t("providerDashboard.portfolio.errors.uploadFailed"),
  );
};

export const deletePortfolioImage = async (imageId: string): Promise<{ message: string }> => {
  return request<{ message: string }>(
    `/api/providers/portfolio/images/${imageId}`,
    { method: "DELETE", headers: { "Content-Type": "application/json" } },
    t("providerDashboard.portfolio.errors.deleteImageFailed"),
  );
};

export const reorderPortfolioProjects = async (payload: ReorderPayload): Promise<{ message: string }> => {
  return request<{ message: string }>(
    "/api/providers/portfolio/reorder",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    t("providerDashboard.portfolio.errors.reorderFailed"),
  );
};
