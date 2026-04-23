/**
 * Drizzle ORM Schema — Postgres 版本
 * 对应 Vercel Postgres 数据库
 */

import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const videos = pgTable('videos', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  video_url: text('video_url'),
  cover_url: text('cover_url'),
  duration: integer('duration').default(0),
  views: integer('views').default(0),
  tags: text('tags').default('[]'),
  featured: integer('featured').default(0),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  video_id: text('video_id').notNull(),
  content: text('content').notNull(),
  nickname: text('nickname'),
  contact: text('contact'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const admin_users = pgTable('admin_users', {
  id: text('id').primaryKey(),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
});

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
