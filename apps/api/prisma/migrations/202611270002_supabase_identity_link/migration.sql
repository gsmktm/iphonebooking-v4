-- Supabase user IDs are verified server-side through GoTrue /auth/v1/user.
-- Existing customer accounts are NEVER linked merely by email.
CREATE TABLE "SupabaseIdentity" (
  "supabaseUserId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupabaseIdentity_pkey" PRIMARY KEY ("supabaseUserId")
);
CREATE UNIQUE INDEX "SupabaseIdentity_userId_key" ON "SupabaseIdentity"("userId");
ALTER TABLE "SupabaseIdentity"
  ADD CONSTRAINT "SupabaseIdentity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
