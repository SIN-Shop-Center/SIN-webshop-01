import { applyFixture } from './database-fixture'

export default async function globalTeardown() {
  await applyFixture('cleanup')
}
