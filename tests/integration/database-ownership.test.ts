import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Tables } from '../../lib/supabase/types';

// Execute repository migrations against PostgreSQL in WASM, including real RLS
// and foreign keys. Only Supabase's auth schema/claim lookup are represented here;
// this does not verify hosted Auth, JWT validation, PostgREST, or deployed grants.
const migrations = readdirSync(resolve('supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => ({ name, sql: readFileSync(resolve('supabase/migrations', name), 'utf8') }));
const alice = '10000000-0000-0000-0000-000000000001';
const bob = '10000000-0000-0000-0000-000000000002';
const aliceRecipe = '20000000-0000-0000-0000-000000000001';
const bobRecipe = '20000000-0000-0000-0000-000000000002';
const bootstrap = `
  create role authenticated nologin;
  create role anon nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
`;
const fixtures = `
  insert into auth.users (id) values ('${alice}'), ('${bob}');
  insert into public.inventory_items (user_id, name)
    values ('${alice}', 'Apple'), ('${bob}', 'Beans');
  insert into public.recipes (id, user_id, name, meal_type)
    values ('${aliceRecipe}', '${alice}', 'Alice recipe', 'lunch'),
           ('${bobRecipe}', '${bob}', 'Bob recipe', 'dinner');
  insert into public.daily_logs (user_id, recipe_id, name, calories, source)
    values ('${alice}', '${aliceRecipe}', 'Alice meal', 420, 'recipe'),
           ('${bob}', '${bobRecipe}', 'Bob meal', 510, 'recipe');
`;
const tables = ['user_settings', 'inventory_items', 'recipes', 'daily_logs'] as const;
const insertSql = {
  user_settings: 'insert into public.user_settings (user_id) values ($1)',
  inventory_items:
    "insert into public.inventory_items (user_id, name) values ($1, 'New ingredient')",
  recipes:
    "insert into public.recipes (user_id, name, meal_type) values ($1, 'New recipe', 'lunch')",
  daily_logs:
    "insert into public.daily_logs (user_id, name, source) values ($1, 'New meal', 'text')",
};

describe('database ownership (actual PostgreSQL RLS)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(bootstrap);
    for (const migration of migrations) await db.exec(migration.sql);
  }, 30_000);
  afterAll(async () => db?.close());
  beforeEach(async () => {
    await db.exec('begin');
    await db.exec(fixtures);
  });
  afterEach(async () => db.exec('rollback'));

  async function asUser(user: string) {
    await db.exec('set local role authenticated');
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);
  }

  // SQL errors abort a transaction; isolate expected denials in savepoints.
  async function denied(sql: string, params: unknown[], code: string) {
    await db.exec('savepoint denied_operation');
    try {
      await expect(db.query(sql, params)).rejects.toMatchObject({ code });
    } finally {
      await db.exec('rollback to savepoint denied_operation');
      await db.exec('release savepoint denied_operation');
    }
  }

  it('runs assertions as a role without superuser or RLS bypass privileges', async () => {
    await asUser(alice);
    const { rows } = await db.query(
      'select rolsuper, rolbypassrls from pg_roles where rolname = current_user',
    );
    expect(rows).toEqual([{ rolsuper: false, rolbypassrls: false }]);
  });

  it.each(tables)(
    '%s hides other users and rejects foreign writes and ownership transfers',
    async (table) => {
      for (const [self, other] of [
        [alice, bob],
        [bob, alice],
      ]) {
        await asUser(self);
        const { rows } = await db.query(`select user_id from public.${table}`);
        expect(rows).toEqual([{ user_id: self }]);
        expect(
          (
            await db.query(
              `update public.${table} set user_id = user_id where user_id = $1 returning user_id`,
              [other],
            )
          ).rows,
        ).toEqual([]);
        if (table === 'user_settings') {
          await denied(`delete from public.${table} where user_id = $1`, [other], '42501');
        } else {
          expect(
            (
              await db.query(`delete from public.${table} where user_id = $1 returning user_id`, [
                other,
              ])
            ).rows,
          ).toEqual([]);
        }
        await denied(insertSql[table], [other], '42501');
        await denied(
          `update public.${table} set user_id = $1 where user_id = $2`,
          [other, self],
          '42501',
        );
      }
    },
  );

  it.each(tables)('%s allows supported own-row operations', async (table) => {
    if (table === 'user_settings') {
      // Signup normally creates settings. Verify the recovery insert policy too.
      await db.query('delete from public.user_settings where user_id = $1', [alice]);
    }
    await asUser(alice);
    const key = table === 'user_settings' ? 'user_id' : 'id';
    const inserted = await db.query<Record<string, string>>(
      `${insertSql[table]} returning ${key}`,
      [alice],
    );
    const column = table === 'user_settings' ? 'daily_calories' : 'name';
    const value = table === 'user_settings' ? 2300 : 'Updated';
    const result = await db.query(
      `update public.${table} set ${column} = $1 where ${key} = $2 returning ${column}`,
      [value, inserted.rows[0][key]],
    );
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((row) => (row as Record<string, unknown>)[column] === value)).toBe(
      true,
    );
    // Settings deliberately cannot be deleted, keeping account defaults intact.
    if (table === 'user_settings') {
      await denied(`delete from public.${table} where user_id = $1`, [alice], '42501');
    } else {
      const deleted = await db.query(
        `delete from public.${table} where user_id = $1 returning user_id`,
        [alice],
      );
      expect(deleted.rows.length).toBe(2);
    }
  });

  it.each(tables)('%s denies anonymous data access even if a claim is supplied', async (table) => {
    await db.exec('set local role anon');
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [alice]);
    await denied(`select * from public.${table}`, [], '42501');
    await denied(insertSql[table], [alice], '42501');
    await denied(`update public.${table} set user_id = user_id`, [], '42501');
    await denied(`delete from public.${table}`, [], '42501');
  });

  it('requires a user identity even when the authenticated role has table access', async () => {
    await db.exec('set local role authenticated');
    for (const table of tables) {
      expect((await db.query(`select * from public.${table}`)).rows).toEqual([]);
      await denied(insertSql[table], [alice], '42501');
    }
  });

  it('rejects cross-owner recipe associations on insert and update', async () => {
    for (const [user, foreignRecipe] of [
      [alice, bobRecipe],
      [bob, aliceRecipe],
    ]) {
      await asUser(user);
      await denied(
        "insert into public.daily_logs (user_id, recipe_id, name, source) values ($1, $2, 'Foreign meal', 'recipe')",
        [user, foreignRecipe],
        '23503',
      );
      await denied(
        'update public.daily_logs set recipe_id = $1 where user_id = $2',
        [foreignRecipe, user],
        '23503',
      );
    }
  });

  it('preserves meal ownership, nutrition and date when its recipe is deleted', async () => {
    await asUser(alice);
    const before = (await db.query<Tables<'daily_logs'>>('select * from public.daily_logs'))
      .rows[0];
    await db.query('delete from public.recipes where id = $1', [aliceRecipe]);
    const after = (await db.query('select * from public.daily_logs')).rows[0];
    expect(after).toEqual({ ...before, recipe_id: null });
    await asUser(bob);
    expect((await db.query('select recipe_id from public.daily_logs')).rows).toEqual([
      { recipe_id: bobRecipe },
    ]);
  });

  it('saves manual meals and preserves provenance/date when their nutrition is edited', async () => {
    await asUser(alice);
    const inserted = await db.query<Tables<'daily_logs'>>(
      "insert into public.daily_logs (user_id, name, calories, source, logged_at) values ($1, 'Manual lunch', 400, 'manual', $2) returning *",
      [alice, '2026-09-17T12:30:00Z'],
    );
    const original = inserted.rows[0];
    const edited = await db.query<Tables<'daily_logs'>>(
      "update public.daily_logs set name = 'Corrected lunch', calories = 500 where id = $1 returning *",
      [original.id],
    );
    expect(edited.rows[0]).toEqual({ ...original, name: 'Corrected lunch', calories: 500 });
  });

  it('rejects empty names and negative meal nutrition on both insert and update', async () => {
    await asUser(alice);
    for (const name of ['', '  ', '\t\n']) {
      await denied(
        "insert into public.daily_logs (user_id, name, source) values ($1, $2, 'manual')",
        [alice, name],
        '23514',
      );
      await denied(
        'update public.daily_logs set name = $1 where user_id = $2',
        [name, alice],
        '23514',
      );
    }
    for (const field of ['calories', 'protein_g', 'carbs_g', 'fat_g']) {
      await denied(
        `insert into public.daily_logs (user_id, name, source, ${field}) values ($1, 'Lunch', 'manual', -1)`,
        [alice],
        '23514',
      );
      await denied(
        `update public.daily_logs set ${field} = -1 where user_id = $1`,
        [alice],
        '23514',
      );
    }
    await denied(
      "insert into public.daily_logs (user_id, name, source) values ($1, 'Lunch', 'unknown')",
      [alice],
      '23514',
    );
  });

  it('rejects invalid macro targets while allowing zero gram targets', async () => {
    await asUser(alice);
    for (const field of ['daily_calories', 'daily_protein_g', 'daily_carbs_g', 'daily_fat_g']) {
      await denied(
        `update public.user_settings set ${field} = -1 where user_id = $1`,
        [alice],
        '23514',
      );
    }
    await denied(
      'update public.user_settings set daily_calories = 0 where user_id = $1',
      [alice],
      '23514',
    );
    const saved = await db.query(
      'update public.user_settings set daily_protein_g = 0, daily_carbs_g = 0, daily_fat_g = 0 where user_id = $1 returning daily_calories',
      [alice],
    );
    expect(saved.rows).toEqual([{ daily_calories: 2000 }]);
  });

  it('defaults inventory to in stock and preserves item identity across stock toggles and edits', async () => {
    await asUser(alice);
    const original = (
      await db.query<Tables<'inventory_items'>>('select * from public.inventory_items')
    ).rows[0];
    expect(original.in_stock).toBe(true);
    const out = await db.query<Tables<'inventory_items'>>(
      'update public.inventory_items set in_stock = false where id = $1 returning *',
      [original.id],
    );
    expect(out.rows[0]).toEqual({ ...original, in_stock: false });
    const edited = await db.query<Tables<'inventory_items'>>(
      "update public.inventory_items set name = 'Green apple', category = 'Produce' where id = $1 returning *",
      [original.id],
    );
    expect(edited.rows[0]).toEqual({
      ...original,
      name: 'Green apple',
      category: 'Produce',
      in_stock: false,
    });
    const restored = await db.query<Tables<'inventory_items'>>(
      'update public.inventory_items set in_stock = true where id = $1 returning *',
      [original.id],
    );
    expect(restored.rows[0]).toEqual({ ...edited.rows[0], in_stock: true });
    await denied(
      'update public.inventory_items set in_stock = null where id = $1',
      [original.id],
      '23502',
    );
  });

  it('keeps case-insensitive per-user inventory uniqueness even when an item is out of stock', async () => {
    await asUser(alice);
    await db.query('update public.inventory_items set in_stock = false');
    await denied(
      "insert into public.inventory_items (user_id, name) values ($1, 'APPLE')",
      [alice],
      '23505',
    );
    const second = await db.query<Tables<'inventory_items'>>(
      "insert into public.inventory_items (user_id, name, in_stock) values ($1, 'Pear', false) returning *",
      [alice],
    );
    expect(second.rows[0].in_stock).toBe(false);
    await denied(
      "update public.inventory_items set name = 'apple' where id = $1",
      [second.rows[0].id],
      '23505',
    );
    await asUser(bob);
    expect(
      (
        await db.query(
          "insert into public.inventory_items (user_id, name) values ($1, 'APPLE') returning in_stock",
          [bob],
        )
      ).rows,
    ).toEqual([{ in_stock: true }]);
  });

  it('prevents changing another owner’s inventory stock or metadata', async () => {
    await asUser(alice);
    expect(
      (
        await db.query(
          "update public.inventory_items set in_stock = false, name = 'Stolen beans' where user_id = $1 returning id",
          [bob],
        )
      ).rows,
    ).toEqual([]);
    await asUser(bob);
    expect((await db.query('select name, in_stock from public.inventory_items')).rows).toEqual([
      { name: 'Beans', in_stock: true },
    ]);
  });

  it('matches the stock column type, nullability, and insert default in PostgreSQL', async () => {
    expect(
      (
        await db.query(
          "select data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'inventory_items' and column_name = 'in_stock'",
        )
      ).rows,
    ).toEqual([{ data_type: 'boolean', is_nullable: 'NO', column_default: 'true' }]);
  });

  it('keeps the signup trigger working without exposing its definer function', async () => {
    await asUser(alice);
    expect((await db.query('select daily_calories from public.user_settings')).rows).toEqual([
      { daily_calories: 2000 },
    ]);
    await denied('select public.handle_new_user()', [], '42501');
  });
});

it('upgrades existing cross-owner links without deleting logs or changing valid links', async () => {
  const db = new PGlite();
  try {
    await db.exec(bootstrap);
    for (const migration of migrations) {
      if (migration.name.endsWith('_enforce_recipe_log_ownership.sql')) {
        await db.exec(fixtures);
        await db.query('update public.daily_logs set recipe_id = $1 where user_id = $2', [
          bobRecipe,
          alice,
        ]);
        const before = (
          await db.query<Tables<'daily_logs'>>(
            'select * from public.daily_logs where user_id = $1',
            [alice],
          )
        ).rows[0];
        await db.exec(migration.sql);
        const after = (
          await db.query('select * from public.daily_logs where user_id = $1', [alice])
        ).rows[0];
        expect(after).toEqual({ ...before, recipe_id: null });
        expect(
          (await db.query('select recipe_id from public.daily_logs where user_id = $1', [bob]))
            .rows,
        ).toEqual([{ recipe_id: bobRecipe }]);
      } else {
        await db.exec(migration.sql);
      }
    }
  } finally {
    await db.close();
  }
}, 30_000);

it('preserves legacy invalid nutrition during upgrade and lets the owner repair it', async () => {
  const db = new PGlite();
  try {
    await db.exec(bootstrap);
    for (const migration of migrations) {
      if (migration.name.endsWith('_manual_logging_validation.sql')) {
        await db.exec(fixtures);
        await db.query(
          "update public.daily_logs set calories = -1, name = '  ' where user_id = $1",
          [alice],
        );
        await db.query('update public.user_settings set daily_calories = 0 where user_id = $1', [
          alice,
        ]);
        await db.exec(migration.sql);
        expect(
          (
            await db.query('select name, calories from public.daily_logs where user_id = $1', [
              alice,
            ])
          ).rows,
        ).toEqual([{ name: '  ', calories: -1 }]);
        expect(
          (
            await db.query('select daily_calories from public.user_settings where user_id = $1', [
              alice,
            ])
          ).rows,
        ).toEqual([{ daily_calories: 0 }]);
        await db.exec('set role authenticated');
        await db.query("select set_config('request.jwt.claim.sub', $1, false)", [alice]);
        expect(
          (
            await db.query(
              "update public.daily_logs set name = 'Repaired meal', calories = 450 where user_id = $1 returning name, calories",
              [alice],
            )
          ).rows,
        ).toEqual([{ name: 'Repaired meal', calories: 450 }]);
        expect(
          (
            await db.query(
              'update public.user_settings set daily_calories = 2000 where user_id = $1 returning daily_calories',
              [alice],
            )
          ).rows,
        ).toEqual([{ daily_calories: 2000 }]);
        // Later migrations run as the schema owner, not the simulated client.
        await db.exec('reset role');
      } else {
        await db.exec(migration.sql);
      }
    }
  } finally {
    await db.close();
  }
}, 30_000);

it('upgrades legacy inventory without rewriting whitespace collisions or metadata', async () => {
  const db = new PGlite();
  try {
    await db.exec(bootstrap);
    for (const migration of migrations) {
      if (migration.name.endsWith('_inventory_stock.sql')) {
        await db.exec(fixtures);
        await db.query(
          "insert into public.inventory_items (user_id, name, category, created_at) values ($1, '  Apple  ', 'Legacy', '2026-01-01T00:00:00Z')",
          [alice],
        );
        const before = (
          await db.query<Omit<Tables<'inventory_items'>, 'in_stock'>>(
            'select * from public.inventory_items order by id',
          )
        ).rows;
        await db.exec(migration.sql);
        const after = (await db.query('select * from public.inventory_items order by id')).rows;
        expect(after).toEqual(before.map((row) => ({ ...row, in_stock: true })));
      } else {
        await db.exec(migration.sql);
      }
    }
  } finally {
    await db.close();
  }
}, 30_000);
