import { applyFixture } from './database-fixture'

export default async function globalSetup() {
  await applyFixture('cleanup')
  await applyFixture('seed')
}
