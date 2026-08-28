"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DOCUMENT_TYPES } from "@/lib/utils";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentType } from "@/types/database";

interface DocumentUploadFormProps {
  shipmentId: string;
}

export function DocumentUploadForm({ shipmentId }: DocumentUploadFormProps) {
  const t = useTranslations("documents");
  const localizedStatus = useLocalizedStatus();
  const [docType, setDocType] = useState<DocumentType>("invoice");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error(t("selectFile"));
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", docType);

    try {
      const response = await fetch(`/api/shipments/${shipmentId}/documents`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? t("uploadFailed"));
        return;
      }

      toast.success(t("uploadSuccess"));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      window.location.reload();
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="doc_type">{t("docType")}</Label>
          <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
            <SelectTrigger id="doc_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {localizedStatus(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">{t("fileLabel")}</Label>
          <Input
            id="file"
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv"
          />
        </div>
      </div>
      <Button onClick={handleUpload} disabled={isUploading} size="sm">
        <Upload className="me-2 h-4 w-4" />
        {isUploading ? t("uploading") : t("upload")}
      </Button>
    </div>
  );
}
