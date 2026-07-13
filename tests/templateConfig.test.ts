import { describe, expect, it } from 'vitest';
import {
  documentTemplateConfigSchema,
  buildDefaultTemplateConfig,
  parseTemplateConfig,
  DEFAULT_ITEM_COLUMNS,
} from '../src/lib/pdf/templateConfig';

describe('documentTemplateConfigSchema', () => {
  it('builds a valid default config that round-trips through the schema', () => {
    const config = buildDefaultTemplateConfig();
    const result = documentTemplateConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid color value', () => {
    const config = buildDefaultTemplateConfig();
    const bad = { ...config, general: { ...config.general, primaryColor: 'not-a-color' } };
    expect(documentTemplateConfigSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an item column with an unknown key', () => {
    const config = buildDefaultTemplateConfig();
    const bad = {
      ...config,
      itemTable: { ...config.itemTable, columns: [{ key: 'bogus', label: 'x', visible: true, widthMm: 10, align: 'left' }] },
    };
    expect(documentTemplateConfigSchema.safeParse(bad).success).toBe(false);
  });

  it('parseTemplateConfig falls back to defaults for malformed stored JSON instead of throwing', () => {
    const config = parseTemplateConfig({ general: { marginTopMm: 'not-a-number' } });
    expect(documentTemplateConfigSchema.safeParse(config).success).toBe(true);
  });

  it('parseTemplateConfig falls back to defaults for null (legacy rows with no config yet)', () => {
    const config = parseTemplateConfig(null);
    expect(config).toEqual(buildDefaultTemplateConfig());
  });

  it('default item columns cover every configurable column exactly once', () => {
    const keys = DEFAULT_ITEM_COLUMNS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
