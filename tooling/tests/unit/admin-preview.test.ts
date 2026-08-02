import { describe, expect, it } from 'vitest'

import { isAdminLocalPreviewEnabled } from '@/lib/admin-preview'

describe('isAdminLocalPreviewEnabled', () => {
  it('requires an explicit local opt-in', () => {
    expect(isAdminLocalPreviewEnabled({ NODE_ENV: 'development' })).toBe(false)
    expect(
      isAdminLocalPreviewEnabled({
        ADMIN_LOCAL_PREVIEW: 'true',
        NODE_ENV: 'development',
      }),
    ).toBe(true)
  })

  it('stays disabled in production and CI', () => {
    expect(
      isAdminLocalPreviewEnabled({
        ADMIN_LOCAL_PREVIEW: 'true',
        NODE_ENV: 'production',
      }),
    ).toBe(false)
    expect(
      isAdminLocalPreviewEnabled({
        ADMIN_LOCAL_PREVIEW: 'true',
        NODE_ENV: 'development',
        CI: 'true',
      }),
    ).toBe(false)
  })
})
