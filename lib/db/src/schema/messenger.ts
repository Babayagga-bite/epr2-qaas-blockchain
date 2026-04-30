// SPDX-License-Identifier: MIT
import { pgTable, text, boolean, customType, bigint, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return "bytea"; },
});

export const pqcNodesTable = pgTable("pqc_nodes", {
  id:            varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  name:          text("name").notNull(),
  kemPublicKey:  text("kem_public_key").notNull(),
  dsaPublicKey:  text("dsa_public_key").notNull(),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export const pqcMessagesTable = pgTable("pqc_messages", {
  id:               varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  fromNodeId:       varchar("from_node_id", { length: 64 }).notNull().references(() => pqcNodesTable.id),
  toNodeId:         varchar("to_node_id", { length: 64 }).notNull().references(() => pqcNodesTable.id),

  kemCiphertextHex: text("kem_ciphertext_hex").notNull(),
  ivHex:            text("iv_hex").notNull(),
  ciphertextHex:    text("ciphertext_hex").notNull(),
  authTagHex:       text("auth_tag_hex").notNull(),
  dsaSignatureHex:  text("dsa_signature_hex").notNull(),

  hasFile:          boolean("has_file").default(false).notNull(),
  fileName:         text("file_name"),
  fileType:         text("file_type"),
  fileSize:         bigint("file_size", { mode: "number" }),

  fileCiphertext:   bytea("file_ciphertext"),
  fileIvHex:        text("file_iv_hex"),
  fileAuthTagHex:   text("file_auth_tag_hex"),

  isRead:           boolean("is_read").default(false).notNull(),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
});

export type PQCNode    = typeof pqcNodesTable.$inferSelect;
export type PQCMessage = typeof pqcMessagesTable.$inferSelect;
