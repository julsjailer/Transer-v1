import { defineAction } from "@agent-native/core/action";
import { and, asc, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { z } from "zod";

import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { requireBcardOwner } from "../server/bcard.js";
import { getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    "Search registered users and read the signed-in user's friend, follower, and brother connections without exposing emails.",
  schema: z.object({
    query: z.string().trim().max(48).default(""),
    all: z.boolean().default(false),
  }),
  http: { method: "GET" },
  run: async ({ query, all }) => {
    const ownerEmail = requireBcardOwner();
    const db = getDb();
    const [
      friendRows,
      followingRows,
      followerRows,
      incomingRows,
      outgoingRows,
      matches,
    ] = await Promise.all([
      db
        .select()
        .from(schema.transerFriendRequests)
        .where(
          and(
            eq(schema.transerFriendRequests.status, "accepted"),
            or(
              eq(schema.transerFriendRequests.requesterEmail, ownerEmail),
              eq(schema.transerFriendRequests.targetEmail, ownerEmail),
            ),
          ),
        ),
      db
        .select({ targetEmail: schema.transerFollows.targetEmail })
        .from(schema.transerFollows)
        .where(eq(schema.transerFollows.followerEmail, ownerEmail)),
      db
        .select({ followerEmail: schema.transerFollows.followerEmail })
        .from(schema.transerFollows)
        .where(eq(schema.transerFollows.targetEmail, ownerEmail)),
      db
        .select()
        .from(schema.transerFriendRequests)
        .where(
          and(
            eq(schema.transerFriendRequests.targetEmail, ownerEmail),
            eq(schema.transerFriendRequests.status, "pending"),
          ),
        ),
      db
        .select()
        .from(schema.transerFriendRequests)
        .where(
          and(
            eq(schema.transerFriendRequests.requesterEmail, ownerEmail),
            eq(schema.transerFriendRequests.status, "pending"),
          ),
        ),
      query
        ? db
            .select({
              ownerEmail: schema.transerProfiles.ownerEmail,
              username: schema.transerProfiles.username,
              displayName: schema.transerProfiles.displayName,
              description: schema.transerProfiles.description,
              secretDescription: schema.transerProfiles.secretDescription,
              avatarData: schema.transerProfiles.avatarData,
              level: schema.transerProfiles.level,
            })
            .from(schema.transerProfiles)
            .where(
              and(
                ne(schema.transerProfiles.ownerEmail, ownerEmail),
                or(
                  ilike(schema.transerProfiles.username, `%${query}%`),
                  ilike(schema.transerProfiles.displayName, `%${query}%`),
                ),
              ),
            )
            .orderBy(asc(schema.transerProfiles.username))
            .limit(30)
        : all
          ? db
              .select({
                ownerEmail: schema.transerProfiles.ownerEmail,
                username: schema.transerProfiles.username,
                displayName: schema.transerProfiles.displayName,
                description: schema.transerProfiles.description,
                secretDescription: schema.transerProfiles.secretDescription,
                avatarData: schema.transerProfiles.avatarData,
                level: schema.transerProfiles.level,
              })
              .from(schema.transerProfiles)
              .where(ne(schema.transerProfiles.ownerEmail, ownerEmail))
              .orderBy(asc(schema.transerProfiles.username))
          : Promise.resolve([]),
    ]);
    const accountEmails = new Set<string>([
      ...friendRows.map((row) =>
        row.requesterEmail === ownerEmail
          ? row.targetEmail
          : row.requesterEmail,
      ),
      ...followingRows.map((row) => row.targetEmail),
      ...followerRows.map((row) => row.followerEmail),
      ...incomingRows.map((row) => row.requesterEmail),
      ...outgoingRows.map((row) => row.targetEmail),
      ...matches.map((profile) => profile.ownerEmail),
    ]);
    const connectedProfiles = accountEmails.size
      ? await db
          .select({
            ownerEmail: schema.transerProfiles.ownerEmail,
            username: schema.transerProfiles.username,
            displayName: schema.transerProfiles.displayName,
            description: schema.transerProfiles.description,
            secretDescription: schema.transerProfiles.secretDescription,
            avatarData: schema.transerProfiles.avatarData,
            level: schema.transerProfiles.level,
          })
          .from(schema.transerProfiles)
          .where(
            or(
              ...[...accountEmails].map((email) =>
                eq(schema.transerProfiles.ownerEmail, email),
              ),
            ),
          )
      : [];
    const [settings, favorites] = accountEmails.size
      ? await Promise.all([
          db
            .select({
              ownerEmail: schema.bcardProfileSettings.ownerEmail,
              collectionPublic: schema.bcardProfileSettings.collectionPublic,
            })
            .from(schema.bcardProfileSettings)
            .where(
              inArray(schema.bcardProfileSettings.ownerEmail, [
                ...accountEmails,
              ]),
            ),
          db
            .select({
              ownerEmail: schema.bcardFavorites.ownerEmail,
              slot: schema.bcardFavorites.slot,
              cardKey: schema.bcardFavorites.cardKey,
            })
            .from(schema.bcardFavorites)
            .where(
              inArray(schema.bcardFavorites.ownerEmail, [...accountEmails]),
            ),
        ])
      : [[], []];
    const profileByEmail = new Map(
      connectedProfiles.map((profile) => [profile.ownerEmail, profile]),
    );
    const safeProfile = (email: string, allowSecret = false) => {
      const profile = profileByEmail.get(email);
      if (!profile) return null;
      const isCollectionPublic = settings.some(
        (setting) => setting.ownerEmail === email && setting.collectionPublic,
      );
      const { ownerEmail: _email, secretDescription, ...safe } = profile;
      return {
        ...safe,
        collectionPublic: isCollectionPublic,
        favorites: isCollectionPublic
          ? favorites
              .filter((favorite) => favorite.ownerEmail === email)
              .sort((a, b) => a.slot - b.slot)
              .flatMap((favorite) => {
                const card = CARTA_POR_CLAVE.get(favorite.cardKey);
                return card
                  ? [
                      {
                        ...card,
                        cardKey: favorite.cardKey,
                        slot: favorite.slot,
                      },
                    ]
                  : [];
              })
          : [],
        ...(allowSecret ? { secretDescription } : {}),
      };
    };
    return {
      results: matches.flatMap(({ ownerEmail: email }) => {
        const friendship = friendRows.find(
          (row) =>
            (row.requesterEmail === ownerEmail && row.targetEmail === email) ||
            (row.targetEmail === ownerEmail && row.requesterEmail === email),
        );
        const profile = safeProfile(email, Boolean(friendship?.isBrother));
        if (!profile) return [];
        return [
          {
            ...profile,
            isFriend: Boolean(friendship),
            isBrother: Boolean(friendship?.isBrother),
            follows: followingRows.some((row) => row.targetEmail === email),
            followsYou: followerRows.some((row) => row.followerEmail === email),
            requestPending:
              outgoingRows.some((row) => row.targetEmail === email) ||
              incomingRows.some((row) => row.requesterEmail === email),
          },
        ];
      }),
      friends: friendRows.flatMap((row) => {
        const email =
          row.requesterEmail === ownerEmail
            ? row.targetEmail
            : row.requesterEmail;
        const profile = safeProfile(email, row.isBrother);
        return profile ? [{ ...profile, isBrother: row.isBrother }] : [];
      }),
      following: followingRows.flatMap((row) => {
        const profile = safeProfile(row.targetEmail);
        return profile ? [profile] : [];
      }),
      followers: followerRows.flatMap((row) => {
        const profile = safeProfile(row.followerEmail);
        return profile ? [profile] : [];
      }),
      incoming: incomingRows.flatMap((row) => {
        const profile = safeProfile(row.requesterEmail);
        return profile ? [{ ...profile, requestId: row.id }] : [];
      }),
      outgoing: outgoingRows.flatMap((row) => {
        const profile = safeProfile(row.targetEmail);
        return profile ? [profile] : [];
      }),
      brotherLimit: 6,
    };
  },
});
