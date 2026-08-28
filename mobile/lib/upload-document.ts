import * as DocumentPicker from "expo-document-picker";
import { supabase } from "@/lib/supabase";
import { MAX_FILE_SIZE } from "@/lib/constants";

function randomId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function uploadShipmentDocument(input: {
  shipmentId: string;
  organizationId: string;
  userId: string;
  docType: string;
}): Promise<{ success: true } | { error: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { error: "Upload cancelled" };
  }

  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_FILE_SIZE) {
    return { error: "File must be 20MB or less" };
  }

  const documentId = randomId();
  const filePath = `${input.organizationId}/${input.shipmentId}/${documentId}`;

  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("passport-documents")
    .upload(filePath, arrayBuffer, {
      contentType: asset.mimeType ?? "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: docError } = await supabase.from("documents").insert({
    id: documentId,
    shipment_id: input.shipmentId,
    organization_id: input.organizationId,
    doc_type: input.docType,
    file_path: filePath,
    mime_type: asset.mimeType ?? null,
    uploaded_by: input.userId,
  });

  if (docError) {
    await supabase.storage.from("passport-documents").remove([filePath]);
    return { error: docError.message };
  }

  return { success: true };
}
