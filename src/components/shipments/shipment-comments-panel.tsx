"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ShipmentComment } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ShipmentCommentsPanelProps {
  shipmentId: string;
  initialComments: ShipmentComment[];
  canComment: boolean;
}

export function ShipmentCommentsPanel({
  shipmentId,
  initialComments,
  canComment,
}: ShipmentCommentsPanelProps) {
  const router = useRouter();
  const t = useTranslations("comments");
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/comments`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data.comments)) {
        setComments(data.comments);
      }
    } catch {
      // ignore background refresh errors
    }
  }, [shipmentId]);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    function onFocus() {
      void refreshComments();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshComments]);

  async function submitComment() {
    if (!body.trim()) {
      toast.error(t("emptyComment"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? t("postFailed"));
        return;
      }
      setComments((prev) => [...prev, data.comment]);
      setBody("");
      toast.success(t("posted"));
      router.refresh();
    } catch {
      toast.error(t("postFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noComments")}</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {comment.users?.full_name ??
                        comment.users?.email ??
                        t("anonymousUser")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {comment.organizations?.name ?? t("organization")} ·{" "}
                      {formatDate(comment.created_at)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}

        {canComment ? (
          <div className="space-y-2 border-t pt-4">
            <Textarea
              placeholder={t("placeholder")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
            <Button size="sm" onClick={submitComment} disabled={loading}>
              {t("post")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
