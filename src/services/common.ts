import { AppNotification, Ctx, DbState, ID, NotifType } from '../types/domain';

/** Deterministic id generator (counter based) so a dry-run and the real run agree. */
export const nextId = (db: DbState, prefix: string): ID => `${prefix}_${++db.counters.seq}`;

export const fail = (error: string) => ({ ok: false as const, error });

export function pushNotification(
  db: DbState,
  ctx: Ctx,
  n: { type: NotifType; title: string; body: string; refType?: AppNotification['refType']; refId?: ID; key?: string },
) {
  if (!ctx.settings.notifications[n.type]) return;
  if (n.key) {
    const k = `notif:${n.key}`;
    if (db.appliedKeys[k]) return;
    db.appliedKeys[k] = true;
  }
  db.notifications.unshift({
    id: nextId(db, 'n'), type: n.type, title: n.title, body: n.body, at: ctx.now, read: false,
    refType: n.refType, refId: n.refId,
  });
  if (db.notifications.length > 200) db.notifications.length = 200;
}
