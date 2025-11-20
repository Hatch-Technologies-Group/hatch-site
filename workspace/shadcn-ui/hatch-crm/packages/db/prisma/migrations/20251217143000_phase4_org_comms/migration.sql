-- Phase 4: Org Communications (additive)

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'OrgConversationType') THEN
    CREATE TYPE "OrgConversationType" AS ENUM ('DIRECT','CHANNEL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'OrgChannelVisibility') THEN
    CREATE TYPE "OrgChannelVisibility" AS ENUM ('ORG_WIDE','PRIVATE');
  END IF;
END$$;

-- 2) OrgConversation
CREATE TABLE IF NOT EXISTS "OrgConversation" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tenantId" TEXT,
  "type" "OrgConversationType" NOT NULL,
  "name" TEXT,
  "visibility" "OrgChannelVisibility" DEFAULT 'ORG_WIDE',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgConversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgConversation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "OrgConversation_org_type_idx" ON "OrgConversation"("organizationId","type");

-- 3) OrgConversationParticipant
CREATE TABLE IF NOT EXISTS "OrgConversationParticipant" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "OrgConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrgConversationParticipant_conversation_user_uq" ON "OrgConversationParticipant"("conversationId","userId");
CREATE INDEX IF NOT EXISTS "OrgConversationParticipant_user_idx" ON "OrgConversationParticipant"("userId");

-- 4) OrgMessage
CREATE TABLE IF NOT EXISTS "OrgMessage" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "OrgConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "OrgMessage_org_conv_created_idx" ON "OrgMessage"("organizationId","conversationId","createdAt");

-- 5) OrgMessageAttachment
CREATE TABLE IF NOT EXISTS "OrgMessageAttachment" (
  "id" TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgMessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "OrgMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgMessageAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "OrgMessageAttachment_message_idx" ON "OrgMessageAttachment"("messageId");

