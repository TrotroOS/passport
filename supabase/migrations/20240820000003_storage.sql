-- Storage bucket for shipment documents

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'passport-documents',
  'passport-documents',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies: org members can access files under their organization folder
DROP POLICY IF EXISTS "passport_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "passport_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "passport_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "passport_documents_delete" ON storage.objects;

CREATE POLICY "passport_documents_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'passport-documents'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

CREATE POLICY "passport_documents_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'passport-documents'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

CREATE POLICY "passport_documents_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'passport-documents'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'passport-documents'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

CREATE POLICY "passport_documents_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'passport-documents'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );
